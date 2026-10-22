package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.domain.Booking;
import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.domain.SeatType;
import com.noah.ticketbox.core.pricing.PricingStrategy;
import com.noah.ticketbox.core.repository.InMemoryRepository;
import com.noah.ticketbox.core.repository.Repository;
import com.noah.ticketbox.core.support.MutableClock;
import com.noah.ticketbox.core.support.TestFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;

import static com.noah.ticketbox.core.support.TestFixtures.seats;
import static org.assertj.core.api.Assertions.assertThat;

class ReportServiceTest {

    private BookingService bookingService;
    private ReportService reportService;
    private Event event;

    @BeforeEach
    void setUp() {
        MutableClock clock = MutableClock.startingAt("2026-11-01T00:00:00Z");
        Repository<Event, Long> events = new InMemoryRepository<>();
        Repository<Booking, Long> bookings = new InMemoryRepository<>();
        EventService eventService = new EventService(events, new SeatMapFactory(), new IdGenerator(), clock);
        bookingService = new BookingService(events, bookings, PricingStrategy.seatPrice(),
                new IdGenerator(), clock, Duration.ofMinutes(10));
        reportService = new ReportService(events, bookings);

        event = eventService.create(new CreateEventCommand("Report", "Hall",
                LocalDateTime.of(2026, 12, 1, 20, 0), TestFixtures.smallLayout()));
        eventService.publish(event.id());

        Booking paid = bookingService.hold(event.id(), "alice", seats("A1", "B1"));
        bookingService.confirm(paid.id(), "alice");
        bookingService.hold(event.id(), "bob", seats("C1"));
    }

    @Test
    void statsCountSeatsByStatusAndType() {
        EventStats stats = reportService.statsOf(event.id());

        assertThat(stats.capacity()).isEqualTo(12);
        assertThat(stats.count(SeatStatus.SOLD)).isEqualTo(2);
        assertThat(stats.count(SeatStatus.HELD)).isEqualTo(1);
        assertThat(stats.count(SeatStatus.AVAILABLE)).isEqualTo(9);
        assertThat(stats.soldByType()).containsEntry(SeatType.VIP, 1L).containsEntry(SeatType.STANDARD, 1L);
        assertThat(stats.soldValue()).isEqualByComparingTo("250000");
        assertThat(stats.occupancyPercent()).isEqualByComparingTo("16.7");
    }

    @Test
    void revenueCountsOnlyConfirmedBookings() {
        assertThat(reportService.revenueByEvent()).containsOnlyKeys(event.id());
        assertThat(reportService.revenueByEvent().get(event.id())).isEqualByComparingTo("250000");
    }

    @Test
    void partitionsAvailableSeatsIntoVipAndStandard() {
        assertThat(reportService.availableVipVsStandard(event.id()))
                .containsEntry(true, 3L)    // A2..A4
                .containsEntry(false, 6L);  // B2..B4, C2..C4
    }
}
