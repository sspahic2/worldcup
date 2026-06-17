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

export type PickResult = 'pending' | 'won' | 'lost';

/**
 * The user's global (knockout) pool membership. During knockouts a single
 * pick per round lives here; group-stage picks live in GroupTrack.
 */
export interface UserPool {
  status: PoolStatus;
  stage: Stage;
  pot: number;
  survivors: number;
  players: number;
  picks: Partial<Record<Stage, string | null>>;
  /** Raw result per stage; `picks` carries the legacy `_L` suffix for losses. */
  pickResults?: Partial<Record<Stage, PickResult>>;
  buyIn: number;
  eliminatedAt?: string;
  hero?: boolean;
  poolId?: string;
  memberId?: string;
}

/**
 * One of the user's 12 per-group survivor tracks (group stage, MD1-MD3).
 * Each track is its own pool: its own pot, picks, and elimination.
 */
export type GroupTrack = {
  groupKey: string;
  poolId: string;
  memberId: string;
  status: PoolStatus;
  /**
   * Current stage FOR THIS GROUP: first of MD1-MD3 with any unfinished
   * cached match for the group; null once the group's stage play is over.
   */
  stage: Stage | null;
  /** Team code per stage; lost picks carry the `_L` suffix (UI convention). */
  picks: Partial<Record<Stage, string>>;
  pickResults: Partial<Record<Stage, PickResult>>;
  pot: number;
  aliveCount: number;
  memberCount: number;
  /** alive + redemption — players still in this track. */
  survivors: number;
};

/** Compact per-track line for the profile grid. */
export interface TrackSummary {
  groupKey: string;
  status: PoolStatus;
  stage: Stage | null;
}

/**
 * A knockout "life" — one per group the player survived. Each round the player
 * picks one team per alive life. The life dies when its pick loses.
 */
export interface KnockoutLife {
  id: string;
  /** Group this life came from (null for a 3rd-place bonus life). */
  sourceGroup: string | null;
  status: PoolStatus;
  isBonus: boolean;
  /** Team code per knockout stage; lost picks carry the `_L` suffix. */
  picks: Partial<Record<Stage, string>>;
  pickResults: Partial<Record<Stage, PickResult>>;
}

export interface KnockoutData {
  /** The player's lives (one per survived group + any bonus life). */
  lives: KnockoutLife[];
  /** Current knockout stage (first R32..F with an unfinished match). */
  stage: Stage;
  /** Teams that advanced, per group ('A'..'L') — the R32 pick options. */
  qualifiersByGroup: Record<string, string[]>;
  /** True once the group stage is fully finished and knockouts are live. */
  knockoutsOpen: boolean;
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
  /** Global (knockout) pool membership status; null when not a member. */
  status: PoolStatus | null;
  /** Legacy alias of totalPicks — kept for existing UI. */
  picksMade: number;
  /** Legacy alias of totalWins — kept for existing UI. */
  wins: number;
  /** Overall tournament stage (first stage with unfinished matches). */
  currentStage: string;
  /** Total potential winnings: combinedPotShare + global-pool share. */
  potShare: number;
  /** Tracks not yet eliminated, out of tracksTotal. */
  tracksAlive: number;
  tracksTotal: number;
  /** All picks across the 12 group tracks + the global pool. */
  totalPicks: number;
  totalWins: number;
  /** Sum of per-track pot shares across surviving (alive/won) tracks. */
  combinedPotShare: number;
  /** Per-track summary for the profile grid, sorted A-L. */
  tracks: TrackSummary[];
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
  group_key: GroupKey | null; // null = the global knockout pool
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
