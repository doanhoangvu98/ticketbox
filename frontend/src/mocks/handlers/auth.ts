import { delay, http, HttpResponse } from 'msw';
import { db, nextId, publicUser, save } from '../db';
import { API, currentUser, problem, tokenFor } from '../utils';

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay();
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    // Same message for "no such user" and "wrong password": do not reveal which emails exist.
    if (!user || user.password !== password) return problem(401, 'BAD_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
    if (user.status === 'LOCKED') return problem(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) });
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay();
    const body = (await request.json()) as { fullName?: string; email?: string; phone?: string; password?: string };
    const errors: { field: string; message: string }[] = [];
    if (!body.fullName?.trim()) errors.push({ field: 'fullName', message: 'must not be blank' });
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) errors.push({ field: 'email', message: 'must be a well-formed email address' });
    if ((body.password ?? '').length < 6) errors.push({ field: 'password', message: 'size must be at least 6' });
    if (errors.length) return problem(400, 'INVALID_ARGUMENT', 'Validation failed', errors);
    if (db.users.some((u) => u.email.toLowerCase() === body.email!.toLowerCase())) {
      return problem(409, 'EMAIL_TAKEN', 'Email đã được sử dụng', [{ field: 'email', message: 'already registered' }]);
    }
    const user = {
      id: nextId(), fullName: body.fullName!.trim(), email: body.email!.trim(), phone: body.phone, role: 'CUSTOMER' as const,
      status: 'ACTIVE' as const, password: body.password!, createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    save();
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) }, { status: 201 });
  }),

  http.get(`${API}/auth/me`, async ({ request }) => {
    await delay(150);
    const user = currentUser(request);
    return user ? HttpResponse.json(publicUser(user)) : problem(401, 'UNAUTHORIZED', 'Authentication required');
  }),
];
