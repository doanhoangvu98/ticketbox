import { DevPanel } from '@/components/layout/DevPanel';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { config } from '@/lib/config';
import { ToastContainer } from 'react-toastify';
import { Outlet } from 'react-router';
import { useTheme } from './ThemeProvider';

/** Providers that need the router (navigate/useLocation) live here, inside RouterProvider. */
export function RootLayout() {
  const { isDark } = useTheme();
  return (
    <AuthProvider>
      <Outlet />
      {config.useMock && <DevPanel />}
      <ToastContainer position="top-right" autoClose={3500} newestOnTop theme={isDark ? 'dark' : 'light'} />
    </AuthProvider>
  );
}
