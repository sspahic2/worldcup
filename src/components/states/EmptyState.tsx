'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';

interface EmptyStateProps {
  onJoin: () => void;
}

export function EmptyState({ onJoin }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh] px-6 py-12 gap-5">
      {/* Dashed icon box */}
      <div
        className="flex items-center justify-center rounded-2xl border-2 border-dashed border-survive-border"
        style={{ width: 72, height: 72 }}
      >
        <Icon name="flame" size={28} color="var(--ink-4)" />
      </div>

      {/* Title */}
      <div className="display" style={{ fontSize: 28, lineHeight: 0.9 }}>
        NO POOLS YET
      </div>

      {/* Description */}
      <p className="text-ink-3 text-[14px] max-w-[340px] leading-relaxed">
        Join or create a survivor pool to start competing. Pick a group, buy in,
        and try to be the last one standing.
      </p>

      {/* Actions */}
      <div className="flex gap-2.5 mt-2">
        <Button
          onClick={onJoin}
          className="h-11 px-6 bg-survive-accent text-survive-accent-ink hover:bg-survive-accent/90"
        >
          Join a pool
        </Button>
        <Button
          variant="outline"
          onClick={onJoin}
          className="h-11 px-6 border-survive-border bg-surface text-ink hover:bg-surface-2"
        >
          Create
        </Button>
      </div>
    </div>
  );
}
