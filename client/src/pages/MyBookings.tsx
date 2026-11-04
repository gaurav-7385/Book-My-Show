import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Booking } from '../api';
import { useAuth } from '../auth';
import { formatDay, formatTime, rupees } from '../utils';

export default function MyBookings() {
  const { user, ready } = useAuth();
  const [params] = useSearchParams();
  const newId = Number(params.get('new'));
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) api.myBookings().then(setBookings).catch((e) => setError(e.message));
  }, [user]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="page">
        <p className="notice">
          <Link to="/login?next=/bookings">Sign in</Link> to see your tickets.
        </p>
      </div>
    );

  return (
    <div className="page narrow">
      <h1 className="page-title">My tickets</h1>
      {newId > 0 && <div className="success">Booking #{newId} is confirmed. Show this ticket at the counter.</div>}
      {error && <p className="notice">{error}</p>}
      {bookings?.length === 0 && (
        <p className="notice">
          No tickets yet. <Link to="/">Find a movie</Link>
        </p>
      )}

      <div className="ticket-list">
        {bookings?.map((b) => (
          <article key={b.id} className={b.id === newId ? 'ticket highlight' : 'ticket'}>
            <div className="ticket-main">
              <h3 className="ticket-title">{b.movie_title}</h3>
              <p className="muted">{b.theater_name}, {b.screen_name}</p>
              <dl className="ticket-facts">
                <div><dt>Date</dt><dd>{formatDay(b.starts_at)}</dd></div>
                <div><dt>Time</dt><dd>{formatTime(b.starts_at)}</dd></div>
                <div><dt>Seats</dt><dd>{b.seats.join(', ')}</dd></div>
              </dl>
            </div>
            <div className="ticket-stub">
              <span className="ticket-amount">{rupees(b.total_amount)}</span>
              <span className="ticket-id">#{String(b.id).padStart(5, '0')}</span>
              <span className={b.status === 'CONFIRMED' ? 'status ok' : 'status'}>{b.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
