/**
 * Server-side fetcher: pulls all World Cup 2026 data from football-data.org
 * and returns it in a shape the UI can consume directly.
 *
 * Called once per page load (cached by the API client).
 */

import { getTeams, getAllMatches, getStandings } from './client';
import {
  transformTeam,
  transformMatch,
  transformStandings,
  buildTeamLookup,
  buildGroupsLookup,
  buildCrestLookup,
  groupMatchesByGroup,
  groupMatchesByStage,
  type WCTeam,
  type WCGroup,
  type WCMatch,
} from './transforms';

export interface WCData {
  teams: WCTeam[];
  teamLookup: Record<string, string>;         // code -> name
  crestLookup: Record<string, string>;         // code -> crest URL
  groups: WCGroup[];
  groupsLookup: Record<string, string[]>;      // "A" -> ["USA",...]
  matches: WCMatch[];
  matchesByGroup: Record<string, WCMatch[]>;   // "A" -> matches
  matchesByStage: Record<string, WCMatch[]>;   // "MD1" -> matches
  currentMatchday: number;
}

export async function fetchWCData(): Promise<WCData> {
  const [teamsRes, matchesRes, standingsRes] = await Promise.all([
    getTeams(),
    getAllMatches(),
    getStandings(),
  ]);

  const teams = teamsRes.teams.map(transformTeam);
  const matches = matchesRes.matches.map(transformMatch);
  const groups = standingsRes.standings.map(transformStandings);

  // Sort groups by key
  groups.sort((a, b) => a.key.localeCompare(b.key));

  // Sort matches by date
  matches.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  return {
    teams,
    teamLookup: buildTeamLookup(teams),
    crestLookup: buildCrestLookup(teams),
    groups,
    groupsLookup: buildGroupsLookup(groups),
    matches,
    matchesByGroup: groupMatchesByGroup(matches),
    matchesByStage: groupMatchesByStage(matches),
    currentMatchday: teamsRes.season?.currentMatchday || 1,
  };
}
