import { Button } from '@/components/ui/Button';
import { PageHeader, ProgressBar } from '@/components/ui/Data';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { config } from '@/lib/config';
import { formatDateTime } from '@/lib/format';
import type { CheckInResult, CheckInResultCode } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { staffApi, useCheckIn, useCheckInStats, useStaffEvents } from '../api';
import { cameraScanSupported, QrScanner } from '../QrScanner';

const RESULT_STYLE: Record<CheckInResultCode, { tone: string; icon: string }> = {
  OK: { tone: 'from-emerald-500 to-green-600', icon: 'ri-checkbox-circle-fill' },
  ALREADY_CHECKED_IN: { tone: 'from-amber-500 to-orange-600', icon: 'ri-error-warning-fill' },
  WRONG_EVENT: { tone: 'from-rose-500 to-red-600', icon: 'ri-close-circle-fill' },
  NOT_VALID: { tone: 'from-rose-500 to-red-600', icon: 'ri-close-circle-fill' },
  INVALID: { tone: 'from-rose-500 to-red-600', icon: 'ri-close-circle-fill' },
};

/** Gate check-in screen. Designed for a phone held in one hand: big input, big result, auto-refocus. */
export function CheckInPage() {
  const { t, locale } = useI18n();
  const events = useStaffEvents();
  const [eventId, setEventId] = useState<number>();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<CheckInResult>();
  const [camera, setCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stats = useCheckInStats(eventId);
  const checkIn = useCheckIn();
  const samples = useQuery({ queryKey: ['dev', 'tickets', eventId], queryFn: () => staffApi.devTickets(eventId!), enabled: config.useMock && !!eventId });

  // Default to the next event (or the latest past one).
  useEffect(() => {
    if (!eventId && events.data?.length) {
      const upcoming = events.data.find((e) => new Date(e.startsAt).getTime() > Date.now() - 6 * 3_600_000);
      setEventId((upcoming ?? events.data[events.data.length - 1])!.id);
    }
  }, [events.data, eventId]);

  const submit = useCallback(
    (token: string) => {
      if (!eventId || !token.trim()) return;
      checkIn.mutate(
        { eventId, qrToken: token.trim() },
        {
          onSuccess: (r) => {
            setResult(r);
            navigator.vibrate?.(r.result === 'OK' ? 80 : [80, 60, 80]);
            setValue('');
            samples.refetch();
          },
          onError: (e) => toast.error(e.message),
          onSettled: () => inputRef.current?.focus(),
        },
      );
    },
    [eventId, checkIn, samples],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  if (events.isPending) return <Skeleton className="h-96" />;
  if (!events.data?.length) return <EmptyState icon="ri-calendar-close-line" title={t('staff.noEvents')} />;

  const current = events.data.find((e) => e.id === eventId);
  const style = result ? RESULT_STYLE[result.result] : undefined;

  return (
    <div>
      <PageHeader title={t('staff.title')} subtitle={t('staff.subtitle')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="card p-5">
            <label htmlFor="event" className="label">{t('staff.event')}</label>
            <select id="event" value={eventId ?? ''} onChange={(e) => { setEventId(Number(e.target.value)); setResult(undefined); }} className="input">
              {events.data.map((e) => <option key={e.id} value={e.id}>{e.name} · {formatDateTime(e.startsAt, locale)}</option>)}
            </select>

            <form onSubmit={onSubmit} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <i className="ri-qr-code-line absolute top-1/2 left-4 -translate-y-1/2 text-xl text-slate-400" />
                <input
                  ref={inputRef}
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t('staff.inputPlaceholder')}
                  className="h-14 w-full rounded-2xl border border-slate-300 bg-white pr-4 pl-12 font-mono text-base focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <Button type="submit" size="lg" className="h-14" loading={checkIn.isPending} icon="ri-login-circle-line">{t('staff.check')}</Button>
            </form>
            {cameraScanSupported() && (
              <Button variant="secondary" size="sm" className="mt-3" icon={camera ? 'ri-camera-off-line' : 'ri-camera-line'} onClick={() => setCamera((c) => !c)}>
                {camera ? t('staff.cameraOff') : t('staff.cameraOn')}
              </Button>
            )}
            {camera && <div className="mx-auto mt-4 max-w-sm"><QrScanner onResult={submit} /></div>}
          </div>

          {result && style && (
            <div className={cn('overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl animate-slide-up', style.tone)} role="status" aria-live="assertive">
              <div className="flex items-center gap-4">
                <i className={cn(style.icon, 'text-6xl')} />
                <div>
                  <p className="text-2xl font-extrabold">{t(`staff.result.${result.result}`)}</p>
                  {result.result === 'ALREADY_CHECKED_IN' && result.checkedInAt && <p className="text-white/90">{t('staff.firstScan', { time: formatDateTime(result.checkedInAt, locale) })}</p>}
                  {result.result === 'WRONG_EVENT' && result.ticket && <p className="text-white/90">{result.ticket.eventName}</p>}
                </div>
              </div>
              {result.ticket && (
                <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-white/15 p-4 text-sm backdrop-blur">
                  <div><p className="text-white/70">{t('ticket.holder')}</p><p className="font-bold">{result.ticket.holderName}</p></div>
                  <div><p className="text-white/70">{t('ticket.type')}</p><p className="font-bold">{result.ticket.ticketTypeName}</p></div>
                  <div><p className="text-white/70">{t('ticket.seat')}</p><p className="text-2xl font-extrabold">{result.ticket.seatCode ?? '—'}</p></div>
                </div>
              )}
            </div>
          )}

          {config.useMock && !!samples.data?.length && (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
              <p className="mb-2 text-xs font-bold text-amber-700 uppercase dark:text-amber-400"><i className="ri-flask-line mr-1" />{t('staff.samples')}</p>
              <div className="flex flex-wrap gap-2">
                {samples.data.map((tk) => (
                  <button key={tk.code} type="button" onClick={() => submit(tk.qrToken)} className="cursor-pointer rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700">
                    {tk.code} · {tk.status}
                  </button>
                ))}
                <button type="button" onClick={() => submit('FAKE-QR-123')} className="cursor-pointer rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-rose-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">FAKE-QR-123</button>
              </div>
            </div>
          )}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="font-bold text-slate-900 dark:text-white">{current?.name}</h2>
          <p className="text-xs text-slate-500">{current && formatDateTime(current.startsAt, locale)}</p>
          {stats.data && (
            <>
              <div className="mt-5 flex items-end justify-between">
                <p className="text-4xl font-extrabold text-slate-900 tabular-nums dark:text-white">{stats.data.checkedIn}<span className="text-lg font-semibold text-slate-400">/{stats.data.total}</span></p>
                <p className="text-sm font-semibold text-brand-600">{stats.data.total ? Math.round((stats.data.checkedIn / stats.data.total) * 100) : 0}%</p>
              </div>
              <ProgressBar value={stats.data.checkedIn} max={stats.data.total} className="mt-2 h-3" />
              <h3 className="mt-6 mb-2 text-sm font-semibold">{t('staff.recent')}</h3>
              {stats.data.recent.length === 0 ? <p className="text-sm text-slate-400">{t('staff.noRecent')}</p> : (
                <ul className="space-y-2">
                  {stats.data.recent.map((r) => (
                    <li key={r.ticketCode} className="flex items-center gap-3 text-sm">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><i className="ri-check-line" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.holderName}</p><p className="text-xs text-slate-500">{r.ticketTypeName}{r.seatCode && ` · ${r.seatCode}`}</p></div>
                      <span className="text-xs text-slate-400">{new Date(r.checkedInAt).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
