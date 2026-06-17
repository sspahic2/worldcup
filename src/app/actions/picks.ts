'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyPickSaved } from '@/lib/email/notify';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import { isLocked, LOCK_BEFORE_KICKOFF_MINUTES } from '@/lib/picks/lock-rules';
import { STAGES } from '@/lib/data/teams';
import type { PlayerPick, Pool, PoolMember, Repositories } from '@/lib/repositories/types';

const VALID_STAGES = new Set<string>(STAGES);
const GROUP_STAGE_SET = new Set<string>(['MD1', 'MD2', 'MD3']);

type MatchRow = {
  utc_date: string;
  home_team_tla: string | null;
  away_team_tla: string | null;
  group_key: string | null;
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
 * Per-pool stage rules for the group-track model:
 *   - Group pools (group_key set) only take group-stage picks (MD1-MD3).
 *   - The global pool only takes knockout picks (R32 onwards).
 */
async function requirePoolForStage(
  repos: Repositories,
  member: PoolMember,
  stage: string,
): Promise<Pool> {
  const pool = await repos.pools.findById(member.poolId);
  if (!pool) throw new Error('Pool not found for this membership');

  if (pool.groupKey) {
    if (!GROUP_STAGE_SET.has(stage)) {
      throw new Error(
        `Group ${pool.groupKey} is a group-stage pool — picks are Matchday 1-3 only`,
      );
    }
  } else if (GROUP_STAGE_SET.has(stage)) {
    throw new Error(
      'Group-stage picks belong in your group pools — the main pool starts at the Round of 32',
    );
  }
  return pool;
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
    .select('utc_date, home_team_tla, away_team_tla, group_key')
    .eq('fd_match_id', fdMatchId)
    .maybeSingle();
  if (error || !match) throw new Error('Match not found for pick');
  if (isLocked(match.utc_date as string)) {
    throw new Error(`Picks lock ${LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff`);
  }
  return match as MatchRow;
}

/**
 * Group-stage week lock: a group's whole matchday locks when its FIRST game
 * kicks off (rule: lock all picks for the week before its first game). Without
 * this, a player could still pick a team in the week's later game after the
 * earlier one already played. No-op for knockout stages (no group week).
 */
async function assertGroupWeekOpen(
  supabase: SupabaseClient,
  groupKey: string | null,
  stage: string,
): Promise<void> {
  if (!GROUP_STAGE_SET.has(stage) || !groupKey) return;
  const { data, error } = await supabase
    .from('match_cache')
    .select('utc_date')
    .eq('group_key', groupKey)
    .eq('stage', stage)
    .order('utc_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  // No cached fixtures → leave the per-match lock as the only guard.
  if (error || !data) return;
  if (isLocked(data.utc_date as string)) {
    throw new Error('This matchday locked when its first game kicked off');
  }
}

export type PickActionResult =
  | { ok: true; pick: PlayerPick | null }
  | { ok: false; error: string };

// Thrown errors from server actions are masked in production builds, so rule
// violations are returned as structured results instead.
export async function submitPick(input: {
  poolMemberId: string;
  stage: string;
  teamCode: string;
  fdMatchId?: number;
}): Promise<PickActionResult> {
  try {
    return { ok: true, pick: await submitPickOrThrow(input) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save pick' };
  }
}

export async function deletePick(input: {
  poolMemberId: string;
  stage: string;
}): Promise<PickActionResult> {
  try {
    await deletePickOrThrow(input);
    return { ok: true, pick: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove pick' };
  }
}

async function submitPickOrThrow(input: {
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
  const pool = await requirePoolForStage(repos, member, input.stage);

  const priorPicks = await repos.picks.findByMember(member.id);
  const existing = priorPicks.find((p) => p.stage === input.stage) ?? null;

  if (existing && existing.result !== 'pending') {
    throw new Error('Your pick for this stage is already settled — next stage opens soon');
  }

  // No-repeat-team rule — GROUP STAGE ONLY: a group track can't reuse a team
  // across its 3 weeks. Knockout picks (global pool) may reuse teams freely.
  if (pool.groupKey && priorPicks.some((p) => p.stage !== input.stage && p.teamCode === teamCode)) {
    throw new Error(`${teamCode} has already been used in this group`);
  }

  // The target match must exist, still be open, and involve the picked team.
  const match = await fetchOpenMatch(supabase, input.fdMatchId);
  if (teamCode !== match.home_team_tla && teamCode !== match.away_team_tla) {
    throw new Error('Team is not in the selected match');
  }

  // Group pools only accept that group's fixtures.
  if (pool.groupKey && match.group_key !== pool.groupKey) {
    throw new Error(`That match isn't a Group ${pool.groupKey} fixture — pick from your group's matches`);
  }

  // Whole-week lock for group stages (locks once the week's first game starts).
  await assertGroupWeekOpen(supabase, pool.groupKey, input.stage);

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

async function deletePickOrThrow(input: {
  poolMemberId: string;
  stage: string;
}): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUser(supabase);

  if (!VALID_STAGES.has(input.stage)) throw new Error('Invalid stage');

  const repos = createSupabaseRepositories(supabase);
  const member = await requireActiveMember(repos, input.poolMemberId, userId);
  const pool = await repos.pools.findById(member.poolId);

  const pick = await repos.picks.findByMemberAndStage(member.id, input.stage);
  if (!pick) throw new Error('No pick found for this stage');
  if (pick.result !== 'pending') {
    throw new Error('Your pick for this stage is already settled — next stage opens soon');
  }

  await fetchOpenMatch(supabase, pick.fdMatchId);
  // Can't pull a pick once the week has locked, same as submitting one.
  await assertGroupWeekOpen(supabase, pool?.groupKey ?? null, input.stage);

  await repos.picks.delete(pick.id);

  revalidatePath('/');
}
