import { useI18n } from '@/i18n/I18nProvider';
import { Button } from './Button';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-3">
      <Button variant="secondary" size="sm" icon="ri-arrow-left-s-line" disabled={page === 0} onClick={() => onChange(page - 1)}>
        {t('common.previous')}
      </Button>
      <span className="text-sm text-slate-500 dark:text-slate-400">{t('common.pageOf', { page: page + 1, total: totalPages })}</span>
      <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
        {t('common.next')}
        <i className="ri-arrow-right-s-line" />
      </Button>
    </nav>
  );
}
