import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Seat, type SeatMap } from '../api';
import { useAuth } from '../auth';
import { formatDay, formatTime, rupees } from '../utils';

const MAX_SEATS = 10;
const TYPE_LABEL = { RECLINER: 'Recliner', PREMIUM: 'Premium', REGULAR: 'Regular' } as const;

export default function SeatPage() {
  const showId = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<SeatMap | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [expiresAt, setExpiresAt] = useState<number | null>(null); // set while seats are held
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api
      .seatMap(showId)
      .then((d) => {
        setData(d);
        // Drop selected seats that someone else has taken in the meantime
        setSelected((sel) =>
          sel.filter((id) => {
            const s = d.seats.find((x) => x.id === id);
            return s && (s.status === 'AVAILABLE' || s.status === 'HELD_BY_YOU');
          }),
        );
      })
      .catch((e) => setMessage(e.message));
  }, [showId]);

  // Load now, then refresh every 5 seconds so you see other people's picks.
  // (Roadmap: replace polling with WebSockets.)
  useEffect(() => {
    load();
    if (expiresAt) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, expiresAt]);

  // Countdown while seats are held
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setExpiresAt(null);
        setMessage('Time is up. Your seats were released. Please pick again.');
        load();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, load]);

  const rows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    data?.seats.forEach((s) => {
      if (!map.has(s.row)) map.set(s.row, []);
      map.get(s.row)!.push(s);
    });
    return [...map.entries()];
  }, [data]);

  const selectedSeats = data?.seats.filter((s) => selected.includes(s.id)) ?? [];
  const total = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  function toggle(seat: Seat) {
    if (expiresAt) return; // locked while paying
    if (seat.status === 'BOOKED' || seat.status === 'HELD') return;
    setMessage('');
    setSelected((sel) => {
      if (sel.includes(seat.id)) return sel.filter((id) => id !== seat.id);
      if (sel.length >= MAX_SEATS) {
        setMessage(`You can book up to ${MAX_SEATS} seats at a time.`);
        return sel;
      }
      return [...sel, seat.id];
    });
  }

  async function holdSeats() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const r = await api.hold(showId, selected);
      setExpiresAt(new Date(r.expiresAt).getTime());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setMessage((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function changeSeats() {
    await api.release(showId, selected).catch(() => {});
    setExpiresAt(null);
    load();
  }

  async function pay() {
    setBusy(true);
    setMessage('');
    try {
      const b = await api.book(showId, selected);
      navigate(`/bookings?new=${b.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setMessage((e as Error).message);
      setExpiresAt(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="muted page">{message || 'Loading seats…'}</p>;
  const { show } = data;

  // Group rows by seat type for the section labels (Recliner at the back)
  let lastType = '';

  return (
    <div className="page seat-page">
      <div className="show-info">
        <h1>{show.movie_title}</h1>
        <div className="tags" style={{ justifyContent: 'center', marginTop: 14 }}>
          <span className="tag">{show.theater_name}, {show.screen_name}</span>
          <span className="tag tag-gold">
            {formatDay(show.starts_at)}, {formatTime(show.starts_at)}
          </span>
        </div>
      </div>

      <div className="seat-map">
        {rows
          .slice()
          .reverse()
          .map(([row, seats]) => {
            const type = seats[0].type;
            const label = type !== lastType ? `${TYPE_LABEL[type]}  ${rupees(seats[0].price)}` : null;
            lastType = type;
            return (
              <div key={row}>
                {label && <div className="section-label">{label}</div>}
                <div className="seat-row">
                  <span className="row-label">{row}</span>
                  {seats.map((s) => {
                    const isSel = selected.includes(s.id);
                    const cls = ['seat', s.status.toLowerCase(), isSel ? 'selected' : '', s.number === 6 ? 'aisle' : '']
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <button
                        key={s.id}
                        className={cls}
                        onClick={() => toggle(s)}
                        disabled={s.status === 'BOOKED' || s.status === 'HELD'}
                        title={`${s.row}${s.number} · ${TYPE_LABEL[s.type]} · ${rupees(s.price)}`}
                      >
                        {s.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        <div className="screen">Screen this way</div>
      </div>

      <div className="legend">
        <span><i className="seat available" /> Available</span>
        <span><i className="seat selected" /> Selected</span>
        <span><i className="seat held" /> Someone is booking</span>
        <span><i className="seat booked" /> Sold</span>
      </div>

      {message && <p className="error center">{message}</p>}

      {selected.length > 0 && (
        <div className="checkout-bar">
          <div>
            <strong>{selectedSeats.map((s) => s.row + s.number).join(', ')}</strong>
            <p className="muted">
              {selected.length} ticket{selected.length > 1 ? 's' : ''} · {rupees(total)}
            </p>
          </div>
          {expiresAt ? (
            <div className="checkout-actions">
              <span className="timer">
                Seats held for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
              <button className="link" onClick={changeSeats} disabled={busy}>
                Change seats
              </button>
              <button className="btn" onClick={pay} disabled={busy}>
                {busy ? 'Paying…' : `Pay ${rupees(total)} (demo)`}
              </button>
            </div>
          ) : (
            <button className="btn" onClick={holdSeats} disabled={busy}>
              {busy ? 'Holding seats…' : `Proceed · ${rupees(total)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
