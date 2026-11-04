export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const dayKey = (iso: string) => new Date(iso).toDateString();

export const formatDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

/** A unique color pair for each movie, used as a stand-in poster. */
export function posterGradient(id: number) {
  const hue = (id * 67) % 360;
  return `linear-gradient(160deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 60% 18%))`;
}
