import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string; // Remix icon class, e.g. "ri-add-line"
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-xl font-semibold whitespace-nowrap transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <i className="ri-loader-4-line animate-spin" /> : icon && <i className={icon} />}
      {children}
    </button>
  );
}

/** Square icon-only button. `label` is required for screen readers (and shown as tooltip). */
export function IconButton({
  icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-lg text-slate-600 transition',
        'hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        className,
      )}
    >
      <i className={icon} />
    </button>
  );
}
