import { AppShell } from '@/components/AppShell';
import { CompetitionDataProvider } from '@/lib/adapters/context';
import { fetchCompetitionData } from '@/lib/adapters/football-data-adapter';
import type { CompetitionData } from '@/lib/adapters/types';
import { AuthProvider } from '@/lib/permissions/context';
import { getAuthUser } from '@/lib/repositories/get-auth-user';
import {
  getCurrentUserPool,
  getLeaderboard,
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

export default async function Home() {
  const [competitionData, authUser, pool, leaderboard, profile] = await Promise.all([
    getCompetitionDataSafe(),
    getAuthUser(),
    getCurrentUserPool(),
    getLeaderboard(),
    getProfileData(),
  ]);

  return (
    <CompetitionDataProvider data={competitionData}>
      <AuthProvider user={authUser}>
        <AppShell
          initialPool={pool}
          initialLeaderboard={leaderboard}
          initialProfile={profile}
        />
      </AuthProvider>
    </CompetitionDataProvider>
  );
}
