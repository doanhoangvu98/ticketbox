import { RoleBadge, UserStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipFilter, PageHeader } from '@/components/ui/Data';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDateTime } from '@/lib/format';
import type { Role } from '@/lib/types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, useAdminMutation, useAdminQuery } from '../api';

const ROLES: Role[] = ['CUSTOMER', 'ORGANIZER', 'STAFF', 'ADMIN'];

export function AdminUsersPage() {
  const { t, locale } = useI18n();
  const { user: me } = useAuth();
  const [role, setRole] = useState<Role>();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const kw = useDebounce(keyword);
  const { data, error, refetch } = useAdminQuery('users', adminApi.users, { role, keyword: kw || undefined, page });
  const update = useAdminMutation(adminApi.updateUser);
  const onDone = { onSuccess: () => toast.success(t('admin.userUpdated')), onError: (e: Error) => toast.error(e.message) };

  return (
    <div>
      <PageHeader title={t('admin.usersTitle')} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <i className="ri-search-line absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} placeholder={t('admin.searchUser')} className="input pl-10" />
        </div>
        <ChipFilter value={role} onChange={(r) => { setRole(r); setPage(0); }} options={[{ value: undefined, label: t('common.all') }, ...ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))]} />
      </div>
      <div className="mt-5">
        {error ? <ErrorState error={error} onRetry={() => refetch()} /> : !data ? <Skeleton className="h-64" /> : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/50"><tr>
                  <th className="px-4 py-3">{t('admin.user')}</th><th className="px-4 py-3">{t('admin.role')}</th><th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3">{t('admin.joined')}</th><th className="px-4 py-3 text-right">{t('common.actions')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.items.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id}>
                        <td className="px-4 py-3"><p className="font-semibold">{u.fullName}{self && <span className="ml-1 text-xs text-slate-400">({t('admin.you')})</span>}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                        <td className="px-4 py-3">
                          {self ? <RoleBadge role={u.role} /> : (
                            <select value={u.role} onChange={(e) => update.mutate({ id: u.id, role: e.target.value as Role }, onDone)} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700">
                              {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3"><UserStatusBadge status={u.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(u.createdAt, locale)}</td>
                        <td className="px-4 py-3 text-right">
                          {!self && (u.status === 'ACTIVE'
                            ? <Button size="sm" variant="secondary" icon="ri-lock-line" onClick={() => update.mutate({ id: u.id, status: 'LOCKED' }, onDone)}>{t('admin.lock')}</Button>
                            : <Button size="sm" variant="secondary" icon="ri-lock-unlock-line" onClick={() => update.mutate({ id: u.id, status: 'ACTIVE' }, onDone)}>{t('admin.unlock')}</Button>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
