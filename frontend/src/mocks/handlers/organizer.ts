import type { EventStats, UpsertEventRequest } from '@/lib/types';
import { delay, http, HttpResponse } from 'msw';
import { db, findEvent, findVenue, nextId, save, sweepExpired, ticketTypeView, toDetail, toSummary, type DbEvent, type DbSeat, type DbUser } from '../db';
import { API, paginate, problem, requireRole, syntheticDaily } from '../utils';

type FieldError = { field: string; message: string };

/** Mirrors the Bean Validation + business checks the backend must do on create/update. */
function validate(body: UpsertEventRequest): FieldError[] {
  const e: FieldError[] = [];
  const ts = (s: string) => new Date(s).getTime();
  if (!body.name?.trim()) e.push({ field: 'name', message: 'must not be blank' });
  if (!body.venueId) e.push({ field: 'venueId', message: 'must not be null' });
  if (!body.startsAt || ts(body.startsAt) <= Date.now()) e.push({ field: 'startsAt', message: 'must be a future date' });
  if (!body.endsAt || ts(body.endsAt) <= ts(body.startsAt)) e.push({ field: 'endsAt', message: 'must be after startsAt' });
  if (!body.saleStartsAt || !body.saleEndsAt || ts(body.saleEndsAt) <= ts(body.saleStartsAt)) {
    e.push({ field: 'saleEndsAt', message: 'must be after saleStartsAt' });
  }
  if (body.saleEndsAt && ts(body.saleEndsAt) > ts(body.startsAt)) e.push({ field: 'saleEndsAt', message: 'must not be after startsAt' });
  if (!body.ticketTypes?.length) e.push({ field: 'ticketTypes', message: 'at least one ticket type' });
  body.ticketTypes?.forEach((t, i) => {
    if (!t.name?.trim()) e.push({ field: `ticketTypes[${i}].name`, message: 'must not be blank' });
    if (t.price < 0) e.push({ field: `ticketTypes[${i}].price`, message: 'must be >= 0' });
    if (t.maxPerOrder < 1) e.push({ field: `ticketTypes[${i}].maxPerOrder`, message: 'must be >= 1' });
  });
  const venue = db.venues.find((v) => v.id === Number(body.venueId));
  if (venue && body.seatingType === 'RESERVED') {
    if (venue.totalRows === 0) e.push({ field: 'venueId', message: 'venue has no seat map, use GENERAL_ADMISSION' });
    const last = String.fromCharCode(64 + venue.totalRows);
    const covered = new Set<string>();
    body.ticketTypes.forEach((t, i) => {
      if (!t.rowFrom || !t.rowTo || t.rowFrom > t.rowTo || t.rowTo > last) {
        e.push({ field: `ticketTypes[${i}].rowTo`, message: `rows must be within A-${last}` });
        return;
      }
      for (let c = t.rowFrom.charCodeAt(0); c <= t.rowTo.charCodeAt(0); c++) {
        const r = String.fromCharCode(c);
        if (covered.has(r)) e.push({ field: `ticketTypes[${i}].rowFrom`, message: `row ${r} overlaps another tier` });
        covered.add(r);
      }
    });
  }
  if (venue && body.seatingType === 'GENERAL_ADMISSION') {
    const total = body.ticketTypes.reduce((s, t) => s + Number(t.quota || 0), 0);
    if (total > venue.capacity) e.push({ field: 'ticketTypes', message: `total quota ${total} exceeds venue capacity ${venue.capacity}` });
  }
  return e;
}

