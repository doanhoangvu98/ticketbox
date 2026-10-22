package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.common.IdGenerator;
import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.EventStatus;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.NotFoundException;
import com.noah.ticketbox.core.repository.Repository;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;

/**
 * Event use cases. Dependencies come in through the constructor (manual DI in Week 1,
 * Spring does the same automatically in Week 2).
 */
public class EventService {

    private final Repository<Event, Long> events;
    private final SeatMapFactory seatMapFactory;
    private final IdGenerator ids;
    private final Clock clock;

    public EventService(Repository<Event, Long> events, SeatMapFactory seatMapFactory,
                        IdGenerator ids, Clock clock) {
        this.events = Objects.requireNonNull(events);
        this.seatMapFactory = Objects.requireNonNull(seatMapFactory);
        this.ids = Objects.requireNonNull(ids);
        this.clock = Objects.requireNonNull(clock);
    }

    public Event create(CreateEventCommand command) {
        if (!command.startsAt().isAfter(LocalDateTime.now(clock))) {
            throw new InvalidStateException("Event must start in the future");
        }
        Event event = Event.builder()
                .id(ids.next())
                .name(command.name())
                .venueName(command.venueName())
                .startsAt(command.startsAt())
                .seats(seatMapFactory.create(command.layout()))
                .build();
        return events.save(event);
    }

    public Event publish(Long eventId) {
        Event event = getById(eventId);
        event.publish();
        return event;
    }

    public Event cancel(Long eventId) {
        Event event = getById(eventId);
        event.cancel();
        return event;
    }

    public Event getById(Long eventId) {
        return events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
    }

    /** Published events that have not started yet, soonest first. */
    public List<Event> findUpcoming() {
        LocalDateTime now = LocalDateTime.now(clock);
        return search(byStatus(EventStatus.PUBLISHED).and(e -> e.startsAt().isAfter(now)));
    }

    /** Generic search: the caller composes Predicates. */
    public List<Event> search(Predicate<Event> criteria) {
        return events.findAll(criteria).stream()
                .sorted(Comparator.comparing(Event::startsAt).thenComparing(Event::name))
                .toList();
    }

    // Small reusable predicates, composable with and()/or()/negate().
    public static Predicate<Event> byStatus(EventStatus status) {
        return e -> e.status() == status;
    }

    public static Predicate<Event> nameContains(String keyword) {
        String needle = keyword.toLowerCase();
        return e -> e.name().toLowerCase().contains(needle);
    }
}
