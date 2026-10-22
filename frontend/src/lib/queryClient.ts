import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry network/5xx once, never retry 4xx (they will fail again).
      retry: (count: number, error: unknown) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
    },
  },
});
