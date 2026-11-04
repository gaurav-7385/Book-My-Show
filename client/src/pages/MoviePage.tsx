import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Movie, type ShowListing } from '../api';
import Poster from '../components/Poster';
import { useCity } from '../useCity';
import { dayKey, formatDuration, formatTime, rupees } from '../utils';

export default function MoviePage() {
  const id = Number(useParams().id);
  const [city] = useCity();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [shows, setShows] = useState<ShowListing[]>([]);
  const [day, setDay] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.movie(id).then(setMovie).catch((e) => setError(e.message));
    api
      .movieShows(id, city)
      .then((s) => {
        setShows(s);
        setDay(s[0] ? dayKey(s[0].starts_at) : '');
      })
      .catch((e) => setError(e.message));
  }, [id, city]);

  const days = useMemo(() => {
    const seen = new Map<string, Date>();
    shows.forEach((s) => seen.set(dayKey(s.starts_at), new Date(s.starts_at)));
    return [...seen.entries()];
  }, [shows]);

  const theaters = useMemo(() => {
    const groups = new Map<number, { name: string; address: string; shows: ShowListing[] }>();
    shows
      .filter((s) => dayKey(s.starts_at) === day)
      .forEach((s) => {
        if (!groups.has(s.theater_id)) groups.set(s.theater_id, { name: s.theater_name, address: s.address, shows: [] });
        groups.get(s.theater_id)!.shows.push(s);
      });
    return [...groups.values()];
  }, [shows, day]);

  if (error) return <div className="page"><p className="notice">{error}</p></div>;
  if (!movie) return <div className="page"><div className="poster skeleton" style={{ width: 220 }} /></div>;

  const today = new Date().toDateString();

  return (
    <>
      <section className="feature feature-compact">
        <div className="feature-bg" aria-hidden="true">
          <Poster movie={movie} size="lg" />
        </div>
        <div className="feature-inner">
          <div className="feature-poster">
            <Poster movie={movie} size="lg" />
          </div>
          <div className="feature-copy">
            <Link to="/" className="back">← All movies</Link>
            <h1 className="feature-title">{movie.title}</h1>
            <div className="tags">
              <span className="tag tag-gold">★ {movie.rating.toFixed(1)}</span>
              <span className="tag">{movie.certificate}</span>
              <span className="tag">{movie.language}</span>
              <span className="tag">{movie.genre}</span>
              <span className="tag">{formatDuration(movie.duration_min)}</span>
            </div>
            <p className="feature-desc">{movie.description}</p>
          </div>
        </div>
      </section>

      <div className="page">
        <h2>Pick a date in {city}</h2>
        {days.length === 0 && <p className="notice">No upcoming shows in {city}. Try another city from the top bar.</p>}

        <div className="date-strip" role="group" aria-label="Show dates">
          {days.map(([key, d]) => (
            <button key={key} className={key === day ? 'date-tile active' : 'date-tile'} onClick={() => setDay(key)}>
              <span className="date-dow">{key === today ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              <span className="date-num">{d.getDate()}</span>
              <span className="date-mon">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </button>
          ))}
        </div>

        <div className="theater-list">
          {theaters.map((t) => (
            <div key={t.name} className="theater">
              <div className="theater-name">
                <h3>{t.name}</h3>
                <p className="muted">{t.address}</p>
              </div>
              <div className="stub-row">
                {t.shows.map((s) => (
                  <Link key={s.id} to={`/shows/${s.id}`} className="stub stub-sm">
                    <span className="stub-time">{formatTime(s.starts_at)}</span>
                    <span className="stub-price">{s.screen_name} / {rupees(s.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
