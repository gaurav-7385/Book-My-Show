import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Read a setting and clean up common copy-paste mistakes:
 * spaces around it and quotes around it ("..." or '...').
 */
function env(name: string, fallback: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

/**
 * Hosted Postgres URLs often end with ?sslmode=require&channel_binding=require.
 * We set SSL ourselves (see db.ts), so remove those options to avoid pg warnings.
 */
function cleanDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch {
    return raw;
  }
}

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port: Number(env('PORT', '4000')),
  databaseUrl: cleanDatabaseUrl(env('DATABASE_URL', 'postgres://bms:bms@localhost:5433/bookmyshow')),
  // Use rediss:// (two s) for hosted Redis with TLS, like Upstash
  redisUrl: env('REDIS_URL', 'redis://localhost:6380'),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  seatHoldSeconds: Number(env('SEAT_HOLD_SECONDS', '300')),
  // One or more allowed frontend URLs, comma separated. Trailing slashes are ignored.
  clientOrigins: env('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  maxSeatsPerBooking: 10,
};
