import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, getToken, type User } from './api';

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Any API call that finds the login expired logs us out here too
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('showspot:logout', onLogout);
    return () => window.removeEventListener('showspot:logout', onLogout);
  }, []);

  // On page load, check if the saved token is still valid
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const value: AuthState = {
    user,
    ready,
    async login(email, password) {
      const r = await api.login(email, password);
      setToken(r.token);
      setUser(r.user);
    },
    async register(name, email, password) {
      const r = await api.register(name, email, password);
      setToken(r.token);
      setUser(r.user);
    },
    logout() {
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
