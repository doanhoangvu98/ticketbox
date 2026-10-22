import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/components/layout/DevPanel';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import { authApi } from '../api';
import { HOME_BY_ROLE, useAuth } from '../AuthProvider';

export function LoginPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      signIn(res);
      toast.success(t('auth.welcome', { name: res.user.fullName }));
      navigate(redirect ?? HOME_BY_ROLE[res.user.role], { replace: true });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {login.error && (
        <Alert tone="danger" className="mb-4">
          {login.error instanceof ApiError ? login.error.message : String(login.error)}
        </Alert>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">{t('auth.email')}</label>
          <div className="relative">
            <i className="ri-mail-line absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="label">{t('auth.password')}</label>
          <div className="relative">
            <i className="ri-lock-2-line absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
            <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input px-10" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={t('auth.togglePassword')} className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600">
              <i className={show ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          {t('auth.loginSubmit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{t('auth.register')}</Link>
      </p>

      {config.useMock && (
        <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
          <p className="mb-3 text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
            <i className="ri-flask-line mr-1" />{t('auth.demoAccounts')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.role}
                type="button"
                onClick={() => login.mutate({ email: a.email, password: DEMO_PASSWORD })}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm ring-1 ring-slate-200 transition hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
              >
                <i className={`${a.icon} text-lg text-brand-600 dark:text-brand-400`} />
                <span className="font-semibold">{t(`role.${a.role}`)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{t('auth.demoHint', { password: DEMO_PASSWORD })}</p>
        </div>
      )}
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute -top-40 left-1/2 -z-10 size-[40rem] -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-700/20" />
      <div className="card w-full max-w-md p-6 shadow-xl shadow-brand-900/5 sm:p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 mb-6 text-center text-sm text-slate-500">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
