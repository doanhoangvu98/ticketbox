import type { OrderStatus, Role, UserStatus } from '@/lib/types';
import { delay, http, HttpResponse } from 'msw';
import { db, findEvent, publicUser, releaseSeats, save, sweepExpired, toDetail } from '../db';
import { API, paginate, problem, requireRole, syntheticDaily } from '../utils';
import { markPaid } from './payments';
import { statsOf } from './organizer';

export const adminHandlers = [
  http.get(`${API}/admin/dashboard`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    sweepExpired();
    const stats = db.events.filter((e) => e.status === 'PUBLISHED' || e.status === 'COMPLETED').map(statsOf);
    const gmv = stats.reduce((s, x) => s + x.revenue, 0);
    const tickets = stats.reduce((s, x) => s + x.sold, 0);
    const ordersByStatus = { PENDING: 0, PAID: 0, CANCELLED: 0, EXPIRED: 0, REFUND_REQUESTED: 0, REFUNDED: 0 } as Record<OrderStatus, number>;
    db.orders.forEach((o) => ordersByStatus[o.status]++);
    return HttpResponse.json({
      users: db.users.length,
      organizers: db.users.filter((u) => u.role === 'ORGANIZER').length,
      pendingEvents: db.events.filter((e) => e.status === 'PENDING_REVIEW').length,
      gmv30d: gmv,
      serviceFee30d: tickets * 5000,
      refundRequests: ordersByStatus.REFUND_REQUESTED,
      unmatchedPayments: db.bankTransactions.filter((t) => t.status === 'UNMATCHED').length,
      ordersByStatus,
      salesByDay: syntheticDaily(7, 30, Math.max(1, tickets / 30), tickets ? Math.round(gmv / tickets) : 0),
    });
  }),

  /* ---------------------------------- Event review ---------------------------------- */
  http.get(`${API}/admin/events`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const list = db.events
      .filter((e) => (!status ? e.status !== 'DRAFT' : e.status === status))
      .map(toDetail)
      .sort((a, b) => (a.status === 'PENDING_REVIEW' ? -1 : 0) - (b.status === 'PENDING_REVIEW' ? -1 : 0) || a.startsAt.localeCompare(b.startsAt));
    return HttpResponse.json(paginate(list, url, 10));
  }),

  http.post(`${API}/admin/events/:id/approve`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const event = findEvent(Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'PENDING_REVIEW') return problem(409, 'INVALID_STATE', `Event is ${event.status}`);
    event.status = 'PUBLISHED';
    save();
    return HttpResponse.json(toDetail(event));
  }),

  http.post(`${API}/admin/events/:id/reject`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const event = findEvent(Number(params.id));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'PENDING_REVIEW') return problem(409, 'INVALID_STATE', `Event is ${event.status}`);
    const { reason } = (await request.json()) as { reason?: string };
    if (!reason?.trim()) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', [{ field: 'reason', message: 'must not be blank' }]);
    event.status = 'REJECTED';
    event.rejectReason = reason.trim();
    save();
    return HttpResponse.json(toDetail(event));
  }),

  /* -------------------------------------- Users ------------------------------------- */
  http.get(`${API}/admin/users`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const kw = url.searchParams.get('keyword')?.trim().toLowerCase();
    const list = db.users
      .filter((u) => !role || u.role === role)
      .filter((u) => !kw || u.fullName.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw))
      .map(publicUser);
    return HttpResponse.json(paginate(list, url, 10));
  }),

  http.patch(`${API}/admin/users/:id`, async ({ request, params }) => {
    await delay();
    const admin = requireRole(request, 'ADMIN');
    if (admin instanceof Response) return admin;
    const target = db.users.find((u) => u.id === Number(params.id));
    if (!target) return problem(404, 'USER_NOT_FOUND', 'User not found');
    if (target.id === admin.id) return problem(409, 'INVALID_STATE', 'Không thể tự đổi quyền hoặc khóa chính mình');
    const body = (await request.json()) as { role?: Role; status?: UserStatus };
    if (body.role) target.role = body.role;
    if (body.status) target.status = body.status;
    save();
    return HttpResponse.json(publicUser(target));
  }),

  /* ------------------------------------- Orders ------------------------------------- */
  http.get(`${API}/admin/orders`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    sweepExpired();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const kw = url.searchParams.get('keyword')?.trim().toUpperCase();
    const list = db.orders
      .filter((o) => !status || o.status === status)
      .filter((o) => !kw || o.code.includes(kw) || (o.buyer?.email ?? '').toUpperCase().includes(kw))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(paginate(list, url, 10));
  }),

  http.post(`${API}/admin/orders/:code/refund/approve`, async ({ request, params }) => {
    await delay(500);
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const order = db.orders.find((o) => o.code === params.code);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'REFUND_REQUESTED') return problem(409, 'INVALID_STATE', `Order is ${order.status}`);
    order.status = 'REFUNDED';
    order.tickets.forEach((t) => (t.status = 'REFUNDED'));
    releaseSeats(order.eventId, order.code); // seats go back on sale
    save();
    return HttpResponse.json(order);
  }),

  http.post(`${API}/admin/orders/:code/refund/reject`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const order = db.orders.find((o) => o.code === params.code);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'REFUND_REQUESTED') return problem(409, 'INVALID_STATE', `Order is ${order.status}`);
    order.status = 'PAID';
    order.refundAmount = undefined;
    order.tickets.forEach((t) => (t.status = 'VALID'));
    save();
    return HttpResponse.json(order);
  }),

  /* -------------------------------- Bank reconciliation ------------------------------ */
  http.get(`${API}/admin/bank-transactions`, async ({ request }) => {
    await delay();
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const list = db.bankTransactions.filter((t) => !status || t.status === status).sort((a, b) => b.transferredAt.localeCompare(a.transferredAt));
    return HttpResponse.json(paginate(list, url, 10));
  }),

  /** Manually attach an unmatched transfer to an order (customer typed a wrong content, paid late...). */
  http.post(`${API}/admin/bank-transactions/:id/match`, async ({ request, params }) => {
    await delay(500);
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const tx = db.bankTransactions.find((t) => t.id === Number(params.id));
    if (!tx || tx.status !== 'UNMATCHED') return problem(409, 'INVALID_STATE', 'Transaction is not unmatched');
    const { orderCode } = (await request.json()) as { orderCode: string };
    const order = db.orders.find((o) => o.code === orderCode?.trim().toUpperCase());
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn');
    if (!['PENDING', 'EXPIRED', 'CANCELLED'].includes(order.status)) return problem(409, 'INVALID_STATE', `Đơn đang ở trạng thái ${order.status}`);
    if (tx.amount < order.total) return problem(422, 'AMOUNT_MISMATCH', `Số tiền ${tx.amount} nhỏ hơn tổng đơn ${order.total}`);
    const seatsTaken = order.items.some((i) => {
      const s = i.seatCode ? db.seats[order.eventId]?.find((x) => x.code === i.seatCode) : undefined;
      return s && s.status !== 'AVAILABLE' && s.orderCode !== order.code;
    });
    if (seatsTaken) return problem(409, 'SEAT_NOT_AVAILABLE', 'Ghế của đơn đã được bán cho người khác. Hãy hoàn tiền.');
    markPaid(order, tx.transferredAt);
    tx.status = 'MATCHED';
    tx.orderCode = order.code;
    tx.note = `Ghép thủ công bởi ${user.fullName}`;
    save();
    return HttpResponse.json(tx);
  }),

  http.post(`${API}/admin/bank-transactions/:id/refund`, async ({ request, params }) => {
    await delay(400);
    const user = requireRole(request, 'ADMIN');
    if (user instanceof Response) return user;
    const tx = db.bankTransactions.find((t) => t.id === Number(params.id));
    if (!tx || tx.status !== 'UNMATCHED') return problem(409, 'INVALID_STATE', 'Transaction is not unmatched');
    tx.status = 'REFUNDED';
    tx.note = `Đã chuyển trả bởi ${user.fullName}`;
    save();
    return HttpResponse.json(tx);
  }),
];
