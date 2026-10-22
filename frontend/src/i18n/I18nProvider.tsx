import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './locales/en';
import vi, { type Messages } from './locales/vi';

export type Locale = 'vi' | 'en';

const DICTIONARIES: Record<Locale, Messages> = { vi, en };
const STORAGE_KEY = 'tb.locale';

/**
 * All valid dot-paths of the dictionary, e.g. 'home.heroTitle' | 'event.status.DRAFT'.
 * Typos in t('...') become TypeScript errors.
 */
type Path<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Path<T[K]>}`;
}[keyof T & string];
export type MessageKey = Path<Messages>;

type Params = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Params) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'vi' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

function lookup(dict: Messages, key: string): string | undefined {
  // Walk "a.b.c" through the nested object.
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Tiny i18n layer (no library). Enough for 2 languages and keeps the mechanism easy to explain.
 * See docs/FRONTEND.md for when to switch to react-i18next.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale; // screen readers + correct font shaping
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, params?: Params) => {
      const template = lookup(DICTIONARIES[locale], key) ?? lookup(vi, key) ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      );
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale: setLocaleState, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
