import type { AuthUser } from '@/lib/permissions/types';

export interface AuthService {
  /** Get the currently logged-in user (null if not authenticated) */
  getCurrentUser(): Promise<AuthUser | null>;

  /** Send a magic-link email. User clicks the link to complete sign-in. */
  sendMagicLink(email: string): Promise<void>;

  /**
   * Verify the 6-digit code from the same sign-in email. Lets a user finish
   * sign-in in whichever browser they're holding — the escape hatch for links
   * that open inside an in-app browser (e.g. the Gmail app) whose cookies never
   * reach Chrome/Safari. Sets the session in the current browser on success.
   */
  verifyEmailOtp(email: string, token: string): Promise<void>;

  /** Sign out */
  signOut(): Promise<void>;

  /** Check if a session exists */
  isAuthenticated(): Promise<boolean>;
}
