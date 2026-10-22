import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader } from '@/components/ui/Data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useMyTickets } from '@/features/booking/api';
import { useI18n } from '@/i18n/I18nProvider';
import { useState } from 'react';
import { Link } from 'react-router';
import { TicketCard } from '../components/TicketCard';

export function MyTicketsPage() {
  const { t } = useI18n();
  const { data, error, isPending, refetch } = useMyTickets();
  const [tab, setTab] = useState<'upcoming' | 'past' | undefined>('upcoming');
  const now = Date.now();
  const list = (data ?? []).filter((tk) => (tab === 'upcoming' ? new Date(tk.eventStartsAt).getTime() >= now : new Date(tk.eventStartsAt).getTime() < now));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title={t('ticket.title')} subtitle={t('ticket.subtitle')} />
      <ChipFilter value={tab} onChange={setTab} options={[{ value: 'upcoming', label: t('ticket.upcoming') }, { value: 'past', label: t('ticket.past') }]} />
      <div className="mt-6">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
          <div className="grid gap-5 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon="ri-ticket-2-line" title={t('ticket.emptyTitle')} text={t('ticket.emptyText')} action={<Link to="/"><Button icon="ri-calendar-event-line">{t('ticket.browse')}</Button></Link>} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">{list.map((tk) => <TicketCard key={tk.code} ticket={tk} />)}</div>
        )}
      </div>
    </div>
  );
}
