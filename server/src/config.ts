import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // Hosted Postgres URLs often end with ?sslmode=require. We set SSL ourselves (see db.ts),
  // so drop that part to avoid pg's warning about how it reads sslmode.
  databaseUrl: (process.env.DATABASE_URL ?? 'postgres://bms:bms@localhost:5433/bookmyshow').replace(
    /[?&]sslmode=[^&]*/,
    '',
  ),
  // Use rediss:// (two s) for hosted Redis with TLS, like Upstash
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  seatHoldSeconds: Number(process.env.SEAT_HOLD_SECONDS ?? 300),
  // One or more allowed frontend URLs, comma separated
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  maxSeatsPerBooking: 10,
};
