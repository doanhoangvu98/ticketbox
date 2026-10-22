package com.noah.ticketbox.api.report;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Constraint annotations on parameters (@Min/@Max) are validated by Spring MVC itself (6.1+),
 * failures become a 400 ProblemDetail. Do NOT add @Validated on the class: that switches to
 * AOP validation which throws ConstraintViolationException (500 unless handled).
 */
@Tag(name = "Reports")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final RevenueReportRepository revenueReportRepository;

    @Operation(summary = "Top events by revenue in a time window (raw SQL via JdbcTemplate)")
    @GetMapping("/revenue")
    public List<RevenueRow> revenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        if (!from.isBefore(to)) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
        return revenueReportRepository.topEventsByRevenue(from, to, limit);
    }
}
