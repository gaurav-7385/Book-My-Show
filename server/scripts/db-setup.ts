// Creates all tables and loads demo data. WARNING: deletes existing data.
// Local:      npm run db:setup
// Production: DATABASE_URL="<your Neon URL>" npm run db:setup
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../src/db.js';
import { fillUpcomingShows } from '../src/services/showScheduler.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = await readFile(path.join(dir, '..', 'db', file), 'utf8');
    await pool.query(sql);
    console.log(`✔ ran ${file}`);
  }
  const added = await fillUpcomingShows();
  console.log(`✔ database ready (${added} shows)`);
  await pool.end();
}

main().catch((err) => {
  console.error('DB setup failed:', err.message);
  process.exit(1);
});
