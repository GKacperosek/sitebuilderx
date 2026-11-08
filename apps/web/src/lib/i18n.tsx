import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { api } from './api';
type Language = 'pl' | 'en';
type I18n = { language: Language; setLanguage: (language: Language) => void; t: (en: string, pl: string) => string };
const Context = createContext<I18n | undefined>(undefined);
export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, update] = useState<Language>(() => localStorage.getItem('sitebuilder-language') === 'en' ? 'en' : 'pl');
  useEffect(() => { if (user?.language) update(user.language); }, [user?.language]);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('sitebuilder-language', language); }, [language]);
  const setLanguage = useCallback((next: Language) => { update(next); if (user) void api('/account', { method: 'PATCH', body: JSON.stringify({ language: next }) }).catch(() => {}); }, [user]);
  const t = useCallback((en: string, pl: string) => language === 'pl' ? pl : en, [language]);
  return <Context.Provider value={{ language, setLanguage, t }}>{children}</Context.Provider>;
}
export function useI18n() { const value = useContext(Context); if (!value) throw new Error('useI18n requires I18nProvider'); return value; }
