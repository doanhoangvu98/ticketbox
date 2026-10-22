import { api } from '@/lib/api';
import type { AuthResponse, User } from '@/lib/types';

export const authApi = {
  login: (body: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: { fullName: string; email: string; phone: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};