function apply(event: DbEvent, body: UpsertEventRequest) {
  Object.assign(event, {
    name: body.name.trim(), category: body.category, description: body.description ?? '', venueId: Number(body.venueId),
    startsAt: body.startsAt, endsAt: body.endsAt, saleStartsAt: body.saleStartsAt, saleEndsAt: body.saleEndsAt, seatingType: body.seatingType,
  });
  event.ticketTypes = body.ticketTypes.map((t) => ({
    id: nextId(), name: t.name.trim(), price: Number(t.price), color: t.color, quota: Number(t.quota) || 0,
    maxPerOrder: Number(t.maxPerOrder), rowFrom: t.rowFrom, rowTo: t.rowTo, seedSold: 0,
  }));
  // (Re)generate the seat map. Allowed only while nothing has been sold (DRAFT / REJECTED).
  if (event.seatingType === 'RESERVED') {
    const v = findVenue(event.venueId);
    const seats: DbSeat[] = [];
    for (let r = 1; r <= v.totalRows; r++) {
      const row = String.fromCharCode(64 + r);
      const tt = event.ticketTypes.find((t) => t.rowFrom! <= row && row <= t.rowTo!);
      if (!tt) continue; // rows not covered by any tier are not sold
      for (let n = 1; n <= v.seatsPerRow; n++) seats.push({ code: `${row}${n}`, row, number: n, ticketTypeId: tt.id, status: 'AVAILABLE' });
    }
    db.seats[event.id] = seats;
    event.ticketTypes.forEach((t) => (t.quota = seats.filter((s) => s.ticketTypeId === t.id).length));
  } else {
    delete db.seats[event.id];
  }
}

function ownEvent(user: DbUser, id: number) {
  const e = findEvent(id);
  return e && (e.organizerId === user.id || user.role === 'ADMIN') ? e : undefined;
}

export function statsOf(event: DbEvent): EventStats {
  const tts = ticketTypeView(event);
  const byTicketType = tts.map((t) => ({ name: t.name, color: t.color, quota: t.quota, sold: t.sold, revenue: t.sold * t.price }));
  const sold = byTicketType.reduce((s, t) => s + t.sold, 0);
  const revenue = byTicketType.reduce((s, t) => s + t.revenue, 0);
  const checkedIn = db.orders.filter((o) => o.eventId === event.id).flatMap((o) => o.tickets).filter((t) => t.status === 'CHECKED_IN').length;
  const avgPrice = sold ? Math.round(revenue / sold) : 0;
  return {
    eventId: event.id, capacity: tts.reduce((s, t) => s + t.quota, 0), sold, revenue, checkedIn, byTicketType,
    salesByDay: syntheticDaily(event.id, 14, Math.max(1, sold / 14), avgPrice),
  };
}

