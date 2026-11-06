package com.noah.week1.service;

import com.noah.week1.domain.Event;
import com.noah.week1.domain.Order;
import com.noah.week1.domain.OrderStatus;
import com.noah.week1.domain.SeatPosition;
import com.noah.week1.domain.SeatStatus;
import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.exception.NotFoundException;
import com.noah.week1.exception.OrderExpiredException;
import com.noah.week1.exception.SeatNotAvailableException;
import com.noah.week1.support.TestApp;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static com.noah.week1.support.TestApp.HOLD;
import static com.noah.week1.support.TestApp.seats;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderServiceTest {

    private final TestApp app = new TestApp();
    private final OrderService service = app.orderService;
    private final Event event = app.publishedEvent();

    private SeatStatus statusOf(String code) {
        return event.seat(SeatPosition.parse(code)).orElseThrow().status();
    }

    @Nested
    class Hold {

        @Test
        void holdsSeatsAndComputesTotal() {
            Order order = service.hold(event.id(), "alice", seats("A1", "B1"));

            assertThat(order.total()).isEqualByComparingTo("250000"); // VIP 150k + standard 100k
            assertThat(order.expiresAt()).isEqualTo(app.clock.instant().plus(HOLD));
            assertThat(statusOf("A1")).isEqualTo(SeatStatus.HELD);
        }

        @Test
        void isAllOrNothing() {
            service.hold(event.id(), "alice", seats("B2"));

            assertThatThrownBy(() -> service.hold(event.id(), "bob", seats("B1", "B2")))
                    .isInstanceOf(SeatNotAvailableException.class);
            assertThat(statusOf("B1")).isEqualTo(SeatStatus.AVAILABLE);
        }

        @Test
        void expiredHoldFreesTheSeat() {
            service.hold(event.id(), "alice", seats("B3"));
            app.clock.advance(HOLD);

            assertThat(service.hold(event.id(), "bob", seats("B3")).userId()).isEqualTo("bob");
        }

        @Test
        void rejectsDraftEvent() {
            Event draft = app.draftEvent();

            assertThatThrownBy(() -> service.hold(draft.id(), "alice", seats("A1")))
                    .isInstanceOf(InvalidStateException.class);
        }

        @Test
        void rejectsUnknownSeat() {
            assertThatThrownBy(() -> service.hold(event.id(), "alice", seats("Z9")))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    class Lifecycle {

        @Test
        void paySellsSeats() {
            Order order = service.hold(event.id(), "alice", seats("C1"));

            service.pay(order.id(), "alice");

            assertThat(order.status()).isEqualTo(OrderStatus.PAID);
            assertThat(statusOf("C1")).isEqualTo(SeatStatus.SOLD);
        }

        @Test
        void payAfterExpiryFails() {
            Order order = service.hold(event.id(), "alice", seats("C2"));
            app.clock.advance(HOLD);

            assertThatThrownBy(() -> service.pay(order.id(), "alice")).isInstanceOf(OrderExpiredException.class);
        }

        @Test
        void otherUserSeesNotFound() {
            Order order = service.hold(event.id(), "alice", seats("C3"));

            assertThatThrownBy(() -> service.pay(order.id(), "mallory")).isInstanceOf(NotFoundException.class);
        }

        @Test
        void cancelReleasesSeats() {
            Order order = service.hold(event.id(), "alice", seats("C4"));

            service.cancel(order.id(), "alice");

            assertThat(statusOf("C4")).isEqualTo(SeatStatus.AVAILABLE);
        }

        @Test
        void releaseExpiredHolds_onlyTimedOutOrders() {
            Order old = service.hold(event.id(), "alice", seats("A2"));
            app.clock.advance(Duration.ofMinutes(6));
            Order fresh = service.hold(event.id(), "bob", seats("A3"));
            app.clock.advance(Duration.ofMinutes(5));

            assertThat(service.releaseExpiredHolds()).isEqualTo(1);
            assertThat(old.status()).isEqualTo(OrderStatus.EXPIRED);
            assertThat(fresh.status()).isEqualTo(OrderStatus.PENDING);
            assertThat(statusOf("A2")).isEqualTo(SeatStatus.AVAILABLE);
        }
    }
}
