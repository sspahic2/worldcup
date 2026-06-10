import { createClient } from '@/lib/supabase/server';
import type { AuthUser, Role } from '@/lib/permissions/types';

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', user.id);

  const { data: createdPools } = await supabase
    .from('pools')
    .select('id')
    .eq('created_by', user.id);

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role as Role,
    poolMemberships: (memberships ?? []).map((m) => m.pool_id),
    createdPools: (createdPools ?? []).map((p) => p.id),
  };
}
