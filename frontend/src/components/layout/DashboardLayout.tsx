import { IconButton } from '@/components/ui/Button';
import { RoleBadge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n, type MessageKey } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Logo } from './Logo';
import { LanguageSwitch, ThemeMenu } from './Preferences';

export interface NavItem {
  to: string;
  key: MessageKey;
  icon: string;
  end?: boolean;
  badge?: number;
}

/** Shared back-office shell for ORGANIZER, STAFF and ADMIN: fixed sidebar (desktop) / drawer (mobile). */
export function DashboardLayout({ titleKey, nav, home }: { titleKey: MessageKey; nav: NavItem[]; home: string }) {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to={home} />
      </div>
      <p className="px-6 pt-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t(titleKey)}</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <i className={cn(item.icon, 'text-lg')} />
            <span className="flex-1">{t(item.key)}</span>
            {!!item.badge && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <i className="ri-store-2-line text-lg" />
          {t('nav.backToStore')}
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate('/login');
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        >
          <i className="ri-logout-box-r-line text-lg" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-900">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
        <IconButton className="lg:hidden" icon="ri-menu-2-line" label={t('nav.openMenu')} onClick={() => setOpen(true)} />
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitch className="hidden sm:inline-flex" />
          <ThemeMenu />
          {user && (
            <div className="ml-2 hidden items-center gap-2 sm:flex">
              <div className="text-right">
                <p className="text-sm leading-tight font-semibold text-slate-900 dark:text-white">{user.organizerName ?? user.fullName}</p>
                <RoleBadge role={user.role} />
              </div>
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-sm font-bold text-white">
                {user.fullName.split(' ').slice(-1)[0]?.[0]}
              </span>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
