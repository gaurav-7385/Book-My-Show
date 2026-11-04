import { createContext, useContext } from 'react';

/** Selected city, shared by the header and every page. */
export const CityContext = createContext<[string, (c: string) => void]>(['Pune', () => {}]);

export function useCity() {
  return useContext(CityContext);
}

const KEY = 'showspot_city';

export function loadCity(): string {
  try {
    return localStorage.getItem(KEY) ?? 'Pune';
  } catch {
    return 'Pune';
  }
}

export function saveCity(c: string) {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* ignore */
  }
}
