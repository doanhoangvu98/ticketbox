package com.noah.week1.domain;

import com.noah.week1.exception.InvalidStateException;
import com.noah.week1.exception.SeatNotAvailableException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * A seat of one event. Each subclass owns its price rule (polymorphism).
 *
 * <p>Not thread-safe by itself: callers mutate seats only while holding the event lock
 * ({@code EventLocks}), because one order changes several seats at once.
 */
public abstract sealed class Seat permits StandardSeat, VipSeat {

    private final SeatPosition position;
    private final BigDecimal basePrice;

    private SeatStatus status = SeatStatus.AVAILABLE;
    private String holder;
    private Instant holdExpiresAt;

    protected Seat(SeatPosition position, BigDecimal basePrice) {
        this.position = Objects.requireNonNull(position);
        this.basePrice = Objects.requireNonNull(basePrice);
    }

    public abstract BigDecimal price();

    /** An expired hold counts as free, so correctness does not depend on a cleanup job running on time. */
    public boolean isAvailableAt(Instant now) {
        return status == SeatStatus.AVAILABLE
                || (status == SeatStatus.HELD && !now.isBefore(holdExpiresAt));
    }

    public void hold(String userId, Instant until, Instant now) {
        if (!isAvailableAt(now)) {
            throw new SeatNotAvailableException(List.of(position));
        }
        status = SeatStatus.HELD;
        holder = userId;
        holdExpiresAt = until;
    }

    public void sell(String userId) {
        if (status != SeatStatus.HELD || !userId.equals(holder)) {
            throw new InvalidStateException("Seat " + position + " is not held by " + userId);
        }
        status = SeatStatus.SOLD;
        holdExpiresAt = null;
    }

    public void release() {
        if (status != SeatStatus.HELD) {
            throw new InvalidStateException("Only a held seat can be released: " + position);
        }
        status = SeatStatus.AVAILABLE;
        holder = null;
        holdExpiresAt = null;
    }

    public SeatPosition position() {
        return position;
    }

    protected BigDecimal basePrice() {
        return basePrice;
    }

    public SeatStatus status() {
        return status;
    }

    public Optional<String> holder() {
        return Optional.ofNullable(holder);
    }

    /** Identity is the position: status changes must not change equals/hashCode. */
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof Seat other && position.equals(other.position));
    }

    @Override
    public int hashCode() {
        return position.hashCode();
    }
}
