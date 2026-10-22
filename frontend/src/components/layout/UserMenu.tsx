import { HOME_BY_ROLE, useAuth } from '@/features/auth/AuthProvider';
import { useI18n, type MessageKey } from '@/i18n/I18nProvider';
import { RoleBadge } from '@/components/ui/Badge';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

/** Avatar + dropdown. Links depend on the role. */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <i className="ri-user-3-line" />
        <span className="hidden sm:inline">{t('nav.login')}</span>
      </Link>
    );
  }

  const links: { to: string; key: MessageKey; icon: string }[] =
    user.role === 'CUSTOMER'
      ? [
          { to: '/me/tickets', key: 'nav.myTickets', icon: 'ri-ticket-2-line' },
          { to: '/me/orders', key: 'nav.myOrders', icon: 'ri-file-list-3-line' },
        ]
      : [{ to: HOME_BY_ROLE[user.role], key: 'nav.workspace', icon: 'ri-dashboard-3-line' }];

  const initials = user.fullName.split(' ').slice(-1)[0]?.[0] ?? 'U';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-sm font-bold text-white">
          {initials}
        </span>
        <i className="ri-arrow-down-s-line text-slate-400" />
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-64 p-2 shadow-xl animate-fade-in">
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <RoleBadge role={user.role} />
          </div>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <i className={`${l.icon} text-base`} />
              {t(l.key)}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              signOut();
              setOpen(false);
              navigate('/');
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <i className="ri-logout-box-r-line text-base" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
