package com.noah.ticketbox.core.support;

import com.noah.ticketbox.core.domain.SeatLayout;
import com.noah.ticketbox.core.domain.SeatPosition;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;

public final class TestFixtures {

    public static final BigDecimal BASE_PRICE = new BigDecimal("100000");

    private TestFixtures() {
    }

    /** 3 rows x 4 seats, row A is VIP. */
    public static SeatLayout smallLayout() {
        return new SeatLayout(3, 4, 1, BASE_PRICE);
    }

    public static List<SeatPosition> seats(String... codes) {
        return Stream.of(codes).map(SeatPosition::parse).toList();
    }
}
