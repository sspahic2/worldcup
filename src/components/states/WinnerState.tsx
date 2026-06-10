'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { PotCounter } from '@/components/ui/PotCounter';
interface WinnerStateProps {
  groupKey: string;
  team: string;
  pot: number;
  onBack: () => void;
}

export function WinnerState({ groupKey, team, pot, onBack }: WinnerStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center min-h-[70vh] px-6 py-12 gap-6"
      style={{
        background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--alive) 12%, var(--bg)) 0%, var(--bg) 70%)',
      }}
    >
      {/* Trophy */}
      <div style={{ fontSize: 48, lineHeight: 1 }}>
        &#127942;
      </div>

      {/* Eyebrow */}
      <div
        className="eyebrow"
        style={{ color: 'var(--alive)' }}
      >
        Group {groupKey} &middot; Champion
      </div>

      {/* Display */}
      <div
        className="display"
        style={{ fontSize: 64, lineHeight: 0.9, color: 'var(--alive)' }}
      >
        YOU WON.
      </div>

      {/* Share card */}
      <Card className="ring-0 border-alive/40 bg-surface rounded-[14px] w-full max-w-[360px]">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <div className="eyebrow">Your share</div>
          <PotCounter value={pot} size="lg" />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-2.5 w-full max-w-[300px] mt-2">
        <Button
          className="h-12 bg-alive text-alive-ink hover:bg-alive/90 text-[15px] font-semibold"
        >
          Collect winnings
        </Button>
        <Button
          variant="ghost"
          className="h-10 text-ink-3 hover:text-ink gap-2"
        >
          <Icon name="share" size={14} />
          Share
        </Button>
      </div>
    </div>
  );
}
