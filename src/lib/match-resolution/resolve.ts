import { createAdminClient } from '@/lib/supabase/admin';
import { notifyPickResults, type ResolvedPickNotification } from '@/lib/email/notify';

export interface ResolveResult {
  picksResolved: number;
  membersEliminated: number;
}

interface CachedMatch {
  fd_match_id: number;
  group_key: string | null;
  stage: string;
  status: string;
  home_team_tla: string;
  away_team_tla: string;
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
}

interface PendingPick {
  id: string;
  pool_member_id: string;
  stage: string;
  team_code: string;
}

const GROUP_STAGES = new Set(['MD1', 'MD2', 'MD3']);
const KNOCKOUT_STAGES = new Set(['R32', 'R16', 'QF', 'SF', 'F']);

/**
 * Resolve pending picks against finished matches.
 *
 * Decisive match (HOME/AWAY winner):
 *   - pick.team_code is the winner → 'won'
 *   - pick.team_code is the loser  → 'lost'; member eliminated in that pool.
 *
 * Drawn match (group stage): a draw normally eliminates you, EXCEPT when BOTH
 * of the group's games that week are draws — then everyone who played the week
 * survives (no team could have won). A drawn pick stays PENDING until both of
 * the group+matchday's games have finished, so the exception can be evaluated.
 * Knockout draws don't occur (extra time / penalties decide a winner).
 *
 * Idempotent: only operates on picks with result='pending', so re-runs are safe.
 */
