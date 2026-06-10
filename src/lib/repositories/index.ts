import { createClient as createServerClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from './supabase-repositories';
import type { Repositories } from './types';

/** Server-side repositories bound to the current request's session cookies. */
export async function getRepositories(): Promise<Repositories> {
  const supabase = await createServerClient();
  return createSupabaseRepositories(supabase);
}

export { createSupabaseRepositories };

export type {
  Repositories,
  User, UserCreate, UserUpdate, UserRepository,
  Pool, PoolCreate, PoolUpdate, PoolSummary, PoolStatus, PoolRepository,
  PoolMember, PoolMemberCreate, PoolMemberUpdate, PoolMemberRepository,
  PlayerPick, PickCreate, PickUpdate, PickResult, PickRepository,
  MemberStatus,
} from './types';
