'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { TEAMS } from '@/lib/data/teams';
import { cn } from '@/lib/utils';
import type { UserPool } from '@/types';

interface RedemptionProps {
  groupKey: string;
  pool: UserPool;
  onPick: (team?: string) => void;
  onBack: () => void;
}

// 3rd place match mock data
const MATCH_TEAM_A = 'ENG';
const MATCH_TEAM_B = 'BRA';

export function Redemption({ groupKey, pool, onPick, onBack }: RedemptionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4 pb-8 max-w-[560px] mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors self-start"
      >
        <Icon name="arrow-left" size={14} />
        Back
      </button>

      {/* Redemption badge */}
      <Badge
        className="self-start px-3 py-1 h-auto text-[11px] font-bold tracking-[0.08em] bg-redemption/15 text-redemption border-0"
      >
        REDEMPTION PATH
      </Badge>

      {/* Display */}
      <div
        className="display"
        style={{ fontSize: 56, lineHeight: 0.88 }}
      >
        ONE LAST SHOT.
      </div>

      {/* Description */}
      <p className="text-ink-3 text-[14px] leading-relaxed -mt-1">
        You were eliminated in the Quarterfinals. But there&apos;s a lifeline:
        correctly predict the 3rd Place match winner to buy your way back into
        the Final and compete for the pot.
      </p>

      {/* 3rd Place match card */}
      <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">3rd Place Match</span>
            <span className="eyebrow" style={{ color: 'var(--redemption)' }}>
              Redemption Round
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Team A */}
            <button
              onClick={() => setSelected(MATCH_TEAM_A)}
              className={cn(
                'flex flex-col items-center gap-3 p-4 rounded-[12px] border-2 transition-all',
                selected === MATCH_TEAM_A
                  ? 'border-redemption bg-redemption/8'
                  : 'border-survive-border bg-bg-2 hover:border-border-2'
              )}
            >
              <Flag code={MATCH_TEAM_A} size="xl" />
              <span className="display" style={{ fontSize: 18, lineHeight: 1 }}>
                {TEAMS[MATCH_TEAM_A]}
              </span>
              <span className="text-[11px] text-ink-3">{MATCH_TEAM_A}</span>
            </button>

            {/* Team B */}
            <button
              onClick={() => setSelected(MATCH_TEAM_B)}
              className={cn(
                'flex flex-col items-center gap-3 p-4 rounded-[12px] border-2 transition-all',
                selected === MATCH_TEAM_B
                  ? 'border-redemption bg-redemption/8'
                  : 'border-survive-border bg-bg-2 hover:border-border-2'
              )}
            >
              <Flag code={MATCH_TEAM_B} size="xl" />
              <span className="display" style={{ fontSize: 18, lineHeight: 1 }}>
                {TEAMS[MATCH_TEAM_B]}
              </span>
              <span className="text-[11px] text-ink-3">{MATCH_TEAM_B}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* How redemption works */}
      <Card className="ring-0 border-survive-border bg-bg-2 rounded-[14px]">
        <CardContent className="p-4 flex flex-col gap-2.5">
          <div className="text-[13px] font-bold text-ink-2">How redemption works</div>
          <ul className="flex flex-col gap-2">
            <li className="flex items-start gap-2.5 text-[13px] text-ink-3 leading-relaxed">
              <span style={{ color: 'var(--redemption)', fontWeight: 700, flexShrink: 0 }}>1.</span>
              Pick the winner of the 3rd Place match
            </li>
            <li className="flex items-start gap-2.5 text-[13px] text-ink-3 leading-relaxed">
              <span style={{ color: 'var(--redemption)', fontWeight: 700, flexShrink: 0 }}>2.</span>
              If your pick wins, you re-enter the pool for the Final
            </li>
            <li className="flex items-start gap-2.5 text-[13px] text-ink-3 leading-relaxed">
              <span style={{ color: 'var(--redemption)', fontWeight: 700, flexShrink: 0 }}>3.</span>
              If your pick loses, you&apos;re permanently eliminated
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Take the shot button */}
      <Button
        disabled={!selected}
        onClick={() => onPick(selected ?? undefined)}
        className={cn(
          'h-12 text-[15px] font-semibold',
          'bg-redemption text-redemption-ink hover:bg-redemption/90',
          'disabled:opacity-40'
        )}
      >
        Take the shot
      </Button>
    </div>
  );
}
