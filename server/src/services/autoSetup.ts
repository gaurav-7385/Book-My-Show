/**
 * First-boot setup: if the database is empty (no "movies" table yet),
 * create the tables and load the demo data. If tables already exist,
 * this does nothing, so it never touches real data.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../db.js';

// Works from both src/services (dev) and dist/services (build): db/ is two levels up
const dbDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db');

export async function setupIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ t: string | null }>(`SELECT to_regclass('public.movies')::text AS t`);
  if (rows[0].t) return; // already set up

  console.log('🗄️  Empty database found, creating tables and demo data...');
  for (const file of ['schema.sql', 'seed.sql']) {
    await pool.query(await readFile(path.join(dbDir, file), 'utf8'));
  }
  console.log('✔ Database set up');
}
