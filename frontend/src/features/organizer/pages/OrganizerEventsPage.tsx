import { EventStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader, ProgressBar } from '@/components/ui/Data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { EventCover } from '@/features/events/components/EventCard';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDateTime } from '@/lib/format';
import type { EventStatus } from '@/lib/types';
import { useState } from 'react';
import { Link } from 'react-router';
import { useOrganizerEvents } from '../api';

const STATUSES: EventStatus[] = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

export function OrganizerEventsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<EventStatus>();
  const [page, setPage] = useState(0);
  const { data, error, isPending, refetch } = useOrganizerEvents(status, page);

  return (
    <div>
      <PageHeader title={t('org.events')} actions={<Link to="/organizer/events/new"><Button icon="ri-add-line">{t('org.newEvent')}</Button></Link>} />
      <ChipFilter value={status} onChange={(s) => { setStatus(s); setPage(0); }} options={[{ value: undefined, label: t('common.all') }, ...STATUSES.map((s) => ({ value: s, label: t(`status.event.${s}`) }))]} />
      <div className="mt-5">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : data.items.length === 0 ? <EmptyState icon="ri-calendar-close-line" title={t('org.noEvents')} /> : (
          <>
            <ul className="space-y-3">
              {data.items.map((e) => {
                const sold = e.ticketTypes.reduce((s, x) => s + x.sold, 0);
                const quota = e.ticketTypes.reduce((s, x) => s + x.quota, 0);
                return (
                  <li key={e.id}>
                    <Link to={`/organizer/events/${e.id}`} className="card flex items-center gap-4 p-3 transition hover:shadow-md sm:p-4">
                      <EventCover id={e.id} className="hidden size-16 shrink-0 rounded-xl sm:block" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{e.name}</p><EventStatusBadge status={e.status} /></div>
                        <p className="text-xs text-slate-500">{formatDateTime(e.startsAt, locale)} · {e.venue.name}</p>
                        {e.status === 'REJECTED' && e.rejectReason && <p className="mt-1 text-xs text-rose-600"><i className="ri-feedback-line mr-1" />{e.rejectReason}</p>}
                      </div>
                      <div className="hidden w-40 sm:block">
                        <p className="mb-1 text-right text-xs text-slate-500">{sold}/{quota}</p>
                        <ProgressBar value={sold} max={quota} />
                      </div>
                      <i className="ri-arrow-right-s-line text-xl text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
