/**
 * Adapter interface — the canonical shape the frontend consumes.
 *
 * Any data provider (football-data.org, API-Football, manual JSON, etc.)
 * must transform its data into these types. The frontend never touches
 * provider-specific structures.
 */

export interface TeamInfo {
  code: string;       // 3-letter TLA, e.g. "USA"
  name: string;       // full name, e.g. "United States"
  shortName: string;  // short name, e.g. "USA"
  crest: string;      // URL to team crest/badge image
}

export interface GroupInfo {
  key: string;        // "A" through "L"
  teams: TeamInfo[];
  standings: GroupStanding[];
}

export interface GroupStanding {
  position: number;
  team: TeamInfo;
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

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'LIVE'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'HALF_TIME'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED';

export interface MatchInfo {
  id: string | number;
  group: string | null;    // group letter: "A", "B", etc.
  stage: string;           // "MD1", "MD2", "MD3", "R32", "R16", "QF", "SF", "3RD", "F"
  matchday: number | null;
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  displayDate: string;     // e.g. "Jun 11"
  utcDate: string;         // ISO 8601
  status: MatchStatus;
  venue: string | null;
  score: {
    home: number | null;
    away: number | null;
    winner: 'HOME' | 'AWAY' | 'DRAW' | null;
  };
}

export interface CompetitionData {
  /** All participating teams */
  teams: TeamInfo[];

  /** Lookup: team code -> full name */
  teamLookup: Record<string, string>;

  /** Lookup: team code -> crest URL */
  crestLookup: Record<string, string>;

  /** All groups with their teams and standings */
  groups: GroupInfo[];

  /** Lookup: group key -> team codes */
  groupsLookup: Record<string, string[]>;

  /** All matches sorted by date */
  matches: MatchInfo[];

  /** Matches indexed by group letter */
  matchesByGroup: Record<string, MatchInfo[]>;

  /** Matches indexed by stage code */
  matchesByStage: Record<string, MatchInfo[]>;

  /** Current matchday of the competition */
  currentMatchday: number;
}
