import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { seatPrice, type SeatType } from './pricing.js';
import { releaseSeats, userHoldsAll } from './seatHold.js';

/**
 * Turns a seat hold into a confirmed booking.
 *
 * Safety layers against double booking:
 *  1. Redis hold   - the user must still own the hold on every seat.
 *  2. Transaction  - booking + seats are saved together, or not at all.
 *  3. Primary key  - booked_seats(show_id, seat_id) is unique, so the
 *                    database itself rejects a seat that is already sold.
 */
export async function createBooking(userId: number, showId: number, seatIds: number[]) {
  if (!(await userHoldsAll(showId, seatIds, userId))) {
    throw new HttpError(409, 'Your seat hold has expired. Please pick your seats again.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const show = await client.query<{ screen_id: number; price: number; starts_at: Date }>(
      'SELECT screen_id, price, starts_at FROM shows WHERE id = $1',
      [showId],
    );
    if (show.rowCount === 0) throw new HttpError(404, 'Show not found');
    const { screen_id, price, starts_at } = show.rows[0];
    if (starts_at.getTime() < Date.now()) throw new HttpError(400, 'This show has already started');

    const seats = await client.query<{ id: number; seat_type: SeatType }>(
      'SELECT id, seat_type FROM seats WHERE screen_id = $1 AND id = ANY($2::int[])',
      [screen_id, seatIds],
    );
    if (seats.rowCount !== seatIds.length) throw new HttpError(400, 'Some seats do not belong to this show');

    const total = seats.rows.reduce((sum, s) => sum + seatPrice(price, s.seat_type), 0);

    // Payment would happen here. For now we use a mock payment reference.
    // Next step: Razorpay order + webhook (see README roadmap).
    const paymentRef = `MOCK-${Date.now()}`;

    const booking = await client.query<{ id: number; created_at: Date }>(
      `INSERT INTO bookings (user_id, show_id, total_amount, status, payment_ref)
       VALUES ($1, $2, $3, 'CONFIRMED', $4) RETURNING id, created_at`,
      [userId, showId, total, paymentRef],
    );
    const bookingId = booking.rows[0].id;

    await client.query(
      'INSERT INTO booked_seats (booking_id, show_id, seat_id) SELECT $1, $2, unnest($3::int[])',
      [bookingId, showId, seatIds],
    );

    await client.query('COMMIT');
    await releaseSeats(showId, seatIds, userId);

    return { id: bookingId, total, paymentRef, createdAt: booking.rows[0].created_at };
  } catch (err) {
    await client.query('ROLLBACK');
    const code = (err as { code?: string }).code;
    if (code === '23505') {
      throw new HttpError(409, 'One or more seats were just booked by someone else.');
    }
    if (code === '23503') {
      throw new HttpError(401, 'Your session has expired. Please sign in again.');
    }
    throw err;
  } finally {
    client.release();
  }
}
