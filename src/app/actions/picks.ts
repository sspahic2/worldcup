'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyPickSaved } from '@/lib/email/notify';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import { isLocked, LOCK_BEFORE_KICKOFF_MINUTES } from '@/lib/picks/lock-rules';
import { STAGES } from '@/lib/data/teams';
import type { PlayerPick, PoolMember, Repositories } from '@/lib/repositories/types';

const VALID_STAGES = new Set<string>(STAGES);

type MatchRow = {
  utc_date: string;
  home_team_tla: string | null;
  away_team_tla: string | null;
};

/** Returns the authenticated user's id, or throws. */
async function requireUser(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

/** Returns the membership if it belongs to the user and is still active, or throws. */
async function requireActiveMember(
  repos: Repositories,
  poolMemberId: string,
  userId: string,
): Promise<PoolMember> {
  const member = await repos.poolMembers.findById(poolMemberId);
  if (!member || member.userId !== userId) throw new Error('Membership not found');
  if (member.status !== 'alive' && member.status !== 'redemption') {
    throw new Error('You are not active in this pool');
  }
  return member;
}

/**
 * Fetch the cached match a pick points at and assert it is still open.
 * Fail-closed: a missing match id, a query error or an absent cache row all
 * reject, so a pick can never bypass the lock window.
 */
async function fetchOpenMatch(
  supabase: SupabaseClient,
  fdMatchId: number | null | undefined,
): Promise<MatchRow> {
  if (!fdMatchId) throw new Error('Match not found for pick');
  const { data: match, error } = await supabase
    .from('match_cache')
    .select('utc_date, home_team_tla, away_team_tla')
    .eq('fd_match_id', fdMatchId)
    .maybeSingle();
  if (error || !match) throw new Error('Match not found for pick');
  if (isLocked(match.utc_date as string)) {
    throw new Error(`Picks lock ${LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff`);
  }
  return match as MatchRow;
}

export async function submitPick(input: {
  poolMemberId: string;
  stage: string;
  teamCode: string;
  fdMatchId?: number;
}): Promise<PlayerPick> {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  if (!VALID_STAGES.has(input.stage)) throw new Error('Invalid stage');
  const teamCode = input.teamCode.trim().toUpperCase();
  if (!teamCode) throw new Error('Team is required');
  if (!input.fdMatchId) throw new Error('A match is required for this pick');

  const repos = createSupabaseRepositories(supabase);
  const member = await requireActiveMember(repos, input.poolMemberId, userId);

  const priorPicks = await repos.picks.findByMember(member.id);
  const existing = priorPicks.find((p) => p.stage === input.stage) ?? null;

  if (existing && existing.result !== 'pending') {
    throw new Error('Pick already resolved for this stage');
  }

  // No-repeat-team rule, excluding the stage being changed.
  if (priorPicks.some((p) => p.stage !== input.stage && p.teamCode === teamCode)) {
    throw new Error(`${teamCode} has already been used in this pool`);
  }

  // The target match must exist, still be open, and involve the picked team.
  const match = await fetchOpenMatch(supabase, input.fdMatchId);
  if (teamCode !== match.home_team_tla && teamCode !== match.away_team_tla) {
    throw new Error('Team is not in the selected match');
  }

  // Changing a pick is only allowed while the original match is also still
  // open. If the pick stays on the same match the fetch above already covers it.
  if (existing && existing.fdMatchId !== input.fdMatchId) {
    await fetchOpenMatch(supabase, existing.fdMatchId);
  }

  const pick = existing
    ? await repos.picks.update(existing.id, { teamCode, fdMatchId: input.fdMatchId })
    : await repos.picks.create({
        poolMemberId: member.id,
        stage: input.stage,
        teamCode,
        fdMatchId: input.fdMatchId,
      });

  // Confirmation email, sent after the response — never blocks or fails the pick.
  after(() =>
    notifyPickSaved({
      userId,
      stage: input.stage,
      teamCode,
      previousTeamCode: existing?.teamCode ?? null,
      kickoffUtc: match.utc_date,
    }),
  );

  revalidatePath('/');
  return pick;
}

export async function deletePick(input: {
  poolMemberId: string;
  stage: string;
}): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  if (!VALID_STAGES.has(input.stage)) throw new Error('Invalid stage');

  const repos = createSupabaseRepositories(supabase);
  const member = await requireActiveMember(repos, input.poolMemberId, userId);

  const pick = await repos.picks.findByMemberAndStage(member.id, input.stage);
  if (!pick) throw new Error('No pick found for this stage');
  if (pick.result !== 'pending') {
    throw new Error('Pick already resolved for this stage');
  }

  await fetchOpenMatch(supabase, pick.fdMatchId);

  await repos.picks.delete(pick.id);

  revalidatePath('/');
}
