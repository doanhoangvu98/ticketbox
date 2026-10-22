-- =====================================================================
-- DEV ONLY demo data (loaded by profile "dev", see application-dev.yml).
-- Version 1.1 = runs after V1 (schema) and before V2 (indexes), so the
-- benchmark can measure queries with and without indexes.
--
-- Volume: 3 venues, 1,000 events, ~300,000 seats.
-- =====================================================================

INSERT INTO venue (name, address, total_rows, seats_per_row)
VALUES ('Saigon Opera House', '07 Cong Truong Lam Son, District 1, HCMC', 10, 10),
       ('Hoa Binh Theater', '240 Ba Thang Hai, District 10, HCMC', 20, 25),
       ('My Dinh Indoor Arena', 'Le Duc Tho, Nam Tu Liem, Hanoi', 15, 20);

-- 1,000 events spread from 60 days ago to ~300 days ahead.
INSERT INTO event (name, venue_id, starts_at, base_price, vip_rows, status)
SELECT 'Demo Event #' || g,
       1 + (g % 3),
       date_trunc('hour', now()) + ((g % 365) - 60) * INTERVAL '1 day' + INTERVAL '20 hours',
       200000 + (g % 5) * 100000,
       2,
       CASE
           WHEN g % 10 = 0 THEN 'DRAFT'
           WHEN g % 10 = 1 THEN 'CANCELLED'
           ELSE 'PUBLISHED'
           END
FROM generate_series(1, 1000) AS g;

-- One row per seat. Deterministic pseudo-random status so results are reproducible.
INSERT INTO seat (id, event_id, row_label, seat_number, type, price, status, held_by, hold_expires_at)
SELECT nextval('seat_seq'),
       e.id,
       chr(64 + r),
       n,
       CASE WHEN r <= e.vip_rows THEN 'VIP' ELSE 'STANDARD' END,
       CASE WHEN r <= e.vip_rows THEN round(e.base_price * 1.5) ELSE e.base_price END,
       st.status,
       CASE WHEN st.status = 'HELD' THEN 'seed-user' END,
       CASE WHEN st.status = 'HELD' THEN now() + (((e.id + n) % 40) - 20) * INTERVAL '1 minute' END
FROM event e
         JOIN venue v ON v.id = e.venue_id
         CROSS JOIN LATERAL generate_series(1, v.total_rows) AS r
         CROSS JOIN LATERAL generate_series(1, v.seats_per_row) AS n
         CROSS JOIN LATERAL (
    SELECT CASE
               WHEN e.status <> 'PUBLISHED' THEN 'AVAILABLE'
               WHEN (e.id * 31 + r * 7 + n * 13) % 100 < 35 THEN 'SOLD'
               WHEN (e.id * 31 + r * 7 + n * 13) % 100 < 37 THEN 'HELD'
               ELSE 'AVAILABLE'
               END AS status
    ) AS st;

-- Refresh planner statistics after a bulk load.
ANALYZE venue;
ANALYZE event;
ANALYZE seat;
