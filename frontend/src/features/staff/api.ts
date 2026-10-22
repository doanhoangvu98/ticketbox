import { api } from '@/lib/api';
import type { CheckInResult, CheckInStats, EventSummary, Ticket } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const staffApi = {
  events: () => api.get<EventSummary[]>('/staff/events').then((r) => r.data),
  stats: (eventId: number) => api.get<CheckInStats>(`/staff/events/${eventId}/stats`).then((r) => r.data),
  checkIn: (body: { eventId: number; qrToken: string }) => api.post<CheckInResult>('/staff/check-ins', body).then((r) => r.data),
  devTickets: (eventId: number) => api.get<Ticket[]>('/__dev/tickets', { params: { eventId } }).then((r) => r.data),
};

export const useStaffEvents = () => useQuery({ queryKey: ['staff', 'events'], queryFn: staffApi.events });

export const useCheckInStats = (eventId?: number) =>
  useQuery({
    queryKey: ['staff', 'stats', eventId],
    queryFn: () => staffApi.stats(eventId!),
    enabled: !!eventId,
    refetchInterval: 10_000, // other gates are scanning too
  });

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: staffApi.checkIn,
    onSuccess: (_r, vars) => qc.invalidateQueries({ queryKey: ['staff', 'stats', vars.eventId] }),
  });
}
