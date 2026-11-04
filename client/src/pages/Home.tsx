import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Movie, type ShowListing } from '../api';
import Poster from '../components/Poster';
import { useCity } from '../useCity';
import { dayKey, formatDuration, formatTime, rupees } from '../utils';

export default function Home() {
  const [city] = useCity();
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [featuredShows, setFeaturedShows] = useState<ShowListing[]>([]);
  const [language, setLanguage] = useState('All');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);

  // Free hosting puts the server to sleep. If the first load is slow, say why.
  useEffect(() => {
    if (movies) return;
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [movies]);

  useEffect(() => {
    setMovies(null);
    setLanguage('All');
    api
      .movies(city)
      .then((list) => {
        setMovies(list);
        if (list[0]) api.movieShows(list[0].id, city).then(setFeaturedShows).catch(() => setFeaturedShows([]));
      })
      .catch((e) => setError(e.message));
  }, [city]);

  const featured = movies?.[0];
  const languages = useMemo(() => ['All', ...new Set(movies?.map((m) => m.language) ?? [])], [movies]);

  const visible = (movies ?? []).filter(
    (m) =>
      (language === 'All' || m.language === language) &&
      m.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Next few shows of the featured movie, on its first available day
  const seen = new Set<string>();
  const nextShows = featuredShows
    .filter((s) => dayKey(s.starts_at) === dayKey(featuredShows[0].starts_at))
    .filter((s) => {
      const k = `${s.theater_id}-${s.starts_at}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 4);

  if (error) {
    return (
      <div className="page">
        <p className="notice">Couldn't load movies: {error}. Refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <>
      {featured && (
        <section className="feature">
          <div className="feature-bg" aria-hidden="true">
            <Poster movie={featured} size="lg" />
          </div>
          <div className="feature-inner">
            <Link to={`/movies/${featured.id}`} className="feature-poster">
              <Poster movie={featured} size="lg" />
            </Link>
            <div className="feature-copy">
              <p className="feature-kicker">Top rated in {city} this week</p>
              <h1 className="feature-title">{featured.title}</h1>
              <div className="tags">
                <span className="tag tag-gold">★ {featured.rating.toFixed(1)}</span>
                <span className="tag">{featured.certificate}</span>
                <span className="tag">{featured.language}</span>
                <span className="tag">{featured.genre}</span>
                <span className="tag">{formatDuration(featured.duration_min)}</span>
              </div>
              {featured.description && <p className="feature-desc">{featured.description}</p>}

              {nextShows.length > 0 && (
                <div className="stub-row">
                  {nextShows.map((s) => (
                    <Link key={s.id} to={`/shows/${s.id}`} className="stub">
                      <span className="stub-time">{formatTime(s.starts_at)}</span>
                      <span className="stub-place">{s.theater_name}</span>
                      <span className="stub-price">from {rupees(s.price)}</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link to={`/movies/${featured.id}`} className="btn btn-gold">
                See all showtimes
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="page">
        <div className="list-head">
          <h2>Now showing in {city}</h2>
          <input
            className="search"
            type="search"
            placeholder="Search movies"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search movies"
          />
        </div>

        <div className="chips" role="group" aria-label="Filter by language">
          {languages.map((l) => (
            <button key={l} className={l === language ? 'chip active' : 'chip'} onClick={() => setLanguage(l)}>
              {l}
            </button>
          ))}
        </div>

        {!movies && slow && (
          <p className="notice">Waking up the server. On free hosting this can take up to a minute the first time.</p>
        )}
        {!movies && <div className="movie-grid">{Array.from({ length: 5 }, (_, i) => <div key={i} className="poster skeleton" />)}</div>}
        {movies && visible.length === 0 && (
          <p className="notice">No movies match. Try another language or clear the search.</p>
        )}

        <div className="movie-grid">
          {visible.map((m) => (
            <Link key={m.id} to={`/movies/${m.id}`} className="movie-card">
              <Poster movie={m} />
              <div className="movie-card-meta">
                <h3>{m.title}</h3>
                <span className="rating-pill">★ {m.rating.toFixed(1)}</span>
              </div>
              <p className="muted">
                {m.certificate} &nbsp;/&nbsp; {formatDuration(m.duration_min)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
