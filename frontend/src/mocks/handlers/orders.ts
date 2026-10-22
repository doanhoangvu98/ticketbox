import { config } from '@/lib/config';
import { canRequestRefund, RULES } from '@/lib/rules';
import type { CreateOrderRequest, Order, OrderItem, PaymentInstruction } from '@/lib/types';
import { vietQrUrl } from '@/lib/vietqr';
import { delay, http, HttpResponse } from 'msw';
import { activeOrdersOf, db, findEvent, findVenue, randomCode, releaseSeats, save, sweepExpired, ticketTypeView } from '../db';
import { API, problem, requireRole } from '../utils';

function ownOrder(code: string, userId: number): Order | undefined {
  return db.orders.find((o) => o.code === code && o.userId === userId);
}

function recalc(order: Order) {
  order.subtotal = order.items.reduce((s, i) => s + i.price, 0);
  const promo = order.promoCode ? db.promoCodes.find((p) => p.eventId === order.eventId && p.code === order.promoCode) : undefined;
  order.discount = promo ? Math.round((order.subtotal * promo.percentOff) / 100) : 0;
  order.serviceFee = order.items.length * RULES.serviceFeePerTicket;
  order.total = order.subtotal - order.discount + order.serviceFee;
}

export const orderHandlers = [
  /**
   * Create a PENDING order = hold seats/quota for RULES.holdMinutes.
   * Validation order matters: cheap checks first, availability (the contended part) last.
   */
  http.post(`${API}/orders`, async ({ request }) => {
    await delay(500);
    const user = requireRole(request, 'CUSTOMER');
    if (user instanceof Response) return user;
    sweepExpired();
    const body = (await request.json()) as CreateOrderRequest;
    const event = findEvent(Number(body.eventId));
    if (!event) return problem(404, 'EVENT_NOT_FOUND', 'Event not found');
    if (event.status !== 'PUBLISHED') return problem(409, 'INVALID_STATE', 'Sự kiện không mở bán');

    const now = Date.now();
    if (now < new Date(event.saleStartsAt).getTime()) return problem(422, 'SALE_NOT_OPEN', 'Chưa đến thời gian mở bán');
    if (now > new Date(event.saleEndsAt).getTime()) return problem(422, 'SALE_CLOSED', 'Đã hết thời gian bán vé');

    // One active hold per user per event: a new hold replaces the previous one.
    db.orders
      .filter((o) => o.userId === user.id && o.eventId === event.id && o.status === 'PENDING')
      .forEach((o) => {
        o.status = 'CANCELLED';
        releaseSeats(o.eventId, o.code);
      });

    const tts = ticketTypeView(event);
    const items: OrderItem[] = [];
    const code = `TBX${randomCode(6)}`;

    if (event.seatingType === 'RESERVED') {
      const codes = [...new Set(body.seatCodes ?? [])];
      if (codes.length === 0) return problem(400, 'INVALID_ARGUMENT', 'Chọn ít nhất 1 ghế');
      const seats = codes.map((c) => db.seats[event.id]!.find((s) => s.code === c));
      if (seats.some((s) => !s)) return problem(404, 'SEAT_NOT_FOUND', 'Ghế không tồn tại');
      seats.forEach((s) => {
        const t = tts.find((x) => x.id === s!.ticketTypeId)!;
        items.push({ ticketTypeId: t.id, ticketTypeName: t.name, seatCode: s!.code, price: t.price });
      });
    } else {
      for (const line of body.items ?? []) {
        const t = tts.find((x) => x.id === line.ticketTypeId);
        if (!t) return problem(404, 'TICKET_TYPE_NOT_FOUND', 'Loại vé không tồn tại');
        for (let i = 0; i < line.quantity; i++) items.push({ ticketTypeId: t.id, ticketTypeName: t.name, price: t.price });
      }
      if (items.length === 0) return problem(400, 'INVALID_ARGUMENT', 'Chọn ít nhất 1 vé');
    }

    // Limits: per order, per tier, and per user per event (anti-scalping).
    if (items.length > RULES.maxTicketsPerOrder) {
      return problem(422, 'LIMIT_EXCEEDED', `Tối đa ${RULES.maxTicketsPerOrder} vé mỗi đơn`);
    }
    for (const t of tts) {
      const n = items.filter((i) => i.ticketTypeId === t.id).length;
      if (n > t.maxPerOrder) return problem(422, 'LIMIT_EXCEEDED', `Hạng ${t.name}: tối đa ${t.maxPerOrder} vé mỗi đơn`);
    }
    const alreadyBought = activeOrdersOf(event.id)
      .filter((o) => o.userId === user.id && o.status !== 'PENDING')
      .reduce((s, o) => s + o.items.length, 0);
    if (alreadyBought + items.length > RULES.maxTicketsPerOrder) {
      return problem(422, 'PURCHASE_LIMIT', `Mỗi tài khoản mua tối đa ${RULES.maxTicketsPerOrder} vé cho sự kiện này (đã mua ${alreadyBought})`);
    }

    // Availability: the race-sensitive check. Backend does this inside one transaction with locking.
    if (event.seatingType === 'RESERVED') {
      const seats = items.map((i) => db.seats[event.id]!.find((s) => s.code === i.seatCode)!);
      const taken = seats.filter((s) => s.status !== 'AVAILABLE').map((s) => s.code);
      if (taken.length) return problem(409, 'SEAT_NOT_AVAILABLE', `Ghế vừa có người khác giữ: ${taken.join(', ')}`);
      seats.forEach((s) => ((s.status = 'HELD'), (s.orderCode = code)));
    } else {
      for (const t of tts) {
        const n = items.filter((i) => i.ticketTypeId === t.id).length;
        if (n > t.available) return problem(409, 'SOLD_OUT', `Hạng ${t.name} chỉ còn ${t.available} vé`);
      }
    }

    const venue = findVenue(event.venueId);
    const order: Order = {
      code, userId: user.id, eventId: event.id, eventName: event.name, eventStartsAt: event.startsAt, venueName: venue.name,
      status: 'PENDING', items, subtotal: 0, discount: 0, serviceFee: 0, total: 0,
      expiresAt: new Date(now + RULES.holdMinutes * 60_000).toISOString(), createdAt: new Date(now).toISOString(), tickets: [],
    };
    recalc(order);
    db.orders.push(order);
    save();
    return HttpResponse.json(order, { status: 201 });
  }),

  http.get(`${API}/orders/:code`, async ({ request, params }) => {
    await delay(200);
    const user = requireRole(request);
    if (user instanceof Response) return user;
    sweepExpired();
    const order = ownOrder(String(params.code), user.id);
    return order ? HttpResponse.json(order) : problem(404, 'ORDER_NOT_FOUND', 'Order not found');
  }),

  http.post(`${API}/orders/:code/promo`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'CUSTOMER');
    if (user instanceof Response) return user;
    sweepExpired();
    const order = ownOrder(String(params.code), user.id);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'PENDING') return problem(409, 'INVALID_STATE', 'Đơn không còn chờ thanh toán');
    const { code } = (await request.json()) as { code?: string };
    const normalized = (code ?? '').trim().toUpperCase();
    if (!normalized) {
      order.promoCode = undefined;
    } else {
      const promo = db.promoCodes.find((p) => p.eventId === order.eventId && p.code === normalized);
      if (!promo || new Date(promo.validUntil).getTime() < Date.now()) return problem(422, 'PROMO_INVALID', 'Mã giảm giá không hợp lệ hoặc đã hết hạn');
      if (promo.used >= promo.maxUses) return problem(422, 'PROMO_EXHAUSTED', 'Mã giảm giá đã hết lượt sử dụng');
      order.promoCode = promo.code;
    }
    recalc(order);
    save();
    return HttpResponse.json(order);
  }),

  /** Save buyer info and return bank transfer instructions (VietQR). */
  http.post(`${API}/orders/:code/checkout`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'CUSTOMER');
    if (user instanceof Response) return user;
    sweepExpired();
    const order = ownOrder(String(params.code), user.id);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status === 'EXPIRED') return problem(410, 'ORDER_EXPIRED', 'Hết thời gian giữ chỗ');
    if (order.status !== 'PENDING') return problem(409, 'INVALID_STATE', 'Đơn không còn chờ thanh toán');
    const buyer = (await request.json()) as { fullName?: string; email?: string; phone?: string };
    const errors: { field: string; message: string }[] = [];
    if (!buyer.fullName?.trim()) errors.push({ field: 'fullName', message: 'must not be blank' });
    if (!/^\S+@\S+\.\S+$/.test(buyer.email ?? '')) errors.push({ field: 'email', message: 'must be a well-formed email address' });
    if (!/^0\d{9}$/.test(buyer.phone ?? '')) errors.push({ field: 'phone', message: 'must be a valid VN phone number' });
    if (errors.length) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', errors);
    order.buyer = { fullName: buyer.fullName!.trim(), email: buyer.email!.trim(), phone: buyer.phone! };
    save();
    const { bank } = config;
    const payment: PaymentInstruction = {
      orderCode: order.code, amount: order.total, bankId: bank.id, accountNo: bank.accountNo, accountName: bank.accountName,
      transferContent: order.code, expiresAt: order.expiresAt,
      qrImageUrl: vietQrUrl({ bankId: bank.id, accountNo: bank.accountNo, accountName: bank.accountName, amount: order.total, content: order.code }),
    };
    return HttpResponse.json(payment);
  }),

  http.post(`${API}/orders/:code/cancel`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'CUSTOMER');
    if (user instanceof Response) return user;
    const order = ownOrder(String(params.code), user.id);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'PENDING') return problem(409, 'INVALID_STATE', 'Chỉ hủy được đơn đang chờ thanh toán');
    order.status = 'CANCELLED';
    releaseSeats(order.eventId, order.code);
    save();
    return HttpResponse.json(order);
  }),

  http.post(`${API}/orders/:code/refund-request`, async ({ request, params }) => {
    await delay();
    const user = requireRole(request, 'CUSTOMER');
    if (user instanceof Response) return user;
    const order = ownOrder(String(params.code), user.id);
    if (!order) return problem(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'PAID') return problem(409, 'INVALID_STATE', 'Chỉ yêu cầu hoàn tiền cho đơn đã thanh toán');
    if (order.tickets.some((t) => t.status === 'CHECKED_IN')) return problem(409, 'INVALID_STATE', 'Vé đã được check-in');
    if (!canRequestRefund(order.eventStartsAt)) {
      return problem(422, 'REFUND_WINDOW_CLOSED', `Chỉ hoàn vé trước ngày diễn ra ít nhất ${RULES.refundDeadlineDays} ngày`);
    }
    const { reason } = (await request.json()) as { reason?: string };
    order.status = 'REFUND_REQUESTED';
    order.refundReason = reason?.trim() || undefined;
    order.refundAmount = Math.round(((order.subtotal - order.discount) * RULES.refundPercent) / 100);
    order.tickets.forEach((t) => (t.status = 'CANCELLED')); // frozen while the request is reviewed
    save();
    return HttpResponse.json(order);
  }),

  http.get(`${API}/me/orders`, async ({ request }) => {
    await delay();
    const user = requireRole(request);
    if (user instanceof Response) return user;
    sweepExpired();
    return HttpResponse.json(db.orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }),

  http.get(`${API}/me/tickets`, async ({ request }) => {
    await delay();
    const user = requireRole(request);
    if (user instanceof Response) return user;
    const tickets = db.orders
      .filter((o) => o.userId === user.id && ['PAID', 'REFUND_REQUESTED', 'REFUNDED'].includes(o.status))
      .flatMap((o) => o.tickets)
      .sort((a, b) => a.eventStartsAt.localeCompare(b.eventStartsAt));
    return HttpResponse.json(tickets);
  }),
];
