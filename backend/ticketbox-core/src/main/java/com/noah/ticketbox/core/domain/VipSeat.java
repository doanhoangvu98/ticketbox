package com.noah.ticketbox.core.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class VipSeat extends Seat {

    /**
     * VIP seats cost 1.5x the base price.
     */
    public static final BigDecimal MULTIPLIER = new BigDecimal("1.5");

    public VipSeat(SeatPosition position, BigDecimal basePrice) {
        super(position, basePrice);
    }

    @Override
    public BigDecimal price() {
        // VND has no minor unit, so round to whole numbers.
        return basePrice().multiply(MULTIPLIER).setScale(0, RoundingMode.HALF_UP);
    }

    @Override
    public SeatType type() {
        return SeatType.VIP;
    }
}
