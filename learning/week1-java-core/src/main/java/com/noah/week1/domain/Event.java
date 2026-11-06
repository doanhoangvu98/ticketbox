package com.noah.week1.domain;

import com.noah.week1.common.Identifiable;
import com.noah.week1.exception.InvalidStateException;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * One ticketed performance at a venue, with a start and an end time (a 3-night show = 3 events).
 *
 * <p>Times are {@link Instant}s (UTC); converting to Vietnam time is a display concern.
 * Not thread-safe: status and seats are changed only inside {@code EventLocks}.
 */
public final class Event implements Identifiable<Long> {

    private final Long id;
    private final String name;
    private final String venueName;
    private final Instant startsAt;
    private final Instant endsAt;
    private final Map<SeatPosition, Seat> seats; // TreeMap: iteration is always A1, A2, ..., B1
    private EventStatus status = EventStatus.DRAFT;

    private Event(Builder b) {
        this.id = Objects.requireNonNull(b.id, "id");
        this.name = requireText(b.name, "name");
        this.venueName = requireText(b.venueName, "venueName");
        this.startsAt = Objects.requireNonNull(b.startsAt, "startsAt");
        this.endsAt = Objects.requireNonNull(b.endsAt, "endsAt");
        if (!endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("endsAt must be after startsAt");
        }
        this.seats = b.seats.stream().collect(Collectors.toMap(Seat::position, Function.identity(),
                (a, dup) -> {
                    throw new IllegalArgumentException("Duplicate seat " + a.position());
                },
                TreeMap::new));
    }

    public static Builder builder() {
        return new Builder();
    }

    public void publish() {
        if (status != EventStatus.DRAFT) {
            throw new InvalidStateException("Only a DRAFT event can be published, current: " + status);
        }
        if (seats.isEmpty()) {
            throw new InvalidStateException("Cannot publish an event without seats");
        }
        status = EventStatus.PUBLISHED;
    }

    public void cancel() {
        if (status == EventStatus.CANCELLED) {
            throw new InvalidStateException("Event already cancelled");
        }
        status = EventStatus.CANCELLED;
    }

    public Optional<Seat> seat(SeatPosition position) {
        return Optional.ofNullable(seats.get(position));
    }

    /** Read-only view: callers can change a seat through its methods but cannot add or remove seats. */
    public Collection<Seat> seats() {
        return Collections.unmodifiableCollection(seats.values());
    }

    @Override
    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String venueName() {
        return venueName;
    }

    public Instant startsAt() {
        return startsAt;
    }

    public Instant endsAt() {
        return endsAt;
    }

    public EventStatus status() {
        return status;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.trim();
    }

    /** Six required fields, two of the same type: a builder avoids swapping arguments by mistake. */
    public static final class Builder {
        private Long id;
        private String name;
        private String venueName;
        private Instant startsAt;
        private Instant endsAt;
        private List<Seat> seats = List.of();

        private Builder() {
        }

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder venueName(String venueName) {
            this.venueName = venueName;
            return this;
        }

        public Builder startsAt(Instant startsAt) {
            this.startsAt = startsAt;
            return this;
        }

        public Builder endsAt(Instant endsAt) {
            this.endsAt = endsAt;
            return this;
        }

        public Builder seats(List<Seat> seats) {
            this.seats = List.copyOf(seats);
            return this;
        }

        public Event build() {
            return new Event(this);
        }
    }
}
