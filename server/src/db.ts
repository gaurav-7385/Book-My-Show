import pg from 'pg';
import { config } from './config.js';

// Local Docker Postgres has no SSL. Hosted Postgres (Neon, Render, Supabase) requires it.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(config.databaseUrl);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  ssl: isLocal ? undefined : { rejectUnauthorized: true },
});
