package com.noah.ticketbox.api.event.dto;

import com.noah.ticketbox.core.domain.EventStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Row of the event list. Flat on purpose: no nested objects, small payload. */
public record EventSummaryResponse(
        Long id,
        String name,
        String venueName,
        OffsetDateTime startsAt,
        BigDecimal basePrice,
        EventStatus status) {
}
