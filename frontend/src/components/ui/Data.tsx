import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { DailySales } from '@/lib/types';
import type { ReactNode } from 'react';
import { Skeleton } from './Feedback';

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, tone, hint, loading }: { label: string; value: ReactNode; icon: string; tone: string; hint?: ReactNode; loading?: boolean }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-lg', tone)}>
        <i className={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="truncate text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>}
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

/** Lightweight bar chart in pure CSS (no chart library needed for this size). */
export function SalesChart({ data, height = 160 }: { data: DailySales[]; height?: number }) {
  const { locale } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-fuchsia-400 opacity-80 transition group-hover:opacity-100"
              style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block">
              <p className="font-semibold">{d.date.slice(5)}</p>
              <p>{formatCurrency(d.revenue, locale)}</p>
              <p className="text-slate-300">{d.tickets} 🎫</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, color, className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** Horizontal chip filter, scrollable on mobile. */
export function ChipFilter<T extends string>({ value, options, onChange }: { value: T | undefined; options: { value: T | undefined; label: string }[]; onChange: (v: T | undefined) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o.value ?? 'ALL'}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition',
            value === o.value
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ id, label, error, hint, children, className }: { id: string; label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputCls = (error?: string) => cn('input', error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15');