export const organizerHandlers = [
  http.get(`${API}/organizer/dashboard`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    sweepExpired();
    const mine = db.events.filter((e) => e.organizerId === user.id);
    const stats = mine.filter((e) => e.status === 'PUBLISHED' || e.status === 'COMPLETED').map(statsOf);
    const revenue = stats.reduce((s, x) => s + x.revenue, 0);
    const tickets = stats.reduce((s, x) => s + x.sold, 0);
    return HttpResponse.json({
      totalEvents: mine.length,
      publishedEvents: mine.filter((e) => e.status === 'PUBLISHED').length,
      revenue30d: revenue, ticketsSold30d: tickets,
      salesByDay: syntheticDaily(user.id, 30, Math.max(1, tickets / 30), tickets ? Math.round(revenue / tickets) : 0),
      upcoming: mine.filter((e) => e.status === 'PUBLISHED').map(toSummary).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5),
    });
  }),

  http.get(`${API}/organizer/events`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const list = db.events
      .filter((e) => e.organizerId === user.id && (!status || e.status === status))
      .map(toDetail)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return HttpResponse.json(paginate(list, url, 10));
  }),

  http.post(`${API}/organizer/events`, async ({ request }) => {
    await delay(500);
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const body = (await request.json()) as UpsertEventRequest;
    const errors = validate(body);
    if (errors.length) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', errors);
    const event = { id: nextId(), organizerId: user.id, status: 'DRAFT', createdAt: new Date().toISOString() } as DbEvent;
    apply(event, body);
    db.events.push(event);
    save();
    return HttpResponse.json(toDetail(event), { status: 201 });
  }),

  http.put(`${API}/organizer/events/:id`, async ({ request, params }) => {
    await delay(500);
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'DRAFT' && event.status !== 'REJECTED') return problem(409, 'INVALID_STATE', 'Chỉ sửa được sự kiện nháp hoặc bị từ chối');
    const body = (await request.json()) as UpsertEventRequest;
    const errors = validate(body);
    if (errors.length) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', errors);
    apply(event, body);
    event.status = 'DRAFT';
    event.rejectReason = undefined;
    save();
    return HttpResponse.json(toDetail(event));
  }),

  http.post(`${API}/organizer/events/:id/submit`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'DRAFT' && event.status !== 'REJECTED') return problem(409, 'INVALID_STATE', `Không thể gửi duyệt từ trạng thái ${event.status}`);
    event.status = 'PENDING_REVIEW';
    save();
    return HttpResponse.json(toDetail(event));
  }),

  /** Cancelling a published event refunds every paid order in full (organizer's fault, not the buyer's). */
  http.post(`${API}/organizer/events/:id/cancel`, async ({ request, params }) => {
    await delay(600);
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') return problem(409, 'INVALID_STATE', `Event already ${event.status}`);
    event.status = 'CANCELLED';
    for (const o of db.orders.filter((x) => x.eventId === event.id)) {
      if (o.status === 'PENDING') o.status = 'CANCELLED';
      if (o.status === 'PAID' || o.status === 'REFUND_REQUESTED') {
        o.status = 'REFUNDED';
        o.refundAmount = o.total;
        o.refundReason = 'Sự kiện bị hủy bởi ban tổ chức';
        o.tickets.forEach((t) => (t.status = 'REFUNDED'));
      }
    }
    save();
    return HttpResponse.json(toDetail(event));
  }),

  http.get(`${API}/organizer/events/:id/stats`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    return event ? HttpResponse.json(statsOf(event)) : problem(404, 'EVENT_NOT_FOUND', 'Event not found');
  }),

  http.get(`${API}/organizer/events/:id/orders`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    const list = db.orders.filter((o) => o.eventId === event.id && o.status !== 'PENDING').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(paginate(list, new URL(request.url), 10));
  }),

  http.get(`${API}/organizer/events/:id/promo-codes`, async ({ request, params }) => {
    await delay(200);
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    return HttpResponse.json(db.promoCodes.filter((p) => p.eventId === event.id));
  }),

  http.post(`${API}/organizer/events/:id/promo-codes`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const event = ownEvent(user, Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    const body = (await request.json()) as { code: string; percentOff: number; maxUses: number; validUntil: string };
    const code = body.code?.trim().toUpperCase();
    const errors: FieldError[] = [];
    if (!/^[A-Z0-9]{4,20}$/.test(code ?? '')) errors.push({ field: 'code', message: '4-20 letters or digits' });
    if (!(body.percentOff >= 1 && body.percentOff <= 100)) errors.push({ field: 'percentOff', message: 'must be 1-100' });
    if (!(body.maxUses >= 1)) errors.push({ field: 'maxUses', message: 'must be >= 1' });
    if (errors.length) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', errors);
    if (db.promoCodes.some((p) => p.eventId === event.id && p.code === code)) return problem(409, 'PROMO_EXISTS', 'Mã đã tồn tại', [{ field: 'code', message: 'already exists' }]);
    const promo = { id: nextId(), eventId: event.id, code: code!, percentOff: Number(body.percentOff), maxUses: Number(body.maxUses), used: 0, validUntil: body.validUntil || event.saleEndsAt };
    db.promoCodes.push(promo);
    save();
    return HttpResponse.json(promo, { status: 201 });
  }),

  http.delete(`${API}/organizer/promo-codes/:id`, async ({ request, params }) => {
    await delay(200);
    const user = requireRole(request, 'ORGANIZER');
    if (user instanceof Response) return user;
    const promo = db.promoCodes.find((p) => p.id === Number(params.id));
    if (!promo || !ownEvent(user, promo.eventId)) return problem(404, 'PROMO_NOT_FOUND', 'Promo code not found');
    db.promoCodes = db.promoCodes.filter((p) => p.id !== promo.id);
    save();
    return new HttpResponse(null, { status: 204 });
  }),
];
