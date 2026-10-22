package com.noah.ticketbox.core.domain;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Input for generating a seat map. The first {@code vipRows} rows are VIP.
 */
public record SeatLayout(int rows, int seatsPerRow, int vipRows, BigDecimal basePrice) {

    public static final int MAX_ROWS = 26; // A..Z

    public SeatLayout {
        Objects.requireNonNull(basePrice, "basePrice");
        if (rows < 1 || rows > MAX_ROWS) {
            throw new IllegalArgumentException("rows must be 1.." + MAX_ROWS);
        }
        if (seatsPerRow < 1) {
            throw new IllegalArgumentException("seatsPerRow must be >= 1");
        }
        if (vipRows < 0 || vipRows > rows) {
            throw new IllegalArgumentException("vipRows must be 0..rows");
        }
        if (basePrice.signum() <= 0) {
            throw new IllegalArgumentException("basePrice must be positive");
        }
    }

    public int capacity() {
        return rows * seatsPerRow;
    }
}
