'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isLocked, LOCK_BEFORE_KICKOFF_MINUTES } from '@/lib/picks/lock-rules';

const KNOCKOUT_STAGES = new Set(['R32', 'R16', 'QF', 'SF', 'F']);

export type KnockoutPickResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Pick a team for one knockout life in a given round.
 *
 * Rules (per the locked design):
 *   - R32: the team must be one of the life's source-group qualifiers.
 *   - R16 → Final: any team playing that round (reuse allowed, no uniqueness).
 *   - The pick locks 60 min before its match; a settled pick can't be changed.
 */
export async function submitKnockoutPick(input: {
  lifeId: string;
  stage: string;
  teamCode: string;
  fdMatchId: number;
}): Promise<KnockoutPickResult> {
  try {
    await submitKnockoutPickOrThrow(input);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save pick' };
  }
}

async function submitKnockoutPickOrThrow(input: {
  lifeId: string;
  stage: string;
  teamCode: string;
  fdMatchId: number;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const stage = input.stage;
  if (!KNOCKOUT_STAGES.has(stage)) throw new Error('Not a knockout round');
  const teamCode = input.teamCode.trim().toUpperCase();
  if (!teamCode) throw new Error('Team is required');
  if (!input.fdMatchId) throw new Error('A match is required for this pick');

  // The life must belong to the signed-in user and still be alive.
  const { data: life, error: lifeErr } = await supabase
    .from('knockout_lives')
    .select('id, source_group_key, status, is_bonus, pool_members!inner(user_id)')
    .eq('id', input.lifeId)
    .maybeSingle();
  if (lifeErr || !life) throw new Error('Life not found');
  const owner = Array.isArray(life.pool_members) ? life.pool_members[0] : life.pool_members;
  if (!owner || owner.user_id !== user.id) throw new Error('That life is not yours');
  if (life.status !== 'alive' && life.status !== 'redemption') {
    throw new Error('This life is already out of the knockouts');
  }

  // Don't overwrite a settled pick.
  const { data: existing } = await supabase
    .from('knockout_picks')
    .select('id, result')
    .eq('life_id', input.lifeId)
    .eq('stage', stage)
    .maybeSingle();
  if (existing && existing.result !== 'pending') {
    throw new Error('Your pick for this round is already settled');
  }

  // The match must exist, be this round's fixture, still be open, and feature
  // the picked team.
  const { data: match, error: matchErr } = await supabase
    .from('match_cache')
    .select('stage, home_team_tla, away_team_tla, utc_date')
    .eq('fd_match_id', input.fdMatchId)
    .maybeSingle();
  if (matchErr || !match) throw new Error('Match not found for pick');
  if (match.stage !== stage) throw new Error("That match isn't in this round");
  if (teamCode !== match.home_team_tla && teamCode !== match.away_team_tla) {
    throw new Error('Team is not in the selected match');
  }
  if (isLocked(match.utc_date as string)) {
    throw new Error(`Picks lock ${LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff`);
  }

  // R32 entry is constrained to the life's source-group qualifiers.
  if (stage === 'R32' && life.source_group_key) {
    const { data: inGroup } = await supabase
      .from('match_cache')
      .select('fd_match_id')
      .eq('group_key', life.source_group_key)
      .in('stage', ['MD1', 'MD2', 'MD3'])
      .or(`home_team_tla.eq.${teamCode},away_team_tla.eq.${teamCode}`)
      .limit(1)
      .maybeSingle();
    if (!inGroup) {
      throw new Error(`Round of 32 pick must be a Group ${life.source_group_key} qualifier`);
    }
  }

  // Validated — write with the admin client (RLS allows owner reads only).
  const admin = createAdminClient();
  if (existing) {
    const { error } = await admin
      .from('knockout_picks')
      .update({ team_code: teamCode, fd_match_id: input.fdMatchId })
      .eq('id', existing.id);
    if (error) throw new Error('Could not update pick');
  } else {
    const { error } = await admin.from('knockout_picks').insert({
      life_id: input.lifeId,
      stage,
      team_code: teamCode,
      fd_match_id: input.fdMatchId,
    });
    if (error) throw new Error('Could not save pick');
  }

  revalidatePath('/');
}
