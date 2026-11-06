package com.noah.week1.service;

import com.noah.week1.common.IdGenerator;
import com.noah.week1.domain.Event;
import com.noah.week1.domain.SeatMapFactory;
import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.exception.NotFoundException;
import com.noah.week1.repository.Repository;

import java.time.Clock;

public class EventService {

    private final Repository<Event, Long> events;
    private final SeatMapFactory seatMapFactory;
    private final IdGenerator ids;
    private final Clock clock;
    private final EventLocks locks;

    public EventService(Repository<Event, Long> events, SeatMapFactory seatMapFactory, IdGenerator ids,
                        Clock clock, EventLocks locks) {
        this.events = events;
        this.seatMapFactory = seatMapFactory;
        this.ids = ids;
        this.clock = clock;
        this.locks = locks;
    }

    public Event create(CreateEventCommand command) {
        if (!command.startsAt().isAfter(clock.instant())) {
            throw new InvalidStateException("Event must start in the future");
        }
        Event event = Event.builder()
                .id(ids.next())
                .name(command.name())
                .venueName(command.venueName())
                .startsAt(command.startsAt())
                .endsAt(command.endsAt())
                .seats(seatMapFactory.create(command.layout(), command.pricing()))
                .build();
        return events.save(event);
    }

    /** Check-then-write on the status: must run under the event lock (volatile alone is not enough). */
    public Event publish(Long eventId) {
        return locks.withLock(eventId, () -> {
            Event event = getById(eventId);
            event.publish();
            return event;
        });
    }

    public Event cancel(Long eventId) {
        return locks.withLock(eventId, () -> {
            Event event = getById(eventId);
            event.cancel();
            return event;
        });
    }

    public Event getById(Long eventId) {
        return events.findById(eventId).orElseThrow(() -> NotFoundException.event(eventId));
    }
}
