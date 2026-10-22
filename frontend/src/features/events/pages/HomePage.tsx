import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { CATEGORIES, CITIES } from '@/lib/constants';
import type { EventCategory } from '@/lib/types';
import { useSearchParams } from 'react-router';
import { useEvents } from '../api';
import { EventCard, EventCardSkeleton } from '../components/EventCard';

/** Filters live in the URL (?q=&category=&city=&page=): shareable, survive refresh and Back. */
export function HomePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('q') ?? '';
  const category = (params.get('category') as EventCategory | null) ?? undefined;
  const city = params.get('city') ?? undefined;
  const page = Number(params.get('page') ?? 0);
  const debounced = useDebounce(keyword);

  const { data, error, isPending, isFetching, refetch } = useEvents({ keyword: debounced || undefined, category, city, page, size: 12 });

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (resetPage) p.delete('page');
    setParams(p, { replace: 'q' in patch });
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-slate-50 dark:from-brand-950/60 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute -top-32 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/20" />
        <div className="mx-auto max-w-4xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <i className="ri-flashlight-fill" />{t('home.heroTag')}
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl dark:text-white">{t('home.heroTitle')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-slate-600 sm:text-lg dark:text-slate-400">{t('home.heroSubtitle')}</p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-brand-900/5 sm:flex-row dark:border-slate-700 dark:bg-slate-900">
            <div className="relative flex-1">
              <i className="ri-search-line absolute top-1/2 left-3.5 -translate-y-1/2 text-lg text-slate-400" />
              <input
                type="search"
                value={keyword}
                onChange={(e) => update({ q: e.target.value })}
                placeholder={t('home.searchPlaceholder')}
                aria-label={t('common.search')}
                className="h-12 w-full rounded-xl bg-transparent pr-3 pl-11 text-base placeholder:text-slate-400 focus:outline-none dark:text-white"
              />
            </div>
            <select
              value={city ?? ''}
              onChange={(e) => update({ city: e.target.value || undefined })}
              aria-label={t('home.city')}
              className="h-12 cursor-pointer rounded-xl bg-slate-50 px-3 text-sm font-medium text-slate-700 focus:outline-none sm:w-44 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">{t('home.allCities')}</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:justify-center">
            <CategoryChip active={!category} icon="ri-apps-2-line" label={t('common.all')} onClick={() => update({ category: undefined })} />
            {CATEGORIES.map((c) => (
              <CategoryChip key={c.value} active={category === c.value} icon={c.icon} label={t(`category.${c.value}`)} onClick={() => update({ category: c.value })} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">{t('home.upcoming')}</h2>
          {data && <span className="text-sm text-slate-500">{t('home.results', { count: data.totalItems })}</span>}
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState icon="ri-calendar-close-line" title={t('home.emptyTitle')} text={t('home.emptyText')} />
        ) : (
          <>
            <div className={cn('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', isFetching && 'opacity-60')}>
              {data.items.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p ? String(p) : undefined }, false)} />
          </>
        )}
      </section>
    </>
  );
}

function CategoryChip({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
        active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
      )}
    >
      <i className={icon} />
      {label}
    </button>
  );
}
