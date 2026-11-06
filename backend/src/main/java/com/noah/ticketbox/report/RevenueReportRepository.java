package com.noah.ticketbox.report;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Read-heavy report in plain SQL: aggregates in the database instead of loading entities (ADR-008).
 */
@Repository
@RequiredArgsConstructor
public class RevenueReportRepository {
}
