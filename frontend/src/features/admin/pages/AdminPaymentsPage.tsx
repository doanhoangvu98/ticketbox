import { TxStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader } from '@/components/ui/Data';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { BankTransaction, BankTransactionStatus } from '@/lib/types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, useAdminMutation, useAdminQuery } from '../api';

/** Bank reconciliation: transfers the webhook could not match automatically. */
export function AdminPaymentsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<BankTransactionStatus | undefined>('UNMATCHED');
  const [page, setPage] = useState(0);
  const [matching, setMatching] = useState<BankTransaction>();
  const [orderCode, setOrderCode] = useState('');
  const { data, error, refetch } = useAdminQuery('transactions', adminApi.transactions, { status, page });
  const match = useAdminMutation(adminApi.matchTransaction);
  const refund = useAdminMutation(adminApi.refundTransaction);

  return (
    <div>
      <PageHeader title={t('admin.paymentsTitle')} subtitle={t('admin.paymentsSubtitle')} />
      <ChipFilter value={status} onChange={(s) => { setStatus(s); setPage(0); }} options={[
        { value: 'UNMATCHED', label: t('status.tx.UNMATCHED') }, { value: 'MATCHED', label: t('status.tx.MATCHED') }, { value: 'REFUNDED', label: t('status.tx.REFUNDED') }, { value: undefined, label: t('common.all') },
      ]} />
      <div className="mt-5">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <Skeleton className="h-64" /> : data.items.length === 0 ? <EmptyState icon="ri-bank-line" title={t('admin.noTx')} /> : (
          <>
            <ul className="space-y-3">
              {data.items.map((tx) => (
                <li key={tx.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600 dark:bg-emerald-500/10"><i className="ri-arrow-left-down-line" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-bold">+{formatCurrency(tx.amount, locale)}</span><TxStatusBadge status={tx.status} />{tx.orderCode && <span className="font-mono text-xs text-slate-500">→ {tx.orderCode}</span>}</div>
                    <p className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">"{tx.content}"</p>
                    <p className="text-xs text-slate-400">{tx.transactionId} · {formatDateTime(tx.transferredAt, locale)}</p>
                    {tx.note && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400"><i className="ri-information-line mr-1" />{tx.note}</p>}
                  </div>
                  {tx.status === 'UNMATCHED' && (
                    <div className="flex gap-2">
                      <Button size="sm" icon="ri-links-line" onClick={() => { setMatching(tx); setOrderCode(tx.orderCode ?? ''); }}>{t('admin.match')}</Button>
                      <Button size="sm" variant="secondary" icon="ri-arrow-go-back-line" loading={refund.isPending && refund.variables === tx.id}
                        onClick={() => window.confirm(t('admin.refundTxConfirm')) && refund.mutate(tx.id, { onSuccess: () => toast.success(t('admin.txRefunded')) })}>{t('admin.refundTx')}</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={!!matching} onClose={() => setMatching(undefined)} title={t('admin.matchTitle')}
        footer={<>
          <Button variant="secondary" onClick={() => setMatching(undefined)}>{t('common.cancel')}</Button>
          <Button disabled={!orderCode.trim()} loading={match.isPending}
            onClick={() => match.mutate({ id: matching!.id, orderCode }, { onSuccess: () => { toast.success(t('admin.matched')); setMatching(undefined); }, onError: (e) => toast.error(e.message) })}>{t('admin.match')}</Button>
        </>}>
        <Alert tone="info" className="mb-4">{t('admin.matchHint')}</Alert>
        <p className="mb-3 text-sm">{matching && `${formatCurrency(matching.amount, locale)} · "${matching.content}"`}</p>
        <label htmlFor="oc" className="label">{t('order.code')}</label>
        <input id="oc" value={orderCode} onChange={(e) => setOrderCode(e.target.value.toUpperCase())} className="input font-mono" placeholder="TBXXXXXXX" />
      </Modal>
    </div>
  );
}
