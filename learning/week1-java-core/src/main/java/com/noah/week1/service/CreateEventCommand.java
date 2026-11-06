package com.noah.week1.service;

import com.noah.week1.domain.SeatLayout;
import com.noah.week1.domain.SeatPricing;

import java.time.Instant;

public record CreateEventCommand(
        String name,
        String venueName,
        Instant startsAt,
        Instant endsAt,
        SeatLayout layout,
        SeatPricing pricing) {
}
