import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return <i className={cn('ri-loader-4-line inline-block animate-spin text-brand-600', className)} aria-hidden />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Spinner className="text-3xl" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800', className)} />;
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <i className={icon} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon="ri-error-warning-line"
      title={t('common.errorTitle')}
      text={error instanceof Error ? error.message : String(error)}
      action={
        onRetry && (
          <Button variant="secondary" icon="ri-refresh-line" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    />
  );
}

/** Coloured info box. */
export function Alert({ tone = 'info', icon, children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
  };
  const icons = { info: 'ri-information-line', warning: 'ri-alert-line', danger: 'ri-error-warning-line', success: 'ri-checkbox-circle-line' };
  return (
    <div className={cn('flex gap-2.5 rounded-xl px-4 py-3 text-sm', tones[tone], className)}>
      <i className={cn(icon ?? icons[tone], 'mt-0.5 text-base')} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
