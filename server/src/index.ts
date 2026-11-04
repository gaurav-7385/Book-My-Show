import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import { attachUser } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { moviesRouter } from './routes/movies.js';
import { showsRouter } from './routes/shows.js';
import { bookingsRouter } from './routes/bookings.js';
import { startShowScheduler } from './services/showScheduler.js';

const app = express();

app.use(cors({ origin: config.clientOrigins }));
app.use(express.json());
app.use(attachUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api', moviesRouter);
app.use('/api', showsRouter);
app.use('/api', bookingsRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🎬 ShowSpot API running on http://localhost:${config.port}`);
  startShowScheduler();
});
