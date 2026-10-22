import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useEffect, type ReactNode } from 'react';
import { IconButton } from './Button';

/** Accessible dialog: Escape closes, body scroll locked, bottom sheet on mobile. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-slide-up sm:rounded-3xl dark:bg-slate-900',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' }[size],
        )}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <h2 className="flex-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <IconButton icon="ri-close-line" label={t('common.close')} onClick={onClose} className="-mr-2" />
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}
