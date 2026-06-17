import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import { STAGES } from '@/lib/data/teams';
import type { PlayerPick, PoolMember, PoolSummary } from '@/lib/repositories/types';
import type {
  UserPool,
  GroupTrack,
  TrackSummary,
  Stage,
  PoolStatus,
  PickResult,
  LeaderboardEntry,
  ProfileData,
} from '@/types';

export const GLOBAL_POOL_ID = '00000000-0000-0000-0000-000000000001';

const STAGE_ORDER: readonly Stage[] = STAGES;
const GROUP_STAGES: readonly Stage[] = ['MD1', 'MD2', 'MD3'];
const KNOCKOUT_STAGES: readonly Stage[] = ['R32', 'R16', 'QF', 'SF', 'F'];
const GROUP_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

/**
 * Single pot-share formula for the whole app:
 * pot = buyIn × memberCount (the pool_summary view); alive members split
 * pot/aliveCount, winners split pot/wonCount, redemption/eliminated get 0.
 */
export function potShare(
  status: PoolStatus | null | undefined,
  summary: (Pick<PoolSummary, 'pot' | 'aliveCount' | 'wonCount'> & { totalPlayers?: number }) | null,
): number {
  if (!summary) return 0;
  if (status === 'alive' && summary.aliveCount > 0) {
    return Math.round(summary.pot / summary.aliveCount);
  }
  if (status === 'won' && summary.wonCount > 0) {
    return Math.round(summary.pot / summary.wonCount);
  }
  // Everyone eliminated, nobody won → the pot returns split equally among all
  // players (rule: if all drop out the same week, split equally). A lone
  // survivor is already the default winner via pot / aliveCount(=1) above.
  if (summary.aliveCount === 0 && summary.wonCount === 0 && (summary.totalPlayers ?? 0) > 0) {
    return Math.round(summary.pot / summary.totalPlayers!);
  }
  return 0;
}

function furthestStage(picks: { stage: string }[]): Stage | null {
  let best = -1;
  for (const p of picks) {
    const i = STAGE_ORDER.indexOf(p.stage as Stage);
    if (i > best) best = i;
  }
  return best >= 0 ? STAGE_ORDER[best] : null;
}

/**
 * UI convention: lost picks carry an `_L` suffix (parsed by AppShell,
 * PickTimeline, Bracket, Dashboard) so they render as locked losses.
 * `pickResults` carries the raw result alongside.
 */
function mapPicks(picks: { stage: string; teamCode: string; result: PickResult }[]): {
  picks: Partial<Record<Stage, string>>;
  pickResults: Partial<Record<Stage, PickResult>>;
} {
  const byStage: Partial<Record<Stage, string>> = {};
  const results: Partial<Record<Stage, PickResult>> = {};
  for (const p of picks) {
    const stage = p.stage as Stage;
    byStage[stage] = p.result === 'lost' ? `${p.teamCode}_L` : p.teamCode;
    results[stage] = p.result;
  }
  return { picks: byStage, pickResults: results };
}

/** Per-request authenticated Supabase context, memoized via React.cache. */
const getAuthedContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user, repos: createSupabaseRepositories(supabase) };
});

/** Global-pool summary, fetched once per request. */
const getGlobalPoolSummary = cache(async (): Promise<PoolSummary | null> => {
  const ctx = await getAuthedContext();
  if (!ctx) return null;
  return ctx.repos.pools.getSummary(GLOBAL_POOL_ID);
});

/** The logged-in user's global-pool membership and picks, fetched once per request. */
const getMemberWithPicks = cache(
  async (): Promise<{ member: PoolMember; picks: PlayerPick[] } | null> => {
    const ctx = await getAuthedContext();
    if (!ctx) return null;
    const member = await ctx.repos.poolMembers.findByPoolAndUser(GLOBAL_POOL_ID, ctx.user.id);
    if (!member) return null;
    const picks = await ctx.repos.picks.findByMember(member.id);
    return { member, picks };
  },
);

// ── Stage progress (one match_cache scan per request) ───────────

type MatchStageRow = { group_key: string | null; stage: string; status: string };

