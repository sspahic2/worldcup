import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { CompetitionDataProvider } from '@/lib/adapters/context';
import { fetchCompetitionData } from '@/lib/adapters/football-data-adapter';
import type { CompetitionData } from '@/lib/adapters/types';
import { AuthProvider } from '@/lib/permissions/context';
import { getAuthUser } from '@/lib/repositories/get-auth-user';
import {
  getCurrentUserPool,
  getUserTracks,
  getGamePot,
  getLeaderboard,
  getLeaderboards,
  getProfileData,
} from '@/lib/pool-data';

const EMPTY_COMPETITION_DATA: CompetitionData = {
  teams: [],
  teamLookup: {},
  crestLookup: {},
  groups: [],
  groupsLookup: {},
  matches: [],
  matchesByGroup: {},
  matchesByStage: {},
  currentMatchday: 1,
};

async function getCompetitionDataSafe(): Promise<CompetitionData> {
  try {
    return await fetchCompetitionData();
  } catch (error) {
    console.error('fetchCompetitionData failed, rendering without fixtures', error);
    return EMPTY_COMPETITION_DATA;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Magic links built from a stale Supabase Site URL land on "/?code=..."
  // instead of the auth callback — forward them so the code gets exchanged.
  const { code } = await searchParams;
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  const [competitionData, authUser, pool, tracks, gamePot, leaderboard, groupLeaderboards, profile] =
    await Promise.all([
      getCompetitionDataSafe(),
      getAuthUser(),
      getCurrentUserPool(),
      getUserTracks(),
      getGamePot(),
      getLeaderboard(),
      getLeaderboards(),
      getProfileData(),
    ]);

  return (
    <CompetitionDataProvider data={competitionData}>
      <AuthProvider user={authUser}>
        <Suspense>
          <AppShell
            initialPool={pool}
            initialTracks={tracks}
            initialGamePot={gamePot}
            initialLeaderboard={leaderboard}
            initialGroupLeaderboards={groupLeaderboards}
            initialProfile={profile}
          />
        </Suspense>
      </AuthProvider>
    </CompetitionDataProvider>
  );
}
