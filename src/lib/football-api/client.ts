/**
 * football-data.org v4 API client with automatic caching.
 *
 * Hard limit: 10 requests / minute on the free tier.
 * Strategy: aggressive caching with TTLs that match data volatility.
 *
 * Cache TTLs:
 *   - Static data (teams, competition info): 24 hours
 *   - Standings: 15 minutes
 *   - Matches (scheduled): 5 minutes
 *   - Matches (live/in-play): 30 seconds
 *   - Scorers: 15 minutes
 */

import { getCache } from '@/lib/cache';
import type {
  FdCompetition,
  FdTeamsResponse,
  FdMatchesResponse,
  FdStandingsResponse,
  FdScorersResponse,
  FdMatch,
} from './types';

const BASE_URL = 'https://api.football-data.org/v4';
const API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN || 'bfbf6594dbcd458e9933ea1a747d0263';

// Cache TTLs in seconds
const TTL = {
  STATIC: 60 * 60 * 24,    // 24 hours — teams, competition meta
  STANDINGS: 60 * 15,       // 15 minutes
  MATCHES: 60 * 5,          // 5 minutes — scheduled matches
  MATCHES_LIVE: 30,         // 30 seconds — live matches
  SCORERS: 60 * 15,         // 15 minutes
} as const;

// Rate limiter — track request timestamps
const requestLog: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 10;

async function rateLimitGuard(): Promise<void> {
  const now = Date.now();
  // Remove entries older than 60s
  while (requestLog.length > 0 && requestLog[0] < now - 60_000) {
    requestLog.shift();
  }
  if (requestLog.length >= MAX_REQUESTS_PER_MINUTE) {
    const waitMs = requestLog[0] + 60_000 - now;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  requestLog.push(Date.now());
}

async function apiFetch<T>(path: string, cacheKey: string, ttl: number): Promise<T> {
  const cache = getCache();

  // Try cache first
  const cached = await cache.get<T>(cacheKey);
  if (cached !== null) return cached;

  // Rate limit
  await rateLimitGuard();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Auth-Token': API_TOKEN,
    },
    next: { revalidate: ttl }, // Next.js fetch cache as secondary layer
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body}`);
  }

  const data: T = await res.json();

  // Store in cache
  await cache.set(cacheKey, data, ttl);

  return data;
}

// ── Public API ────────────────────────────────────────────────────

const COMPETITION = 'WC';

/** Get World Cup competition metadata */
export async function getCompetition(): Promise<FdCompetition> {
  return apiFetch<FdCompetition>(
    `/competitions/${COMPETITION}`,
    `fd:competition:${COMPETITION}`,
    TTL.STATIC
  );
}

/** Get all WC 2026 teams */
export async function getTeams(): Promise<FdTeamsResponse> {
  return apiFetch<FdTeamsResponse>(
    `/competitions/${COMPETITION}/teams`,
    `fd:teams:${COMPETITION}`,
    TTL.STATIC
  );
}

/** Get WC matches with optional filters */
export async function getMatches(filters?: {
  matchday?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  stage?: string;
  group?: string;
}): Promise<FdMatchesResponse> {
  const params = new URLSearchParams();
  if (filters?.matchday) params.set('matchday', String(filters.matchday));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.group) params.set('group', filters.group);

  const qs = params.toString();
  const path = `/competitions/${COMPETITION}/matches${qs ? `?${qs}` : ''}`;
  const cacheKey = `fd:matches:${COMPETITION}:${qs}`;

  // Use shorter TTL if looking for live matches
  const isLive = filters?.status && ['IN_PLAY', 'PAUSED', 'LIVE'].includes(filters.status);
  const ttl = isLive ? TTL.MATCHES_LIVE : TTL.MATCHES;

  return apiFetch<FdMatchesResponse>(path, cacheKey, ttl);
}

/** Get a single match by ID */
export async function getMatch(matchId: number): Promise<FdMatch> {
  return apiFetch<FdMatch>(
    `/matches/${matchId}`,
    `fd:match:${matchId}`,
    TTL.MATCHES
  );
}

/** Get WC standings (group tables) */
export async function getStandings(filters?: {
  matchday?: number;
  season?: number;
}): Promise<FdStandingsResponse> {
  const params = new URLSearchParams();
  if (filters?.matchday) params.set('matchday', String(filters.matchday));
  if (filters?.season) params.set('season', String(filters.season));

  const qs = params.toString();
  const path = `/competitions/${COMPETITION}/standings${qs ? `?${qs}` : ''}`;
  const cacheKey = `fd:standings:${COMPETITION}:${qs}`;

  return apiFetch<FdStandingsResponse>(path, cacheKey, TTL.STANDINGS);
}

/** Get WC top scorers */
export async function getScorers(limit?: number): Promise<FdScorersResponse> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));

  const qs = params.toString();
  const path = `/competitions/${COMPETITION}/scorers${qs ? `?${qs}` : ''}`;
  const cacheKey = `fd:scorers:${COMPETITION}:${qs}`;

  return apiFetch<FdScorersResponse>(path, cacheKey, TTL.SCORERS);
}

/** Get matches for a specific group (convenience wrapper) */
export async function getGroupMatches(group: string): Promise<FdMatchesResponse> {
  return getMatches({ group: `GROUP_${group}` });
}

/** Get all matches, all matchdays, for building the full picture */
export async function getAllMatches(): Promise<FdMatchesResponse> {
  return getMatches();
}
