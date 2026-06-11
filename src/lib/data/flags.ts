import type { FlagDef } from '@/types';

export const FLAGS: Record<string, FlagDef> = {
  // Group A — Mexico
  MEX: { colors: ['#006847', '#ffffff', '#ce1126'], dir: 'v' },
  CRC: { colors: ['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], dir: 'h' },
  JAM: { colors: ['#009b3a', '#000000', '#fed100'], dir: 'x' },
  UZB: { colors: ['#0099b5', '#ffffff', '#1eb53a'], dir: 'h' },

  // Group B — Canada
  CAN: { colors: ['#d52b1e', '#ffffff', '#d52b1e'], dir: 'v' },
  ECU: { colors: ['#ffd200', '#034ea2', '#ed1c24'], dir: 'h' },
  MAR: { colors: ['#c1272d'], dir: 's' },
  POR: { colors: ['#006600', '#ff0000'], dir: 'v' },

  // Group C
  CRO: { colors: ['#171796', '#ffffff', '#ff0000'], dir: 'h' },
  NED: { colors: ['#ae1c28', '#ffffff', '#21468b'], dir: 'h' },
  SEN: { colors: ['#00853f', '#fdef42', '#e31b23'], dir: 'v' },
  SVN: { colors: ['#ffffff', '#005ce6', '#ed1c24'], dir: 'h' },

  // Group D — USA
  USA: { colors: ['#b22234', '#ffffff', '#3c3b6e'], dir: 'h' },
  SUI: { colors: ['#ff0000'], dir: 's' },
  KOR: { colors: ['#ffffff', '#cd2e3a', '#0047a0'], dir: 'h' },
  PAR: { colors: ['#d52b1e', '#ffffff', '#0038a8'], dir: 'h' },

  // Group E
  ARG: { colors: ['#74acdf', '#ffffff', '#74acdf'], dir: 'h' },
  NOR: { colors: ['#ef2b2d', '#ffffff', '#002868'], dir: 'v' },
  AUS: { colors: ['#00247d', '#ff0000'], dir: 'd' },
  TUN: { colors: ['#e70013', '#ffffff', '#e70013'], dir: 'v' },

  // Group F
  ENG: { colors: ['#ffffff', '#ce1124'], dir: 'x' },
  GER: { colors: ['#000000', '#dd0000', '#ffce00'], dir: 'h' },
  CPV: { colors: ['#003893', '#ffffff', '#cf2027'], dir: 'h' },
  JOR: { colors: ['#000000', '#ffffff', '#007a3d'], dir: 'h' },

  // Group G
  ESP: { colors: ['#aa151b', '#f1bf00', '#aa151b'], dir: 'h' },
  BEL: { colors: ['#000000', '#fae042', '#ed2939'], dir: 'v' },
  EGY: { colors: ['#ce1126', '#ffffff', '#000000'], dir: 'h' },
  HAI: { colors: ['#00209f', '#d21034'], dir: 'h' },

  // Group H
  BRA: { colors: ['#009739', '#fedd00'], dir: 's' },
  IRN: { colors: ['#239f40', '#ffffff', '#da0000'], dir: 'h' },
  COL: { colors: ['#fcd116', '#003893', '#ce1126'], dir: 'h' },
  UAE: { colors: ['#00732f', '#ffffff', '#000000'], dir: 'h' },

  // Group I
  FRA: { colors: ['#002395', '#ffffff', '#ed2939'], dir: 'v' },
  URU: { colors: ['#ffffff', '#0038a8', '#ffffff', '#0038a8'], dir: 'h' },
  JPN: { colors: ['#ffffff'], dir: 's' },
  PAN: { colors: ['#ffffff', '#d21034', '#0038a8', '#ffffff'], dir: 'q' },

  // Group J
  ITA: { colors: ['#009246', '#ffffff', '#ce2b37'], dir: 'v' },
  SRB: { colors: ['#c6363c', '#0c4076', '#ffffff'], dir: 'h' },
  CIV: { colors: ['#ff8200', '#ffffff', '#009e60'], dir: 'v' },
  CUR: { colors: ['#002b7f', '#fae042'], dir: 'h' },

  // Group K
  POL: { colors: ['#ffffff', '#dc143c'], dir: 'h' },
  UKR: { colors: ['#0057b7', '#ffd700'], dir: 'h' },
  DEN: { colors: ['#c8102e'], dir: 's' },
  NGA: { colors: ['#008751', '#ffffff', '#008751'], dir: 'v' },

  // Group L
  GHA: { colors: ['#ce1126', '#fcd116', '#006b3f'], dir: 'h' },
  TUR: { colors: ['#e30a17'], dir: 's' },
  AUT: { colors: ['#ed2939', '#ffffff', '#ed2939'], dir: 'h' },
  NZL: { colors: ['#012169', '#ffffff', '#cc142b'], dir: 'h' },

  // Other WC2026 qualifiers served by the live data feed but absent from the
  // static demo groups above — kept here as the offline/no-crest fallback.
  RSA: { colors: ['#007749', '#ffb612'], dir: 'h' },
  ALG: { colors: ['#006233', '#ffffff'], dir: 'v' },
  KSA: { colors: ['#006c35', '#ffffff'], dir: 'h' },
  QAT: { colors: ['#8a1538', '#ffffff'], dir: 'v' },
  SCO: { colors: ['#005eb8', '#ffffff'], dir: 'd' },
};
