import type { GroupKey } from '@/types';

// The 48 qualified teams, keyed by football-data.org TLA. Offline fallback
// for the live teamLookup \u2014 keep codes in sync with the feed.
export const TEAMS: Record<string, string> = {
  ALG: 'Algeria', ARG: 'Argentina', AUS: 'Australia', AUT: 'Austria',
  BEL: 'Belgium', BIH: 'Bosnia-Herzegovina', BRA: 'Brazil', CAN: 'Canada',
  CIV: 'Ivory Coast', COD: 'Congo DR', COL: 'Colombia', CPV: 'Cape Verde Islands',
  CRO: 'Croatia', CUW: 'Cura\u00e7ao', CZE: 'Czechia', ECU: 'Ecuador',
  EGY: 'Egypt', ENG: 'England', ESP: 'Spain', FRA: 'France',
  GER: 'Germany', GHA: 'Ghana', HAI: 'Haiti', IRN: 'Iran',
  IRQ: 'Iraq', JOR: 'Jordan', JPN: 'Japan', KOR: 'South Korea',
  KSA: 'Saudi Arabia', MAR: 'Morocco', MEX: 'Mexico', NED: 'Netherlands',
  NOR: 'Norway', NZL: 'New Zealand', PAN: 'Panama', PAR: 'Paraguay',
  POR: 'Portugal', QAT: 'Qatar', RSA: 'South Africa', SCO: 'Scotland',
  SEN: 'Senegal', SUI: 'Switzerland', SWE: 'Sweden', TUN: 'Tunisia',
  TUR: 'Turkey', URY: 'Uruguay', USA: 'United States', UZB: 'Uzbekistan',
};

export const GROUPS: Record<GroupKey, string[]> = {
  A: ['MEX', 'CRC', 'JAM', 'UZB'],
  B: ['CAN', 'ECU', 'MAR', 'POR'],
  C: ['CRO', 'NED', 'SEN', 'SVN'],
  D: ['USA', 'SUI', 'KOR', 'PAR'],
  E: ['ARG', 'NOR', 'AUS', 'TUN'],
  F: ['ENG', 'GER', 'CPV', 'JOR'],
  G: ['ESP', 'BEL', 'EGY', 'HAI'],
  H: ['BRA', 'IRN', 'COL', 'UAE'],
  I: ['FRA', 'URU', 'JPN', 'PAN'],
  J: ['ITA', 'SRB', 'CIV', 'CUR'],
  K: ['POL', 'UKR', 'DEN', 'NGA'],
  L: ['GHA', 'TUR', 'AUT', 'NZL'],
};

export const STAGES = ['MD1', 'MD2', 'MD3', 'R32', 'R16', 'QF', 'SF', 'F'] as const;

export const STAGE_LABELS: Record<string, string> = {
  MD1: 'Matchday 1', MD2: 'Matchday 2', MD3: 'Matchday 3',
  R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final',
};

const GROUP_VENUES = [
  'Los Angeles', 'Dallas', 'Toronto', 'Mexico City', 'New York', 'Miami',
  'Atlanta', 'Seattle', 'Boston', 'Houston', 'Philadelphia', 'Kansas City',
];

export function groupFixtures(groupKey: GroupKey) {
  const t = GROUPS[groupKey];
  const venueIdx = groupKey.charCodeAt(0) - 65;
  return [
    { md: 1, a: t[0], b: t[1], venue: GROUP_VENUES[venueIdx], date: 'Jun 11' },
    { md: 1, a: t[2], b: t[3], venue: 'Vancouver', date: 'Jun 11' },
    { md: 2, a: t[0], b: t[2], venue: 'Monterrey', date: 'Jun 17' },
    { md: 2, a: t[3], b: t[1], venue: 'San Francisco', date: 'Jun 17' },
    { md: 3, a: t[0], b: t[3], venue: 'Guadalajara', date: 'Jun 24' },
    { md: 3, a: t[1], b: t[2], venue: 'Philadelphia', date: 'Jun 24' },
  ];
}

// Demo pool data for development
export const USER_POOLS: Record<string, import('@/types').UserPool | null> = {
  A: { status: 'alive', stage: 'R32', pot: 2400, survivors: 8, players: 24, picks: { MD1: 'MEX', MD2: 'UZB', MD3: 'MEX', R32: null }, buyIn: 100 },
  B: { status: 'alive', stage: 'R16', pot: 3600, survivors: 3, players: 36, picks: { MD1: 'POR', MD2: 'POR', MD3: 'CAN', R32: 'POR' }, buyIn: 100 },
  C: { status: 'eliminated', stage: 'R16', pot: 1800, survivors: 4, players: 18, picks: { MD1: 'NED', MD2: 'CRO', MD3: 'SEN_L', R32: null }, eliminatedAt: 'MD3', buyIn: 100 },
  D: { status: 'alive', stage: 'R16', pot: 8800, survivors: 5, players: 88, picks: { MD1: 'USA', MD2: 'SUI', MD3: 'KOR', R32: 'USA' }, buyIn: 100, hero: true },
  E: { status: 'alive', stage: 'R32', pot: 3200, survivors: 11, players: 32, picks: { MD1: 'ARG', MD2: 'ARG', MD3: 'NOR', R32: null }, buyIn: 100 },
  F: { status: 'redemption', stage: 'QF', pot: 5400, survivors: 2, players: 54, picks: { MD1: 'ENG', MD2: 'GER', MD3: 'ENG', R32: 'ENG', R16: 'GER', QF: 'ENG_L' }, buyIn: 100 },
  G: { status: 'alive', stage: 'R16', pot: 2200, survivors: 6, players: 22, picks: { MD1: 'ESP', MD2: 'BEL', MD3: 'ESP', R32: 'ESP' }, buyIn: 100 },
  H: { status: 'eliminated', stage: 'MD2', pot: 2600, survivors: 14, players: 26, picks: { MD1: 'BRA', MD2: 'IRN_L' }, eliminatedAt: 'MD2', buyIn: 100 },
  I: { status: 'alive', stage: 'QF', pot: 4100, survivors: 2, players: 41, picks: { MD1: 'FRA', MD2: 'FRA', MD3: 'URU', R32: 'FRA', R16: 'URU' }, buyIn: 100 },
  J: null,
  K: { status: 'alive', stage: 'R32', pot: 1400, survivors: 9, players: 14, picks: { MD1: 'POL', MD2: 'DEN', MD3: 'POL', R32: null }, buyIn: 100 },
  L: null,
};