/** All cached match (group, stage, status) triples — ONE query per request. */
const getMatchStageRows = cache(async (): Promise<MatchStageRow[]> => {
  const ctx = await getAuthedContext();
  const supabase = ctx?.supabase ?? (await createClient());
  const { data, error } = await supabase
    .from('match_cache')
    .select('group_key, stage, status');
  if (error || !data) return [];
  return data as MatchStageRow[];
});

/**
 * Current knockout stage: the first of R32..F with an unfinished cached
 * match. Falls back to R32 (knockouts not synced / not started yet).
 */
const getKnockoutStage = cache(async (): Promise<Stage> => {
  const rows = await getMatchStageRows();
  const open = new Set(rows.filter((r) => r.status !== 'FINISHED').map((r) => r.stage));
  for (const s of KNOCKOUT_STAGES) {
    if (open.has(s)) return s;
  }
  return 'R32';
});

/**
 * Per-group current stage: the first of MD1-MD3 with any unfinished cached
 * match for that group. null = the group's stage play is fully finished.
 * A group with no cached matches at all falls back to MD1 (cache not synced
 * yet ≠ play over).
 */
const getGroupStages = cache(async (): Promise<Record<string, Stage | null>> => {
  const rows = await getMatchStageRows();
  const result: Record<string, Stage | null> = {};
  for (const key of GROUP_KEYS) {
    const groupRows = rows.filter(
      (r) => r.group_key === key && GROUP_STAGES.includes(r.stage as Stage),
    );
    if (groupRows.length === 0) {
      result[key] = 'MD1';
      continue;
    }
    result[key] =
      GROUP_STAGES.find((s) =>
        groupRows.some((r) => r.stage === s && r.status !== 'FINISHED'),
      ) ?? null;
  }
  return result;
});

// ── Group tracks ─────────────────────────────────────────────────

type GroupSummaryRow = {
  pool_id: string;
  group_key: string | null;
  buy_in: number;
  total_players: number;
  alive_count: number;
  redemption_count: number;
  won_count: number;
  pot: number;
};

/** pool_summary rows for all group pools, keyed by pool id — ONE query. */
const getGroupPoolSummaries = cache(async (): Promise<Map<string, GroupSummaryRow>> => {
  const ctx = await getAuthedContext();
  if (!ctx) return new Map();
  const { data, error } = await ctx.supabase
    .from('pool_summary')
    .select('pool_id, group_key, buy_in, total_players, alive_count, redemption_count, won_count, pot')
    .not('group_key', 'is', null);
  if (error) {
    console.error('getGroupPoolSummaries query failed:', error);
    return new Map();
  }
  const map = new Map<string, GroupSummaryRow>();
  for (const row of (data ?? []) as GroupSummaryRow[]) {
    map.set(row.pool_id, row);
  }
  return map;
});

type TrackMemberRow = {
  id: string;
  pool_id: string;
  status: PoolStatus;
  eliminated_at: string | null;
  pools: { group_key: string | null } | { group_key: string | null }[] | null;
  picks: { stage: string; team_code: string; result: PickResult }[] | null;
};

function embedded<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * All 12 per-group survivor tracks for the signed-in user, keyed by group
 * key ('A'..'L'). Three queries total per request: memberships+picks,
 * pool summaries, match stages — never per-group loops.
 */
export const getUserTracks = cache(async (): Promise<Record<string, GroupTrack>> => {
  const ctx = await getAuthedContext();
  if (!ctx) return {};

  const [membersResult, summaries, groupStages] = await Promise.all([
    ctx.supabase
      .from('pool_members')
      .select('id, pool_id, status, eliminated_at, pools!inner(group_key), picks(stage, team_code, result)')
      .eq('user_id', ctx.user.id)
      .not('pools.group_key', 'is', null),
    getGroupPoolSummaries(),
    getGroupStages(),
  ]);
  if (membersResult.error) {
    console.error('getUserTracks query failed:', membersResult.error);
    return {};
  }

  const tracks: Record<string, GroupTrack> = {};
  for (const row of (membersResult.data ?? []) as unknown as TrackMemberRow[]) {
    const groupKey = embedded(row.pools)?.group_key;
    if (!groupKey) continue;

    const summary = summaries.get(row.pool_id) ?? null;
    const { picks, pickResults } = mapPicks(
      (row.picks ?? []).map((p) => ({ stage: p.stage, teamCode: p.team_code, result: p.result })),
    );

    tracks[groupKey] = {
      groupKey,
      poolId: row.pool_id,
      memberId: row.id,
      status: row.status,
      stage: groupStages[groupKey] ?? null,
      picks,
      pickResults,
      pot: summary?.pot ?? 0,
      aliveCount: summary?.alive_count ?? 0,
      memberCount: summary?.total_players ?? 0,
      survivors: (summary?.alive_count ?? 0) + (summary?.redemption_count ?? 0),
    };
  }
  return tracks;
});

