// Proof that double booking can't happen.
// 100 fake users all try to hold the SAME seat at the SAME moment.
// Exactly one should win.
// Run: npm run test:race   (needs Redis running)
import { holdSeats, releaseSeats } from '../src/services/seatHold.js';
import { redis } from '../src/redis.js';

const SHOW_ID = 999_999; // fake show, so we don't touch real data
const SEAT_ID = 1;
const USERS = 100;

async function main() {
  await releaseSeats(SHOW_ID, [SEAT_ID], 0);
  await redis.del(`hold:{show:${SHOW_ID}}:seat:${SEAT_ID}`);

  const results = await Promise.all(
    Array.from({ length: USERS }, (_, i) => holdSeats(SHOW_ID, [SEAT_ID], i + 1, 30)),
  );
  const winners = results.filter((r) => r.ok).length;

  console.log(`${USERS} users tried to grab seat ${SEAT_ID} at once.`);
  console.log(`Winners: ${winners}`);
  console.log(winners === 1 ? '✔ PASS: only one user got the seat' : '✘ FAIL: double booking!');

  await redis.del(`hold:{show:${SHOW_ID}}:seat:${SEAT_ID}`);
  redis.disconnect();
  process.exit(winners === 1 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
