/**
 * Seat holds (temporary locks) in Redis.
 *
 * When a user picks seats, we "hold" them for a few minutes while they pay.
 * Each seat is one Redis key with a TTL:
 *
 *   hold:{show:42}:seat:17  ->  "<userId>"   (expires after N seconds)
 *
 * The {show:42} part is a Redis "hash tag": all seats of one show land on the
 * same Redis node, so the multi-key Lua scripts below still work on a cluster.
 *
 * We use Lua scripts because Redis runs a script as ONE atomic step.
 * So "check all seats are free, then lock all of them" can never be
 * interrupted by another user in the middle. All seats are held, or none.
 */
import { redis } from '../redis.js';

const key = (showId: number, seatId: number) => `hold:{show:${showId}}:seat:${seatId}`;

// Returns 0 on success, or the 1-based index of the first seat that is taken.
const HOLD_SCRIPT = `
for i, k in ipairs(KEYS) do
  local owner = redis.call('GET', k)
  if owner and owner ~= ARGV[1] then
    return i
  end
end
for i, k in ipairs(KEYS) do
  redis.call('SET', k, ARGV[1], 'EX', ARGV[2])
end
return 0
`;

// Deletes only the keys that belong to this user.
const RELEASE_SCRIPT = `
local n = 0
for i, k in ipairs(KEYS) do
  if redis.call('GET', k) == ARGV[1] then
    redis.call('DEL', k)
    n = n + 1
  end
end
return n
`;

export type HoldResult = { ok: true } | { ok: false; takenSeatId: number };

export async function holdSeats(
  showId: number,
  seatIds: number[],
  userId: number,
  ttlSeconds: number,
): Promise<HoldResult> {
  const keys = seatIds.map((id) => key(showId, id));
  const result = (await redis.eval(HOLD_SCRIPT, keys.length, ...keys, String(userId), String(ttlSeconds))) as number;
  if (result === 0) return { ok: true };
  return { ok: false, takenSeatId: seatIds[result - 1] };
}

export async function releaseSeats(showId: number, seatIds: number[], userId: number): Promise<number> {
  if (seatIds.length === 0) return 0;
  const keys = seatIds.map((id) => key(showId, id));
  return (await redis.eval(RELEASE_SCRIPT, keys.length, ...keys, String(userId))) as number;
}

/** Map of seatId -> userId for every seat in the list that is currently held. */
export async function getHolders(showId: number, seatIds: number[]): Promise<Map<number, number>> {
  const holders = new Map<number, number>();
  if (seatIds.length === 0) return holders;
  const values = await redis.mget(...seatIds.map((id) => key(showId, id)));
  values.forEach((v, i) => {
    if (v !== null) holders.set(seatIds[i], Number(v));
  });
  return holders;
}

export async function userHoldsAll(showId: number, seatIds: number[], userId: number): Promise<boolean> {
  const holders = await getHolders(showId, seatIds);
  return seatIds.every((id) => holders.get(id) === userId);
}
