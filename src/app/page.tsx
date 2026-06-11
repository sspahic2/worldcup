import { AppShell } from '@/components/AppShell';
import {
  getCurrentUserPool,
  getLeaderboard,
  getProfileData,
} from '@/lib/pool-data';

export default async function Home() {
  const [pool, leaderboard, profile] = await Promise.all([
    getCurrentUserPool(),
    getLeaderboard(),
    getProfileData(),
  ]);

  return (
    <AppShell
      initialPool={pool}
      initialLeaderboard={leaderboard}
      initialProfile={profile}
    />
  );
}
