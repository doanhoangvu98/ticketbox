package com.noah.week1.service;

import com.noah.week1.domain.SeatStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

public record EventStats(int capacity, Map<SeatStatus, Long> countByStatus, BigDecimal soldValue) {

    public long count(SeatStatus status) {
        return countByStatus.getOrDefault(status, 0L);
    }

    public BigDecimal occupancyPercent() {
        return BigDecimal.valueOf(count(SeatStatus.SOLD) * 100.0 / capacity).setScale(1, RoundingMode.HALF_UP);
    }
}
