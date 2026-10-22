import { Badge, EventStatusBadge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { coverOf } from '@/lib/cover';
import { formatCurrency, formatDateTime, formatDayMonth } from '@/lib/format';
import type { EventSummary } from '@/lib/types';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Gradient "poster" used wherever an event image would be (the API has no images yet). */
export function EventCover({ id, className, children }: { id: number; className?: string; children?: ReactNode }) {
  const cover = coverOf(id);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', cover.gradient, className)}>
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,white_0,transparent_35%),radial-gradient(circle_at_80%_70%,white_0,transparent_30%)]" />
      <i className={cn(cover.icon, 'absolute right-3 bottom-1 text-7xl text-white/35 transition duration-500 group-hover:scale-110 group-hover:rotate-6')} />
      {children}
    </div>
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  const { t, locale } = useI18n();
  const { day, month } = formatDayMonth(event.startsAt, locale);
  return (
    <Link
      to={`/events/${event.id}`}
      className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5 dark:hover:border-slate-700"
    >
      <EventCover id={event.id} className="aspect-[16/9]">
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-white/95 px-3 py-1.5 text-center shadow-sm dark:bg-slate-950/90">
          <span className="text-lg leading-none font-extrabold text-slate-900 dark:text-white">{day}</span>
          <span className="text-[11px] font-semibold text-brand-600 uppercase dark:text-brand-400">{month}</span>
        </div>
        <span className="absolute top-3 right-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {t(`category.${event.category}`)}
        </span>
        {event.soldOut && (
          <Badge tone="red" className="absolute bottom-3 left-3 bg-white/95">{t('event.soldOut')}</Badge>
        )}
        {event.status !== 'PUBLISHED' && <EventStatusBadge status={event.status} className="absolute bottom-3 left-3 bg-white/95" />}
      </EventCover>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold text-slate-900 transition group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">{event.name}</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-1.5"><i className="ri-time-line" />{formatDateTime(event.startsAt, locale)}</p>
          <p className="flex items-center gap-1.5 truncate"><i className="ri-map-pin-2-line" />{event.venueName} · {event.city}</p>
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-xs text-slate-400">{t('event.from')}</p>
            <p className="font-bold text-brand-700 dark:text-brand-300">{event.minPrice === 0 ? t('event.free') : formatCurrency(event.minPrice, locale)}</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
            <i className="ri-arrow-right-up-line" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/9] animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
