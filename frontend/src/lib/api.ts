import axios, { AxiosError } from 'axios';
import { config } from './config';

/** Error body from GlobalExceptionHandler (RFC 7807 ProblemDetail). */
interface ProblemDetail {
  status?: number;
  title?: string;
  detail?: string;
  errorCode?: string;
  errors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = problem.errorCode ?? 'UNKNOWN';
    this.fieldErrors = Object.fromEntries((problem.errors ?? []).map((e) => [e.field, e.message]));
  }
}

export const TOKEN_KEY = 'tb.token';
export const UNAUTHORIZED_EVENT = 'tb:unauthorized';

/** Single axios instance for the whole app. */
export const api = axios.create({ baseURL: config.apiBase, timeout: 15_000 });

// Request: attach the JWT.
api.interceptors.request.use((req) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Response: normalise every failure into ApiError; broadcast 401 so AuthProvider can log out.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ProblemDetail>) => {
    const status = error.response?.status ?? 0;
    if (status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const body = error.response?.data ?? { detail: error.message, errorCode: 'NETWORK_ERROR' };
    return Promise.reject(new ApiError(status, body));
  },
);

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
