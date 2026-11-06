package com.noah.ticketbox.event.dto;

import com.noah.ticketbox.event.EventStatus;
import java.time.OffsetDateTime;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Query parameters of GET /events. All optional. Use "Z" in URLs: a raw "+" is decoded as a space.
 */
public record EventSearchCriteria(
    EventStatus status,
    String keyword,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {}
