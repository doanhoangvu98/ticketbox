import { api, errorMessage } from '@/lib/api';
import { useAuth, HOME_BY_ROLE } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';
import { useI18n } from '@/i18n/I18nProvider';
import type { Role } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { cn } from '@/lib/cn';

export const DEMO_ACCOUNTS: { role: Role; email: string; icon: string }[] = [
  { role: 'CUSTOMER', email: 'customer@ticketbox.vn', icon: 'ri-user-smile-line' },
  { role: 'ORGANIZER', email: 'organizer@ticketbox.vn', icon: 'ri-megaphone-line' },
  { role: 'STAFF', email: 'staff@ticketbox.vn', icon: 'ri-qr-scan-2-line' },
  { role: 'ADMIN', email: 'admin@ticketbox.vn', icon: 'ri-shield-user-line' },
];
export const DEMO_PASSWORD = '123456';

/** Floating panel, visible only in mock mode: switch role in one click, reset demo data. */
export function DevPanel() {
  const { t } = useI18n();
  const { user, signIn } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const loginAs = async (email: string) => {
    try {
      const res = await authApi.login({ email, password: DEMO_PASSWORD });
      signIn(res);
      navigate(HOME_BY_ROLE[res.user.role]);
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const reset = async () => {
    if (!window.confirm(t('dev.resetConfirm'))) return;
    await api.post('/__dev/reset');
    qc.clear();
    toast.success(t('dev.resetDone'));
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 z-[65]">
      {open && (
        <div className="card mb-2 w-64 p-3 shadow-2xl animate-slide-up">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase">
            <i className="ri-flask-line" /> {t('dev.title')}
          </p>
          <p className="mb-1.5 text-xs text-slate-500">{t('dev.loginAs')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.role}
                type="button"
                onClick={() => loginAs(a.email)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition',
                  user?.role === a.role ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                )}
              >
                <i className={a.icon} />
                {t(`role.${a.role}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
          >
            <i className="ri-restart-line" /> {t('dev.reset')}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-amber-400 px-4 text-xs font-bold text-amber-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300"
        aria-expanded={open}
      >
        <i className="ri-flask-fill text-base" />
        MOCK
      </button>
    </div>
  );
}
