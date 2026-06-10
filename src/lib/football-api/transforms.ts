/**
 * Transform football-data.org API responses into shapes
 * our UI components consume.
 */

import type { FdTeam, FdMatch, FdStandingsTable, FdStandingEntry } from './types';

export interface WCTeam {
  code: string;     // TLA e.g. "USA"
  name: string;     // full name
  shortName: string;
  crest: string;    // URL to crest image
  id: number;       // football-data.org ID
}

export interface WCGroup {
  key: string;           // "A", "B", etc
  teams: WCTeam[];
  standings: WCGroupStanding[];
}

export interface WCGroupStanding {
  position: number;
  team: WCTeam;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

export interface WCMatch {
  id: number;
  group: string | null;  // "GROUP_A" -> "A"
  stage: string;         // our stage code: MD1, MD2, MD3, R32, R16, QF, SF, F
  matchday: number | null;
  homeTeam: WCTeam | null;
  awayTeam: WCTeam | null;
  date: string;          // formatted display date
  utcDate: string;       // ISO date
  status: string;
  venue: string | null;
  score: {
    home: number | null;
    away: number | null;
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
}

// Map API stage names to our app stage codes
const STAGE_MAP: Record<string, string> = {
  'GROUP_STAGE': 'GS',     // will be refined by matchday -> MD1/MD2/MD3
  'LAST_32': 'R32',
  'LAST_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': '3RD',
  'FINAL': 'F',
};

function mapStage(apiStage: string, matchday: number | null): string {
  if (apiStage === 'GROUP_STAGE' && matchday) {
    return `MD${matchday}`;
  }
  return STAGE_MAP[apiStage] || apiStage;
}

// Extract group letter from "GROUP_A" -> "A"
function parseGroupKey(group: string | null): string | null {
  if (!group) return null;
  const match = group.match(/GROUP_([A-L])/);
  return match ? match[1] : null;
}

// Format date for display: "Jun 11"
function formatDate(utcDate: string): string {
  const d = new Date(utcDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function transformTeam(t: FdTeam): WCTeam {
  return {
    code: t.tla,
    name: t.name,
    shortName: t.shortName,
    crest: t.crest,
    id: t.id,
  };
}

export function transformMatch(m: FdMatch): WCMatch {
  return {
    id: m.id,
    group: parseGroupKey(m.group),
    stage: mapStage(m.stage, m.matchday),
    matchday: m.matchday,
    homeTeam: m.homeTeam?.tla ? transformTeam(m.homeTeam as FdTeam) : null,
    awayTeam: m.awayTeam?.tla ? transformTeam(m.awayTeam as FdTeam) : null,
    date: formatDate(m.utcDate),
    utcDate: m.utcDate,
    status: m.status,
    venue: m.venue || null,
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner ?? null,
    },
  };
}

export function transformStandings(table: FdStandingsTable): WCGroup {
  const groupKey = parseGroupKey(table.group) || '?';
  return {
    key: groupKey,
    teams: table.table.map(e => transformTeam(e.team as FdTeam)),
    standings: table.table.map(e => ({
      position: e.position,
      team: transformTeam(e.team as FdTeam),
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

/** Build a team name lookup: code -> full name */
export function buildTeamLookup(teams: WCTeam[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const t of teams) {
    lookup[t.code] = t.name;
  }
  return lookup;
}

/** Build groups lookup: "A" -> ["USA", "PAR", ...] */
export function buildGroupsLookup(groups: WCGroup[]): Record<string, string[]> {
  const lookup: Record<string, string[]> = {};
  for (const g of groups) {
    lookup[g.key] = g.teams.map(t => t.code);
  }
  return lookup;
}

/** Build team crest lookup: code -> crest URL */
export function buildCrestLookup(teams: WCTeam[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const t of teams) {
    lookup[t.code] = t.crest;
  }
  return lookup;
}

/** Group matches by group key */
export function groupMatchesByGroup(matches: WCMatch[]): Record<string, WCMatch[]> {
  const grouped: Record<string, WCMatch[]> = {};
  for (const m of matches) {
    if (m.group) {
      if (!grouped[m.group]) grouped[m.group] = [];
      grouped[m.group].push(m);
    }
  }
  return grouped;
}

/** Group matches by stage */
export function groupMatchesByStage(matches: WCMatch[]): Record<string, WCMatch[]> {
  const grouped: Record<string, WCMatch[]> = {};
  for (const m of matches) {
    if (!grouped[m.stage]) grouped[m.stage] = [];
    grouped[m.stage].push(m);
  }
  return grouped;
}
