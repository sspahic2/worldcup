import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  User, UserCreate, UserUpdate, UserRepository,
  Pool, PoolCreate, PoolUpdate, PoolSummary, PoolStatus, PoolRepository,
  PoolMember, PoolMemberCreate, PoolMemberUpdate, PoolMemberRepository,
  PlayerPick, PickCreate, PickUpdate, PickRepository,
  Repositories,
} from './types';
import type { Role } from '@/lib/permissions/types';

// ── Row → Domain mappers ────────────────────────────────────────

type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

type PoolRow = {
  id: string;
  name: string;
  group_key: string | null;
  buy_in: number;
  invite_code: string;
  status: PoolStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type PoolMemberRow = {
  id: string;
  pool_id: string;
  user_id: string;
  status: 'alive' | 'redemption' | 'eliminated' | 'won';
  eliminated_at: string | null;
  joined_at: string;
};

type PickRow = {
  id: string;
  pool_member_id: string;
  stage: string;
  team_code: string;
  fd_match_id: number | null;
  result: 'pending' | 'won' | 'lost';
  locked_at: string;
};

type PoolSummaryRow = {
  pool_id: string;
  name: string;
  group_key: string | null;
  buy_in: number;
  invite_code: string;
  pool_status: PoolStatus;
  total_players: number;
  alive_count: number;
  redemption_count: number;
  eliminated_count: number;
  won_count: number;
  pot: number;
};

const toUser = (r: ProfileRow): User => ({
  id: r.id,
  email: '', // not stored in profiles; resolved via auth.users separately
  displayName: r.display_name,
  username: r.username,
  avatarUrl: r.avatar_url,
  role: r.role as Role,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toPool = (r: PoolRow): Pool => ({
  id: r.id,
  name: r.name,
  groupKey: r.group_key,
  buyIn: r.buy_in,
  inviteCode: r.invite_code,
  status: r.status,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMember = (r: PoolMemberRow): PoolMember => ({
  id: r.id,
  poolId: r.pool_id,
  userId: r.user_id,
  status: r.status,
  eliminatedAt: r.eliminated_at,
  joinedAt: r.joined_at,
});

const toPick = (r: PickRow): PlayerPick => ({
  id: r.id,
  poolMemberId: r.pool_member_id,
  stage: r.stage,
  teamCode: r.team_code,
  fdMatchId: r.fd_match_id,
  result: r.result,
  lockedAt: r.locked_at,
});

const toSummary = (s: PoolSummaryRow, p: PoolRow): PoolSummary => ({
  ...toPool(p),
  status: s.pool_status,
  totalPlayers: s.total_players,
  aliveCount: s.alive_count,
  redemptionCount: s.redemption_count,
  eliminatedCount: s.eliminated_count,
  wonCount: s.won_count,
  pot: s.pot,
});

// ── Implementations ─────────────────────────────────────────────

class SupabaseUserRepository implements UserRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data ? toUser(data as ProfileRow) : null;
  }

  async findByEmail(): Promise<User | null> {
    throw new Error('findByEmail requires service-role access to auth.users — not implemented');
  }

  async findByUsername(username: string) {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    return data ? toUser(data as ProfileRow) : null;
  }

  async create(_data: UserCreate): Promise<User> {
    throw new Error('Profiles are auto-created by the on_auth_user_created trigger');
  }

  async update(id: string, input: UserUpdate): Promise<User> {
    const patch: Record<string, unknown> = {};
    if (input.displayName !== undefined) patch.display_name = input.displayName;
    if (input.username !== undefined) patch.username = input.username;
    if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
    if (input.role !== undefined) patch.role = input.role;

    const { data, error } = await this.supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toUser(data as ProfileRow);
  }

  async delete(): Promise<void> {
    throw new Error('Profiles cascade-delete from auth.users; delete the auth user instead');
  }
}

class SupabasePoolRepository implements PoolRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase
      .from('pools')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data ? toPool(data as PoolRow) : null;
  }

  async findByInviteCode(code: string) {
    const { data } = await this.supabase
      .from('pools')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();
    return data ? toPool(data as PoolRow) : null;
  }

  async findByGroupKey(groupKey: string) {
    const { data } = await this.supabase
      .from('pools')
      .select('*')
      .eq('group_key', groupKey);
    return ((data as PoolRow[] | null) ?? []).map(toPool);
  }

  async findByCreator(userId: string) {
    const { data } = await this.supabase
      .from('pools')
      .select('*')
      .eq('created_by', userId);
    return ((data as PoolRow[] | null) ?? []).map(toPool);
  }

  async findAll(filters?: { status?: PoolStatus; groupKey?: string }) {
    let query = this.supabase.from('pools').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.groupKey) query = query.eq('group_key', filters.groupKey);
    const { data } = await query;
    return ((data as PoolRow[] | null) ?? []).map(toPool);
  }

  async getSummary(id: string): Promise<PoolSummary | null> {
    const { data: pool } = await this.supabase
      .from('pools')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!pool) return null;

    const { data: summary } = await this.supabase
      .from('pool_summary')
      .select('*')
      .eq('pool_id', id)
      .single();
    return summary ? toSummary(summary as PoolSummaryRow, pool as PoolRow) : null;
  }

  async getSummaries(filters?: { userId?: string }): Promise<PoolSummary[]> {
    let poolIds: string[] | null = null;
    if (filters?.userId) {
      const { data: members } = await this.supabase
        .from('pool_members')
        .select('pool_id')
        .eq('user_id', filters.userId);
      poolIds = ((members as { pool_id: string }[] | null) ?? []).map((m) => m.pool_id);
      if (poolIds.length === 0) return [];
    }

    let poolQuery = this.supabase.from('pools').select('*');
    if (poolIds) poolQuery = poolQuery.in('id', poolIds);
    const { data: pools } = await poolQuery;
    const poolRows = (pools as PoolRow[] | null) ?? [];
    if (poolRows.length === 0) return [];

    const ids = poolRows.map((p) => p.id);
    const { data: summaries } = await this.supabase
      .from('pool_summary')
      .select('*')
      .in('pool_id', ids);
    const summaryByPool = new Map<string, PoolSummaryRow>();
    for (const s of (summaries as PoolSummaryRow[] | null) ?? []) {
      summaryByPool.set(s.pool_id, s);
    }
    return poolRows
      .map((p) => {
        const s = summaryByPool.get(p.id);
        return s ? toSummary(s, p) : null;
      })
      .filter((s): s is PoolSummary => s !== null);
  }

  async create(input: PoolCreate): Promise<Pool> {
    const { data, error } = await this.supabase
      .from('pools')
      .insert({
        name: input.name,
        group_key: input.groupKey,
        buy_in: input.buyIn,
        created_by: input.createdBy,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPool(data as PoolRow);
  }

  async update(id: string, input: PoolUpdate): Promise<Pool> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.buyIn !== undefined) patch.buy_in = input.buyIn;
    if (input.status !== undefined) patch.status = input.status;

    const { data, error } = await this.supabase
      .from('pools')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toPool(data as PoolRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('pools').delete().eq('id', id);
    if (error) throw error;
  }
}

