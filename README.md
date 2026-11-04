# 🎬 ShowSpot — a BookMyShow-style ticket booking system

A full-stack movie ticket booking app built to handle the hardest part of
ticketing: **many people trying to book the same seat at the same time.**

**Stack:** React + TypeScript (Vite) · Node.js + Express (TypeScript) · PostgreSQL · Redis · Docker

---

## ✨ Features

- Browse movies by city, pick a date, theater and showtime
- Live seat map (Regular / Premium / Recliner pricing)
- **Seat hold for 5 minutes** while you pay, with a countdown
- Other users see held seats in real time (amber) and can't take them
- Sign up / sign in with JWT
- My bookings page
- Demo payment step (Razorpay coming next)

## 🧠 How double booking is prevented (the interview question)

Three layers of safety:

| Layer | What it does | Where |
|---|---|---|
| 1. Redis seat hold | Picking seats runs a **Lua script** in Redis. Redis runs it as one atomic step: check all seats are free → lock all of them with a 5 min TTL. All seats or none. | `server/src/services/seatHold.ts` |
| 2. DB transaction | Booking + its seats are saved in one transaction. If anything fails, nothing is saved. | `server/src/services/bookingService.ts` |
| 3. DB constraint | `booked_seats` has `PRIMARY KEY (show_id, seat_id)`. Even if layers 1–2 had a bug, Postgres itself refuses to sell the same seat twice. | `server/db/schema.sql` |

Holds expire on their own (Redis TTL), so seats from abandoned checkouts come back automatically. No cron job needed.

Proof: `npm run test:race` makes 100 users grab the same seat at the same moment. Exactly 1 wins.

```
┌──────────┐   pick seats   ┌──────────┐  Lua: check+lock (TTL 5m)  ┌───────┐
│  React   │ ─────────────▶ │ Express  │ ─────────────────────────▶ │ Redis │
│  client  │                │   API    │                            └───────┘
│          │  pay / confirm │          │  BEGIN … INSERT … COMMIT   ┌──────────┐
│          │ ─────────────▶ │          │ ─────────────────────────▶ │ Postgres │
└──────────┘                └──────────┘   PK(show_id, seat_id)     └──────────┘
```

## 🚀 Run it locally

You need **Node 20+** and **Docker Desktop**.

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Backend
cd server
cp .env.example .env
npm install
npm run db:setup      # creates tables + demo data
npm run dev           # http://localhost:4000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev           # http://localhost:5173
```

No Docker? Install with Homebrew instead:
`brew install postgresql@16 redis && brew services start postgresql@16 && brew services start redis`,
create the database (`createdb bookmyshow`), then set in `server/.env`:
`DATABASE_URL=postgres://localhost:5432/bookmyshow` and `REDIS_URL=redis://localhost:6379`.

Tip: open the same show in two browsers with two accounts to watch seat locking live.

## 📡 API

| Method | Path | Auth | What |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Get JWT |
| GET | `/api/cities` | – | List cities |
| GET | `/api/movies?city=Pune` | – | Movies with upcoming shows |
| GET | `/api/movies/:id/shows?city=Pune` | – | Showtimes |
| GET | `/api/shows/:id/seats` | optional | Seat map with live status |
| POST | `/api/shows/:id/hold` | ✔ | Hold seats `{ seatIds }` |
| DELETE | `/api/shows/:id/hold` | ✔ | Release held seats |
| POST | `/api/bookings` | ✔ | Confirm booking `{ showId, seatIds }` |
| GET | `/api/bookings/me` | ✔ | My bookings |

## 🗺️ Roadmap

- [x] Phase 1 — Core booking flow with Redis seat locks
- [ ] Phase 2 — Razorpay test-mode payments + webhook
- [ ] Phase 3 — WebSockets for live seat updates (replace 5s polling)
- [ ] Phase 4 — Redis caching for movie lists, rate limiting
- [ ] Phase 5 — Admin panel (add movies, shows, see sales)
- [ ] Phase 6 — Booking queue for big releases (BullMQ), load test with k6
- [ ] Phase 7 — Deploy (Docker + Render/Railway), CI with GitHub Actions
