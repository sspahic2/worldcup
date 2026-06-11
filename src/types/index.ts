// Flag direction types for rendering
export type FlagDirection = 'v' | 'h' | 's' | 'd' | 'x' | 'q';

export interface FlagDef {
  colors: string[];
  dir: FlagDirection;
}

export type TeamCode = string;

export type PoolStatus = 'alive' | 'redemption' | 'eliminated' | 'won';

export type Stage = 'MD1' | 'MD2' | 'MD3' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';

export type GroupKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface UserPool {
  status: PoolStatus;
  stage: Stage;
  pot: number;
  survivors: number;
  players: number;
  picks: Partial<Record<Stage, string | null>>;
  buyIn: number;
  eliminatedAt?: string;
  hero?: boolean;
  poolId?: string;
  memberId?: string;
}

export interface LeaderboardEntry {
  memberId: string;
  username: string;
  stage: string;
  streak: number;
  potShare: number;
  status: PoolStatus;
  isYou: boolean;
}

export interface ProfileData {
  displayName: string;
  username: string | null;
  status: PoolStatus | null;
  picksMade: number;
  wins: number;
  currentStage: string;
  potShare: number;
}

export interface Match {
  md: number | string;
  a: string;
  b: string;
  venue: string;
  date: string;
  utcDate?: string;
  knockout?: boolean;
}

export interface MatchResult {
  [team: string]: 'W' | 'L' | 'D';
}

// Database types (Supabase)
export interface DbUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface DbPool {
  id: string;
  name: string;
  group_key: GroupKey;
  buy_in: number;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface DbPoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  status: PoolStatus;
  joined_at: string;
}

export interface DbPick {
  id: string;
  pool_member_id: string;
  stage: Stage;
  team_code: string;
  result: 'W' | 'L' | null;
  locked_at: string;
}

export interface DbMatch {
  id: string;
  group_key: GroupKey;
  stage: Stage;
  matchday: number;
  team_a: string;
  team_b: string;
  venue: string;
  kickoff: string;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  status: 'scheduled' | 'live' | 'finished';
}
