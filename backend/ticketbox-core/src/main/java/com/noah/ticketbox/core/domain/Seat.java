package com.noah.ticketbox.core.domain;

import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.SeatNotAvailableException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * A seat of one event.
 *
 * <p>Knowledge shown:
 * <ul>
 *   <li>Abstraction: {@link #price()} and {@link #type()} are abstract, subclasses decide.</li>
 *   <li>Encapsulation: state only changes through {@link #hold}, {@link #sell}, {@link #release},
 *       each guarded by {@link SeatStatus#canTransitionTo}.</li>
 * </ul>
 *
 * <p><b>Thread-safety:</b> NOT thread-safe by itself. All mutations must happen while holding
 * the per-event lock in {@code BookingService}. This is a deliberate design: the invariant
 * "a seat belongs to at most one booking" spans several seats, so locking a single seat is not enough.
 */
public abstract sealed class Seat permits StandardSeat, VipSeat {

    private final SeatPosition position;
    private final BigDecimal basePrice;

    private SeatStatus status = SeatStatus.AVAILABLE;
    private String holder;
    private Instant holdExpiresAt;

    protected Seat(SeatPosition position, BigDecimal basePrice) {
        this.position = Objects.requireNonNull(position, "position");
        this.basePrice = Objects.requireNonNull(basePrice, "basePrice");
        if (basePrice.signum() <= 0) {
            throw new IllegalArgumentException("basePrice must be positive");
        }
    }

    /**
     * Ticket price of this seat before discounts/fees. Each subclass has its own rule.
     */
    public abstract BigDecimal price();

    public abstract SeatType type();

    /**
     * A seat is available if nobody holds it, or the previous hold has already expired
     * ("lazy expiry": we do not need a background job to be correct, only to be tidy).
     */
    public boolean isAvailableAt(Instant now) {
        return status == SeatStatus.AVAILABLE || (status == SeatStatus.HELD && holdExpiresAt != null && !now.isBefore(holdExpiresAt));
    }

    public void hold(String userId, Instant until, Instant now) {
        if (!isAvailableAt(now)) {
            throw new SeatNotAvailableException(List.of(position));
        }
        this.status = SeatStatus.HELD;
        this.holder = Objects.requireNonNull(userId, "userId");
        this.holdExpiresAt = Objects.requireNonNull(until, "until");
    }

    // Current user is also holder
    public void sell(String userId) {
        if (status != SeatStatus.HELD || !Objects.equals(holder, userId)) {
            throw new InvalidStateException("Seat " + position + " is not held by " + userId);
        }
        transitionTo(SeatStatus.SOLD);
        this.holdExpiresAt = null;
    }

    public void release() {
        transitionTo(SeatStatus.AVAILABLE);
        this.holder = null;
        this.holdExpiresAt = null;
    }

    private void transitionTo(SeatStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new InvalidStateException("Seat " + position + ": " + status + " -> " + target + " not allowed");
        }
        this.status = target;
    }

    public SeatPosition position() {
        return position;
    }

    public BigDecimal basePrice() {
        return basePrice;
    }

    public SeatStatus status() {
        return status;
    }

    public Optional<String> holder() {
        return Optional.ofNullable(holder);
    }

    public Optional<Instant> holdExpiresAt() {
        return Optional.ofNullable(holdExpiresAt);
    }

    /**
     * Identity = position. Two Seat objects for the same position of the same event are the same seat.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Seat other)) {
            return false;
        }
        return position.equals(other.position);
    }

    @Override
    public int hashCode() {
        return position.hashCode();
    }

    @Override
    public String toString() {
        return type() + "[" + position + ", " + status + ", " + price() + "]";
    }
}
