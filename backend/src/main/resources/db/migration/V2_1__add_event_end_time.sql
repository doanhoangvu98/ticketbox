-- V2.1: an event has an end time (hide finished events, mark COMPLETED, limit the check-in window).
-- Expand -> backfill -> constrain, so it also works on a table that already has rows.

ALTER TABLE event ADD COLUMN ends_at TIMESTAMPTZ;

UPDATE event SET ends_at = starts_at + INTERVAL '2 hours' WHERE ends_at IS NULL;

ALTER TABLE event ALTER COLUMN ends_at SET NOT NULL;
ALTER TABLE event ADD CONSTRAINT ck_event_time CHECK (ends_at > starts_at);