// ── Global (knockout) pool ───────────────────────────────────────

/**
 * The user's GLOBAL pool membership — knockout play only. Group-stage picks
 * live in the per-group tracks (getUserTracks); this membership carries one
 * pick per knockout round, R32 onwards.
 */
export async function getCurrentUserPool(): Promise<UserPool | null> {
  const ctx = await getAuthedContext();
  if (!ctx) return null;

  const [membership, summary, stage] = await Promise.all([
    getMemberWithPicks(),
    getGlobalPoolSummary(),
    getKnockoutStage(),
  ]);
  if (!membership || !summary) return null;
  const { member, picks } = membership;

  const mapped = mapPicks(picks);

  return {
    status: member.status as PoolStatus,
    stage,
    pot: summary.pot,
    survivors: summary.aliveCount + summary.redemptionCount,
    players: summary.totalPlayers,
    picks: mapped.picks,
    pickResults: mapped.pickResults,
    buyIn: summary.buyIn,
    eliminatedAt: member.eliminatedAt ?? undefined,
    poolId: summary.id,
    memberId: member.id,
  };
}

// ── Leaderboards ─────────────────────────────────────────────────

type LeaderboardMemberRow = {
  id: string;
  user_id: string;
  status: PoolStatus;
  eliminated_at: string | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
  picks: { stage: string; result: PickResult }[] | null;
};

type GroupLeaderboardRow = LeaderboardMemberRow & {
  pool_id: string;
  pools: { group_key: string | null; buy_in: number } | { group_key: string | null; buy_in: number }[] | null;
};

const STATUS_PRIORITY: Record<PoolStatus, number> = {
  alive: 0,
  won: 1,
  redemption: 2,
  eliminated: 3,
};

function toLeaderboardEntry(
  r: LeaderboardMemberRow,
  summary: (Pick<PoolSummary, 'pot' | 'aliveCount' | 'wonCount'> & { totalPlayers?: number }) | null,
  currentUserId: string,
): LeaderboardEntry {
  const picks = r.picks ?? [];
  const profile = embedded(r.profiles);
  const streak = picks.filter((p) => p.result === 'won').length;
  const stage = (r.eliminated_at as Stage | null) ?? furthestStage(picks) ?? 'MD1';
  return {
    memberId: r.id,
    username: profile?.display_name ?? 'Unknown player',
    stage,
    streak,
    potShare: potShare(r.status, summary),
    status: r.status,
    isYou: r.user_id === currentUserId,
  };
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  entries.sort(
    (a, b) =>
      STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
      b.streak - a.streak ||
      a.username.localeCompare(b.username),
  );
  return entries;
}

/**
 * All members of the GLOBAL pool with profile names, pick stats and pot
 * share — the knockout-phase leaderboard.
 * Sorted: alive first, then streak desc, then name.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const ctx = await getAuthedContext();
  if (!ctx) return [];

  const [summary, result] = await Promise.all([
    getGlobalPoolSummary(),
    ctx.supabase
      .from('pool_members')
      .select('id, user_id, status, eliminated_at, profiles(display_name), picks(stage, result)')
      .eq('pool_id', GLOBAL_POOL_ID),
  ]);
  if (result.error) {
    // Fail soft: an empty leaderboard beats 500ing the whole home page.
    console.error('getLeaderboard query failed:', result.error);
    return [];
  }

  const rows = (result.data ?? []) as unknown as LeaderboardMemberRow[];
  return sortEntries(rows.map((r) => toLeaderboardEntry(r, summary, ctx.user.id)));
}

/**
 * Group-stage leaderboards for all 12 group pools, keyed by group key —
 * ONE query across every group-pool membership, grouped client-side.
 * Pot share per pool: pot = buyIn × memberCount, alive members split it.
 */
