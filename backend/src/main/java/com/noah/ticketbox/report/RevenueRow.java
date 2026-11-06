package com.noah.ticketbox.report;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RevenueRow(
    Long eventId,
    String eventName,
    OffsetDateTime startsAt,
    long capacity,
    long soldSeats,
    BigDecimal revenue,
    BigDecimal occupancyPercent) {}
