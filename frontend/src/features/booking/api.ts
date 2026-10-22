import { api } from '@/lib/api';
import type { Buyer, CreateOrderRequest, Order, PaymentInstruction, Ticket } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventKeys } from '../events/api';

export const orderKeys = {
  detail: (code: string) => ['orders', code] as const,
  mine: ['me', 'orders'] as const,
  tickets: ['me', 'tickets'] as const,
};

export const ordersApi = {
  create: (body: CreateOrderRequest) => api.post<Order>('/orders', body).then((r) => r.data),
  get: (code: string) => api.get<Order>(`/orders/${code}`).then((r) => r.data),
  applyPromo: (code: string, promo: string) => api.post<Order>(`/orders/${code}/promo`, { code: promo }).then((r) => r.data),
  checkout: (code: string, buyer: Buyer) => api.post<PaymentInstruction>(`/orders/${code}/checkout`, buyer).then((r) => r.data),
  cancel: (code: string) => api.post<Order>(`/orders/${code}/cancel`).then((r) => r.data),
  requestRefund: (code: string, reason: string) => api.post<Order>(`/orders/${code}/refund-request`, { reason }).then((r) => r.data),
  mine: () => api.get<Order[]>('/me/orders').then((r) => r.data),
  tickets: () => api.get<Ticket[]>('/me/tickets').then((r) => r.data),
};

/**
 * Order detail. While waiting for the bank transfer, poll every 3 s: the status flips to PAID
 * when the bank webhook arrives on the server. (Week 4 stretch: Server-Sent Events instead of polling.)
 */
export const useOrder = (code: string, poll = false) =>
  useQuery({
    queryKey: orderKeys.detail(code),
    queryFn: () => ordersApi.get(code),
    refetchInterval: (q) => (poll && q.state.data?.status === 'PENDING' ? 3_000 : false),
    staleTime: 0,
  });

export const useMyOrders = () => useQuery({ queryKey: orderKeys.mine, queryFn: ordersApi.mine });
export const useMyTickets = () => useQuery({ queryKey: orderKeys.tickets, queryFn: ordersApi.tickets });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: eventKeys.seats(vars.eventId) }),
  });
}

/** Mutations that return the updated order write it straight into the cache (no extra GET). */
export function useOrderMutation<V>(fn: (vars: V) => Promise<Order>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      qc.setQueryData(orderKeys.detail(order.code), order);
      qc.invalidateQueries({ queryKey: orderKeys.mine });
      qc.invalidateQueries({ queryKey: orderKeys.tickets });
    },
  });
}
