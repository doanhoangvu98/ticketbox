import { api } from '@/lib/api';
import type { EventDetail, EventStats, Order, OrganizerDashboard, PageResponse, PromoCode, UpsertEventRequest } from '@/lib/types';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const base = '/organizer';

export const organizerApi = {
  dashboard: () => api.get<OrganizerDashboard>(`${base}/dashboard`).then((r) => r.data),
  events: (params: { status?: string; page?: number }) =>
    api.get<PageResponse<EventDetail>>(`${base}/events`, { params }).then((r) => r.data),
  create: (body: UpsertEventRequest) => api.post<EventDetail>(`${base}/events`, body).then((r) => r.data),
  update: (id: number, body: UpsertEventRequest) => api.put<EventDetail>(`${base}/events/${id}`, body).then((r) => r.data),
  submit: (id: number) => api.post<EventDetail>(`${base}/events/${id}/submit`).then((r) => r.data),
  cancel: (id: number) => api.post<EventDetail>(`${base}/events/${id}/cancel`).then((r) => r.data),
  stats: (id: number) => api.get<EventStats>(`${base}/events/${id}/stats`).then((r) => r.data),
  orders: (id: number, page: number) =>
    api.get<PageResponse<Order>>(`${base}/events/${id}/orders`, { params: { page } }).then((r) => r.data),
  promoCodes: (id: number) => api.get<PromoCode[]>(`${base}/events/${id}/promo-codes`).then((r) => r.data),
  createPromo: (id: number, body: Pick<PromoCode, 'code' | 'percentOff' | 'maxUses' | 'validUntil'>) =>
    api.post<PromoCode>(`${base}/events/${id}/promo-codes`, body).then((r) => r.data),
  deletePromo: (promoId: number) => api.delete(`${base}/promo-codes/${promoId}`),
};

export const useOrganizerDashboard = () => useQuery({ queryKey: ['organizer', 'dashboard'], queryFn: organizerApi.dashboard });

export const useOrganizerEvents = (status: string | undefined, page: number) =>
  useQuery({ queryKey: ['organizer', 'events', status, page], queryFn: () => organizerApi.events({ status, page }), placeholderData: keepPreviousData });

export const useEventStats = (id: number) => useQuery({ queryKey: ['organizer', 'stats', id], queryFn: () => organizerApi.stats(id) });

export const useEventOrders = (id: number, page: number) =>
  useQuery({ queryKey: ['organizer', 'orders', id, page], queryFn: () => organizerApi.orders(id, page), placeholderData: keepPreviousData });

export const usePromoCodes = (id: number) => useQuery({ queryKey: ['organizer', 'promo', id], queryFn: () => organizerApi.promoCodes(id) });

/** Generic mutation that refreshes everything under ['organizer'] and ['events'] afterwards. */
export function useOrganizerMutation<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer'] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
