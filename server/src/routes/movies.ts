import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';

export const moviesRouter = Router();

const cityQuery = z.object({ city: z.string().trim().min(1).optional() });
const idParam = z.object({ id: z.coerce.number().int().positive() });

moviesRouter.get('/cities', async (_req, res) => {
  const { rows } = await pool.query<{ city: string }>('SELECT DISTINCT city FROM theaters ORDER BY city');
  res.json(rows.map((r) => r.city));
});

// Movies that have at least one upcoming show (in the city, if given)
moviesRouter.get('/movies', async (req, res) => {
  const { city } = cityQuery.parse(req.query);
  const { rows } = await pool.query(
    `SELECT m.id, m.title, m.description, m.language, m.genre, m.duration_min, m.certificate,
            m.rating::float AS rating, m.poster_url
       FROM movies m
      WHERE EXISTS (
        SELECT 1 FROM shows s
          JOIN screens sc ON sc.id = s.screen_id
          JOIN theaters t ON t.id = sc.theater_id
         WHERE s.movie_id = m.id AND s.starts_at > now()
           AND ($1::text IS NULL OR t.city = $1))
      ORDER BY m.rating DESC`,
    [city ?? null],
  );
  res.json(rows);
});

moviesRouter.get('/movies/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query(
    `SELECT id, title, description, language, genre, duration_min, certificate,
            rating::float AS rating, poster_url
       FROM movies WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, 'Movie not found');
  res.json(rows[0]);
});

// Upcoming shows for a movie, grouped later on the client by date + theater
moviesRouter.get('/movies/:id/shows', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { city } = cityQuery.parse(req.query);
  const { rows } = await pool.query(
    `SELECT s.id, s.starts_at, s.price,
            t.id AS theater_id, t.name AS theater_name, t.address, t.city,
            sc.name AS screen_name
       FROM shows s
       JOIN screens sc ON sc.id = s.screen_id
       JOIN theaters t ON t.id = sc.theater_id
      WHERE s.movie_id = $1 AND s.starts_at > now()
        AND ($2::text IS NULL OR t.city = $2)
      ORDER BY s.starts_at, t.name`,
    [id, city ?? null],
  );
  res.json(rows);
});
