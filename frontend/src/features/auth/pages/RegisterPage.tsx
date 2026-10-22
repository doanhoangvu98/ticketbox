import { Button } from '@/components/ui/Button';
import { Field, inputCls } from '@/components/ui/Data';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { authApi } from '../api';
import { useAuth } from '../AuthProvider';
import { AuthShell } from './LoginPage';

export function RegisterPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      signIn(res);
      toast.success(t('auth.registered'));
      navigate('/');
    },
    onError: (e) => !(e instanceof ApiError && Object.keys(e.fieldErrors).length) && toast.error(e.message),
  });
  const errors = register.error instanceof ApiError ? register.error.fieldErrors : {};

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="fullName" label={t('auth.fullName')} error={errors.fullName}>
          <input id="fullName" autoComplete="name" value={form.fullName} onChange={set('fullName')} className={inputCls(errors.fullName)} />
        </Field>
        <Field id="email" label={t('auth.email')} error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputCls(errors.email)} />
        </Field>
        <Field id="phone" label={t('auth.phone')}>
          <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className="input" />
        </Field>
        <Field id="password" label={t('auth.password')} error={errors.password} hint={t('auth.passwordHint')}>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className={inputCls(errors.password)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          {t('auth.registerSubmit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{t('auth.loginSubmit')}</Link>
      </p>
    </AuthShell>
  );
}
