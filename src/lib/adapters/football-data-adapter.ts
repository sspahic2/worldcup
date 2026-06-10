/**
 * Adapter: football-data.org -> CompetitionData
 *
 * Transforms the football-data.org v4 API responses into
 * the canonical CompetitionData shape the frontend consumes.
 *
 * To swap providers, create a new adapter that implements
 * the same `fetchCompetitionData(): Promise<CompetitionData>` function.
 */

import { getTeams, getAllMatches, getStandings } from '@/lib/football-api/client';
import type { FdTeam, FdMatch, FdStandingsTable } from '@/lib/football-api/types';
import type {
  CompetitionData,
  TeamInfo,
  GroupInfo,
  GroupStanding,
  MatchInfo,
  MatchStatus,
} from './types';

// ── Mapping helpers ─────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  'GROUP_STAGE': 'GS', // refined by matchday
  'LAST_32': 'R32',
  'LAST_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': '3RD',
  'FINAL': 'F',
};

function mapStage(apiStage: string, matchday: number | null): string {
  if (apiStage === 'GROUP_STAGE' && matchday) return `MD${matchday}`;
  return STAGE_MAP[apiStage] || apiStage;
}

function parseGroupKey(group: string | null): string | null {
  if (!group) return null;
  // Handles both "GROUP_A" (from matches) and "Group A" (from standings)
  const m = group.match(/(?:GROUP_|Group\s+)([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

function formatDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function mapWinner(w: string | null): 'HOME' | 'AWAY' | 'DRAW' | null {
  if (w === 'HOME_TEAM') return 'HOME';
  if (w === 'AWAY_TEAM') return 'AWAY';
  if (w === 'DRAW') return 'DRAW';
  return null;
}

function toTeamInfo(t: FdTeam): TeamInfo {
  return {
    code: t.tla,
    name: t.name,
    shortName: t.shortName,
    crest: t.crest,
  };
}

function toTeamInfoOrNull(t: { id: number; name: string; shortName: string; tla: string; crest: string }): TeamInfo | null {
  if (!t.tla) return null;
  return { code: t.tla, name: t.name, shortName: t.shortName, crest: t.crest };
}

function toMatchInfo(m: FdMatch): MatchInfo {
  return {
    id: m.id,
    group: parseGroupKey(m.group),
    stage: mapStage(m.stage, m.matchday),
    matchday: m.matchday,
    homeTeam: toTeamInfoOrNull(m.homeTeam),
    awayTeam: toTeamInfoOrNull(m.awayTeam),
    displayDate: formatDate(m.utcDate),
    utcDate: m.utcDate,
    status: m.status as MatchStatus,
    venue: m.venue || null,
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      winner: mapWinner(m.score?.winner ?? null),
    },
  };
}

function toGroupInfo(table: FdStandingsTable): GroupInfo {
  const groupKey = parseGroupKey(table.group) || '?';
  return {
    key: groupKey,
    teams: table.table.map(e => toTeamInfo(e.team as FdTeam)),
    standings: table.table.map((e): GroupStanding => ({
      position: e.position,
      team: toTeamInfo(e.team as FdTeam),
      played: e.playedGames,
      won: e.won,
      draw: e.draw,
      lost: e.lost,
      points: e.points,
      goalsFor: e.goalsFor,
      goalsAgainst: e.goalsAgainst,
      goalDifference: e.goalDifference,
      form: e.form,
    })),
  };
}

// ── Build lookups ───────────────────────────────────────────────

function buildTeamLookup(teams: TeamInfo[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of teams) m[t.code] = t.name;
  return m;
}

function buildCrestLookup(teams: TeamInfo[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of teams) m[t.code] = t.crest;
  return m;
}

function buildGroupsLookup(groups: GroupInfo[]): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const g of groups) m[g.key] = g.teams.map(t => t.code);
  return m;
}

function groupMatchesByGroup(matches: MatchInfo[]): Record<string, MatchInfo[]> {
  const m: Record<string, MatchInfo[]> = {};
  for (const match of matches) {
    if (match.group) {
      if (!m[match.group]) m[match.group] = [];
      m[match.group].push(match);
    }
  }
  return m;
}

function groupMatchesByStage(matches: MatchInfo[]): Record<string, MatchInfo[]> {
  const m: Record<string, MatchInfo[]> = {};
  for (const match of matches) {
    if (!m[match.stage]) m[match.stage] = [];
    m[match.stage].push(match);
  }
  return m;
}

// ── Public API ──────────────────────────────────────────────────

export async function fetchCompetitionData(): Promise<CompetitionData> {
  const [teamsRes, matchesRes, standingsRes] = await Promise.all([
    getTeams(),
    getAllMatches(),
    getStandings(),
  ]);

  const teams = teamsRes.teams.map(toTeamInfo);
  const matches = matchesRes.matches.map(toMatchInfo);
  const groups = standingsRes.standings.map(toGroupInfo);

  groups.sort((a, b) => a.key.localeCompare(b.key));
  matches.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  return {
    teams,
    teamLookup: buildTeamLookup(teams),
    crestLookup: buildCrestLookup(teams),
    groups,
    groupsLookup: buildGroupsLookup(groups),
    matches,
    matchesByGroup: groupMatchesByGroup(matches),
    matchesByStage: groupMatchesByStage(matches),
    currentMatchday: teamsRes.season?.currentMatchday || 1,
  };
}