export const getLeaderboards = cache(
  async (): Promise<Record<string, LeaderboardEntry[]>> => {
    const ctx = await getAuthedContext();
    if (!ctx) return {};

    const { data, error } = await ctx.supabase
      .from('pool_members')
      .select('id, user_id, status, eliminated_at, pool_id, pools!inner(group_key, buy_in), profiles(display_name), picks(stage, result)')
      .not('pools.group_key', 'is', null);
    if (error) {
      console.error('getLeaderboards query failed:', error);
      return {};
    }

    const byGroup = new Map<string, GroupLeaderboardRow[]>();
    const buyInByGroup = new Map<string, number>();
    for (const row of (data ?? []) as unknown as GroupLeaderboardRow[]) {
      const pool = embedded(row.pools);
      if (!pool?.group_key) continue;
      const list = byGroup.get(pool.group_key) ?? [];
      list.push(row);
      byGroup.set(pool.group_key, list);
      buyInByGroup.set(pool.group_key, pool.buy_in);
    }

    const leaderboards: Record<string, LeaderboardEntry[]> = {};
    for (const [groupKey, rows] of byGroup) {
      const summary = {
        pot: (buyInByGroup.get(groupKey) ?? 0) * rows.length,
        aliveCount: rows.filter((r) => r.status === 'alive').length,
        wonCount: rows.filter((r) => r.status === 'won').length,
        totalPlayers: rows.length,
      };
      leaderboards[groupKey] = sortEntries(
        rows.map((r) => toLeaderboardEntry(r, summary, ctx.user.id)),
      );
    }
    return leaderboards;
  },
);

// ── Profile ──────────────────────────────────────────────────────

/**
 * Logged-in user's profile, aggregated across the 12 group tracks and the
 * global knockout membership.
 */
export async function getProfileData(): Promise<ProfileData | null> {
  const ctx = await getAuthedContext();
  if (!ctx) return null;

  const [profile, tracks, summaries, membership, globalSummary, matchRows] =
    await Promise.all([
      ctx.repos.users.findById(ctx.user.id),
      getUserTracks(),
      getGroupPoolSummaries(),
      getMemberWithPicks(),
      getGlobalPoolSummary(),
      getMatchStageRows(),
    ]);
  if (!profile) return null;

  const trackList = GROUP_KEYS.map((k) => tracks[k]).filter(
    (t): t is GroupTrack => t !== undefined,
  );

  let totalPicks = 0;
  let totalWins = 0;
  let combinedPotShare = 0;
  for (const t of trackList) {
    const results = Object.values(t.pickResults);
    totalPicks += results.length;
    totalWins += results.filter((r) => r === 'won').length;
    const s = summaries.get(t.poolId);
    combinedPotShare += potShare(
      t.status,
      s
        ? { pot: s.pot, aliveCount: s.alive_count, wonCount: s.won_count, totalPlayers: s.total_players }
        : null,
    );
  }

  const globalPicks = membership?.picks ?? [];
  totalPicks += globalPicks.length;
  totalWins += globalPicks.filter((p) => p.result === 'won').length;
  const globalShare = potShare(membership?.member.status, globalSummary);

  // Overall tournament stage: first stage in canonical order with an
  // unfinished cached match; 'F' once everything is decided, MD1 when the
  // cache is empty.
  const openStages = new Set(
    matchRows.filter((r) => r.status !== 'FINISHED').map((r) => r.stage),
  );
  const currentStage =
    STAGE_ORDER.find((s) => openStages.has(s)) ?? (matchRows.length > 0 ? 'F' : 'MD1');

  const trackSummaries: TrackSummary[] = trackList.map((t) => ({
    groupKey: t.groupKey,
    status: t.status,
    stage: t.stage,
  }));

  return {
    displayName: profile.displayName,
    username: profile.username,
    status: membership?.member.status ?? null,
    picksMade: totalPicks,
    wins: totalWins,
    currentStage,
    potShare: combinedPotShare + globalShare,
    tracksAlive: trackList.filter((t) => t.status !== 'eliminated').length,
    tracksTotal: GROUP_KEYS.length,
    totalPicks,
    totalWins,
    combinedPotShare,
    tracks: trackSummaries,
  };
}