class SupabasePoolMemberRepository implements PoolMemberRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase
      .from('pool_members')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data ? toMember(data as PoolMemberRow) : null;
  }

  async findByPoolAndUser(poolId: string, userId: string) {
    const { data } = await this.supabase
      .from('pool_members')
      .select('*')
      .eq('pool_id', poolId)
      .eq('user_id', userId)
      .maybeSingle();
    return data ? toMember(data as PoolMemberRow) : null;
  }

  async findByPool(poolId: string) {
    const { data } = await this.supabase
      .from('pool_members')
      .select('*')
      .eq('pool_id', poolId);
    return ((data as PoolMemberRow[] | null) ?? []).map(toMember);
  }

  async findByUser(userId: string) {
    const { data } = await this.supabase
      .from('pool_members')
      .select('*')
      .eq('user_id', userId);
    return ((data as PoolMemberRow[] | null) ?? []).map(toMember);
  }

  async create(input: PoolMemberCreate): Promise<PoolMember> {
    const { data, error } = await this.supabase
      .from('pool_members')
      .insert({ pool_id: input.poolId, user_id: input.userId })
      .select('*')
      .single();
    if (error) throw error;
    return toMember(data as PoolMemberRow);
  }

  async update(id: string, input: PoolMemberUpdate): Promise<PoolMember> {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.eliminatedAt !== undefined) patch.eliminated_at = input.eliminatedAt;

    const { data, error } = await this.supabase
      .from('pool_members')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toMember(data as PoolMemberRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('pool_members').delete().eq('id', id);
    if (error) throw error;
  }
}

class SupabasePickRepository implements PickRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string) {
    const { data } = await this.supabase
      .from('picks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data ? toPick(data as PickRow) : null;
  }

  async findByMember(poolMemberId: string) {
    const { data } = await this.supabase
      .from('picks')
      .select('*')
      .eq('pool_member_id', poolMemberId);
    return ((data as PickRow[] | null) ?? []).map(toPick);
  }

  async findByMemberAndStage(poolMemberId: string, stage: string) {
    const { data } = await this.supabase
      .from('picks')
      .select('*')
      .eq('pool_member_id', poolMemberId)
      .eq('stage', stage)
      .maybeSingle();
    return data ? toPick(data as PickRow) : null;
  }

  async findByPool(poolId: string): Promise<PlayerPick[]> {
    const { data: members } = await this.supabase
      .from('pool_members')
      .select('id')
      .eq('pool_id', poolId);
    const memberIds = ((members as { id: string }[] | null) ?? []).map((m) => m.id);
    if (memberIds.length === 0) return [];
    const { data } = await this.supabase
      .from('picks')
      .select('*')
      .in('pool_member_id', memberIds);
    return ((data as PickRow[] | null) ?? []).map(toPick);
  }

  async create(input: PickCreate): Promise<PlayerPick> {
    const { data, error } = await this.supabase
      .from('picks')
      .insert({
        pool_member_id: input.poolMemberId,
        stage: input.stage,
        team_code: input.teamCode,
        fd_match_id: input.fdMatchId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPick(data as PickRow);
  }

  async update(id: string, input: PickUpdate): Promise<PlayerPick> {
    const patch: Record<string, unknown> = {};
    if (input.result !== undefined) patch.result = input.result;
    if (input.teamCode !== undefined) patch.team_code = input.teamCode;
    if (input.fdMatchId !== undefined) patch.fd_match_id = input.fdMatchId;

    // maybeSingle: RLS (ownership, pending-only, time lock) or a concurrent
    // resolution can leave zero rows updated — surface that as a friendly
    // error instead of a raw PGRST116.
    const { data, error } = await this.supabase
      .from('picks')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Pick can no longer be changed');
    return toPick(data as PickRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('picks').delete().eq('id', id);
    if (error) throw error;
  }
}

export function createSupabaseRepositories(supabase: SupabaseClient): Repositories {
  return {
    users: new SupabaseUserRepository(supabase),
    pools: new SupabasePoolRepository(supabase),
    poolMembers: new SupabasePoolMemberRepository(supabase),
    picks: new SupabasePickRepository(supabase),
  };
}
