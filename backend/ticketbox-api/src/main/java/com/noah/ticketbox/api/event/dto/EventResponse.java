package com.noah.ticketbox.api.event.dto;

import com.noah.ticketbox.core.domain.EventStatus;
import com.noah.ticketbox.core.domain.SeatStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;

/** Event detail, including seat counts per status. */
public record EventResponse(
        Long id,
        String name,
        VenueInfo venue,
        OffsetDateTime startsAt,
        BigDecimal basePrice,
        int vipRows,
        EventStatus status,
        int capacity,
        Map<SeatStatus, Long> seatCounts,
        long version,
        Instant createdAt,
        Instant updatedAt) {

    public record VenueInfo(Long id, String name, String address) {
    }
}
