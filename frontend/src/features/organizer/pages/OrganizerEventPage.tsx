import { EventStatusBadge, OrderStatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { ChipFilter, Field, inputCls, PageHeader, ProgressBar, SalesChart, StatCard } from '@/components/ui/Data';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { useEvent } from '@/features/events/api';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import type { EventDetail } from '@/lib/types';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { organizerApi, useEventOrders, useEventStats, useOrganizerMutation, usePromoCodes } from '../api';

type Tab = 'overview' | 'orders' | 'promo';

export function OrganizerEventPage() {
  const id = Number(useParams().id);
  const { t, locale } = useI18n();
  const { data: event, error, refetch } = useEvent(id);
  const [tab, setTab] = useState<Tab | undefined>('overview');
  const submit = useOrganizerMutation(() => organizerApi.submit(id));
  const cancel = useOrganizerMutation(() => organizerApi.cancel(id));

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!event) return <Skeleton className="h-96" />;
  const editable = event.status === 'DRAFT' || event.status === 'REJECTED';
  const live = event.status === 'PUBLISHED';

  return (
    <div>
      <Link to="/organizer/events" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><i className="ri-arrow-left-line" />{t('org.events')}</Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{event.name}<EventStatusBadge status={event.status} /></span>}
        subtitle={`${formatDateTime(event.startsAt, locale)} · ${event.venue.name}`}
        actions={
          <>
            <Link to={`/events/${id}`}><Button variant="secondary" icon="ri-eye-line">{t('org.preview')}</Button></Link>
            {editable && <Link to={`/organizer/events/${id}/edit`}><Button variant="secondary" icon="ri-edit-line">{t('common.edit')}</Button></Link>}
            {editable && <Button icon="ri-send-plane-line" loading={submit.isPending} onClick={() => submit.mutate(undefined, { onSuccess: () => toast.success(t('org.submitted')), onError: (e) => toast.error(e.message) })}>{t('org.submit')}</Button>}
            {live && <Button variant="danger" icon="ri-forbid-line" loading={cancel.isPending} onClick={() => window.confirm(t('org.cancelConfirm')) && cancel.mutate(undefined, { onSuccess: () => toast.success(t('org.cancelled')), onError: (e) => toast.error(e.message) })}>{t('org.cancelEvent')}</Button>}
          </>
        }
      />
      {event.status === 'REJECTED' && <Alert tone="danger" className="mb-5">{t('org.rejectedNote', { reason: event.rejectReason ?? '' })}</Alert>}
      {event.status === 'PENDING_REVIEW' && <Alert tone="info" className="mb-5">{t('org.pendingNote')}</Alert>}
      {event.status === 'DRAFT' && <Alert tone="info" className="mb-5">{t('org.draftNote')}</Alert>}

      <ChipFilter value={tab} onChange={setTab} options={[{ value: 'overview', label: t('org.tabOverview') }, { value: 'orders', label: t('org.tabOrders') }, { value: 'promo', label: t('org.tabPromo') }]} />
      <div className="mt-5">
        {tab === 'overview' && <Overview event={event} />}
        {tab === 'orders' && <Orders eventId={id} />}
        {tab === 'promo' && <Promos event={event} />}
      </div>
    </div>
  );
}

function Overview({ event }: { event: EventDetail }) {
  const { t, locale } = useI18n();
  const { data } = useEventStats(event.id);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={!data} label={t('org.statRevenue')} value={formatCurrency(data?.revenue ?? 0, locale)} icon="ri-money-dollar-circle-line" tone="from-amber-500 to-orange-500" />
        <StatCard loading={!data} label={t('org.sold')} value={`${formatNumber(data?.sold ?? 0, locale)} / ${formatNumber(data?.capacity ?? 0, locale)}`} icon="ri-ticket-2-line" tone="from-violet-500 to-fuchsia-500" />
        <StatCard loading={!data} label={t('org.occupancy')} value={`${data && data.capacity ? Math.round((data.sold / data.capacity) * 100) : 0}%`} icon="ri-pie-chart-2-line" tone="from-sky-500 to-indigo-500" />
        <StatCard loading={!data} label={t('org.checkedIn')} value={formatNumber(data?.checkedIn ?? 0, locale)} icon="ri-login-circle-line" tone="from-emerald-500 to-teal-500" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t('org.byTier')}</h2>
          {data ? (
            <ul className="space-y-4">
              {data.byTicketType.map((x) => (
                <li key={x.name}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <span className="size-3 rounded-full" style={{ backgroundColor: x.color }} />
                    <span className="flex-1 font-semibold">{x.name}</span>
                    <span className="text-slate-500">{x.sold}/{x.quota}</span>
                    <span className="w-32 text-right font-semibold">{formatCurrency(x.revenue, locale)}</span>
                  </div>
                  <ProgressBar value={x.sold} max={x.quota} color={x.color} />
                </li>
              ))}
            </ul>
          ) : <Skeleton className="h-40" />}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t('org.salesChart14')}</h2>
          {data ? <SalesChart data={data.salesByDay} /> : <Skeleton className="h-40" />}
        </section>
      </div>
    </div>
  );
}

