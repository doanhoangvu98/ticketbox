package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.domain.SeatType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** Read model for the event dashboard. */
public record EventStats(
        long eventId,
        int capacity,
        Map<SeatStatus, Long> countByStatus,
        Map<SeatType, Long> soldByType,
        BigDecimal soldValue) {

    public long count(SeatStatus status) {
        return countByStatus.getOrDefault(status, 0L);
    }

    /** Sold seats / capacity, in percent with 1 decimal. */
    public BigDecimal occupancyPercent() {
        if (capacity == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(count(SeatStatus.SOLD) * 100.0 / capacity).setScale(1, RoundingMode.HALF_UP);
    }
}
