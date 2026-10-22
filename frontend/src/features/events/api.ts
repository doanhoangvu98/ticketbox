import { api } from '@/lib/api';
import type { EventDetail, EventSearchParams, EventSummary, PageResponse, Seat, Venue } from '@/lib/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/** Query keys in one place: easy to invalidate precisely (e.g. eventKeys.seats(id) after a hold). */
export const eventKeys = {
  all: ['events'] as const,
  list: (p: EventSearchParams) => ['events', 'list', p] as const,
  detail: (id: number) => ['events', 'detail', id] as const,
  seats: (id: number) => ['events', 'seats', id] as const,
  venues: ['venues'] as const,
};

export const eventsApi = {
  search: (params: EventSearchParams) => api.get<PageResponse<EventSummary>>('/events', { params }).then((r) => r.data),
  get: (id: number) => api.get<EventDetail>(`/events/${id}`).then((r) => r.data),
  seats: (id: number) => api.get<Seat[]>(`/events/${id}/seats`).then((r) => r.data),
  venues: () => api.get<Venue[]>('/venues').then((r) => r.data),
};

export const useEvents = (params: EventSearchParams) =>
  useQuery({ queryKey: eventKeys.list(params), queryFn: () => eventsApi.search(params), placeholderData: keepPreviousData });

export const useEvent = (id: number) =>
  useQuery({ queryKey: eventKeys.detail(id), queryFn: () => eventsApi.get(id), enabled: Number.isFinite(id) && id > 0 });

/** Seat map refreshes every 15 s so other buyers' holds show up without reloading. */
export const useSeats = (id: number, enabled = true) =>
  useQuery({ queryKey: eventKeys.seats(id), queryFn: () => eventsApi.seats(id), enabled, refetchInterval: 15_000, staleTime: 0 });

export const useVenues = () => useQuery({ queryKey: eventKeys.venues, queryFn: eventsApi.venues, staleTime: Infinity });
