package com.noah.ticketbox.api.event.dto;

import com.noah.ticketbox.core.domain.EventStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.OffsetDateTime;

/** Query parameters of GET /events. All optional; null means "no filter". */
public record EventSearchCriteria(
        @Schema(description = "Filter by status") EventStatus status,
        @Schema(description = "Case-insensitive match on name") String keyword,
        @Schema(example = "2026-11-01T00:00:00Z")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
        @Schema(example = "2027-01-01T00:00:00Z")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
}
