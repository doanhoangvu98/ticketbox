import { ThemeProvider } from '@/app/ThemeProvider';
import { router } from '@/app/router';
import { I18nProvider } from '@/i18n/I18nProvider';
import { config } from '@/lib/config';
import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';

/**
 * Start MSW before the first render so no request escapes to the network.
 * The dynamic import keeps the whole mock layer out of the production bundle when VITE_USE_MOCK=false.
 */
async function enableMocking() {
  if (!config.useMock) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <RouterProvider router={router} />
          </I18nProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      </QueryClientProvider>
    </StrictMode>,
  );
});
