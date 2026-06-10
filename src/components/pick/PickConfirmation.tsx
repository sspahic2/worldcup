'use client';

import { Button } from '@/components/ui/button';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { TEAMS } from '@/lib/data/teams';
import type { Match } from '@/types';

interface PickConfirmationProps {
  team: string;
  match: Match;
  onDone: () => void;
}

function kickoffText(utcDate?: string): string {
  if (!utcDate) return 'Kickoff is locked in.';
  const ms = new Date(utcDate).getTime() - Date.now();
  if (ms <= 0) return 'Match has kicked off.';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `Kickoff in ${m}m.`;
  return `Kickoff in ${h}h ${m}m.`;
}

export function PickConfirmation({ team, match, onDone }: PickConfirmationProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 p-4 max-w-[480px] mx-auto w-full"
      style={{ minHeight: '80vh', textAlign: 'center' }}
    >
      {/* Checkmark circle */}
      <div
        className="animate-tick-in flex items-center justify-center rounded-full"
        style={{
          width: 80,
          height: 80,
          background: 'var(--survive-accent)',
          color: 'var(--survive-accent-ink)',
        }}
      >
        <Icon name="check" size={36} color="var(--survive-accent-ink)" />
      </div>

      {/* Eyebrow */}
      <div
        className="eyebrow"
        style={{
          animation: 'rise 0.5s 0.2s both',
          opacity: 0,
        }}
      >
        Pick locked
      </div>

      {/* Team name */}
      <div
        className="display"
        style={{
          fontSize: 52,
          animation: 'rise 0.5s 0.3s both',
          opacity: 0,
        }}
      >
        {TEAMS[team]}
      </div>

      {/* Flag */}
      <div
        style={{
          animation: 'rise 0.5s 0.4s both',
          opacity: 0,
        }}
      >
        <Flag code={team} size="xl" />
      </div>

      {/* Info text */}
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--ink-3)',
          maxWidth: 320,
          margin: 0,
          animation: 'rise 0.5s 0.5s both',
          opacity: 0,
        }}
      >
        {kickoffText(match.utcDate)} If {TEAMS[team]} wins outright, you advance.
      </p>

      {/* Back to dashboard button */}
      <div
        style={{
          animation: 'rise 0.5s 0.6s both',
          opacity: 0,
        }}
      >
        <Button variant="ghost" onClick={onDone} className="gap-2 text-ink-3 hover:text-ink">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
