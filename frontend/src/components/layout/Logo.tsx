import { Link } from 'react-router';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-md shadow-brand-600/30">
        <i className="ri-coupon-3-fill text-lg" />
      </span>
      Ticket<span className="text-brand-600 dark:text-brand-400">Box</span>
    </Link>
  );
}
