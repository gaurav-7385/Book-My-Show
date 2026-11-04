import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://bms:bms@localhost:5433/bookmyshow',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  seatHoldSeconds: Number(process.env.SEAT_HOLD_SECONDS ?? 300),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  maxSeatsPerBooking: 10,
};