export async function resolvePicks(): Promise<ResolveResult> {
  const supabase = createAdminClient();

  const { data: matches, error: matchErr } = await supabase
    .from('match_cache')
    .select('fd_match_id, group_key, stage, status, home_team_tla, away_team_tla, winner');
  if (matchErr) throw matchErr;

  const all = (matches ?? []) as CachedMatch[];
  if (all.length === 0) return { picksResolved: 0, membersEliminated: 0 };

  // group+stage → its matches (a group week has 2 games) for the 2-draws rule.
  const byGroupStage = new Map<string, CachedMatch[]>();
  for (const m of all) {
    if (m.group_key == null) continue;
    const key = `${m.group_key}|${m.stage}`;
    const list = byGroupStage.get(key);
    if (list) list.push(m);
    else byGroupStage.set(key, [m]);
  }

  let picksResolved = 0;
  let membersEliminated = 0;
  const notifications: ResolvedPickNotification[] = [];

  for (const m of all) {
    if (m.status !== 'FINISHED' || !m.winner) continue;

    const decisiveWinnerTla =
      m.winner === 'HOME_TEAM' ? m.home_team_tla
      : m.winner === 'AWAY_TEAM' ? m.away_team_tla
      : null; // DRAW

    const { data: picks, error: picksErr } = await supabase
      .from('picks')
      .select('id, pool_member_id, stage, team_code')
      .eq('fd_match_id', m.fd_match_id)
      .eq('result', 'pending');
    if (picksErr) throw picksErr;

    for (const p of (picks ?? []) as PendingPick[]) {
      let won: boolean;

      if (decisiveWinnerTla !== null) {
        // Decisive match — picked the winner or not.
        won = p.team_code === decisiveWinnerTla;
      } else if (GROUP_STAGES.has(m.stage) && m.group_key != null) {
        // Drawn group-stage match. Wait for the whole week to finish, then the
        // pick survives only if BOTH of the week's games were draws.
        const week = byGroupStage.get(`${m.group_key}|${m.stage}`) ?? [m];
        const weekFinished = week.every((g) => g.status === 'FINISHED');
        if (!weekFinished) continue; // leave pending; decide once the week ends
        won = week.every((g) => g.winner === 'DRAW');
      } else {
        // Knockout draw (shouldn't happen) — treat as a loss.
        won = false;
      }

      const result = won ? 'won' : 'lost';

      const { error: updPickErr } = await supabase
        .from('picks')
        .update({ result })
        .eq('id', p.id);
      if (updPickErr) throw updPickErr;
      picksResolved++;
      notifications.push({
        poolMemberId: p.pool_member_id,
        stage: p.stage,
        teamCode: p.team_code,
        won,
      });

      if (!won) {
        const { error: updMemberErr, count } = await supabase
          .from('pool_members')
          .update({ status: 'eliminated', eliminated_at: p.stage }, { count: 'exact' })
          .eq('id', p.pool_member_id)
          .eq('status', 'alive');
        if (updMemberErr) throw updMemberErr;
        if (count && count > 0) membersEliminated++;
      }
    }
  }

  // ── Knockout picks ──────────────────────────────────────────────
  // Decisive winner per knockout match; a losing pick kills that life. A member
  // whose every life is dead is eliminated from the game. Knockouts never draw.
  for (const m of all) {
    if (m.status !== 'FINISHED' || !m.winner) continue;
    if (!KNOCKOUT_STAGES.has(m.stage)) continue;
    const winnerTla =
      m.winner === 'HOME_TEAM' ? m.home_team_tla
      : m.winner === 'AWAY_TEAM' ? m.away_team_tla
      : null;

    const { data: kpicks, error: kErr } = await supabase
      .from('knockout_picks')
      .select('id, life_id, team_code, stage')
      .eq('fd_match_id', m.fd_match_id)
      .eq('result', 'pending');
    if (kErr) throw kErr;

    for (const p of (kpicks ?? []) as { id: string; life_id: string; team_code: string; stage: string }[]) {
      const won = winnerTla !== null && p.team_code === winnerTla;
      const { error: updErr } = await supabase
        .from('knockout_picks')
        .update({ result: won ? 'won' : 'lost' })
        .eq('id', p.id);
      if (updErr) throw updErr;
      picksResolved++;
      if (!won) {
        const { error: lifeErr } = await supabase
          .from('knockout_lives')
          .update({ status: 'eliminated', eliminated_at_stage: p.stage })
          .eq('id', p.life_id)
          .eq('status', 'alive');
        if (lifeErr) throw lifeErr;
      }
    }
  }

  // ── 3rd-place bonus life ────────────────────────────────────────
  // A life knocked out in the SF whose team then WINS the 3rd-place match,
  // while the member has no life left in the Final, earns one bonus life to
  // pick a finalist. One bonus per member; idempotent.
  const thirdMatch = all.find((m) => m.stage === '3RD' && m.status === 'FINISHED' && m.winner);
  if (thirdMatch) {
    const thirdWinner =
      thirdMatch.winner === 'HOME_TEAM' ? thirdMatch.home_team_tla
      : thirdMatch.winner === 'AWAY_TEAM' ? thirdMatch.away_team_tla
      : null;
    if (thirdWinner) {
      const { data: sfLost, error: sfErr } = await supabase
        .from('knockout_picks')
        .select('knockout_lives!inner(pool_member_id)')
        .eq('stage', 'SF')
        .eq('result', 'lost')
        .eq('team_code', thirdWinner);
      if (sfErr) throw sfErr;

      const candidates = new Set<string>();
      for (const row of (sfLost ?? []) as { knockout_lives: { pool_member_id: string } | { pool_member_id: string }[] }[]) {
        const kl = Array.isArray(row.knockout_lives) ? row.knockout_lives[0] : row.knockout_lives;
        if (kl?.pool_member_id) candidates.add(kl.pool_member_id);
      }

      for (const memberId of candidates) {
        const { data: alive } = await supabase
          .from('knockout_lives')
          .select('id')
          .eq('pool_member_id', memberId)
          .in('status', ['alive', 'redemption'])
          .limit(1);
        if (alive && alive.length > 0) continue; // still has a team in the Final

        const { data: hasBonus } = await supabase
          .from('knockout_lives')
          .select('id')
          .eq('pool_member_id', memberId)
          .eq('is_bonus', true)
          .limit(1);
        if (hasBonus && hasBonus.length > 0) continue; // already granted

        await supabase.from('knockout_lives').insert({
          pool_member_id: memberId,
          source_group_key: null,
          status: 'redemption',
          is_bonus: true,
        });
        // Revive the member onto their bonus life so they can pick the Final.
        await supabase
          .from('pool_members')
          .update({ status: 'redemption' })
          .eq('id', memberId)
          .eq('status', 'eliminated');
      }
    }
  }

  // A member with lives but none still alive is out of the game.
  const { data: allLives, error: livesErr } = await supabase
    .from('knockout_lives')
    .select('pool_member_id, status');
  if (livesErr) throw livesErr;
  const lifeTally = new Map<string, { total: number; alive: number }>();
  for (const l of (allLives ?? []) as { pool_member_id: string; status: string }[]) {
    const t = lifeTally.get(l.pool_member_id) ?? { total: 0, alive: 0 };
    t.total++;
    if (l.status === 'alive' || l.status === 'redemption') t.alive++;
    lifeTally.set(l.pool_member_id, t);
  }
  for (const [memberId, t] of lifeTally) {
    if (t.total > 0 && t.alive === 0) {
      const { count } = await supabase
        .from('pool_members')
        .update({ status: 'eliminated', eliminated_at: 'KO' }, { count: 'exact' })
        .eq('id', memberId)
        .eq('status', 'alive');
      if (count && count > 0) membersEliminated++;
    }
  }

  // Survived/eliminated emails. Deduped per (member, stage) inside, so cron
  // re-runs are safe; failures are logged and never fail the resolution.
  await notifyPickResults(notifications);

  return { picksResolved, membersEliminated };
}
