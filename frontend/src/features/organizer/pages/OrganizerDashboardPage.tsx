import { EventStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader, SalesChart, StatCard } from '@/components/ui/Data';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { Link } from 'react-router';
import { useOrganizerDashboard } from '../api';

export function OrganizerDashboardPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { data, error, isPending, refetch } = useOrganizerDashboard();
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('org.hello', { name: user?.organizerName ?? user?.fullName ?? '' })}
        subtitle={t('org.dashboardSubtitle')}
        actions={<Link to="/organizer/events/new"><Button icon="ri-add-line">{t('org.newEvent')}</Button></Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={isPending} label={t('org.statEvents')} value={formatNumber(data?.totalEvents ?? 0, locale)} icon="ri-calendar-2-line" tone="from-violet-500 to-fuchsia-500" />
        <StatCard loading={isPending} label={t('org.statPublished')} value={formatNumber(data?.publishedEvents ?? 0, locale)} icon="ri-broadcast-line" tone="from-emerald-500 to-teal-500" />
        <StatCard loading={isPending} label={t('org.statRevenue')} value={formatCurrency(data?.revenue30d ?? 0, locale)} icon="ri-money-dollar-circle-line" tone="from-amber-500 to-orange-500" />
        <StatCard loading={isPending} label={t('org.statTickets')} value={formatNumber(data?.ticketsSold30d ?? 0, locale)} icon="ri-ticket-2-line" tone="from-sky-500 to-indigo-500" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">{t('org.salesChart')}</h2>
          {data ? <SalesChart data={data.salesByDay} height={200} /> : <Skeleton className="h-52" />}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">{t('org.upcoming')}</h2>
          {data ? (
            <ul className="space-y-3">
              {data.upcoming.map((e) => (
                <li key={e.id}>
                  <Link to={`/organizer/events/${e.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><i className="ri-calendar-event-line" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.name}</p><p className="text-xs text-slate-500">{formatDateTime(e.startsAt, locale)}</p></div>
                    <EventStatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Skeleton className="h-52" />}
        </section>
      </div>
    </div>
  );
}
