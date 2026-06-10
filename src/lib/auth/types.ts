import type { AuthUser } from '@/lib/permissions/types';

export interface AuthService {
  /** Get the currently logged-in user (null if not authenticated) */
  getCurrentUser(): Promise<AuthUser | null>;

  /** Send a magic-link email. User clicks the link to complete sign-in. */
  sendMagicLink(email: string): Promise<void>;

  /** Sign out */
  signOut(): Promise<void>;

  /** Check if a session exists */
  isAuthenticated(): Promise<boolean>;
}
