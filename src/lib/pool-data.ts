import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import type { UserPool, Stage, PoolStatus } from '@/types';

export const GLOBAL_POOL_ID = '00000000-0000-0000-0000-000000000001';

export async function getCurrentUserPool(): Promise<UserPool | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const repos = createSupabaseRepositories(supabase);
  const member = await repos.poolMembers.findByPoolAndUser(GLOBAL_POOL_ID, user.id);
  if (!member) return null;

  const summary = await repos.pools.getSummary(GLOBAL_POOL_ID);
  if (!summary) return null;

  const picks = await repos.picks.findByMember(member.id);
  const picksByStage: Partial<Record<Stage, string | null>> = {};
  for (const p of picks) picksByStage[p.stage as Stage] = p.teamCode;

  return {
    status: member.status as PoolStatus,
    stage: 'MD1' as Stage,
    pot: summary.pot,
    survivors: summary.aliveCount + summary.redemptionCount,
    players: summary.totalPlayers,
    picks: picksByStage,
    buyIn: summary.buyIn,
    eliminatedAt: member.eliminatedAt ?? undefined,
    poolId: summary.id,
    memberId: member.id,
  };
}
