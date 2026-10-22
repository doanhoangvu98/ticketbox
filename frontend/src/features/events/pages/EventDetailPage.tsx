import { EventStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Data';
import { Alert, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { RULES } from '@/lib/rules';
import type { EventDetail } from '@/lib/types';
import { Link, useParams } from 'react-router';
import { useEvent } from '../api';
import { EventCover } from '../components/EventCard';

export type SaleState = 'ON_SALE' | 'NOT_OPEN' | 'CLOSED' | 'SOLD_OUT' | 'UNAVAILABLE';

export function saleStateOf(e: EventDetail, now = Date.now()): SaleState {
  if (e.status !== 'PUBLISHED') return 'UNAVAILABLE';
  if (now < new Date(e.saleStartsAt).getTime()) return 'NOT_OPEN';
  if (now > new Date(e.saleEndsAt).getTime()) return 'CLOSED';
  if (e.soldOut) return 'SOLD_OUT';
  return 'ON_SALE';
}

export function EventDetailPage() {
  const eventId = Number(useParams().id);
  const { t, locale } = useI18n();
  const { data: event, error, refetch } = useEvent(eventId);

  if (error) return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState error={error} onRetry={() => refetch()} /></div>;

  const sale = event ? saleStateOf(event) : undefined;
  return (
    <div className="pb-24 lg:pb-12">
      <EventCover id={eventId} className="text-white">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-14">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"><i className="ri-arrow-left-line" />{t('common.back')}</Link>
          {event ? (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{t(`category.${event.category}`)}</span>
                {event.status !== 'PUBLISHED' && <EventStatusBadge status={event.status} className="bg-white/90" />}
              </div>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold text-balance sm:text-5xl">{event.name}</h1>
              <p className="mt-3 text-white/85">{t('event.by')} <span className="font-semibold">{event.organizer.name}</span></p>
            </>
          ) : (
            <div className="mt-6 space-y-3"><Skeleton className="h-10 w-2/3 bg-white/30" /><Skeleton className="h-4 w-1/3 bg-white/30" /></div>
          )}
        </div>
      </EventCover>

      {event && sale && (
        <div className="mx-auto -mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="card grid gap-4 p-5 sm:grid-cols-3">
              <Info icon="ri-calendar-event-line" label={t('event.time')} value={formatDateTime(event.startsAt, locale)} />
              <Info icon="ri-map-pin-2-line" label={t('event.venue')} value={`${event.venue.name}`} sub={`${event.venue.address}, ${event.venue.city}`} />
              <Info icon={event.seatingType === 'RESERVED' ? 'ri-armchair-line' : 'ri-group-line'} label={t('event.seating')} value={t(`seating.${event.seatingType}`)} />
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('event.about')}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">{event.description}</p>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('event.policyTitle')}</h2>
              <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <Policy icon="ri-timer-line" text={t('event.policyHold', { minutes: RULES.holdMinutes })} />
                <Policy icon="ri-shopping-bag-3-line" text={t('event.policyLimit', { max: RULES.maxTicketsPerOrder })} />
                <Policy icon="ri-refund-2-line" text={t('event.policyRefund', { days: RULES.refundDeadlineDays, percent: RULES.refundPercent })} />
                <Policy icon="ri-qr-code-line" text={t('event.policyQr')} />
              </ul>
            </section>
          </div>

          <aside>
            <div className="card sticky top-24 p-5">
              <h2 className="font-bold text-slate-900 dark:text-white">{t('event.ticketTypes')}</h2>
              <ul className="mt-4 space-y-3">
                {event.ticketTypes.map((tt) => (
                  <li key={tt.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: tt.color }} />
                      <span className="flex-1 font-semibold">{tt.name}</span>
                      <span className="font-bold text-brand-700 dark:text-brand-300">{tt.price === 0 ? t('event.free') : formatCurrency(tt.price, locale)}</span>
                    </div>
                    <ProgressBar value={tt.sold} max={tt.quota} color={tt.color} className="mt-2.5 h-1.5" />
                    <p className="mt-1.5 text-xs text-slate-500">
                      {tt.available === 0 ? <span className="font-semibold text-rose-600">{t('event.soldOut')}</span> : t('event.remaining', { count: tt.available })}
                      {tt.rowFrom && <span> · {t('event.rows', { from: tt.rowFrom, to: tt.rowTo ?? '' })}</span>}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <SaleCta event={event} sale={sale} />
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                {t('event.saleWindow', { from: formatDateTime(event.saleStartsAt, locale), to: formatDateTime(event.saleEndsAt, locale) })}
              </p>
            </div>
          </aside>
        </div>
      )}

      {event && sale === 'ON_SALE' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500">{t('event.from')}</p>
              <p className="text-lg font-bold">{formatCurrency(event.minPrice, locale)}</p>
            </div>
            <Link to={`/events/${event.id}/book`}><Button size="lg" icon="ri-coupon-3-line">{t('event.buy')}</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SaleCta({ event, sale }: { event: EventDetail; sale: SaleState }) {
  const { t, locale } = useI18n();
  if (sale === 'ON_SALE') {
    return (
      <Link to={`/events/${event.id}/book`}>
        <Button size="lg" className="w-full" icon="ri-coupon-3-line">{event.seatingType === 'RESERVED' ? t('event.pickSeats') : t('event.buy')}</Button>
      </Link>
    );
  }
  const msg = {
    NOT_OPEN: t('event.saleNotOpen', { date: formatDateTime(event.saleStartsAt, locale) }),
    CLOSED: t('event.saleClosed'),
    SOLD_OUT: t('event.soldOutAll'),
    UNAVAILABLE: t('event.notOnSale'),
  }[sale];
  return <Alert tone={sale === 'NOT_OPEN' ? 'info' : 'warning'}>{msg}</Alert>;
}

function Info({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><i className={icon} /></span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-semibold text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function Policy({ icon, text }: { icon: string; text: string }) {
  return <li className="flex gap-2.5"><i className={`${icon} mt-0.5 text-brand-600 dark:text-brand-400`} />{text}</li>;
}
