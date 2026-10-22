import { useI18n } from '@/i18n/I18nProvider';
import { formatCurrency } from '@/lib/format';
import type { Order } from '@/lib/types';

/** Item list + money breakdown, reused by checkout, order detail and admin views. */
export function OrderLines({ order }: { order: Pick<Order, 'items' | 'subtotal' | 'discount' | 'serviceFee' | 'total' | 'promoCode'> }) {
  const { t, locale } = useI18n();
  const grouped = Object.values(
    order.items.reduce<Record<string, { name: string; seats: string[]; count: number; price: number }>>((acc, i) => {
      const g = (acc[i.ticketTypeName] ??= { name: i.ticketTypeName, seats: [], count: 0, price: i.price });
      g.count++;
      if (i.seatCode) g.seats.push(i.seatCode);
      return acc;
    }, {}),
  );
  return (
    <div>
      <ul className="space-y-2 text-sm">
        {grouped.map((g) => (
          <li key={g.name} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="font-semibold">{g.count} × {g.name}</span>
              {g.seats.length > 0 && <span className="block truncate text-xs text-slate-500">{t('booking.seats')}: {g.seats.join(', ')}</span>}
            </span>
            <span className="shrink-0">{formatCurrency(g.price * g.count, locale)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
        <Row label={t('booking.subtotal')} value={formatCurrency(order.subtotal, locale)} />
        {order.discount > 0 && <Row label={`${t('booking.discount')} (${order.promoCode})`} value={`- ${formatCurrency(order.discount, locale)}`} className="text-emerald-600" />}
        <Row label={t('booking.serviceFee')} value={formatCurrency(order.serviceFee, locale)} />
        <div className="flex justify-between pt-2 text-base font-bold text-slate-900 dark:text-white">
          <dt>{t('booking.total')}</dt>
          <dd className="text-brand-700 dark:text-brand-300">{formatCurrency(order.total, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between text-slate-500 dark:text-slate-400 ${className ?? ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
