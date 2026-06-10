'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { Countdown } from '@/components/ui/Countdown';
import { TEAMS } from '@/lib/data/teams';
import { cn } from '@/lib/utils';
import { isLocked, LOCK_BEFORE_KICKOFF_MINUTES } from '@/lib/picks/lock-rules';
import type { Match } from '@/types';

interface PickFlowProps {
  match: Match;
  usedTeams: string[];
  onConfirm: (team: string) => void;
  onBack: () => void;
  error?: string | null;
}

function TeamCard({
  code,
  selected,
  disabled,
  usedLabel,
  onSelect,
}: {
  code: string;
  selected: boolean;
  disabled: boolean;
  usedLabel: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-[14px] p-5 transition-all duration-150',
        'border-2 cursor-pointer',
        disabled && 'opacity-40 cursor-not-allowed',
        selected
          ? 'border-survive-accent bg-survive-accent/8'
          : 'border-survive-border bg-surface hover:border-border-2',
      )}
      style={{ outline: 'none' }}
    >
      <div className="flex items-center gap-4">
        <Flag code={code} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="display" style={{ fontSize: 28 }}>
            {TEAMS[code]}
          </div>
          {usedLabel && (
            <div
              className="mt-1"
              style={{
                fontSize: 11,
                color: 'var(--ink-4)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Already used this stage
            </div>
          )}
        </div>
        {selected && (
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 28,
              height: 28,
              background: 'var(--survive-accent)',
              color: 'var(--survive-accent-ink)',
            }}
          >
            <Icon name="check" size={16} color="var(--survive-accent-ink)" />
          </div>
        )}
      </div>
    </button>
  );
}

export function PickFlow({ match, usedTeams, onConfirm, onBack, error }: PickFlowProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [pickLocked, setPickLocked] = useState(
    () => match.utcDate ? isLocked(match.utcDate) : false,
  );

  const aUsed = usedTeams.includes(match.a);
  const bUsed = usedTeams.includes(match.b);

  const stageLabel = typeof match.md === 'number' ? `MD${match.md}` : match.md;

  if (error && locking) setLocking(false);

  // Re-check lock state every second so the UI flips to LOCKED on the boundary
  useEffect(() => {
    if (!match.utcDate || pickLocked) return;
    const id = setInterval(() => {
      if (isLocked(match.utcDate!)) setPickLocked(true);
    }, 1000);
    return () => clearInterval(id);
  }, [match.utcDate, pickLocked]);

  function handleLock() {
    if (!selected || locking || pickLocked) return;
    setLocking(true);
    onConfirm(selected);
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-[480px] mx-auto w-full">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-ink-3 hover:text-ink -ml-2"
        >
          <Icon name="arrow-left" size={16} />
          Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="eyebrow">Pick a winner &middot; {stageLabel}</div>
        <div className="display" style={{ fontSize: 40 }}>
          {TEAMS[match.a]} vs {TEAMS[match.b]}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {match.date} &middot; {match.venue}
          </span>
          <Countdown kickoffUtc={match.utcDate} />
        </div>
      </div>

      {/* Warning box */}
      <div
        className="flex items-start gap-3 p-4 rounded-[12px]"
        style={{
          background: 'color-mix(in oklab, var(--redemption) 12%, transparent)',
          border: '1px solid color-mix(in oklab, var(--redemption) 35%, transparent)',
        }}
      >
        <div
          className="flex items-center justify-center shrink-0 rounded-[8px]"
          style={{
            width: 32,
            height: 32,
            background: 'var(--redemption)',
            color: 'var(--redemption-ink)',
          }}
        >
          <Icon name="bolt" size={16} color="var(--redemption-ink)" />
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--ink-2)',
            margin: 0,
          }}
        >
          A draw eliminates you. Pick the side you&apos;re confident will win outright.
        </p>
      </div>

      {/* Team cards */}
      <div className="flex flex-col gap-3">
        <TeamCard
          code={match.a}
          selected={selected === match.a}
          disabled={aUsed}
          usedLabel={aUsed}
          onSelect={() => !aUsed && setSelected(match.a)}
        />
        <TeamCard
          code={match.b}
          selected={selected === match.b}
          disabled={bUsed}
          usedLabel={bUsed}
          onSelect={() => !bUsed && setSelected(match.b)}
        />
      </div>

      {pickLocked && (
        <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
          Picks for this match are locked. They close {LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff.
        </div>
      )}

      {error && (
        <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Lock pick button */}
      <div className="flex flex-col items-center gap-3 mt-2">
        <button
          type="button"
          disabled={!selected || locking || pickLocked}
          onClick={handleLock}
          className={cn(
            'btn-survive w-full',
            selected && !locking && !pickLocked
              ? 'bg-survive-accent text-survive-accent-ink'
              : 'bg-surface-2 text-ink-4 cursor-not-allowed',
          )}
          style={{
            opacity: !selected || pickLocked ? 0.5 : 1,
            fontSize: 15,
          }}
        >
          <Icon name="lock" size={16} />
          {pickLocked ? 'Picks closed' : locking ? 'Locking pick…' : 'Lock pick'}
        </button>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            textAlign: 'center',
          }}
        >
          Picks close {LOCK_BEFORE_KICKOFF_MINUTES} minutes before kickoff.
        </span>
      </div>
    </div>
  );
}
