import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@sitebuilder/shared/types';
import { api } from './api';
type AuthContextValue = { user: User | null; loading: boolean; error: string | null; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try { const data = await api<{ user: User | null }>('/auth/me'); setUser(data.user); }
    catch (err) { setError(err instanceof Error ? err.message : 'Connection failed'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); }, []);
  return <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth requires AuthProvider'); return value; }
