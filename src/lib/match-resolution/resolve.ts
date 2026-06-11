import { createAdminClient } from '@/lib/supabase/admin';
import { notifyPickResults, type ResolvedPickNotification } from '@/lib/email/notify';

export interface ResolveResult {
  picksResolved: number;
  membersEliminated: number;
}

interface CachedMatch {
  fd_match_id: number;
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

/**
 * Resolve pending picks against finished matches.
 *
 * - pick.team_code matches winner → result = 'won'
 * - pick.team_code is loser or draw → result = 'lost'; member → eliminated
 *
 * Idempotent: only operates on picks with result='pending', so re-runs are safe.
 */
export async function resolvePicks(): Promise<ResolveResult> {
  const supabase = createAdminClient();

  const { data: matches, error: matchErr } = await supabase
    .from('match_cache')
    .select('fd_match_id, home_team_tla, away_team_tla, winner')
    .eq('status', 'FINISHED');
  if (matchErr) throw matchErr;

  const finished = (matches ?? []) as CachedMatch[];
  if (finished.length === 0) return { picksResolved: 0, membersEliminated: 0 };

  let picksResolved = 0;
  let membersEliminated = 0;
  const notifications: ResolvedPickNotification[] = [];

  for (const m of finished) {
    if (!m.winner) continue;

    const winnerTla =
      m.winner === 'HOME_TEAM' ? m.home_team_tla
      : m.winner === 'AWAY_TEAM' ? m.away_team_tla
      : null;

    const { data: picks, error: picksErr } = await supabase
      .from('picks')
      .select('id, pool_member_id, stage, team_code')
      .eq('fd_match_id', m.fd_match_id)
      .eq('result', 'pending');
    if (picksErr) throw picksErr;

    for (const p of (picks ?? []) as PendingPick[]) {
      const won = winnerTla !== null && p.team_code === winnerTla;
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
