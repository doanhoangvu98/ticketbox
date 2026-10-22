import { useTheme, type ThemePreference } from '@/app/ThemeProvider';
import { useI18n, type Locale } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useEffect, useRef, useState } from 'react';

/** VI | EN pill switch. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const options: Locale[] = ['vi', 'en'];
  return (
    <div
      role="radiogroup"
      aria-label={t('nav.language')}
      className={cn('inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={locale === opt}
          onClick={() => setLocale(opt)}
          className={cn(
            'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition',
            locale === opt
              ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-950 dark:text-brand-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; icon: string; key: 'nav.themeLight' | 'nav.themeDark' | 'nav.themeSystem' }[] = [
  { value: 'light', icon: 'ri-sun-line', key: 'nav.themeLight' },
  { value: 'dark', icon: 'ri-moon-clear-line', key: 'nav.themeDark' },
  { value: 'system', icon: 'ri-computer-line', key: 'nav.themeSystem' },
];

/** Icon button + dropdown with Light / Dark / System. Closes on outside click and Escape. */
export function ThemeMenu() {
  const { preference, isDark, setPreference } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('nav.theme')}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('nav.theme')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <i className={isDark ? 'ri-moon-clear-line' : 'ri-sun-line'} />
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 z-50 mt-2 w-44 p-1.5 shadow-lg animate-fade-in">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={preference === opt.value}
              onClick={() => {
                setPreference(opt.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                preference === opt.value
                  ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <i className={cn(opt.icon, 'text-base')} />
              {t(opt.key)}
              {preference === opt.value && <i className="ri-check-line ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
