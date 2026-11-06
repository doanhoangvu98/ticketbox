-- V2: indexes for real query patterns (measured in docs/BENCHMARK.md)

-- PostgreSQL does not index foreign keys automatically.
CREATE INDEX ix_event_venue_id ON event (venue_id);

-- Event list: WHERE status = ? AND starts_at >= ? ORDER BY starts_at (equality column first).
CREATE INDEX ix_event_status_starts_at ON event (status, starts_at);

-- Hold expiry job (week 4): only HELD rows are indexed, so the index stays tiny.
CREATE INDEX ix_seat_held_expires_at ON seat (hold_expires_at) WHERE status = 'HELD';
