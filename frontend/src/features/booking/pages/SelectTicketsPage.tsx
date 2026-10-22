import { Button, IconButton } from '@/components/ui/Button';
import { Alert, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEvent, useSeats } from '@/features/events/api';
import { saleStateOf } from '@/features/events/pages/EventDetailPage';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { RULES, serviceFee } from '@/lib/rules';
import type { EventDetail, Seat, TicketType } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { useCreateOrder } from '../api';
import { SeatLegend, SeatMap } from '../components/SeatMap';

/** Step 1 of 2: pick seats (RESERVED) or quantities (GENERAL_ADMISSION), then hold them. */
export function SelectTicketsPage() {
  const eventId = Number(useParams().id);
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const eventQuery = useEvent(eventId);
  const event = eventQuery.data;
  const reserved = event?.seatingType === 'RESERVED';
  const seatsQuery = useSeats(eventId, reserved);
  const createOrder = useCreateOrder();

  const [selected, setSelected] = useState<Map<string, Seat>>(new Map());
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const tiers = useMemo(() => new Map(event?.ticketTypes.map((tt) => [tt.id, tt]) ?? []), [event]);
  const lines = useMemo(() => {
    if (!event) return [];
    if (reserved) {
      return [...selected.values()]
        .sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)
        .map((s) => ({ key: s.code, label: s.code, tier: tiers.get(s.ticketTypeId)!, qty: 1 }));
    }
    return event.ticketTypes.filter((tt) => (quantities[tt.id] ?? 0) > 0).map((tt) => ({ key: String(tt.id), label: tt.name, tier: tt, qty: quantities[tt.id]! }));
  }, [event, reserved, selected, quantities, tiers]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.tier.price * l.qty, 0);
  const fee = serviceFee(count);

  if (eventQuery.error) return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState error={eventQuery.error} onRetry={() => eventQuery.refetch()} /></div>;
  if (!event) return <div className="mx-auto max-w-7xl space-y-4 px-4 py-10"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-96" /></div>;

  const sale = saleStateOf(event);

  const toggleSeat = (seat: Seat) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(seat.code)) next.delete(seat.code);
      else if (next.size >= RULES.maxTicketsPerOrder) {
        toast.info(t('booking.maxReached', { max: RULES.maxTicketsPerOrder }));
        return prev;
      } else next.set(seat.code, seat);
      return next;
    });

  const setQty = (tt: TicketType, delta: number) =>
    setQuantities((q) => {
      const current = q[tt.id] ?? 0;
      const next = current + delta;
      if (next < 0 || next > Math.min(tt.maxPerOrder, tt.available)) return q;
      if (delta > 0 && count >= RULES.maxTicketsPerOrder) {
        toast.info(t('booking.maxReached', { max: RULES.maxTicketsPerOrder }));
        return q;
      }
      return { ...q, [tt.id]: next };
    });

  const proceed = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.warn(t('booking.customerOnly'));
      return;
    }
    createOrder.mutate(
      reserved
        ? { eventId, seatCodes: [...selected.keys()] }
        : { eventId, items: Object.entries(quantities).filter(([, q]) => q > 0).map(([id, q]) => ({ ticketTypeId: Number(id), quantity: q })) },
      {
        onSuccess: (order) => navigate(`/checkout/${order.code}`),
        onError: (e) => {
          toast.error(e.message);
          // Someone else got the seat first: drop the stale selection, the seat map is refetched.
          if (e instanceof ApiError && e.errorCode === 'SEAT_NOT_AVAILABLE') setSelected(new Map());
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:pb-12">
      <Link to={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><i className="ri-arrow-left-line" />{t('common.back')}</Link>
      <Steps current={1} />
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">{event.name}</h1>
      <p className="mt-1 text-sm text-slate-500"><i className="ri-time-line mr-1" />{formatDateTime(event.startsAt, locale)} · {event.venue.name}</p>

      {sale !== 'ON_SALE' && <Alert tone="warning" className="mt-4">{t('event.notOnSale')}</Alert>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{reserved ? t('event.pickSeats') : t('booking.chooseQuantity')}</h2>
            {reserved && <IconButton icon="ri-refresh-line" label={t('common.refresh')} onClick={() => seatsQuery.refetch()} />}
          </div>
          {reserved ? (
            seatsQuery.error ? <ErrorState error={seatsQuery.error} onRetry={() => seatsQuery.refetch()} /> : seatsQuery.data ? (
              <div className={cn('transition-opacity', seatsQuery.isFetching && 'opacity-70')}>
                <SeatMap seats={seatsQuery.data} ticketTypes={event.ticketTypes} selected={new Set(selected.keys())} onToggle={toggleSeat} disabled={sale !== 'ON_SALE' || createOrder.isPending} />
                <div className="mt-8 border-t border-slate-100 pt-5 dark:border-slate-800"><SeatLegend ticketTypes={event.ticketTypes} /></div>
              </div>
            ) : <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <TierPicker event={event} quantities={quantities} onChange={setQty} disabled={sale !== 'ON_SALE'} />
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <Summary lines={lines} subtotal={subtotal} fee={fee} onRemove={(key) => (reserved ? toggleSeat(selected.get(key)!) : setQuantities((q) => ({ ...q, [Number(key)]: 0 })))} />
            <Button size="lg" className="mt-5 w-full" icon="ri-lock-2-line" disabled={count === 0 || sale !== 'ON_SALE'} loading={createOrder.isPending} onClick={proceed}>
              {t('booking.hold')}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-400"><i className="ri-timer-line mr-1" />{t('booking.holdNote', { minutes: RULES.holdMinutes })}</p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-500">{count ? lines.map((l) => (l.qty > 1 ? `${l.qty}× ${l.label}` : l.label)).join(', ') : t('booking.noSelection')}</p>
            <p className="text-lg font-bold">{formatCurrency(subtotal + fee, locale)}</p>
          </div>
          <Button size="lg" icon="ri-lock-2-line" disabled={count === 0 || sale !== 'ON_SALE'} loading={createOrder.isPending} onClick={proceed}>{t('booking.holdShort')}</Button>
        </div>
      </div>
    </div>
  );
}

function TierPicker({ event, quantities, onChange, disabled }: { event: EventDetail; quantities: Record<number, number>; onChange: (tt: TicketType, d: number) => void; disabled: boolean }) {
  const { t, locale } = useI18n();
  return (
    <ul className="space-y-3">
      {event.ticketTypes.map((tt) => {
        const q = quantities[tt.id] ?? 0;
        const soldOut = tt.available === 0;
        return (
          <li key={tt.id} className={cn('flex items-center gap-4 rounded-2xl border p-4 transition', q > 0 ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-500/5' : 'border-slate-200 dark:border-slate-800', soldOut && 'opacity-60')}>
            <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tt.color }} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 dark:text-white">{tt.name}</p>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(tt.price, locale)}</p>
              <p className="text-xs text-slate-500">{soldOut ? t('event.soldOut') : `${t('event.remaining', { count: tt.available })} · ${t('booking.maxPerOrder', { max: tt.maxPerOrder })}`}</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <IconButton icon="ri-subtract-line" label="-" className="size-9" disabled={disabled || q === 0} onClick={() => onChange(tt, -1)} />
              <span className="w-8 text-center font-bold tabular-nums">{q}</span>
              <IconButton icon="ri-add-line" label="+" className="size-9" disabled={disabled || soldOut || q >= Math.min(tt.maxPerOrder, tt.available)} onClick={() => onChange(tt, 1)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Summary({ lines, subtotal, fee, onRemove }: { lines: { key: string; label: string; tier: TicketType; qty: number }[]; subtotal: number; fee: number; onRemove: (key: string) => void }) {
  const { t, locale } = useI18n();
  return (
    <>
      <h3 className="font-bold text-slate-900 dark:text-white">{t('booking.summary')}</h3>
      {lines.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">{t('booking.noSelection')}</p>
      ) : (
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm animate-fade-in dark:bg-slate-800/60">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-bold text-white" style={{ backgroundColor: l.tier.color }}>{l.qty > 1 ? `×${l.qty}` : l.label}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{l.tier.name}</span>
              <span className="font-semibold">{formatCurrency(l.tier.price * l.qty, locale)}</span>
              <button type="button" aria-label={t('common.remove')} onClick={() => onRemove(l.key)} className="cursor-pointer text-slate-400 hover:text-rose-600"><i className="ri-close-circle-line text-lg" /></button>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
        <div className="flex justify-between text-slate-500"><dt>{t('booking.subtotal')}</dt><dd>{formatCurrency(subtotal, locale)}</dd></div>
        <div className="flex justify-between text-slate-500"><dt>{t('booking.serviceFee')}</dt><dd>{formatCurrency(fee, locale)}</dd></div>
        <div className="flex justify-between pt-1 text-base font-bold text-slate-900 dark:text-white"><dt>{t('booking.total')}</dt><dd className="text-brand-700 dark:text-brand-300">{formatCurrency(subtotal + fee, locale)}</dd></div>
      </dl>
    </>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useI18n();
  const steps = [t('booking.step1'), t('booking.step2'), t('booking.step3')];
  return (
    <ol className="my-5 flex items-center gap-2 text-xs font-semibold sm:text-sm">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={cn('flex size-6 items-center justify-center rounded-full text-xs', done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800')}>
              {done ? <i className="ri-check-line" /> : n}
            </span>
            <span className={cn(active ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{label}</span>
            {n < steps.length && <span className="h-px w-6 bg-slate-300 sm:w-10 dark:bg-slate-700" />}
          </li>
        );
      })}
    </ol>
  );
}
