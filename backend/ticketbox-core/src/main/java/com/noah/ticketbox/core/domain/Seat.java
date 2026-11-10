package com.noah.ticketbox.core.domain;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * A seat template produced by {@link SeatMapFactory}.
 *
 * <p>Abstraction: {@link #price()} and {@link #type()} are abstract, each subclass decides.
 * Runtime state (available / held / sold) is NOT modelled here: the API stores it in the database.
 */
public abstract sealed class Seat permits StandardSeat, VipSeat {

    private final SeatPosition position;
    private final BigDecimal basePrice;

    protected Seat(SeatPosition position, BigDecimal basePrice) {
        this.position = Objects.requireNonNull(position, "position");
        this.basePrice = Objects.requireNonNull(basePrice, "basePrice");
        if (basePrice.signum() <= 0) {
            throw new IllegalArgumentException("basePrice must be positive");
        }
    }

    /**
     * Ticket price of this seat. Each subclass has its own rule.
     */
    public abstract BigDecimal price();

    public abstract SeatType type();

    public SeatPosition position() {
        return position;
    }

    public BigDecimal basePrice() {
        return basePrice;
    }

    @Override
    public String toString() {
        return type() + "[" + position + ", " + price() + "]";
    }
}
