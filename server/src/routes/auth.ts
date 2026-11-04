import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash],
    );
    const user = { id: rows[0].id, name, email };
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'This email is already registered');
    throw err;
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await pool.query<{ id: number; name: string; password_hash: string }>(
    'SELECT id, name, password_hash FROM users WHERE email = $1',
    [email],
  );
  const found = rows[0];
  if (!found || !(await bcrypt.compare(password, found.password_hash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  const user = { id: found.id, name: found.name, email };
  res.json({ user, token: signToken(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
