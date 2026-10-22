import { TOKEN_KEY, UNAUTHORIZED_EVENT } from '@/lib/api';
import type { AuthResponse, Role, User } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from './api';

const USER_KEY = 'tb.user';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Record<Role, string> = {
  CUSTOMER: '/',
  ORGANIZER: '/organizer',
  STAFF: '/staff',
  ADMIN: '/admin',
};

/**
 * Keeps the signed-in user. Token lives in localStorage (simple; see ADR-FE-06 for the trade-off
 * vs. httpOnly cookies). On start-up the token is verified with GET /auth/me.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    queryClient.clear(); // never show the previous user's cached data
  }, [queryClient]);

  const signIn = useCallback((res: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    queryClient.clear();
    setUser(res.user);
  }, [queryClient]);

  // Validate the stored token once.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then((me) => {
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      })
      .catch(() => signOut())
      .finally(() => setReady(true));
  }, [signOut]);

  // Any 401 from the API (expired token) logs the user out.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signOut, hasRole: (...roles) => !!user && roles.includes(user.role) }),
    [user, ready, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
