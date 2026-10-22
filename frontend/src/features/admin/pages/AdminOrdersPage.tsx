import { OrderStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader } from '@/components/ui/Data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { OrderLines } from '@/features/booking/components/OrderLines';
import { useDebounce } from '@/hooks/useDebounce';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, useAdminMutation, useAdminQuery } from '../api';

const FILTERS: OrderStatus[] = ['REFUND_REQUESTED', 'PAID', 'PENDING', 'REFUNDED', 'EXPIRED', 'CANCELLED'];

export function AdminOrdersPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<OrderStatus | undefined>('REFUND_REQUESTED');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Order>();
  const kw = useDebounce(keyword);
  const { data, error, refetch } = useAdminQuery('orders', adminApi.orders, { status, keyword: kw || undefined, page });
  const approve = useAdminMutation(adminApi.approveRefund);
  const reject = useAdminMutation(adminApi.rejectRefund);
  const done = (msg: string) => ({ onSuccess: () => { toast.success(msg); setSelected(undefined); }, onError: (e: Error) => toast.error(e.message) });

  return (
    <div>
      <PageHeader title={t('admin.ordersTitle')} subtitle={t('admin.ordersSubtitle')} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <i className="ri-search-line absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} placeholder={t('admin.searchOrder')} className="input pl-10" />
        </div>
        <ChipFilter value={status} onChange={(s) => { setStatus(s); setPage(0); }} options={[...FILTERS.map((s) => ({ value: s, label: t(`status.order.${s}`) })), { value: undefined, label: t('common.all') }]} />
      </div>
      <div className="mt-5">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <Skeleton className="h-64" /> : data.items.length === 0 ? <EmptyState icon="ri-file-list-3-line" title={t('admin.noOrders')} /> : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/50"><tr>
                  <th className="px-4 py-3">{t('order.code')}</th><th className="px-4 py-3">{t('admin.event')}</th><th className="px-4 py-3">{t('order.buyer')}</th>
                  <th className="px-4 py-3 text-right">{t('booking.total')}</th><th className="px-4 py-3">{t('common.status')}</th><th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.items.map((o) => (
                    <tr key={o.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs">{o.code}<p className="font-sans text-slate-400">{formatDateTime(o.createdAt, locale)}</p></td>
                      <td className="max-w-56 truncate px-4 py-3">{o.eventName}</td>
                      <td className="px-4 py-3"><p>{o.buyer?.fullName ?? '—'}</p><p className="text-xs text-slate-500">{o.buyer?.email}</p></td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total, locale)}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right"><Button size="sm" variant={o.status === 'REFUND_REQUESTED' ? 'primary' : 'secondary'} onClick={() => setSelected(o)}>{o.status === 'REFUND_REQUESTED' ? t('admin.review') : t('common.view')}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(undefined)} title={selected ? t('order.detailTitle', { code: selected.code }) : ''}
        footer={selected?.status === 'REFUND_REQUESTED' && (<>
          <Button variant="secondary" loading={reject.isPending} onClick={() => reject.mutate(selected.code, done(t('admin.refundRejected')))}>{t('admin.rejectRefund')}</Button>
          <Button variant="success" icon="ri-refund-2-line" loading={approve.isPending} onClick={() => approve.mutate(selected.code, done(t('admin.refundApproved')))}>{t('admin.approveRefund', { amount: formatCurrency(selected.refundAmount ?? 0, locale) })}</Button>
        </>)}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2"><OrderStatusBadge status={selected.status} /><span className="text-sm text-slate-500">{selected.eventName}</span></div>
            {selected.refundReason && <p className="rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-500/10"><i className="ri-chat-quote-line mr-1" />{selected.refundReason}</p>}
            <OrderLines order={selected} />
            {selected.buyer && <p className="text-sm text-slate-500">{selected.buyer.fullName} · {selected.buyer.email} · {selected.buyer.phone}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
