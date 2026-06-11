'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';

export async function updateProfile(displayName: string): Promise<{ displayName: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const name = displayName.trim();
  if (name.length < 2 || name.length > 30) {
    throw new Error('Display name must be 2-30 characters');
  }

  const repos = createSupabaseRepositories(supabase);
  const updated = await repos.users.update(user.id, { displayName: name });

  revalidatePath('/');
  return { displayName: updated.displayName };
}
