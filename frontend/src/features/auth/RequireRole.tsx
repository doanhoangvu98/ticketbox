import { FullPageSpinner } from '@/components/ui/Feedback';
import type { Role } from '@/lib/types';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

/**
 * Route guard. Not logged in -> /login?redirect=..., wrong role -> 403 page.
 * UX only: the backend still checks every request (@PreAuthorize). Never trust the client.
 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <FullPageSpinner />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;
  return <>{children}</>;
}
