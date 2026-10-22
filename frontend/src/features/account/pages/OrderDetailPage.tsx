import { OrderStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { ordersApi, useOrder, useOrderMutation } from '@/features/booking/api';
import { OrderLines } from '@/features/booking/components/OrderLines';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { canRequestRefund, RULES } from '@/lib/rules';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { TicketCard } from '../components/TicketCard';

export function OrderDetailPage() {
  const code = String(useParams().code);
  const { t, locale } = useI18n();
  const { data: order, error, isPending, refetch } = useOrder(code);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');
  const refund = useOrderMutation(() => ordersApi.requestRefund(code, reason));

  if (error) return <div className="mx-auto max-w-5xl px-4 py-10"><ErrorState error={error} onRetry={() => refetch()} /></div>;
  if (isPending) return <div className="mx-auto max-w-5xl space-y-4 px-4 py-10"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (order.status === 'PENDING') return <Navigate to={`/checkout/${code}`} replace />;

  const refundable = order.status === 'PAID' && canRequestRefund(order.eventStartsAt) && !order.tickets.some((tk) => tk.status === 'CHECKED_IN');
  const refundAmount = Math.round(((order.subtotal - order.discount) * RULES.refundPercent) / 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/me/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><i className="ri-arrow-left-line" />{t('order.myTitle')}</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('order.detailTitle', { code: order.code })}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === 'PAID' && <Alert tone="success" className="mt-4">{t('order.paidNote', { email: order.buyer?.email ?? '' })}</Alert>}
      {order.status === 'REFUND_REQUESTED' && <Alert tone="info" className="mt-4">{t('order.refundPending', { amount: formatCurrency(order.refundAmount ?? 0, locale) })}</Alert>}
      {order.status === 'REFUNDED' && <Alert tone="info" className="mt-4">{t('order.refunded', { amount: formatCurrency(order.refundAmount ?? 0, locale) })}{order.refundReason && ` · ${order.refundReason}`}</Alert>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-3 font-bold text-slate-900 dark:text-white">{t('order.tickets', { count: order.tickets.length })}</h2>
          {order.tickets.length ? (
            <div className="grid gap-4">{order.tickets.map((tk) => <TicketCard key={tk.code} ticket={tk} />)}</div>
          ) : (
            <p className="card p-6 text-center text-sm text-slate-500">{t('order.noTickets')}</p>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 dark:text-white">{order.eventName}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.eventStartsAt, locale)}<br />{order.venueName}</p>
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><OrderLines order={order} /></div>
            <dl className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
              <div className="flex justify-between"><dt>{t('order.createdAt')}</dt><dd>{formatDateTime(order.createdAt, locale)}</dd></div>
              {order.paidAt && <div className="flex justify-between"><dt>{t('order.paidAt')}</dt><dd>{formatDateTime(order.paidAt, locale)}</dd></div>}
              {order.buyer && <div className="flex justify-between"><dt>{t('order.buyer')}</dt><dd className="truncate pl-4">{order.buyer.fullName}</dd></div>}
            </dl>
          </div>
          {order.status === 'PAID' && (
            <div className="card p-5">
              <h3 className="text-sm font-bold">{t('order.refundTitle')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('event.policyRefund', { days: RULES.refundDeadlineDays, percent: RULES.refundPercent })}</p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" icon="ri-refund-2-line" disabled={!refundable} onClick={() => setRefundOpen(true)}>
                {t('order.requestRefund')}
              </Button>
              {!refundable && <p className="mt-2 text-xs text-slate-400">{t('order.refundClosed')}</p>}
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={t('order.requestRefund')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={refund.isPending} onClick={() => refund.mutate(undefined, { onSuccess: () => { toast.success(t('order.refundSent')); setRefundOpen(false); }, onError: (e) => toast.error(e.message) })}>
              {t('order.confirmRefund')}
            </Button>
          </>
        }
      >
        <Alert tone="warning">{t('order.refundEstimate', { amount: formatCurrency(refundAmount, locale), percent: RULES.refundPercent })}</Alert>
        <label htmlFor="reason" className="label mt-4">{t('order.refundReason')}</label>
        <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
      </Modal>
    </div>
  );
}
