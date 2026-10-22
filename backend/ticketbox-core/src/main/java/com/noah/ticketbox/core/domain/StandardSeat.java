package com.noah.ticketbox.core.domain;

import java.math.BigDecimal;

public final class StandardSeat extends Seat {

    public StandardSeat(SeatPosition position, BigDecimal basePrice) {
        super(position, basePrice);
    }

    @Override
    public BigDecimal price() {
        return basePrice();
    }

    @Override
    public SeatType type() {
        return SeatType.STANDARD;
    }
}
