'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthUser, Resource, Action } from './types';
import { hasPermission, canVisitPage, getAllowedActions } from './check';
import { authService } from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Check if user can perform action on resource */
  can: (resource: Resource, action: Action, context?: { poolId?: string; resourceOwnerId?: string; memberStatus?: 'alive' | 'redemption' | 'eliminated' | 'won' }) => boolean;
  /** Check if user can visit a page */
  canVisit: (resource: Resource, context?: { poolId?: string; memberStatus?: 'alive' | 'redemption' | 'eliminated' | 'won' }) => boolean;
  /** Get all allowed actions for a resource */
  allowedActions: (resource: Resource, context?: { poolId?: string; resourceOwnerId?: string; memberStatus?: 'alive' | 'redemption' | 'eliminated' | 'won' }) => Action[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Refresh user from session (call after login) */
  refreshUser: () => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ user: initialUser, children }: { user: AuthUser | null; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(initialUser === null);

  useEffect(() => {
    if (initialUser !== null) return;
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, [initialUser]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    const u = await authService.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    can: (resource, action, context) => hasPermission(user, resource, action, context),
    canVisit: (resource, context) => canVisitPage(user, resource, context),
    allowedActions: (resource, context) => getAllowedActions(user, resource, context),
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin',
    refreshUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
