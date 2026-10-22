package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.domain.Booking;
import com.noah.ticketbox.core.domain.BookingStatus;
import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.Seat;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.domain.SeatType;
import com.noah.ticketbox.core.exception.NotFoundException;
import com.noah.ticketbox.core.repository.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reporting with the Stream API: groupingBy, counting, partitioningBy, reducing, toMap.
 * Week 2 moves the heavy reports to SQL (JdbcTemplate), see RevenueReportRepository.
 */
public class ReportService {

    private final Repository<Event, Long> events;
    private final Repository<Booking, Long> bookings;

    public ReportService(Repository<Event, Long> events, Repository<Booking, Long> bookings) {
        this.events = events;
        this.bookings = bookings;
    }

    public EventStats statsOf(Long eventId) {
        Event event = events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
        Collection<Seat> seats = event.seats();

        // groupingBy + counting, collected into an EnumMap (compact, ordered by enum declaration)
        Map<SeatStatus, Long> byStatus = seats.stream()
                .collect(Collectors.groupingBy(Seat::status,
                        () -> new EnumMap<>(SeatStatus.class), Collectors.counting()));

        List<Seat> sold = seats.stream().filter(s -> s.status() == SeatStatus.SOLD).toList();

        Map<SeatType, Long> soldByType = sold.stream()
                .collect(Collectors.groupingBy(Seat::type,
                        () -> new EnumMap<>(SeatType.class), Collectors.counting()));

        BigDecimal soldValue = sold.stream().map(Seat::price).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new EventStats(eventId, seats.size(), byStatus, soldByType, soldValue);
    }

    /** VIP vs non-VIP availability, using partitioningBy (a groupingBy with a boolean key). */
    public Map<Boolean, Long> availableVipVsStandard(Long eventId) {
        Event event = events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
        return event.seats().stream()
                .filter(s -> s.status() == SeatStatus.AVAILABLE)
                .collect(Collectors.partitioningBy(s -> s.type() == SeatType.VIP, Collectors.counting()));
    }

    /** Revenue of confirmed bookings per event id. */
    public Map<Long, BigDecimal> revenueByEvent() {
        return bookings.findAll(b -> b.status() == BookingStatus.CONFIRMED).stream()
                .collect(Collectors.groupingBy(Booking::eventId,
                        Collectors.reducing(BigDecimal.ZERO, Booking::totalAmount, BigDecimal::add)));
    }

    /** Top N events by revenue, keeping order (LinkedHashMap). Event name as key for readability. */
    public Map<String, BigDecimal> topEventsByRevenue(int limit) {
        Map<Long, String> names = events.findAll().stream()
                .collect(Collectors.toMap(Event::id, Event::name));

        return revenueByEvent().entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(limit)
                .collect(Collectors.toMap(
                        e -> names.getOrDefault(e.getKey(), "#" + e.getKey()),
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    /** Bookings count per status, all events. Function.identity() demo. */
    public Map<BookingStatus, Long> bookingCountByStatus() {
        return bookings.findAll().stream()
                .map(Booking::status)
                .collect(Collectors.groupingBy(Function.identity(),
                        () -> new EnumMap<>(BookingStatus.class), Collectors.counting()));
    }
}
