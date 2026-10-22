import { HttpResponse } from 'msw';
import type { Role } from '@/lib/types';
import { db, type DbUser } from './db';

export const API = '/api/v1';

/** Same JSON shape as the Spring GlobalExceptionHandler (RFC 7807 + errorCode). */
export function problem(status: number, errorCode: string, detail: string, errors?: { field: string; message: string }[]) {
  return HttpResponse.json(
    { type: `https://ticketbox.dev/errors/${errorCode.toLowerCase().replace(/_/g, '-')}`, status, detail, errorCode, errors, timestamp: new Date().toISOString() },
    { status },
  );
}

/** Mock token format: "mock.<userId>". The real backend issues a signed JWT. */
export const tokenFor = (userId: number) => `mock.${userId}`;

export function currentUser(request: Request): DbUser | undefined {
  const match = request.headers.get('Authorization')?.match(/^Bearer mock\.(\d+)$/);
  return match ? db.users.find((u) => u.id === Number(match[1])) : undefined;
}

/** Returns the user, or a 401/403 response to return immediately. */
export function requireRole(request: Request, ...roles: Role[]): DbUser | Response {
  const user = currentUser(request);
  if (!user) return problem(401, 'UNAUTHORIZED', 'Authentication required');
  if (user.status === 'LOCKED') return problem(403, 'ACCOUNT_LOCKED', 'Account is locked');
  if (roles.length > 0 && !roles.includes(user.role)) return problem(403, 'FORBIDDEN', `Requires role: ${roles.join(', ')}`);
  return user;
}

export function paginate<T>(all: T[], url: URL, defaultSize = 12) {
  const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? defaultSize)));
  const totalPages = Math.max(1, Math.ceil(all.length / size));
  return { items: all.slice(page * size, (page + 1) * size), page, size, totalItems: all.length, totalPages, hasNext: page + 1 < totalPages };
}

/** Deterministic synthetic daily sales for charts (last `days` days). */
export function syntheticDaily(seed: number, days: number, avgTickets: number, avgPrice: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    const wave = 0.55 + 0.45 * Math.abs(Math.sin((seed + i) * 1.7));
    const tickets = Math.round(avgTickets * wave * (0.6 + i / days));
    return { date: d.toISOString().slice(0, 10), tickets, revenue: tickets * avgPrice };
  });
}
