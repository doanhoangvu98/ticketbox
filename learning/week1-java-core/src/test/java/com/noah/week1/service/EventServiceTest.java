package com.noah.week1.service;

import com.noah.week1.domain.Event;
import com.noah.week1.domain.EventStatus;
import com.noah.week1.domain.SeatLayout;
import com.noah.week1.domain.SeatPricing;
import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.support.TestApp;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;

import static com.noah.week1.support.TestApp.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventServiceTest {

    private final TestApp app = new TestApp();

    @Test
    void rejectsEventInThePast() {
        assertThatThrownBy(() -> create(NOW.minus(Duration.ofHours(1)), NOW.plus(Duration.ofHours(1))))
                .isInstanceOf(InvalidStateException.class);
    }

    @Test
    void rejectsEndBeforeStart() {
        Instant start = NOW.plus(Duration.ofDays(1));
        assertThatThrownBy(() -> create(start, start.minus(Duration.ofMinutes(1))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void publishOnlyFromDraft() {
        Event event = app.publishedEvent();

        assertThatThrownBy(() -> app.eventService.publish(event.id())).isInstanceOf(InvalidStateException.class);
    }

    @Test
    void cancelledEventCannotBePublished() {
        Event event = app.draftEvent();
        app.eventService.cancel(event.id());

        assertThatThrownBy(() -> app.eventService.publish(event.id())).isInstanceOf(InvalidStateException.class);
        assertThat(event.status()).isEqualTo(EventStatus.CANCELLED);
    }

    private Event create(Instant start, Instant end) {
        return app.eventService.create(new CreateEventCommand("Show", "Hall", start, end,
                new SeatLayout(1, 1), new SeatPricing(BigDecimal.TEN, 0)));
    }
}
