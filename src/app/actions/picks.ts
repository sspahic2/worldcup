'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import { isLocked, LOCK_BEFORE_KICKOFF_MINUTES } from '@/lib/picks/lock-rules';
import type { PlayerPick } from '@/lib/repositories/types';

const VALID_STAGES = new Set(['MD1', 'MD2', 'MD3', 'R32', 'R16', 'QF', 'SF', 'F']);

export async function submitPick(input: {
  poolMemberId: string;
  stage: string;
  teamCode: string;
  fdMatchId?: number;
}): Promise<PlayerPick> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!VALID_STAGES.has(input.stage)) throw new Error('Invalid stage');
  const teamCode = input.teamCode.trim().toUpperCase();
  if (!teamCode) throw new Error('Team is required');

  const repos = createSupabaseRepositories(supabase);

  const member = await repos.poolMembers.findById(input.poolMemberId);
  if (!member || member.userId !== user.id) throw new Error('Membership not found');
  if (member.status !== 'alive' && member.status !== 'redemption') {
    throw new Error('You are not active in this pool');
  }

  const priorPicks = await repos.picks.findByMember(member.id);
  if (priorPicks.some((p) => p.stage === input.stage)) {
    throw new Error('Pick already locked for this stage');
  }
  if (priorPicks.some((p) => p.teamCode === teamCode)) {
    throw new Error(`${teamCode} has already been used in this pool`);
  }

  if (input.fdMatchId) {
    const { data: match } = await supabase
      .from('match_cache')
      .select('utc_date, home_team_tla, away_team_tla')
      .eq('fd_match_id', input.fdMatchId)
      .maybeSingle();
    if (match) {
      if (isLocked(match.utc_date as string)) {
        throw new Error(`Picks lock ${LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff`);
      }
      if (teamCode !== match.home_team_tla && teamCode !== match.away_team_tla) {
        throw new Error('Team is not in the selected match');
      }
    }
  }

  const pick = await repos.picks.create({
    poolMemberId: member.id,
    stage: input.stage,
    teamCode,
    fdMatchId: input.fdMatchId,
  });

  revalidatePath('/');
  return pick;
}
