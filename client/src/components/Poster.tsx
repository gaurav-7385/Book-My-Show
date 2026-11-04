import type { Movie } from '../api';

/**
 * Generated poster art. Each genre gets its own motif, each movie its own colors.
 * If a movie has a real poster_url, that is used instead.
 */

type Palette = { sky: string; deep: string; ink: string; glow: string };

const PALETTES: Palette[] = [
  { sky: '#1f4e79', deep: '#0b1730', ink: '#f6c453', glow: '#7fd1ff' },
  { sky: '#7a2e1c', deep: '#200a10', ink: '#ffd9a0', glow: '#ff8a4c' },
  { sky: '#1d5c4a', deep: '#081a17', ink: '#f2f0c9', glow: '#7fe0b4' },
  { sky: '#5a2a7a', deep: '#160a22', ink: '#ffd166', glow: '#c99bff' },
  { sky: '#8c1d3a', deep: '#22070f', ink: '#fff1d6', glow: '#ff6f91' },
  { sky: '#2f4f2a', deep: '#0c140b', ink: '#e9f5c9', glow: '#a8d672' },
];

function Motif({ genre, p }: { genre: string; p: Palette }) {
  switch (genre) {
    case 'Thriller': // rain over a city
      return (
        <g>
          {Array.from({ length: 28 }, (_, i) => (
            <line key={i} x1={(i * 23) % 210} y1={(i * 37) % 160} x2={(i * 23) % 210 - 14} y2={((i * 37) % 160) + 40}
              stroke={p.glow} strokeOpacity="0.35" strokeWidth="1.2" />
          ))}
          <path d="M0 230 V180 h20 v-30 h18 v40 h14 v-60 h22 v50 h16 v-25 h20 v45 h18 v-70 h24 v60 h16 v-20 h32 V230 Z" fill={p.deep} />
          {[[30, 170], [62, 150], [96, 186], [140, 140], [150, 160], [176, 190]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="4" height="5" fill={p.ink} opacity="0.8" />
          ))}
        </g>
      );
    case 'Sci-Fi': // planet with rings
      return (
        <g>
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 47) % 200} cy={(i * 29) % 200} r={i % 5 === 0 ? 1.4 : 0.7} fill={p.ink} opacity="0.7" />
          ))}
          <circle cx="110" cy="110" r="52" fill={p.glow} opacity="0.9" />
          <circle cx="96" cy="96" r="52" fill={p.sky} opacity="0.55" />
          <ellipse cx="110" cy="112" rx="92" ry="16" fill="none" stroke={p.ink} strokeWidth="3" transform="rotate(-16 110 112)" />
        </g>
      );
    case 'Drama': // big setting sun over hills
      return (
        <g>
          <circle cx="100" cy="140" r="70" fill={p.ink} opacity="0.95" />
          <circle cx="100" cy="140" r="90" fill="none" stroke={p.ink} strokeOpacity="0.25" strokeWidth="2" />
          <path d="M0 190 Q50 150 100 180 T200 170 V230 H0 Z" fill={p.deep} />
          <path d="M0 210 Q70 180 130 205 T200 200 V230 H0 Z" fill={p.sky} opacity="0.6" />
        </g>
      );
    case 'Comedy': // confetti
      return (
        <g>
          {Array.from({ length: 34 }, (_, i) => (
            <rect key={i} x={(i * 41) % 196} y={(i * 53) % 200} width="9" height="4" rx="2"
              fill={i % 3 === 0 ? p.ink : i % 3 === 1 ? p.glow : '#ffffff'} opacity="0.85"
              transform={`rotate(${(i * 37) % 180} ${(i * 41) % 196} ${(i * 53) % 200})`} />
          ))}
          <circle cx="100" cy="110" r="44" fill={p.deep} opacity="0.6" />
        </g>
      );
    case 'Sports': // stadium lights + pitch
      return (
        <g>
          <path d="M20 0 L80 200 L120 200 Z" fill={p.ink} opacity="0.12" />
          <path d="M180 0 L120 200 L80 200 Z" fill={p.ink} opacity="0.12" />
          <ellipse cx="100" cy="200" rx="120" ry="40" fill={p.sky} />
          <rect x="88" y="168" width="24" height="60" fill={p.ink} opacity="0.35" />
          <circle cx="100" cy="90" r="16" fill="#e8e1d4" />
          <path d="M88 82 Q100 90 112 82 M88 98 Q100 90 112 98" stroke="#b33" strokeWidth="1.5" fill="none" />
        </g>
      );
    case 'Mystery': // layered mountains + mist
    default:
      return (
        <g>
          <circle cx="150" cy="60" r="18" fill={p.ink} opacity="0.85" />
          <path d="M0 150 L40 100 L70 130 L110 70 L150 120 L200 90 V230 H0 Z" fill={p.sky} opacity="0.9" />
          <path d="M0 180 L50 130 L90 165 L140 115 L200 160 V230 H0 Z" fill={p.deep} opacity="0.95" />
          <rect x="0" y="150" width="200" height="12" fill={p.glow} opacity="0.12" />
          <rect x="0" y="172" width="200" height="8" fill={p.glow} opacity="0.1" />
        </g>
      );
  }
}

export default function Poster({ movie, size = 'md' }: { movie: Movie; size?: 'md' | 'lg' }) {
  const cls = `poster poster-${size}`;
  if (movie.poster_url) return <img className={cls} src={movie.poster_url} alt={movie.title} />;

  const p = PALETTES[(movie.id - 1) % PALETTES.length];
  const gid = `g${movie.id}-${size}`;

  return (
    <div className={cls} role="img" aria-label={`${movie.title} poster`}>
      <svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky} />
            <stop offset="1" stopColor={p.deep} />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill={`url(#${gid})`} />
        <Motif genre={movie.genre} p={p} />
        <rect y="200" width="200" height="100" fill={p.deep} />
      </svg>
      <div className="poster-text" style={{ color: p.ink }}>
        <span className="poster-title">{movie.title}</span>
        <span className="poster-credit">{movie.language} · {movie.genre}</span>
      </div>
    </div>
  );
}
