import type { Locale } from '@/i18n/I18nProvider';

const intlLocale = (locale: Locale) => (locale === 'vi' ? 'vi-VN' : 'en-US');

export function formatCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Times are shown in Vietnam time regardless of the visitor's timezone: events happen in Vietnam. */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

export function formatDayMonth(iso: string, locale: Locale): { day: string; month: string } {
  const date = new Date(iso);
  const opts = { timeZone: 'Asia/Ho_Chi_Minh' } as const;
  return {
    day: new Intl.DateTimeFormat(intlLocale(locale), { ...opts, day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(intlLocale(locale), { ...opts, month: 'short' }).format(date),
  };
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}
