// Small fetch wrapper + all API types in one place.

export type User = { id: number; name: string; email: string };

export type Movie = {
  id: number;
  title: string;
  description?: string;
  language: string;
  genre: string;
  duration_min: number;
  certificate: string;
  rating: number;
  poster_url: string | null;
};

export type ShowListing = {
  id: number;
  starts_at: string;
  price: number;
  theater_id: number;
  theater_name: string;
  address: string;
  city: string;
  screen_name: string;
};

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'HELD' | 'HELD_BY_YOU';
export type Seat = {
  id: number;
  row: string;
  number: number;
  type: 'REGULAR' | 'PREMIUM' | 'RECLINER';
  price: number;
  status: SeatStatus;
};

export type SeatMap = {
  show: {
    id: number;
    starts_at: string;
    movie_id: number;
    movie_title: string;
    language: string;
    certificate: string;
    theater_name: string;
    screen_name: string;
    city: string;
  };
  holdSeconds: number;
  seats: Seat[];
};

export type Booking = {
  id: number;
  total_amount: number;
  status: string;
  payment_ref: string;
  created_at: string;
  starts_at: string;
  movie_title: string;
  theater_name: string;
  screen_name: string;
  seats: string[];
};

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'showspot_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: stay logged in for this tab only */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    // Saved login is no longer valid: forget it everywhere
    setToken(null);
    window.dispatchEvent(new Event('showspot:logout'));
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Request failed');
  return data as T;
}

const q = (city?: string) => (city ? `?city=${encodeURIComponent(city)}` : '');

export const api = {
  cities: () => request<string[]>('GET', '/cities'),
  movies: (city?: string) => request<Movie[]>('GET', `/movies${q(city)}`),
  movie: (id: number) => request<Movie>('GET', `/movies/${id}`),
  movieShows: (id: number, city?: string) => request<ShowListing[]>('GET', `/movies/${id}/shows${q(city)}`),
  seatMap: (showId: number) => request<SeatMap>('GET', `/shows/${showId}/seats`),
  hold: (showId: number, seatIds: number[]) =>
    request<{ seatIds: number[]; expiresAt: string }>('POST', `/shows/${showId}/hold`, { seatIds }),
  release: (showId: number, seatIds: number[]) =>
    request<{ released: number }>('DELETE', `/shows/${showId}/hold`, { seatIds }),
  book: (showId: number, seatIds: number[]) =>
    request<{ id: number; total: number }>('POST', '/bookings', { showId, seatIds }),
  myBookings: () => request<Booking[]>('GET', '/bookings/me'),
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>('POST', '/auth/register', { name, email, password }),
  me: () => request<{ user: User }>('GET', '/auth/me'),
};
