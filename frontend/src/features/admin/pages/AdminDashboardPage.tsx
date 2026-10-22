import { Badge, type Tone } from '@/components/ui/Badge';
import { PageHeader, SalesChart, StatCard } from '@/components/ui/Data';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { Link } from 'react-router';
import { adminApi, useAdminQuery } from '../api';

const ORDER_TONES: Record<OrderStatus, Tone> = { PENDING: 'amber', PAID: 'green', CANCELLED: 'gray', EXPIRED: 'gray', REFUND_REQUESTED: 'violet', REFUNDED: 'blue' };

export function AdminDashboardPage() {
  const { t, locale } = useI18n();
  const { data, error, isPending, refetch } = useAdminQuery('dashboard', adminApi.dashboard);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const todo = data
    ? [
        { to: '/admin/events', icon: 'ri-file-search-line', label: t('admin.todoReview'), count: data.pendingEvents },
        { to: '/admin/orders', icon: 'ri-refund-2-line', label: t('admin.todoRefund'), count: data.refundRequests },
        { to: '/admin/payments', icon: 'ri-bank-line', label: t('admin.todoPayments'), count: data.unmatchedPayments },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.dashboard')} subtitle={t('admin.dashboardSubtitle')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard loading={isPending} label={t('admin.gmv')} value={formatCurrency(data?.gmv30d ?? 0, locale)} icon="ri-funds-line" tone="from-violet-500 to-fuchsia-500" />
        <StatCard loading={isPending} label={t('admin.serviceFee')} value={formatCurrency(data?.serviceFee30d ?? 0, locale)} icon="ri-hand-coin-line" tone="from-amber-500 to-orange-500" />
        <StatCard loading={isPending} label={t('admin.users')} value={formatNumber(data?.users ?? 0, locale)} icon="ri-group-line" tone="from-sky-500 to-indigo-500" />
        <StatCard loading={isPending} label={t('admin.organizers')} value={formatNumber(data?.organizers ?? 0, locale)} icon="ri-megaphone-line" tone="from-emerald-500 to-teal-500" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t('admin.salesChart')}</h2>
          {data ? <SalesChart data={data.salesByDay} height={200} /> : <Skeleton className="h-52" />}
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">{t('admin.todo')}</h2>
            <ul className="space-y-2">
              {todo.map((x) => (
                <li key={x.to}>
                  <Link to={x.to} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"><i className={x.icon} /></span>
                    <span className="flex-1 text-sm font-medium">{x.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${x.count ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{x.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-bold">{t('admin.ordersByStatus')}</h2>
            <div className="flex flex-wrap gap-2">
              {data && (Object.keys(data.ordersByStatus) as OrderStatus[]).map((s) => (
                <Badge key={s} tone={ORDER_TONES[s]}>{t(`status.order.${s}`)}: {data.ordersByStatus[s]}</Badge>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
