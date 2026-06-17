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

  // Survived/eliminated emails. Deduped per (member, stage) inside, so cron
  // re-runs are safe; failures are logged and never fail the resolution.
  await notifyPickResults(notifications);

  return { picksResolved, membersEliminated };
}
