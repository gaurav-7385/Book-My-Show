import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createBooking } from '../services/bookingService.js';

export const bookingsRouter = Router();

const bookingBody = z.object({
  showId: z.number().int().positive(),
  seatIds: z.array(z.number().int().positive()).min(1).max(config.maxSeatsPerBooking),
});

bookingsRouter.post('/bookings', requireAuth, async (req, res) => {
  const { showId, seatIds } = bookingBody.parse(req.body);
  const booking = await createBooking(req.user!.id, showId, [...new Set(seatIds)]);
  res.status(201).json(booking);
});

bookingsRouter.get('/bookings/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.total_amount, b.status, b.payment_ref, b.created_at,
            s.starts_at, m.title AS movie_title, t.name AS theater_name, sc.name AS screen_name,
            array_agg(se.row_label || se.seat_number ORDER BY se.row_label, se.seat_number) AS seats
       FROM bookings b
       JOIN shows s        ON s.id = b.show_id
       JOIN movies m       ON m.id = s.movie_id
       JOIN screens sc     ON sc.id = s.screen_id
       JOIN theaters t     ON t.id = sc.theater_id
       JOIN booked_seats bs ON bs.booking_id = b.id
       JOIN seats se       ON se.id = bs.seat_id
      WHERE b.user_id = $1
      GROUP BY b.id, s.starts_at, m.title, t.name, sc.name
      ORDER BY b.created_at DESC`,
    [req.user!.id],
  );
  res.json(rows);
});
