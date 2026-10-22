package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.domain.Booking;
import com.noah.ticketbox.core.domain.BookingStatus;
import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.domain.SeatPosition;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.exception.BookingExpiredException;
import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.NotFoundException;
import com.noah.ticketbox.core.exception.SeatNotAvailableException;
import com.noah.ticketbox.core.pricing.PricingStrategy;
import com.noah.ticketbox.core.repository.InMemoryRepository;
import com.noah.ticketbox.core.repository.Repository;
import com.noah.ticketbox.core.support.MutableClock;
import com.noah.ticketbox.core.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;

import static com.noah.ticketbox.core.support.TestFixtures.seats;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BookingServiceTest {

    private static final Duration HOLD = Duration.ofMinutes(10);

    private MutableClock clock;
    private EventService eventService;
    private BookingService bookingService;
    private Event event;

    @BeforeEach
    void setUp() {
        clock = MutableClock.startingAt("2026-11-01T00:00:00Z");
        Repository<Event, Long> events = new InMemoryRepository<>();
        Repository<Booking, Long> bookings = new InMemoryRepository<>();
        eventService = new EventService(events, new SeatMapFactory(), new IdGenerator(), clock);
        bookingService = new BookingService(events, bookings, PricingStrategy.seatPrice(),
                new IdGenerator(), clock, HOLD);

        event = eventService.create(new CreateEventCommand("Test Show", "Hall 1",
                LocalDateTime.of(2026, 12, 1, 20, 0), TestFixtures.smallLayout()));
        eventService.publish(event.id());
    }

    private SeatStatus statusOf(String code) {
        return event.seat(SeatPosition.parse(code)).orElseThrow().status();
    }

    @Nested
    @DisplayName("hold")
    class Hold {

        @Test
        void holdsSeatsAndComputesTotal() {
            Booking booking = bookingService.hold(event.id(), "alice", seats("A1", "B1"));

            assertThat(booking.status()).isEqualTo(BookingStatus.PENDING);
            assertThat(booking.totalAmount()).isEqualByComparingTo("250000"); // VIP 150k + STD 100k
            assertThat(booking.expiresAt()).isEqualTo(clock.instant().plus(HOLD));
            assertThat(statusOf("A1")).isEqualTo(SeatStatus.HELD);
        }

        @Test
        void rejectsSeatAlreadyHeld() {
            bookingService.hold(event.id(), "alice", seats("B2"));

            assertThatThrownBy(() -> bookingService.hold(event.id(), "bob", seats("B2")))
                    .isInstanceOf(SeatNotAvailableException.class);
        }

        @Test
        void isAllOrNothing() {
            bookingService.hold(event.id(), "alice", seats("B2"));

            assertThatThrownBy(() -> bookingService.hold(event.id(), "bob", seats("B1", "B2")))
                    .isInstanceOf(SeatNotAvailableException.class);
            assertThat(statusOf("B1")).as("B1 must not stay held").isEqualTo(SeatStatus.AVAILABLE);
        }

        @Test
        void allowsHoldAgainAfterPreviousHoldExpired() {
            bookingService.hold(event.id(), "alice", seats("B3"));
            clock.advance(HOLD.plusSeconds(1));

            Booking bob = bookingService.hold(event.id(), "bob", seats("B3"));

            assertThat(bob.userId()).isEqualTo("bob");
        }

        @Test
        void rejectsDraftEvent() {
            Event draft = eventService.create(new CreateEventCommand("Draft", "Hall 2",
                    LocalDateTime.of(2026, 12, 2, 20, 0), TestFixtures.smallLayout()));

            assertThatThrownBy(() -> bookingService.hold(draft.id(), "alice", seats("A1")))
                    .isInstanceOf(InvalidStateException.class);
        }

        @Test
        void rejectsUnknownSeat() {
            assertThatThrownBy(() -> bookingService.hold(event.id(), "alice", seats("Z9")))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("confirm / cancel / expire")
    class Lifecycle {

        @Test
        void confirmSellsSeats() {
            Booking booking = bookingService.hold(event.id(), "alice", seats("C1"));

            bookingService.confirm(booking.id(), "alice");

            assertThat(booking.status()).isEqualTo(BookingStatus.CONFIRMED);
            assertThat(statusOf("C1")).isEqualTo(SeatStatus.SOLD);
        }

        @Test
        void confirmAfterExpiryFails() {
            Booking booking = bookingService.hold(event.id(), "alice", seats("C2"));
            clock.advance(HOLD);

            assertThatThrownBy(() -> bookingService.confirm(booking.id(), "alice"))
                    .isInstanceOf(BookingExpiredException.class);
        }

        @Test
        void otherUserCannotSeeOrConfirmBooking() {
            Booking booking = bookingService.hold(event.id(), "alice", seats("C3"));

            assertThatThrownBy(() -> bookingService.confirm(booking.id(), "mallory"))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        void cancelReleasesSeats() {
            Booking booking = bookingService.hold(event.id(), "alice", seats("C4"));

            bookingService.cancel(booking.id(), "alice");

            assertThat(booking.status()).isEqualTo(BookingStatus.CANCELLED);
            assertThat(statusOf("C4")).isEqualTo(SeatStatus.AVAILABLE);
        }

        @Test
        void releaseExpiredHolds_expiresOnlyTimedOutBookings() {
            Booking old = bookingService.hold(event.id(), "alice", seats("A2"));
            clock.advance(Duration.ofMinutes(6));
            Booking fresh = bookingService.hold(event.id(), "bob", seats("A3"));
            clock.advance(Duration.ofMinutes(5)); // old: 11 min, fresh: 5 min

            int expired = bookingService.releaseExpiredHolds();

            assertThat(expired).isEqualTo(1);
            assertThat(old.status()).isEqualTo(BookingStatus.EXPIRED);
            assertThat(fresh.status()).isEqualTo(BookingStatus.PENDING);
            assertThat(statusOf("A2")).isEqualTo(SeatStatus.AVAILABLE);
        }
    }
}
