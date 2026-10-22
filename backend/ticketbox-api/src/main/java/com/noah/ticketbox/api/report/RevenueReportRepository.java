package com.noah.ticketbox.api.report;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Reporting with plain SQL via JdbcTemplate (no entities).
 *
 * <p>Why not JPA here? Aggregations with FILTER, ROUND and ORDER BY on computed columns are
 * clearer in SQL, and loading thousands of entities just to sum prices would waste memory.
 * Rule of thumb (ADR-008): JPA for writes and entity graphs, SQL for read-heavy reports.
 *
 * <p>Named parameters (:from) are bound by the driver, never concatenated: no SQL injection.
 */
@Repository
@RequiredArgsConstructor
public class RevenueReportRepository {

    private static final String REVENUE_SQL = """
            SELECT e.id,
                   e.name,
                   e.starts_at,
                   COUNT(s.id)                                              AS capacity,
                   COUNT(s.id) FILTER (WHERE s.status = 'SOLD')             AS sold_seats,
                   COALESCE(SUM(s.price) FILTER (WHERE s.status = 'SOLD'), 0) AS revenue
            FROM event e
            JOIN seat s ON s.event_id = e.id
            WHERE e.starts_at >= :from
              AND e.starts_at <  :to
              AND e.status <> 'CANCELLED'
            GROUP BY e.id, e.name, e.starts_at
            ORDER BY revenue DESC
            LIMIT :limit
            """;

    private static final RowMapper<RevenueRow> ROW_MAPPER = (rs, rowNum) -> {
        long capacity = rs.getLong("capacity");
        long sold = rs.getLong("sold_seats");
        BigDecimal occupancy = capacity == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(sold * 100.0 / capacity).setScale(1, RoundingMode.HALF_UP);
        return new RevenueRow(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getObject("starts_at", OffsetDateTime.class),
                capacity,
                sold,
                rs.getBigDecimal("revenue"),
                occupancy);
    };

    private final NamedParameterJdbcTemplate jdbc;

    public List<RevenueRow> topEventsByRevenue(OffsetDateTime from, OffsetDateTime to, int limit) {
        var params = new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to)
                .addValue("limit", limit);
        return jdbc.query(REVENUE_SQL, params, ROW_MAPPER);
    }
}
