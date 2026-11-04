import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';

type TokenPayload = { id: number; email: string; name: string };

export function signToken(user: TokenPayload): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });
}

/** Reads the token if there is one. Never blocks the request. */
export const attachUser: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const p = jwt.verify(header.slice(7), config.jwtSecret) as TokenPayload;
      req.user = { id: p.id, email: p.email, name: p.name };
    } catch {
      // bad or expired token: treat as logged out
    }
  }
  next();
};

/**
 * Blocks the request if the user is not logged in,
 * or if their account no longer exists (e.g. the database was reset).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  if (!req.user) throw new HttpError(401, 'Please sign in first');
  const { rowCount } = await pool.query('SELECT 1 FROM users WHERE id = $1', [req.user.id]);
  if (!rowCount) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  next();
};
