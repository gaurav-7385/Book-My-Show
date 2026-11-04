import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { seatPrice, type SeatType } from '../services/pricing.js';
import { getHolders, holdSeats, releaseSeats } from '../services/seatHold.js';

export const showsRouter = Router();

const idParam = z.object({ id: z.coerce.number().int().positive() });
const seatsBody = z.object({
  seatIds: z.array(z.number().int().positive()).min(1).max(config.maxSeatsPerBooking),
});

async function getShow(id: number) {
  const { rows } = await pool.query(
    `SELECT s.id, s.starts_at, s.price, s.screen_id,
            m.id AS movie_id, m.title AS movie_title, m.language, m.certificate,
            t.name AS theater_name, t.address, t.city, sc.name AS screen_name
       FROM shows s
       JOIN movies m   ON m.id = s.movie_id
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theaters t ON t.id = sc.theater_id
      WHERE s.id = $1`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'Show not found');
  return rows[0] as { id: number; price: number; screen_id: number; starts_at: Date } & Record<string, unknown>;
}

// Seat map with live status: AVAILABLE, BOOKED, HELD (by someone else) or HELD_BY_YOU
showsRouter.get('/shows/:id/seats', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const show = await getShow(id);

  const { rows: seats } = await pool.query<{
    id: number; row_label: string; seat_number: number; seat_type: SeatType; booked: boolean;
  }>(
    `SELECT se.id, se.row_label, se.seat_number, se.seat_type,
            (bs.seat_id IS NOT NULL) AS booked
       FROM seats se
       LEFT JOIN booked_seats bs ON bs.seat_id = se.id AND bs.show_id = $1
      WHERE se.screen_id = $2
      ORDER BY se.row_label, se.seat_number`,
    [id, show.screen_id],
  );

  const holders = await getHolders(id, seats.filter((s) => !s.booked).map((s) => s.id));
  const me = req.user?.id;

  res.json({
    show,
    holdSeconds: config.seatHoldSeconds,
    seats: seats.map((s) => {
      const holder = holders.get(s.id);
      const status = s.booked
        ? 'BOOKED'
        : holder === undefined
          ? 'AVAILABLE'
          : holder === me
            ? 'HELD_BY_YOU'
            : 'HELD';
      return {
        id: s.id,
        row: s.row_label,
        number: s.seat_number,
        type: s.seat_type,
        price: seatPrice(show.price, s.seat_type),
        status,
      };
    }),
  });
});

// Lock seats for this user for a few minutes
showsRouter.post('/shows/:id/hold', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { seatIds } = seatsBody.parse(req.body);
  const show = await getShow(id);
  if (new Date(show.starts_at).getTime() < Date.now()) throw new HttpError(400, 'This show has already started');

  // Seats must be real seats of this screen and not already sold
  const { rows } = await pool.query<{ id: number; booked: boolean }>(
    `SELECT se.id, (bs.seat_id IS NOT NULL) AS booked
       FROM seats se
       LEFT JOIN booked_seats bs ON bs.seat_id = se.id AND bs.show_id = $1
      WHERE se.screen_id = $2 AND se.id = ANY($3::int[])`,
    [id, show.screen_id, seatIds],
  );
  if (rows.length !== seatIds.length) throw new HttpError(400, 'Some seats do not belong to this show');
  if (rows.some((r) => r.booked)) throw new HttpError(409, 'Some seats are already booked');

  const result = await holdSeats(id, seatIds, req.user!.id, config.seatHoldSeconds);
  if (!result.ok) throw new HttpError(409, 'Someone else just picked one of these seats. Please choose again.');

  res.json({ seatIds, expiresAt: new Date(Date.now() + config.seatHoldSeconds * 1000).toISOString() });
});

// Let go of held seats (user went back or changed their mind)
showsRouter.delete('/shows/:id/hold', requireAuth, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { seatIds } = seatsBody.parse(req.body);
  const released = await releaseSeats(id, seatIds, req.user!.id);
  res.json({ released });
});
