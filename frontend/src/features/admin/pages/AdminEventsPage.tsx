import { EventStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader } from '@/components/ui/Data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { EventCover } from '@/features/events/components/EventCard';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { EventDetail, EventStatus } from '@/lib/types';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';
import { adminApi, useAdminMutation, useAdminQuery } from '../api';

export function AdminEventsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<EventStatus | undefined>('PENDING_REVIEW');
  const [page, setPage] = useState(0);
  const [rejecting, setRejecting] = useState<EventDetail>();
  const [reason, setReason] = useState('');
  const { data, error, refetch } = useAdminQuery('events', adminApi.events, { status, page });
  const approve = useAdminMutation(adminApi.approve);
  const reject = useAdminMutation(adminApi.reject);

  return (
    <div>
      <PageHeader title={t('admin.events')} subtitle={t('admin.eventsSubtitle')} />
      <ChipFilter value={status} onChange={(s) => { setStatus(s); setPage(0); }} options={[
        { value: 'PENDING_REVIEW', label: t('status.event.PENDING_REVIEW') }, { value: 'PUBLISHED', label: t('status.event.PUBLISHED') },
        { value: 'REJECTED', label: t('status.event.REJECTED') }, { value: 'CANCELLED', label: t('status.event.CANCELLED') }, { value: undefined, label: t('common.all') },
      ]} />
      <div className="mt-5">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <Skeleton className="h-64" /> : data.items.length === 0 ? (
          <EmptyState icon="ri-checkbox-circle-line" title={t('admin.noEvents')} />
        ) : (
          <>
            <ul className="space-y-3">
              {data.items.map((e) => (
                <li key={e.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <EventCover id={e.id} className="hidden size-16 shrink-0 rounded-xl sm:block" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{e.name}</p><EventStatusBadge status={e.status} /></div>
                    <p className="text-xs text-slate-500">{e.organizer.name} · {formatDateTime(e.startsAt, locale)} · {e.venue.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{e.ticketTypes.map((x) => `${x.name} ${formatCurrency(x.price, locale)} ×${x.quota}`).join(' · ')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/events/${e.id}`}><Button size="sm" variant="secondary" icon="ri-eye-line">{t('admin.preview')}</Button></Link>
                    {e.status === 'PENDING_REVIEW' && (
                      <>
                        <Button size="sm" variant="success" icon="ri-check-line" loading={approve.isPending && approve.variables === e.id}
                          onClick={() => approve.mutate(e.id, { onSuccess: () => toast.success(t('admin.approved')), onError: (x) => toast.error(x.message) })}>{t('admin.approve')}</Button>
                        <Button size="sm" variant="danger" icon="ri-close-line" onClick={() => { setRejecting(e); setReason(''); }}>{t('admin.reject')}</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={!!rejecting} onClose={() => setRejecting(undefined)} title={t('admin.rejectTitle')}
        footer={<>
          <Button variant="secondary" onClick={() => setRejecting(undefined)}>{t('common.cancel')}</Button>
          <Button variant="danger" disabled={!reason.trim()} loading={reject.isPending}
            onClick={() => reject.mutate({ id: rejecting!.id, reason }, { onSuccess: () => { toast.success(t('admin.rejected')); setRejecting(undefined); } })}>{t('admin.reject')}</Button>
        </>}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{rejecting?.name}</p>
        <label htmlFor="reason" className="label">{t('admin.rejectReason')}</label>
        <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder={t('admin.rejectPlaceholder')} />
      </Modal>
    </div>
  );
}
