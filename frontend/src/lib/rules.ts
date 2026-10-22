/**
 * Business rules shared by the UI and the mock backend.
 * The real backend is the source of truth; these values must match docs/DOMAIN.md.
 */
export const RULES = {
  holdMinutes: 10,
  maxTicketsPerOrder: 8,
  serviceFeePerTicket: 5_000,
  refundDeadlineDays: 7,
  refundPercent: 90, // customer-requested refund keeps 10% as processing fee
} as const;

export const ORDER_CODE_PATTERN = /TBX[A-Z0-9]{6}/;

export function serviceFee(ticketCount: number): number {
  return ticketCount * RULES.serviceFeePerTicket;
}

export function canRequestRefund(eventStartsAt: string, now = Date.now()): boolean {
  return new Date(eventStartsAt).getTime() - now >= RULES.refundDeadlineDays * 86_400_000;
}
