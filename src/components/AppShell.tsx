'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCompetitionData } from '@/lib/adapters/context';
import { useAuth } from '@/lib/permissions/context';
import { submitPick, deletePick } from '@/app/actions/picks';
import { usedTeams, currentStagePick } from '@/lib/picks/pick-codes';
import type { MatchInfo } from '@/lib/adapters/types';
import type { Resource } from '@/lib/permissions/types';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { GroupSwitcher } from '@/components/layout/GroupSwitcher';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PickFlow } from '@/components/pick/PickFlow';
import { PickConfirmation } from '@/components/pick/PickConfirmation';
import { Bracket } from '@/components/bracket/Bracket';
import { KnockoutBoard } from '@/components/knockout/KnockoutBoard';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { Profile } from '@/components/profile/Profile';
import { Landing } from '@/components/landing/Landing';
import { Admin } from '@/components/admin/Admin';
import { EliminatedState } from '@/components/states/EliminatedState';
import { WinnerState } from '@/components/states/WinnerState';
import { EmptyState } from '@/components/states/EmptyState';
import { Redemption } from '@/components/pick/Redemption';
import { AccessDenied } from '@/components/states/AccessDenied';
import type { UserPool, GroupTrack, KnockoutData, LeaderboardEntry, ProfileData } from '@/types';
import type { GamePot } from '@/lib/pool-data';

type MatchData = {
  id?: number;
  md: number | string;
  a: string;
  b: string;
  venue: string;
  date: string;
  utcDate?: string;
  knockout?: boolean;
};

const VIEW_RESOURCE_MAP: Record<string, Resource> = {
  landing: 'landing',
  dashboard: 'dashboard',
  pick: 'pick',
  confirmation: 'pick',
  bracket: 'bracket',
  knockout: 'bracket',
  leaderboard: 'leaderboard',
  redemption: 'redemption',
  profile: 'profile',
  admin: 'admin',
  eliminated: 'dashboard',
  winner: 'dashboard',
};

// Flow-internal views that depend on in-memory state (selected match, last
// pick) — never restored from the URL.
const TRANSIENT_VIEWS = new Set(['pick', 'confirmation', 'eliminated', 'winner', 'access-denied']);

interface AppShellProps {
  initialPool?: UserPool | null;
  /** The user's 12 per-group survivor tracks, keyed by group key ('A'..'L'). */
  initialTracks?: Record<string, GroupTrack>;
  /** The single game-wide pot (one buy-in per player). */
  initialGamePot?: GamePot;
  /** The player's knockout lives + per-round state. */
  initialKnockout?: KnockoutData;
  initialLeaderboard?: LeaderboardEntry[];
  /** Per-group leaderboards, keyed by group key. */
  initialGroupLeaderboards?: Record<string, LeaderboardEntry[]>;
  initialProfile?: ProfileData | null;
}

