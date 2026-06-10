'use client';

import { Button } from '@/components/ui/button';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { TEAMS } from '@/lib/data/teams';

interface EliminatedStateProps {
  groupKey: string;
  team: string;
  onBack: () => void;
}

export function EliminatedState({ groupKey, team, onBack }: EliminatedStateProps) {
  const teamName = TEAMS[team] || team;

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[70vh] px-6 py-12 gap-6">
      {/* Grayscale flag */}
      <div style={{ filter: 'grayscale(1)', opacity: 0.6 }}>
        <Flag code={team} size="xl" />
      </div>

      {/* Eyebrow */}
      <div
        className="eyebrow"
        style={{ color: 'var(--eliminated)' }}
      >
        Eliminated &middot; Group {groupKey}
      </div>

      {/* Display */}
      <div
        className="display"
        style={{ fontSize: 56, lineHeight: 0.9 }}
      >
        OUT.
      </div>

      {/* Description */}
      <p className="text-ink-3 text-[14px] max-w-[380px] leading-relaxed">
        Your pick of <strong className="text-ink">{teamName}</strong> was
        eliminated. Better luck next time, or check out your other pools.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-2.5 w-full max-w-[300px] mt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 border-survive-border bg-surface text-ink hover:bg-surface-2 gap-2"
        >
          <Icon name="arrow-left" size={14} />
          See other pools
        </Button>
        <Button
          className="h-11 bg-survive-accent text-survive-accent-ink hover:bg-survive-accent/90"
        >
          Join new pool
        </Button>
      </div>
    </div>
  );
}
