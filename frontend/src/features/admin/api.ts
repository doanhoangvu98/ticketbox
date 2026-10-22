import { api } from '@/lib/api';
import type { AdminDashboard, BankTransaction, EventDetail, Order, PageResponse, Role, User, UserStatus } from '@/lib/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Params = Record<string, string | number | undefined>;

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/admin/dashboard').then((r) => r.data),
  events: (params: Params) => api.get<PageResponse<EventDetail>>('/admin/events', { params }).then((r) => r.data),
  approve: (id: number) => api.post<EventDetail>(`/admin/events/${id}/approve`).then((r) => r.data),
  reject: ({ id, reason }: { id: number; reason: string }) => api.post<EventDetail>(`/admin/events/${id}/reject`, { reason }).then((r) => r.data),
  users: (params: Params) => api.get<PageResponse<User>>('/admin/users', { params }).then((r) => r.data),
  updateUser: ({ id, ...body }: { id: number; role?: Role; status?: UserStatus }) => api.patch<User>(`/admin/users/${id}`, body).then((r) => r.data),
  orders: (params: Params) => api.get<PageResponse<Order>>('/admin/orders', { params }).then((r) => r.data),
  approveRefund: (code: string) => api.post<Order>(`/admin/orders/${code}/refund/approve`).then((r) => r.data),
  rejectRefund: (code: string) => api.post<Order>(`/admin/orders/${code}/refund/reject`).then((r) => r.data),
  transactions: (params: Params) => api.get<PageResponse<BankTransaction>>('/admin/bank-transactions', { params }).then((r) => r.data),
  matchTransaction: ({ id, orderCode }: { id: number; orderCode: string }) =>
    api.post<BankTransaction>(`/admin/bank-transactions/${id}/match`, { orderCode }).then((r) => r.data),
  refundTransaction: (id: number) => api.post<BankTransaction>(`/admin/bank-transactions/${id}/refund`).then((r) => r.data),
};

export const useAdminQuery = <T,>(key: string, fn: (p: Params) => Promise<T>, params: Params = {}) =>
  useQuery({ queryKey: ['admin', key, params], queryFn: () => fn(params), placeholderData: keepPreviousData });

export function useAdminMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }) });
}
