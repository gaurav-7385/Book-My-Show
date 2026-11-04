import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { CityContext, loadCity, saveCity } from './useCity';
import Home from './pages/Home';
import MoviePage from './pages/MoviePage';
import SeatPage from './pages/SeatPage';
import LoginPage from './pages/LoginPage';
import MyBookings from './pages/MyBookings';

export default function App() {
  const { user, logout } = useAuth();
  const [city, setCityState] = useState(loadCity);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    api.cities().then(setCities).catch(() => {});
  }, []);

  const setCity = (c: string) => {
    setCityState(c);
    saveCity(c);
  };

  return (
    <CityContext.Provider value={[city, setCity]}>
      <header className="topbar">
        <Link to="/" className="logo" aria-label="ShowSpot home">
          <span className="logo-bulbs" aria-hidden="true" />
          showspot
        </Link>

        <label className="city-select">
          <span className="sr-only">City</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.2 4.5 8.5 4.5 8.5s4.5-5.3 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z" fill="currentColor"/></svg>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {(cities.length ? cities : [city]).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <nav>
          {user ? (
            <>
              <NavLink to="/bookings">My tickets</NavLink>
              <span className="avatar" title={user.email}>{user.name.charAt(0).toUpperCase()}</span>
              <button className="link" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-small">Sign in</Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies/:id" element={<MoviePage />} />
          <Route path="/shows/:id" element={<SeatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="*" element={<div className="page"><p className="notice">This page doesn't exist. <Link to="/">Go to movies</Link></p></div>} />
        </Routes>
      </main>

      <footer className="footer">
        ShowSpot is a portfolio project by Gaurav Shinde. Movies and theaters are made up.
      </footer>
    </CityContext.Provider>
  );
}
