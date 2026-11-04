-- ShowSpot database schema (PostgreSQL)
-- Dev only: drops and recreates everything.

DROP TABLE IF EXISTS booked_seats, bookings, shows, seats, screens, theaters, movies, users CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE movies (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  language      TEXT NOT NULL,
  genre         TEXT NOT NULL,
  duration_min  INT  NOT NULL,
  certificate   TEXT NOT NULL DEFAULT 'UA',
  rating        NUMERIC(2,1) NOT NULL DEFAULT 0,
  poster_url    TEXT
);

CREATE TABLE theaters (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  city    TEXT NOT NULL,
  address TEXT NOT NULL
);
CREATE INDEX idx_theaters_city ON theaters(city);

CREATE TABLE screens (
  id          SERIAL PRIMARY KEY,
  theater_id  INT NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  name        TEXT NOT NULL
);

CREATE TABLE seats (
  id          SERIAL PRIMARY KEY,
  screen_id   INT  NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  row_label   TEXT NOT NULL,
  seat_number INT  NOT NULL,
  seat_type   TEXT NOT NULL CHECK (seat_type IN ('REGULAR', 'PREMIUM', 'RECLINER')),
  UNIQUE (screen_id, row_label, seat_number)
);

CREATE TABLE shows (
  id          SERIAL PRIMARY KEY,
  movie_id    INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_id   INT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  price       INT NOT NULL  -- base price in rupees (REGULAR seat)
);
CREATE INDEX idx_shows_movie_time ON shows(movie_id, starts_at);

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  user_id       INT  NOT NULL REFERENCES users(id),
  show_id       INT  NOT NULL REFERENCES shows(id),
  total_amount  INT  NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  payment_ref   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);

-- The primary key (show_id, seat_id) is our LAST line of defence:
-- even if two requests slip past the Redis lock, the database
-- will reject the second one. No double booking, ever.
CREATE TABLE booked_seats (
  booking_id  INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  show_id     INT NOT NULL REFERENCES shows(id),
  seat_id     INT NOT NULL REFERENCES seats(id),
  PRIMARY KEY (show_id, seat_id)
);
