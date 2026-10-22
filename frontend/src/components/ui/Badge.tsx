import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import type { BankTransactionStatus, EventStatus, OrderStatus, Role, TicketStatus, UserStatus } from '@/lib/types';
import type { ReactNode } from 'react';

export type Tone = 'green' | 'gray' | 'red' | 'blue' | 'amber' | 'violet';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
};

export function Badge({ tone, children, className, dot = true }: { tone: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const EVENT_TONE: Record<EventStatus, Tone> = {
  DRAFT: 'gray', PENDING_REVIEW: 'amber', PUBLISHED: 'green', REJECTED: 'red', CANCELLED: 'red', COMPLETED: 'blue',
};
const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'amber', PAID: 'green', CANCELLED: 'gray', EXPIRED: 'gray', REFUND_REQUESTED: 'violet', REFUNDED: 'blue',
};
const TICKET_TONE: Record<TicketStatus, Tone> = { VALID: 'green', CHECKED_IN: 'blue', CANCELLED: 'gray', REFUNDED: 'gray' };
const ROLE_TONE: Record<Role, Tone> = { CUSTOMER: 'gray', ORGANIZER: 'violet', STAFF: 'blue', ADMIN: 'red' };
const TX_TONE: Record<BankTransactionStatus, Tone> = { MATCHED: 'green', UNMATCHED: 'amber', REFUNDED: 'blue' };

export function EventStatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const { t } = useI18n();
  return <Badge tone={EVENT_TONE[status]} className={className}>{t(`status.event.${status}`)}</Badge>;
}
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Badge tone={ORDER_TONE[status]}>{t(`status.order.${status}`)}</Badge>;
}
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useI18n();
  return <Badge tone={TICKET_TONE[status]}>{t(`status.ticket.${status}`)}</Badge>;
}
export function RoleBadge({ role }: { role: Role }) {
  const { t } = useI18n();
  return <Badge tone={ROLE_TONE[role]} dot={false}>{t(`role.${role}`)}</Badge>;
}
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useI18n();
  return <Badge tone={status === 'ACTIVE' ? 'green' : 'red'}>{t(`status.user.${status}`)}</Badge>;
}
export function TxStatusBadge({ status }: { status: BankTransactionStatus }) {
  const { t } = useI18n();
  return <Badge tone={TX_TONE[status]}>{t(`status.tx.${status}`)}</Badge>;
}
