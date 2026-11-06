package com.noah.week1.domain;

import com.noah.week1.common.Identifiable;
import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.exception.OrderExpiredException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** A buyer's hold on some seats of one event. Seats and total are fixed at creation; only the status moves. */
public final class Order implements Identifiable<Long> {

    private final Long id;
    private final Long eventId;
    private final String userId;
    private final List<SeatPosition> seats;
    private final BigDecimal total;
    private final Instant expiresAt;
    private OrderStatus status = OrderStatus.PENDING;

    public Order(Long id, Long eventId, String userId, List<SeatPosition> seats, BigDecimal total, Instant expiresAt) {
        this.id = Objects.requireNonNull(id);
        this.eventId = Objects.requireNonNull(eventId);
        this.userId = Objects.requireNonNull(userId);
        this.seats = List.copyOf(seats);
        this.total = Objects.requireNonNull(total);
        this.expiresAt = Objects.requireNonNull(expiresAt);
    }

    public boolean isExpiredAt(Instant now) {
        return status == OrderStatus.PENDING && !now.isBefore(expiresAt);
    }

    public void pay(Instant now) {
        requirePending();
        if (isExpiredAt(now)) {
            throw new OrderExpiredException(id);
        }
        status = OrderStatus.PAID;
    }

    public void cancel() {
        requirePending();
        status = OrderStatus.CANCELLED;
    }

    public void expire() {
        requirePending();
        status = OrderStatus.EXPIRED;
    }

    private void requirePending() {
        if (status != OrderStatus.PENDING) {
            throw new InvalidStateException("Order " + id + " is already " + status);
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

    public BigDecimal total() {
        return total;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public OrderStatus status() {
        return status;
    }

    @Override
    public String toString() {
        return "Order[id=%d, event=%d, user=%s, seats=%s, total=%s, status=%s]"
                .formatted(id, eventId, userId, seats, total, status);
    }
}
