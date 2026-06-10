'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';

interface AccessDeniedProps {
  onBack: () => void;
}

export function AccessDenied({ onBack }: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[20px] border border-dashed border-eliminated/40 bg-eliminated/5 mb-4">
        <Icon name="lock" size={28} color="var(--eliminated)" />
      </div>
      <div className="display text-[32px] mb-1.5">Access Denied</div>
      <div className="text-[13px] text-ink-3 max-w-[280px] mb-5">
        You don&apos;t have permission to view this page. Contact a pool admin if you think this is a mistake.
      </div>
      <Button
        onClick={onBack}
        variant="outline"
        className="border-survive-border bg-surface text-ink hover:bg-surface-2"
      >
        Go back
      </Button>
    </div>
  );
}
