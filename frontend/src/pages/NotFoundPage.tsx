import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="bg-gradient-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-8xl font-extrabold text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t('common.notFoundTitle')}</h1>
      <p className="mt-2 text-slate-500">{t('common.notFoundText')}</p>
      <Link to="/" className="mt-8">
        <Button icon="ri-home-4-line">{t('common.backHome')}</Button>
      </Link>
    </div>
  );
}
