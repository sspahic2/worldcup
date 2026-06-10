'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import type { Pool } from '@/lib/repositories/types';

export async function createPool(input: {
  name: string;
  groupKey: string;
  buyIn: number;
}): Promise<Pool> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const name = input.name.trim();
  if (!name) throw new Error('Pool name is required');
  if (!/^[A-L]$/.test(input.groupKey)) throw new Error('Invalid group');
  if (!Number.isInteger(input.buyIn) || input.buyIn <= 0) throw new Error('Invalid buy-in');

  const repos = createSupabaseRepositories(supabase);
  const pool = await repos.pools.create({
    name,
    groupKey: input.groupKey,
    buyIn: input.buyIn,
    createdBy: user.id,
  });
  await repos.poolMembers.create({ poolId: pool.id, userId: user.id });

  revalidatePath('/');
  return pool;
}

export async function joinPool(inviteCode: string): Promise<Pool> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error('Invite code is required');

  const repos = createSupabaseRepositories(supabase);
  const pool = await repos.pools.findByInviteCode(code);
  if (!pool) throw new Error('Invalid invite code');
  if (pool.status !== 'open') throw new Error('Pool is no longer accepting players');

  const existing = await repos.poolMembers.findByPoolAndUser(pool.id, user.id);
  if (existing) throw new Error('Already a member of this pool');

  await repos.poolMembers.create({ poolId: pool.id, userId: user.id });

  revalidatePath('/');
  return pool;
}
