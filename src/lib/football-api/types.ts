/** Types for football-data.org v4 API responses */

export interface FdArea {
  id: number;
  name: string;
  code: string;
  flag: string | null;
}

export interface FdSeason {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
  winner: FdTeam | null;
}

export interface FdCompetition {
  area: FdArea;
  id: number;
  name: string;
  code: string;
  type: 'CUP' | 'LEAGUE' | 'LEAGUE_CUP' | 'PLAYOFFS';
  emblem: string;
  currentSeason: FdSeason;
  seasons: FdSeason[];
  lastUpdated: string;
}

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address?: string;
  website?: string;
  founded?: number;
  clubColors?: string;
  venue?: string | null;
  lastUpdated?: string;
  group?: string;
}

export interface FdTeamsResponse {
  count: number;
  competition: { id: number; name: string; code: string };
  season: FdSeason;
  teams: FdTeam[];
}

export interface FdScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
  regularTime?: { home: number | null; away: number | null };
  extraTime?: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null };
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface FdMatch {
  area: FdArea;
  competition: { id: number; name: string; code: string; type: string; emblem: string };
  season: FdSeason;
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: FdScore;
  venue?: string;
  referees?: Array<{ id: number; name: string; type: string; nationality: string }>;
}

export interface FdMatchesResponse {
  filters: Record<string, string>;
  resultSet: {
    count: number;
    first: string;
    last: string;
    played: number;
  };
  competition: { id: number; name: string; code: string };
  matches: FdMatch[];
}

export interface FdStandingEntry {
  position: number;
  team: FdTeam;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FdStandingsTable {
  stage: string;
  type: string;
  group: string | null;
  table: FdStandingEntry[];
}

export interface FdStandingsResponse {
  filters: Record<string, string>;
  competition: { id: number; name: string; code: string };
  season: FdSeason;
  standings: FdStandingsTable[];
}

export interface FdScorer {
  player: {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    position: string;
  };
  team: FdTeam;
  playedMatches: number;
  goals: number;
  assists: number;
  penalties: number;
}

export interface FdScorersResponse {
  count: number;
  competition: { id: number; name: string; code: string };
  season: FdSeason;
  scorers: FdScorer[];
}
