'use client';

import type { AuthService } from './types';
import type { AuthUser, Role } from '@/lib/permissions/types';
import { createClient } from '@/lib/supabase/client';

async function buildAuthUser(userId: string, email: string): Promise<AuthUser | null> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, role')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', userId);

  const { data: createdPools } = await supabase
    .from('pools')
    .select('id')
    .eq('created_by', userId);

  return {
    id: userId,
    email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role as Role,
    poolMemberships: (memberships ?? []).map((m) => m.pool_id),
    createdPools: (createdPools ?? []).map((p) => p.id),
  };
}

export const supabaseAuthService: AuthService = {
  async getCurrentUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return buildAuthUser(user.id, user.email ?? '');
  },

  async sendMagicLink(email: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  },

  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  },

  async isAuthenticated() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user !== null;
  },
};
