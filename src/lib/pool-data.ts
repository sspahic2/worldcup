import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepositories } from '@/lib/repositories/supabase-repositories';
import { STAGES } from '@/lib/data/teams';
import type { PlayerPick, PoolMember, PoolSummary } from '@/lib/repositories/types';
import type { UserPool, Stage, PoolStatus, LeaderboardEntry, ProfileData } from '@/types';

export const GLOBAL_POOL_ID = '00000000-0000-0000-0000-000000000001';

const STAGE_ORDER: readonly Stage[] = STAGES;

/**
 * Single pot-share formula for the whole app:
 * pot = buyIn × memberCount (the pool_summary view); alive members split
 * pot/aliveCount, winners split pot/wonCount, redemption/eliminated get 0.
 */
export function potShare(
  status: PoolStatus | null | undefined,
  summary: Pick<PoolSummary, 'pot' | 'aliveCount' | 'wonCount'> | null,
): number {
  if (!summary) return 0;
  if (status === 'alive' && summary.aliveCount > 0) {
    return Math.round(summary.pot / summary.aliveCount);
  }
  if (status === 'won' && summary.wonCount > 0) {
    return Math.round(summary.pot / summary.wonCount);
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

/**
 * Current tournament stage: the first stage in canonical order that still has
 * an unfinished cached match. Falls back to MD1 when the cache is empty.
 */
const getCurrentStage = cache(async (): Promise<Stage> => {
  const ctx = await getAuthedContext();
  const supabase = ctx?.supabase ?? (await createClient());
  const { data, error } = await supabase
    .from('match_cache')
    .select('stage')
    .neq('status', 'FINISHED');
  if (error || !data || data.length === 0) return 'MD1';
  const openStages = new Set((data as { stage: string }[]).map((r) => r.stage));
  for (const s of STAGE_ORDER) {
    if (openStages.has(s)) return s;
  }
  return 'MD1';
});

export async function getCurrentUserPool(): Promise<UserPool | null> {
  const ctx = await getAuthedContext();
  if (!ctx) return null;

  const [membership, summary, stage] = await Promise.all([
    getMemberWithPicks(),
    getGlobalPoolSummary(),
    getCurrentStage(),
  ]);
  if (!membership || !summary) return null;
  const { member, picks } = membership;

  const picksByStage: Partial<Record<Stage, string | null>> = {};
  for (const p of picks) {
    // UI convention: lost picks carry an `_L` suffix (parsed by AppShell,
    // PickTimeline, Bracket, Dashboard) so they render as locked losses.
    picksByStage[p.stage as Stage] = p.result === 'lost' ? `${p.teamCode}_L` : p.teamCode;
  }

  return {
    status: member.status as PoolStatus,
    stage,
    pot: summary.pot,
    survivors: summary.aliveCount + summary.redemptionCount,
    players: summary.totalPlayers,
    picks: picksByStage,
    buyIn: summary.buyIn,
    eliminatedAt: member.eliminatedAt ?? undefined,
    poolId: summary.id,
    memberId: member.id,
  };
}

type LeaderboardMemberRow = {
  id: string;
  user_id: string;
  status: PoolStatus;
  eliminated_at: string | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
  picks: { stage: string; result: 'pending' | 'won' | 'lost' }[] | null;
};

const STATUS_PRIORITY: Record<PoolStatus, number> = {
  alive: 0,
  won: 1,
  redemption: 2,
  eliminated: 3,
};

/**
 * All members of the global pool with profile names, pick stats and pot share.
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

  const entries: LeaderboardEntry[] = rows.map((r) => {
    const picks = r.picks ?? [];
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const streak = picks.filter((p) => p.result === 'won').length;
    const stage = (r.eliminated_at as Stage | null) ?? furthestStage(picks) ?? 'MD1';
    return {
      memberId: r.id,
      username: profile?.display_name ?? 'Unknown player',
      stage,
      streak,
      potShare: potShare(r.status, summary),
      status: r.status,
      isYou: r.user_id === ctx.user.id,
    };
  });

  entries.sort(
    (a, b) =>
      STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
      b.streak - a.streak ||
      a.username.localeCompare(b.username),
  );
  return entries;
}

/** Logged-in user's profile + their global-pool membership stats. */
export async function getProfileData(): Promise<ProfileData | null> {
  const ctx = await getAuthedContext();
  if (!ctx) return null;

  const [profile, membership, summary] = await Promise.all([
    ctx.repos.users.findById(ctx.user.id),
    getMemberWithPicks(),
    getGlobalPoolSummary(),
  ]);
  if (!profile) return null;

  const member = membership?.member ?? null;
  const picks = membership?.picks ?? [];
  const wins = picks.filter((p) => p.result === 'won').length;
  const currentStage =
    (member?.eliminatedAt as Stage | null) ?? furthestStage(picks) ?? 'MD1';

  return {
    displayName: profile.displayName,
    username: profile.username,
    status: member?.status ?? null,
    picksMade: picks.length,
    wins,
    currentStage,
    potShare: potShare(member?.status, summary),
  };
}
