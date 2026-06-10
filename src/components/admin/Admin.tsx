'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/Icon';
import { Country } from '@/components/ui/Country';
import { cn } from '@/lib/utils';

interface AdminProps {
  onClose: () => void;
  desktop: boolean;
}

type MatchOutcome = 'a' | 'draw' | 'b' | null;

interface MatchEntry {
  id: string;
  teamA: string;
  teamB: string;
  stage: string;
  live: boolean;
  outcome: MatchOutcome;
}

interface RecentResult {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  stage: string;
}

const MOCK_MATCHES: MatchEntry[] = [
  { id: 'm1', teamA: 'USA', teamB: 'SUI', stage: 'R16', live: true, outcome: null },
  { id: 'm2', teamA: 'ENG', teamB: 'BRA', stage: 'R16', live: true, outcome: null },
  { id: 'm3', teamA: 'FRA', teamB: 'ESP', stage: 'R16', live: false, outcome: null },
  { id: 'm4', teamA: 'ARG', teamB: 'GER', stage: 'R16', live: false, outcome: null },
];

const RECENT_RESULTS: RecentResult[] = [
  { teamA: 'MEX', teamB: 'CRC', scoreA: 2, scoreB: 1, stage: 'R32' },
  { teamA: 'POR', teamB: 'CAN', scoreA: 3, scoreB: 0, stage: 'R32' },
  { teamA: 'NED', teamB: 'SEN', scoreA: 1, scoreB: 1, stage: 'R32' },
];

const IMPACT_STATS = [
  { label: 'Players eliminated', value: 14 },
  { label: 'Players entering redemption', value: 3 },
  { label: 'Pools affected', value: 8 },
  { label: 'Total pot at stake', value: '$38,400' },
];

export function Admin({ onClose, desktop }: AdminProps) {
  const [matches, setMatches] = useState<MatchEntry[]>(MOCK_MATCHES);

  function setOutcome(id: string, outcome: MatchOutcome) {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, outcome } : m))
    );
  }

  return (
    <div className={cn('flex flex-col gap-5', desktop ? 'max-w-[1100px] p-8 px-10 pb-16' : 'p-4 pb-8')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow" style={{ color: 'var(--redemption)' }}>
            Admin
          </div>
          <div className="display mt-1" style={{ fontSize: desktop ? 36 : 28, lineHeight: 0.9 }}>
            MATCH RESULTS
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Body */}
      <div className={cn('grid gap-5', desktop ? 'grid-cols-[1.4fr_1fr] gap-6' : 'grid-cols-1')}>
        {/* Left: Match result entry */}
        <div className="flex flex-col gap-4">
          <div className="eyebrow">Current matches</div>

          {matches.map((match) => (
            <Card key={match.id} className="ring-0 border-survive-border bg-surface rounded-[14px]">
              <CardContent className="p-4 flex flex-col gap-3">
                {/* Match header */}
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{match.stage}</span>
                  {match.live && (
                    <Badge
                      variant="destructive"
                      className="bg-survive-accent/15 text-survive-accent border-0 text-[9px] font-bold tracking-widest"
                    >
                      LIVE
                    </Badge>
                  )}
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between gap-3">
                  <Country code={match.teamA} variant="name" size="lg" />
                  <span className="display mono text-ink-4" style={{ fontSize: 14 }}>
                    VS
                  </span>
                  <Country code={match.teamB} variant="name" size="lg" />
                </div>

                {/* Result selector */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setOutcome(match.id, 'a')}
                    className={cn(
                      'py-2 rounded-lg text-[12px] font-semibold transition-all',
                      match.outcome === 'a'
                        ? 'bg-alive text-alive-ink'
                        : 'bg-bg-2 text-ink-3 hover:text-ink'
                    )}
                  >
                    {match.teamA} wins
                  </button>
                  <button
                    onClick={() => setOutcome(match.id, 'draw')}
                    className={cn(
                      'py-2 rounded-lg text-[12px] font-semibold transition-all',
                      match.outcome === 'draw'
                        ? 'bg-redemption text-redemption-ink'
                        : 'bg-bg-2 text-ink-3 hover:text-ink'
                    )}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setOutcome(match.id, 'b')}
                    className={cn(
                      'py-2 rounded-lg text-[12px] font-semibold transition-all',
                      match.outcome === 'b'
                        ? 'bg-alive text-alive-ink'
                        : 'bg-bg-2 text-ink-3 hover:text-ink'
                    )}
                  >
                    {match.teamB} wins
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Recent results */}
          <div className="mt-2">
            <div className="eyebrow mb-3">Recent results</div>
            <div className="flex flex-col gap-0">
              {RECENT_RESULTS.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < RECENT_RESULTS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Country code={r.teamA} size="sm" />
                    <span className="mono text-[14px] font-bold">
                      {r.scoreA} - {r.scoreB}
                    </span>
                    <Country code={r.teamB} size="sm" />
                  </div>
                  <span className="eyebrow">{r.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Impact stats */}
        <div className="flex flex-col gap-4">
          {/* Impact preview */}
          <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="eyebrow">Impact preview</div>
              {IMPACT_STATS.map((stat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-ink-3">{stat.label}</span>
                    <span className="mono text-[14px] font-bold">{stat.value}</span>
                  </div>
                  {i < IMPACT_STATS.length - 1 && (
                    <Separator className="bg-survive-border mt-3" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Button
            className="h-12 bg-eliminated text-survive-accent-ink hover:bg-eliminated/90 text-[14px] font-semibold"
          >
            <Icon name="skull" size={16} />
            Trigger eliminations
          </Button>
          <Button
            variant="outline"
            className="h-12 border-survive-border bg-surface text-ink hover:bg-surface-2 text-[14px] font-semibold gap-2"
          >
            <Icon name="bolt" size={16} />
            Process refund flow
          </Button>
        </div>
      </div>
    </div>
  );
}
