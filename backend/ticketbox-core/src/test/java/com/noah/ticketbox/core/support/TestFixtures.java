package com.noah.ticketbox.core.support;

import com.noah.ticketbox.core.domain.SeatLayout;

import java.math.BigDecimal;

public final class TestFixtures {

    public static final BigDecimal BASE_PRICE = new BigDecimal("100000");

    private TestFixtures() {
    }

    /** 3 rows x 4 seats, row A is VIP. */
    public static SeatLayout smallLayout() {
        return new SeatLayout(3, 4, 1, BASE_PRICE);
    }
}
