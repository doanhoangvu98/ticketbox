import { IconButton } from '@/components/ui/Button';
import { HOME_BY_ROLE, useAuth } from '@/features/auth/AuthProvider';
import { useI18n, type MessageKey } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Logo } from './Logo';
import { LanguageSwitch, ThemeMenu } from './Preferences';
import { UserMenu } from './UserMenu';

/** Public storefront shell (guests + customers). Staff/organizer/admin get a link to their workspace. */
export function AppLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const nav: { to: string; key: MessageKey; icon: string }[] = [{ to: '/', key: 'nav.events', icon: 'ri-calendar-event-line' }];
  if (user?.role === 'CUSTOMER') {
    nav.push({ to: '/me/tickets', key: 'nav.myTickets', icon: 'ri-ticket-2-line' }, { to: '/me/orders', key: 'nav.myOrders', icon: 'ri-file-list-3-line' });
  } else if (user) {
    nav.push({ to: HOME_BY_ROLE[user.role], key: 'nav.workspace', icon: 'ri-dashboard-3-line' });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                <i className={item.icon} />
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitch className="hidden sm:inline-flex" />
            <ThemeMenu />
            <UserMenu />
            <IconButton
              className="md:hidden"
              icon={menuOpen ? 'ri-close-line' : 'ri-menu-3-line'}
              label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            />
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 px-4 pt-3 pb-5 md:hidden dark:border-slate-800 animate-fade-in">
            <nav className="flex flex-col gap-1">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
                  <i className={cn(item.icon, 'text-lg')} />
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
              <span className="text-sm text-slate-500">{t('nav.language')}</span>
              <LanguageSwitch />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 text-slate-500 dark:text-slate-400">{t('footer.tagline')}</p>
          </div>
          <div className="space-y-2 text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-white">{t('footer.support')}</p>
            <p><i className="ri-phone-line mr-2" />1900 0000</p>
            <p><i className="ri-mail-line mr-2" />support@ticketbox.dev</p>
          </div>
          <div className="space-y-2 text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-white">{t('footer.policy')}</p>
            <p>{t('footer.refundPolicy')}</p>
            <div className="flex gap-3 pt-1 text-xl">
              <i className="ri-facebook-circle-fill" aria-hidden />
              <i className="ri-tiktok-fill" aria-hidden />
              <i className="ri-youtube-fill" aria-hidden />
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} TicketBox</p>
      </footer>
    </div>
  );
}
