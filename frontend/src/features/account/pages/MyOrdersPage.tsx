import { OrderStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Data';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useMyOrders } from '@/features/booking/api';
import { EventCover } from '@/features/events/components/EventCard';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Link } from 'react-router';

export function MyOrdersPage() {
  const { t, locale } = useI18n();
  const { data, error, isPending, refetch } = useMyOrders();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title={t('order.myTitle')} subtitle={t('order.mySubtitle')} />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon="ri-file-list-3-line" title={t('order.empty')} action={<Link to="/"><Button>{t('ticket.browse')}</Button></Link>} />
      ) : (
        <ul className="space-y-3">
          {data.map((o) => (
            <li key={o.code}>
              <Link to={o.status === 'PENDING' ? `/checkout/${o.code}` : `/me/orders/${o.code}`} className="card flex items-center gap-4 p-3 transition hover:shadow-md sm:p-4">
                <EventCover id={o.eventId} className="hidden size-20 shrink-0 rounded-xl sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">#{o.code}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 truncate font-bold text-slate-900 dark:text-white">{o.eventName}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(o.eventStartsAt, locale)} · {t('order.ticketCount', { count: o.items.length })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(o.total, locale)}</p>
                  <i className="ri-arrow-right-s-line text-xl text-slate-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
