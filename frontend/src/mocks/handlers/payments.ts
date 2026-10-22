import { ORDER_CODE_PATTERN } from '@/lib/rules';
import type { BankTransaction, Order } from '@/lib/types';
import { delay, http, HttpResponse } from 'msw';
import { db, issueTickets, nextId, save, sweepExpired } from '../db';
import { API, problem } from '../utils';

export const MOCK_BANK_API_KEY = 'mock-bank-key';

/** Marks an order PAID: seats SOLD, tickets issued, promo usage counted. Shared with admin manual match. */
export function markPaid(order: Order, paidAt: string) {
  order.status = 'PAID';
  order.paidAt = paidAt;
  (db.seats[order.eventId] ?? []).filter((s) => s.orderCode === order.code).forEach((s) => (s.status = 'SOLD'));
  // Expired orders lost their seats: re-take them if still free (admin manual match).
  order.items
    .filter((i) => i.seatCode)
    .forEach((i) => {
      const seat = db.seats[order.eventId]!.find((s) => s.code === i.seatCode)!;
      seat.status = 'SOLD';
      seat.orderCode = order.code;
    });
  order.tickets = issueTickets(order);
  const promo = order.promoCode ? db.promoCodes.find((p) => p.eventId === order.eventId && p.code === order.promoCode) : undefined;
  if (promo) promo.used++;
}

/**
 * Bank webhook (SePay / Casso style): the bank calls us for EVERY incoming transfer.
 * - Authenticated by an API key header, not by a user token.
 * - Idempotent on transactionId: banks retry, the same transfer must never be applied twice.
 * - Always answers 200 for well-formed calls, otherwise the bank keeps retrying; problems are
 *   recorded as UNMATCHED transactions for an admin to resolve.
 */
export const paymentHandlers = [
  http.post(`${API}/payments/webhook/bank`, async ({ request }) => {
    await delay(300);
    if (request.headers.get('X-Api-Key') !== MOCK_BANK_API_KEY) return problem(401, 'UNAUTHORIZED', 'Invalid API key');
    sweepExpired();
    const body = (await request.json()) as { transactionId: string; amount: number; content: string; transferredAt?: string };

    if (db.bankTransactions.some((t) => t.transactionId === body.transactionId)) {
      return HttpResponse.json({ success: true, duplicate: true });
    }

    const tx: BankTransaction = {
      id: nextId(), transactionId: body.transactionId, amount: body.amount, content: body.content,
      transferredAt: body.transferredAt ?? new Date().toISOString(), status: 'UNMATCHED',
    };
    db.bankTransactions.push(tx);

    const code = body.content.toUpperCase().replace(/\s+/g, '').match(ORDER_CODE_PATTERN)?.[0];
    const order = code ? db.orders.find((o) => o.code === code) : undefined;

    if (!order) tx.note = 'Không tìm thấy mã đơn trong nội dung';
    else if (order.status === 'PAID' || order.status === 'REFUND_REQUESTED') tx.note = `Đơn ${order.code} đã thanh toán trước đó (chuyển trùng)`;
    else if (order.status !== 'PENDING') tx.note = `Đơn ${order.code} đã ${order.status === 'EXPIRED' ? 'hết hạn' : 'hủy'} trước khi nhận tiền`;
    else if (body.amount < order.total) tx.note = `Thiếu tiền: nhận ${body.amount}, cần ${order.total}`;
    else {
      markPaid(order, tx.transferredAt);
      tx.status = 'MATCHED';
      tx.orderCode = order.code;
    }
    if (order && tx.status === 'UNMATCHED') tx.orderCode = order.code;
    save();
    return HttpResponse.json({ success: true });
  }),
];
