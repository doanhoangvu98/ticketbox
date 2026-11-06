package com.noah.week1.service;

import com.noah.week1.domain.Event;
import com.noah.week1.domain.Seat;
import com.noah.week1.domain.SeatStatus;
import com.noah.week1.exception.NotFoundException;
import com.noah.week1.repository.Repository;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;
import java.util.stream.Collectors;

public class ReportService {

    private final Repository<Event, Long> events;
    private final EventLocks locks;

    public ReportService(Repository<Event, Long> events, EventLocks locks) {
        this.events = events;
        this.locks = locks;
    }

    /** Reads seat state under the event lock: without it this is a data race with OrderService. */
    public EventStats statsOf(Long eventId) {
        return locks.withLock(eventId, () -> {
            Event event = events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));

            Map<SeatStatus, Long> byStatus = event.seats().stream()
                    .collect(Collectors.groupingBy(Seat::status, () -> new EnumMap<>(SeatStatus.class),
                            Collectors.counting()));

            BigDecimal soldValue = event.seats().stream()
                    .filter(s -> s.status() == SeatStatus.SOLD)
                    .map(Seat::price)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new EventStats(event.seats().size(), byStatus, soldValue);
        });
    }
}
