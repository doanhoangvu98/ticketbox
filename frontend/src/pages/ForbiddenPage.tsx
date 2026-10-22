import { Button } from '@/components/ui/Button';
import { HOME_BY_ROLE, useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router';

export function ForbiddenPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-rose-50 text-4xl text-rose-500 dark:bg-rose-500/10">
        <i className="ri-lock-2-line" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">{t('common.forbiddenTitle')}</h1>
      <p className="mt-2 max-w-md text-slate-500">{t('common.forbiddenText')}</p>
      <Link to={user ? HOME_BY_ROLE[user.role] : '/'} className="mt-8">
        <Button icon="ri-arrow-left-line">{t('common.backHome')}</Button>
      </Link>
    </div>
  );
}
