import type { CheckInResult } from '@/lib/types';
import { delay, http, HttpResponse } from 'msw';
import { allTickets, db, findEvent, save, toSummary } from '../db';
import { API, problem, requireRole } from '../utils';

const assignedTo = (staffId: number) => db.staffAssignments[staffId] ?? [];

export const staffHandlers = [
  http.get(`${API}/staff/events`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'STAFF', 'ADMIN');
    if (user instanceof Response) return user;
    const ids = user.role === 'ADMIN' ? db.events.map((e) => e.id) : assignedTo(user.id);
    const list = ids
      .map(findEvent)
      .filter((e) => e && (e.status === 'PUBLISHED' || e.status === 'COMPLETED'))
      .map((e) => toSummary(e!))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return HttpResponse.json(list);
  }),

  http.get(`${API}/staff/events/:id/stats`, async ({ request, params }) => {
    await delay(200);
    const user = requireRole(request, 'STAFF', 'ADMIN');
    if (user instanceof Response) return user;
    const eventId = Number(params.id);
    const tickets = allTickets().filter((t) => t.eventId === eventId && (t.status === 'VALID' || t.status === 'CHECKED_IN'));
    const checked = tickets.filter((t) => t.status === 'CHECKED_IN').sort((a, b) => (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? ''));
    return HttpResponse.json({
      eventId, total: tickets.length, checkedIn: checked.length,
      recent: checked.slice(0, 8).map((t) => ({
        ticketCode: t.code, holderName: t.holderName, ticketTypeName: t.ticketTypeName, seatCode: t.seatCode, checkedInAt: t.checkedInAt!,
      })),
    });
  }),

  /**
   * Check-in. Business outcome is in the body (200), not in the HTTP status: a duplicate scan is a
   * normal situation at the gate, not a client error. Backend must make this atomic
   * (UPDATE ticket SET status='CHECKED_IN' WHERE code=? AND status='VALID') so two gates cannot both accept.
   */
  http.post(`${API}/staff/check-ins`, async ({ request }) => {
    await delay(250);
    const user = requireRole(request, 'STAFF', 'ADMIN');
    if (user instanceof Response) return user;
    const { eventId, qrToken } = (await request.json()) as { eventId: number; qrToken: string };
    if (user.role === 'STAFF' && !assignedTo(user.id).includes(Number(eventId))) {
      return problem(403, 'FORBIDDEN', 'Bạn không được phân công cho sự kiện này');
    }
    const value = qrToken.trim();
    const ticket = allTickets().find((t) => t.qrToken === value || t.code === value.toUpperCase());
    let result: CheckInResult;
    if (!ticket) result = { result: 'INVALID' };
    else if (ticket.eventId !== Number(eventId)) result = { result: 'WRONG_EVENT', ticket };
    else if (ticket.status === 'CHECKED_IN') result = { result: 'ALREADY_CHECKED_IN', ticket, checkedInAt: ticket.checkedInAt };
    else if (ticket.status !== 'VALID') result = { result: 'NOT_VALID', ticket };
    else {
      ticket.status = 'CHECKED_IN';
      ticket.checkedInAt = new Date().toISOString();
      save();
      result = { result: 'OK', ticket, checkedInAt: ticket.checkedInAt };
    }
    return HttpResponse.json(result);
  }),
];
