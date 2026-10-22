package com.noah.ticketbox.core.domain;

import com.noah.ticketbox.core.common.Identifiable;
import com.noah.ticketbox.core.exception.InvalidStateException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * An event with its own seat map.
 *
 * <p>Knowledge shown:
 * <ul>
 *   <li>Builder pattern: many parameters, some optional, readable call site.</li>
 *   <li>TreeMap: seats are kept sorted by {@link SeatPosition#compareTo} (O(log n) lookup),
 *       which makes printing the seat map trivial. See docs/DECISIONS.md ADR-004.</li>
 *   <li>Defensive copy / unmodifiable views: callers can read seats but cannot add or remove them.</li>
 * </ul>
 */
public final class Event implements Identifiable<Long> {

    private final Long id;
    private final String name;
    private final String venueName;
    private final LocalDateTime startsAt;
    private final Map<SeatPosition, Seat> seats;
    private volatile EventStatus status;

    private Event(Builder builder) {
        this.id = Objects.requireNonNull(builder.id, "id");
        this.name = requireText(builder.name, "name");
        this.venueName = requireText(builder.venueName, "venueName");
        this.startsAt = Objects.requireNonNull(builder.startsAt, "startsAt");
        this.status = builder.status;
        this.seats = builder.seats.stream()
                .collect(Collectors.toMap(Seat::position, Function.identity(),
                        (a, b) -> {
                            throw new IllegalArgumentException("Duplicate seat " + a.position());
                        },
                        TreeMap::new));
    }

    public static Builder builder() {
        return new Builder();
    }

    public void publish() {
        if (status != EventStatus.DRAFT) {
            throw new InvalidStateException("Only DRAFT events can be published, current: " + status);
        }
        if (seats.isEmpty()) {
            throw new InvalidStateException("Cannot publish an event without seats");
        }
        status = EventStatus.PUBLISHED;
    }

    public void cancel() {
        if (status == EventStatus.CANCELLED || status == EventStatus.COMPLETED) {
            throw new InvalidStateException("Event already " + status);
        }
        status = EventStatus.CANCELLED;
    }

    public Optional<Seat> seat(SeatPosition position) {
        return Optional.ofNullable(seats.get(position));
    }

    /** Read-only, sorted view. */
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

    public LocalDateTime startsAt() {
        return startsAt;
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

    @Override
    public String toString() {
        return "Event[id=%d, name=%s, status=%s, seats=%d]".formatted(id, name, status, seats.size());
    }

    public static final class Builder {
        private Long id;
        private String name;
        private String venueName;
        private LocalDateTime startsAt;
        private EventStatus status = EventStatus.DRAFT;
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

        public Builder startsAt(LocalDateTime startsAt) {
            this.startsAt = startsAt;
            return this;
        }

        public Builder status(EventStatus status) {
            this.status = Objects.requireNonNull(status);
            return this;
        }

        public Builder seats(List<Seat> seats) {
            this.seats = List.copyOf(seats); // defensive copy
            return this;
        }

        public Event build() {
            return new Event(this);
        }
    }
}