function Orders({ eventId }: { eventId: number }) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(0);
  const { data, error, refetch } = useEventOrders(eventId, page);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <Skeleton className="h-64" />;
  if (!data.items.length) return <EmptyState icon="ri-file-list-3-line" title={t('org.noOrders')} />;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/50"><tr>
            <th className="px-4 py-3">{t('order.code')}</th><th className="px-4 py-3">{t('order.buyer')}</th><th className="px-4 py-3">{t('order.ticketsCol')}</th>
            <th className="px-4 py-3 text-right">{t('booking.total')}</th><th className="px-4 py-3">{t('common.status')}</th><th className="px-4 py-3">{t('order.createdAt')}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((o) => (
              <tr key={o.code}>
                <td className="px-4 py-3 font-mono text-xs">{o.code}</td>
                <td className="px-4 py-3"><p className="font-medium">{o.buyer?.fullName ?? '—'}</p><p className="text-xs text-slate-500">{o.buyer?.email}</p></td>
                <td className="px-4 py-3 text-xs">{o.items.map((i) => i.seatCode ?? i.ticketTypeName).join(', ')}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total, locale)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.createdAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </>
  );
}

function Promos({ event }: { event: EventDetail }) {
  const { t, locale } = useI18n();
  const { data } = usePromoCodes(event.id);
  const [form, setForm] = useState({ code: '', percentOff: 10, maxUses: 100, validUntil: event.saleEndsAt.slice(0, 10) });
  const create = useOrganizerMutation(() => organizerApi.createPromo(event.id, { ...form, validUntil: new Date(`${form.validUntil}T23:59:59`).toISOString() }));
  const remove = useOrganizerMutation(organizerApi.deletePromo);
  const errors = create.error instanceof ApiError ? create.error.fieldErrors : {};

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(undefined, { onSuccess: () => { toast.success(t('org.promoCreated')); setForm((f) => ({ ...f, code: '' })); } });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card overflow-hidden">
        {!data ? <Skeleton className="h-40" /> : data.length === 0 ? <EmptyState icon="ri-coupon-2-line" title={t('org.noPromo')} /> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((p) => (
              <li key={p.id} className="flex items-center gap-4 p-4">
                <span className="rounded-lg border-2 border-dashed border-brand-300 px-3 py-1.5 font-mono font-bold text-brand-700 dark:text-brand-300">{p.code}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">-{p.percentOff}%</p>
                  <p className="text-xs text-slate-500">{t('org.promoUsage', { used: p.used, max: p.maxUses })} · {t('org.promoUntil', { date: formatDateTime(p.validUntil, locale) })}</p>
                  <ProgressBar value={p.used} max={p.maxUses} className="mt-1.5 h-1.5" />
                </div>
                <IconButton icon="ri-delete-bin-line" label={t('common.remove')} className="text-rose-500" onClick={() => remove.mutate(p.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <form onSubmit={submit} className="card h-fit space-y-4 p-5" noValidate>
        <h2 className="font-bold">{t('org.newPromo')}</h2>
        <Field id="pc" label={t('org.promoCode')} error={errors.code}><input id="pc" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={`${inputCls(errors.code)} font-mono uppercase`} placeholder="EARLYBIRD" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="pp" label={t('org.promoPercent')} error={errors.percentOff}><input id="pp" type="number" min={1} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })} className="input" /></Field>
          <Field id="pm" label={t('org.promoMax')} error={errors.maxUses}><input id="pm" type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} className="input" /></Field>
        </div>
        <Field id="pv" label={t('org.promoValidUntil')}><input id="pv" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="input" /></Field>
        <Button type="submit" className="w-full" icon="ri-add-line" loading={create.isPending}>{t('org.createPromo')}</Button>
      </form>
    </div>
  );
}