export function AppShell({
  initialPool,
  initialTracks,
  initialGamePot,
  initialKnockout,
  initialLeaderboard,
  initialGroupLeaderboards,
  initialProfile,
}: AppShellProps = {}) {
  const router = useRouter();
  const competitionData = useCompetitionData();
  const { user, loading, canVisit, signOut, isAuthenticated } = useAuth();
  const [, startTransition] = useTransition();

  const groupKeys = competitionData.groups.map((g) => g.key);

  const searchParams = useSearchParams();
  const defaultGroup = groupKeys[0] || 'A';

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState(() => {
    const v = searchParams.get('view');
    return v && VIEW_RESOURCE_MAP[v] && !TRANSIENT_VIEWS.has(v) ? v : 'landing';
  });
  const [groupKey, setGroupKey] = useState(() => {
    const g = searchParams.get('group');
    return g && (groupKeys.length === 0 || groupKeys.includes(g)) ? g : defaultGroup;
  });
  const [pickMatch, setPickMatch] = useState<MatchData | null>(null);
  const [lastPick, setLastPick] = useState<{ team: string; match: MatchData } | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  const pool: UserPool | null = initialPool ?? null;

  // The selected group's survivor track. The group dashboard + pick flow run
  // off THIS (its own MD1→MD2→MD3 stage, its own membership, picks, pot, and
  // no-repeat set) — not the global pool, which carries knockouts only. Once a
  // group's stage play is over (track.stage null) we fall back to the global
  // (knockout) pool.
  const track: GroupTrack | null = initialTracks?.[groupKey] ?? null;
  const activePool: UserPool | null = useMemo(() => {
    if (track && track.stage) {
      return {
        status: track.status,
        stage: track.stage,
        pot: track.pot,
        survivors: track.survivors,
        players: track.memberCount,
        picks: track.picks,
        pickResults: track.pickResults,
        buyIn: track.memberCount > 0 ? Math.round(track.pot / track.memberCount) : 0,
        poolId: track.poolId,
        memberId: track.memberId,
      };
    }
    return pool;
  }, [track, pool]);

  useEffect(() => {
    if (!loading && isAuthenticated && view === 'landing') {
      setView('dashboard');
    }
  }, [loading, isAuthenticated, view]);

  // Keep view/group in the URL (shallow — no server round-trip) so refresh,
  // share, and back/forward all work. Transient flow views map to dashboard.
  useEffect(() => {
    const urlView = TRANSIENT_VIEWS.has(view) ? 'dashboard' : view;
    const next = new URLSearchParams(window.location.search);
    if (urlView === 'landing') next.delete('view');
    else next.set('view', urlView);
    if (groupKey === defaultGroup) next.delete('group');
    else next.set('group', groupKey);
    const qs = next.toString();
    const target = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (target !== window.location.pathname + window.location.search) {
      window.history.pushState(null, '', target);
    }
  }, [view, groupKey, defaultGroup]);

  // Back/forward restores state from the URL.
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('view');
      setView(v && VIEW_RESOURCE_MAP[v] && !TRANSIENT_VIEWS.has(v) ? v : isAuthenticated ? 'dashboard' : 'landing');
      const g = p.get('group');
      setGroupKey(g && (groupKeys.length === 0 || groupKeys.includes(g)) ? g : defaultGroup);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [groupKeys, defaultGroup, isAuthenticated]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const groupMatches: MatchInfo[] = useMemo(
    () => competitionData.matchesByGroup[groupKey] || [],
    [competitionData.matchesByGroup, groupKey],
  );

  const groupTeams = useMemo(() => {
    const g = competitionData.groups.find((gr) => gr.key === groupKey);
    return g?.teams || [];
  }, [competitionData.groups, groupKey]);

  // Members still alive (excludes redemption) — the pot splits between these,
  // matching the leaderboard/profile pot-share rule.
  const aliveCount = useMemo(
    () => (initialLeaderboard ?? []).filter((e) => e.status === 'alive').length,
    [initialLeaderboard],
  );

  const onPickMatch = (match: MatchData) => {
    setPickMatch(match);
    setView('pick');
  };

  const onConfirmPick = (team: string) => {
    if (!pickMatch || !activePool) return;
    setPickError(null);

    if (!activePool.memberId) {
      setPickError('No active membership');
      return;
    }

    const stageKey = activePool.stage;
    const fdMatchId = pickMatch.id;

    startTransition(async () => {
      const result = await submitPick({
        poolMemberId: activePool.memberId!,
        stage: stageKey,
        teamCode: team,
        fdMatchId,
      });
      if (!result.ok) {
        setPickError(result.error);
        return;
      }
      setLastPick({ team, match: pickMatch });
      setView('confirmation');
      router.refresh();
    });
  };

  // The user's pick for the current stage, if any (lost picks carry an `_L` suffix).
  const stagePick = activePool ? currentStagePick(activePool.picks, activePool.stage) : null;

  const onRemovePick = () => {
    if (!activePool) return;
    setPickError(null);

    if (!activePool.memberId) {
      setPickError('No active membership');
      return;
    }

    const stageKey = activePool.stage;

    startTransition(async () => {
      const result = await deletePick({ poolMemberId: activePool.memberId!, stage: stageKey });
      if (!result.ok) {
        setPickError(result.error);
        return;
      }
      setView('dashboard');
      router.refresh();
    });
  };

  const navigateTo = (nextView: string) => {
    const resource = VIEW_RESOURCE_MAP[nextView] || 'landing';
    const ctx = pool
      ? { poolId: pool.poolId, memberStatus: pool.status as 'alive' | 'redemption' | 'eliminated' | 'won' }
      : undefined;
    if (canVisit(resource, ctx)) {
      setView(nextView);
    } else if (!user) {
      setView('landing');
    } else {
      setView('access-denied');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setView('landing');
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="flex items-center gap-3 text-ink-3">
            <div className="h-5 w-5 rounded-full border-2 border-survive-accent border-t-transparent animate-spin" />
            Loading...
          </div>
        </div>
      );
    }

    if (view === 'access-denied')
      return <AccessDenied onBack={() => setView('dashboard')} />;

    if (view === 'landing')
      return <Landing onEnter={() => {
        if (isAuthenticated) {
          navigateTo('dashboard');
        } else {
          window.location.href = '/login';
        }
      }} desktop={isDesktop} />;

    if (view === 'dashboard' && activePool)
      return (
        <Dashboard
          groupKey={groupKey}
          pool={activePool}
          gamePot={initialGamePot}
          stagePick={stagePick}
          groupTeams={groupTeams}
          groupMatches={groupMatches}
          aliveCount={track?.stage ? track.aliveCount : aliveCount}
          crestLookup={competitionData.crestLookup}
          teamLookup={competitionData.teamLookup}
          onPick={onPickMatch}
          onOpenBracket={() => setView('bracket')}
          onOpenLeaderboard={() => setView('leaderboard')}
          onOpenRedemption={() => setView('redemption')}
          desktop={isDesktop}
        />
      );

    if (view === 'pick' && pickMatch)
      return (
        <PickFlow
          match={pickMatch}
          usedTeams={activePool ? usedTeams(activePool.picks, activePool.stage) : []}
          currentPick={stagePick}
          onConfirm={onConfirmPick}
          onRemove={stagePick ? onRemovePick : undefined}
          onBack={() => { setPickError(null); setView('dashboard'); }}
          error={pickError}
        />
      );

    if (view === 'confirmation' && lastPick)
      return (
        <PickConfirmation
          team={lastPick.team}
          match={lastPick.match}
          onDone={() => setView('dashboard')}
        />
      );

    if (view === 'bracket' && activePool)
      return <Bracket groupKey={groupKey} pool={activePool} desktop={isDesktop} />;

    if (view === 'knockout' && initialKnockout)
      return <KnockoutBoard knockout={initialKnockout} desktop={isDesktop} />;

    if (view === 'redemption' && pool)
      return (
        <Redemption
          groupKey={groupKey}
          pool={pool}
          onPick={() => setView('confirmation')}
          onBack={() => setView('dashboard')}
        />
      );

    if (view === 'leaderboard' && pool)
      return (
        <Leaderboard
          groupKey={groupKey}
          entries={initialGroupLeaderboards?.[groupKey] ?? initialLeaderboard ?? []}
          desktop={isDesktop}
        />
      );

    if (view === 'profile')
      return <Profile profile={initialProfile ?? null} desktop={isDesktop} />;

    if (view === 'admin')
      return <Admin onClose={() => setView('dashboard')} desktop={isDesktop} />;

    if (view === 'eliminated')
      return <EliminatedState groupKey={groupKey} team={groupTeams[0]?.code || 'USA'} onBack={() => setView('profile')} />;

    if (view === 'winner')
      return (
        <WinnerState
          groupKey={groupKey}
          team={groupTeams[0]?.code || 'USA'}
          pot={1760}
          onBack={() => setView('profile')}
        />
      );

    return <EmptyState onJoin={() => setView('dashboard')} />;
  };

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-bg">
        {view === 'landing' ? (
          renderBody()
        ) : (
          <div className="flex">
            <DesktopSidebar
              view={view}
              onNav={navigateTo}
              groupKey={groupKey}
              onGroupChange={setGroupKey}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSignOut={handleSignOut}
              groupKeys={groupKeys}
              pool={pool}
            />
            <div className="flex-1 min-w-0 max-w-[1200px]">
              {['dashboard', 'bracket', 'leaderboard'].includes(view) && pool && (
                <div className="flex gap-2 flex-wrap px-10 pt-5">
                  {groupKeys.map((k) => {
                    const active = groupKey === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setGroupKey(k)}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
                          active
                            ? 'border-ink bg-ink text-bg'
                            : 'border-survive-border bg-surface text-ink-2'
                        }`}
                      >
                        Group {k}
                      </button>
                    );
                  })}
                </div>
              )}
              {renderBody()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {['dashboard', 'bracket', 'leaderboard'].includes(view) && pool && (
        <GroupSwitcher current={groupKey} onChange={setGroupKey} groupKeys={groupKeys} />
      )}
      <div className={['dashboard', 'bracket', 'leaderboard', 'profile'].includes(view) ? 'pb-24' : ''}>
        {renderBody()}
      </div>
      {['dashboard', 'bracket', 'leaderboard', 'profile'].includes(view) && (
        <BottomNav view={view} onNav={setView} />
      )}
    </div>
  );
}
