/**
 * Data adapter barrel.
 *
 * Switch providers here. The rest of the app imports from this file
 * and never knows which underlying API is being used.
 *
 * To swap providers:
 *   1. Create a new adapter file (e.g. api-football-adapter.ts)
 *   2. Implement `fetchCompetitionData(): Promise<CompetitionData>`
 *   3. Change the re-export below
 */

// Active provider: football-data.org
export { fetchCompetitionData } from './football-data-adapter';

// Re-export the canonical types so consumers only need one import
export type {
  CompetitionData,
  TeamInfo,
  GroupInfo,
  GroupStanding,
  MatchInfo,
  MatchStatus,
} from './types';
