-- =====================================================================
-- V2: indexes for real query patterns (measured in docs/BENCHMARK.md)
-- =====================================================================

-- PostgreSQL does NOT index foreign keys automatically. Needed for joins and ON DELETE checks.
CREATE INDEX ix_event_venue_id ON event (venue_id);

-- Event list: WHERE status = ? AND starts_at >= ? ORDER BY starts_at
-- Equality column first, range/sort column second.
CREATE INDEX ix_event_status_starts_at ON event (status, starts_at);

-- Week 3 expiry job: WHERE status = 'HELD' AND hold_expires_at < now()
-- Partial index: only HELD rows (a tiny fraction) are indexed -> small and fast.
CREATE INDEX ix_seat_held_expires_at ON seat (hold_expires_at) WHERE status = 'HELD';
