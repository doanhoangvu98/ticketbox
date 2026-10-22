import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'tb.theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Light / dark / follow OS. The inline script in index.html applies it before first paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? 'system',
  );
  const [systemDark, setSystemDark] = useState(() => media().matches);

  // React to OS theme changes while the app is open.
  useEffect(() => {
    const mq = media();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEY, preference);
  }, [isDark, preference]);

  const value = useMemo(() => ({ preference, isDark, setPreference }), [preference, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
