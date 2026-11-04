/**
 * Keeps the next few days of shows filled in, so the live demo
 * never runs out of showtimes. Safe to run many times: it only
 * adds shows for time slots that don't exist yet.
 */
import { pool } from '../db.js';

const DAYS_AHEAD = 4;
const EVERY_6_HOURS = 6 * 60 * 60 * 1000;

const FILL_SQL = `
WITH params AS (
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS today,
         (SELECT count(*) FROM movies)::int AS n
),
slots AS (
  SELECT sc.id AS screen_id, slot,
         ((p.today + d) + time '10:00' + slot * interval '3 hours 30 minutes') AT TIME ZONE 'Asia/Kolkata' AS starts_at,
         (sc.id + slot + d) % p.n AS movie_idx
    FROM screens sc, params p, generate_series(0, $1::int - 1) d, generate_series(0, 3) slot
   WHERE p.n > 0
),
ranked AS (
  SELECT id, (row_number() OVER (ORDER BY id) - 1)::int AS idx FROM movies
)
INSERT INTO shows (movie_id, screen_id, starts_at, price)
SELECT r.id, s.screen_id, s.starts_at,
       CASE s.slot WHEN 3 THEN 250 WHEN 2 THEN 220 ELSE 180 END
  FROM slots s
  JOIN ranked r ON r.idx = s.movie_idx
 WHERE NOT EXISTS (
   SELECT 1 FROM shows x WHERE x.screen_id = s.screen_id AND x.starts_at = s.starts_at
 )`;

export async function fillUpcomingShows(days = DAYS_AHEAD): Promise<number> {
  const { rowCount } = await pool.query(FILL_SQL, [days]);
  return rowCount ?? 0;
}

export function startShowScheduler() {
  const run = () =>
    fillUpcomingShows()
      .then((n) => n > 0 && console.log(`📅 added ${n} upcoming shows`))
      .catch((err) => console.error('Show scheduler failed:', err.message));
  run();
  setInterval(run, EVERY_6_HOURS).unref();
}
