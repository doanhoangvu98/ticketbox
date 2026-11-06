package com.noah.week1.domain;

import java.math.BigDecimal;
import java.util.Objects;

/** Pricing chosen by the organizer for one event: the first {@code vipRows} rows are VIP. */
public record SeatPricing(BigDecimal basePrice, int vipRows) {

    public SeatPricing {
        Objects.requireNonNull(basePrice, "basePrice");
        if (basePrice.signum() <= 0) {
            throw new IllegalArgumentException("basePrice must be positive");
        }
        if (vipRows < 0) {
            throw new IllegalArgumentException("vipRows must be >= 0");
        }
    }
}
