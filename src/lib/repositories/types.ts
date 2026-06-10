/**
 * Repository entity types.
 *
 * These mirror the Supabase schema exactly so that swapping
 * from mock → real DB is just changing the implementation,
 * not the data shapes.
 */

import type { Role } from '@/lib/permissions/types';

// ── User / Profile ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export type UserCreate = Pick<User, 'email' | 'displayName'> & {
  username?: string;
  avatarUrl?: string;
  role?: Role;
};

export type UserUpdate = Partial<Pick<User, 'displayName' | 'username' | 'avatarUrl' | 'role'>>;

// ── Pool ────────────────────────────────────────────────────────

export type PoolStatus = 'open' | 'active' | 'completed' | 'cancelled';

export interface Pool {
  id: string;
  name: string;
  groupKey: string;
  buyIn: number;
  inviteCode: string;
  status: PoolStatus;
  createdBy: string; // user ID
  createdAt: string;
  updatedAt: string;
}

export type PoolCreate = Pick<Pool, 'name' | 'groupKey' | 'buyIn' | 'createdBy'>;

export type PoolUpdate = Partial<Pick<Pool, 'name' | 'buyIn' | 'status'>>;

// ── Pool summary (joined view) ──────────────────────────────────

export interface PoolSummary extends Pool {
  totalPlayers: number;
  aliveCount: number;
  redemptionCount: number;
  eliminatedCount: number;
  wonCount: number;
  pot: number;
}

// ── Pool Member ─────────────────────────────────────────────────

export type MemberStatus = 'alive' | 'redemption' | 'eliminated' | 'won';

export interface PoolMember {
  id: string;
  poolId: string;
  userId: string;
  status: MemberStatus;
  eliminatedAt: string | null; // stage where eliminated
  joinedAt: string;
  // Joined fields (populated by repository)
  user?: User;
  pool?: Pool;
}

export type PoolMemberCreate = Pick<PoolMember, 'poolId' | 'userId'>;

export type PoolMemberUpdate = Partial<Pick<PoolMember, 'status' | 'eliminatedAt'>>;

// ── Pick ────────────────────────────────────────────────────────

export type PickResult = 'pending' | 'won' | 'lost';

export interface PlayerPick {
  id: string;
  poolMemberId: string;
  stage: string;
  teamCode: string;
  fdMatchId: number | null; // football-data.org match ID
  result: PickResult;
  lockedAt: string;
}

export type PickCreate = Pick<PlayerPick, 'poolMemberId' | 'stage' | 'teamCode'> & {
  fdMatchId?: number;
};

export type PickUpdate = Partial<Pick<PlayerPick, 'result'>>;

// ── Repository interfaces ───────────────────────────────────────

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: UserCreate): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface PoolRepository {
  findById(id: string): Promise<Pool | null>;
  findByInviteCode(code: string): Promise<Pool | null>;
  findByGroupKey(groupKey: string): Promise<Pool[]>;
  findByCreator(userId: string): Promise<Pool[]>;
  findAll(filters?: { status?: PoolStatus; groupKey?: string }): Promise<Pool[]>;
  getSummary(id: string): Promise<PoolSummary | null>;
  getSummaries(filters?: { userId?: string }): Promise<PoolSummary[]>;
  create(data: PoolCreate): Promise<Pool>;
  update(id: string, data: PoolUpdate): Promise<Pool>;
  delete(id: string): Promise<void>;
}

export interface PoolMemberRepository {
  findById(id: string): Promise<PoolMember | null>;
  findByPoolAndUser(poolId: string, userId: string): Promise<PoolMember | null>;
  findByPool(poolId: string): Promise<PoolMember[]>;
  findByUser(userId: string): Promise<PoolMember[]>;
  create(data: PoolMemberCreate): Promise<PoolMember>;
  update(id: string, data: PoolMemberUpdate): Promise<PoolMember>;
  delete(id: string): Promise<void>;
}

export interface PickRepository {
  findById(id: string): Promise<PlayerPick | null>;
  findByMember(poolMemberId: string): Promise<PlayerPick[]>;
  findByMemberAndStage(poolMemberId: string, stage: string): Promise<PlayerPick | null>;
  findByPool(poolId: string): Promise<PlayerPick[]>;
  create(data: PickCreate): Promise<PlayerPick>;
  update(id: string, data: PickUpdate): Promise<PlayerPick>;
  delete(id: string): Promise<void>;
}

// ── Aggregate repository ────────────────────────────────────────

export interface Repositories {
  users: UserRepository;
  pools: PoolRepository;
  poolMembers: PoolMemberRepository;
  picks: PickRepository;
}
