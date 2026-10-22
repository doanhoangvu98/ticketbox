package com.noah.ticketbox.core.domain;

import com.noah.ticketbox.core.common.Identifiable;
import com.noah.ticketbox.core.exception.BookingExpiredException;
import com.noah.ticketbox.core.exception.InvalidStateException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * A user's reservation of one or more seats of a single event.
 * Mutated only by BookingService under the event lock.
 */
public final class Booking implements Identifiable<Long> {

    private final Long id;
    private final Long eventId;
    private final String userId;
    private final List<SeatPosition> seats;
    private final BigDecimal totalAmount;
    private final Instant createdAt;
    private final Instant expiresAt;
    private BookingStatus status = BookingStatus.PENDING;

    public Booking(Long id, Long eventId, String userId, List<SeatPosition> seats,
                   BigDecimal totalAmount, Instant createdAt, Instant expiresAt) {
        this.id = Objects.requireNonNull(id);
        this.eventId = Objects.requireNonNull(eventId);
        this.userId = Objects.requireNonNull(userId);
        this.seats = List.copyOf(seats);
        this.totalAmount = Objects.requireNonNull(totalAmount);
        this.createdAt = Objects.requireNonNull(createdAt);
        this.expiresAt = Objects.requireNonNull(expiresAt);
        if (this.seats.isEmpty()) {
            throw new IllegalArgumentException("Booking needs at least one seat");
        }
    }

    public boolean isExpiredAt(Instant now) {
        return status == BookingStatus.PENDING && !now.isBefore(expiresAt);
    }

    public void confirm(Instant now) {
        requirePending();
        if (isExpiredAt(now)) {
            throw new BookingExpiredException(id);
        }
        status = BookingStatus.CONFIRMED;
    }

    public void cancel() {
        requirePending();
        status = BookingStatus.CANCELLED;
    }

    public void expire() {
        requirePending();
        status = BookingStatus.EXPIRED;
    }

    private void requirePending() {
        if (status != BookingStatus.PENDING) {
            throw new InvalidStateException("Booking " + id + " is already " + status);
        }
    }

    @Override
    public Long id() {
        return id;
    }

    public Long eventId() {
        return eventId;
    }

    public String userId() {
        return userId;
    }

    public List<SeatPosition> seats() {
        return seats;
    }

    public BigDecimal totalAmount() {
        return totalAmount;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public BookingStatus status() {
        return status;
    }

    @Override
    public String toString() {
        return "Booking[id=%d, event=%d, user=%s, seats=%s, total=%s, status=%s]"
                .formatted(id, eventId, userId, seats, totalAmount, status);
    }
}
