/**
 * VietQR "quick link": an image URL that renders a NAPAS 247 QR any Vietnamese banking app can scan.
 * Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=&addInfo=&accountName=
 * The transfer content (addInfo) carries the order code so the bank webhook can match the payment.
 */
export function vietQrUrl(p: { bankId: string; accountNo: string; accountName: string; amount: number; content: string }) {
  const q = new URLSearchParams({ amount: String(p.amount), addInfo: p.content, accountName: p.accountName });
  return `https://img.vietqr.io/image/${p.bankId}-${p.accountNo}-compact2.png?${q.toString()}`;
}
