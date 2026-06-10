import { getAllMatches } from '@/lib/football-api';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FdMatch } from '@/lib/football-api/types';

const FD_STAGE_TO_PICK_STAGE: Record<string, string> = {
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: '3RD',
  FINAL: 'F',
};

function deriveStage(m: FdMatch): string {
  if (m.stage === 'GROUP_STAGE') return `MD${m.matchday}`;
  return FD_STAGE_TO_PICK_STAGE[m.stage] ?? m.stage;
}

function deriveGroupKey(m: FdMatch): string | null {
  if (!m.group) return null;
  const match = m.group.match(/GROUP_([A-L])/);
  return match ? match[1] : null;
}

export interface SyncResult {
  total: number;
  upserted: number;
}

export async function syncMatchCache(): Promise<SyncResult> {
  const res = await getAllMatches();
  const supabase = createAdminClient();

  const rows = res.matches.map((m) => ({
    fd_match_id: m.id,
    group_key: deriveGroupKey(m),
    stage: deriveStage(m),
    matchday: m.matchday,
    home_team_tla: m.homeTeam.tla,
    away_team_tla: m.awayTeam.tla,
    home_team_name: m.homeTeam.name,
    away_team_name: m.awayTeam.name,
    home_team_crest: m.homeTeam.crest,
    away_team_crest: m.awayTeam.crest,
    status: m.status,
    utc_date: m.utcDate,
    score_home: m.score.fullTime.home,
    score_away: m.score.fullTime.away,
    winner: m.score.winner,
    venue: m.venue ?? null,
    last_synced_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return { total: 0, upserted: 0 };

  const { error, count } = await supabase
    .from('match_cache')
    .upsert(rows, { onConflict: 'fd_match_id', count: 'exact' });
  if (error) throw error;

  return { total: rows.length, upserted: count ?? rows.length };
}
