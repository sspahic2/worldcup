'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusChip } from '@/components/ui/StatusChip';
import { PotCounter } from '@/components/ui/PotCounter';
import { updateProfile } from '@/app/actions/profile';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/types';

interface ProfileProps {
  profile: ProfileData | null;
  desktop: boolean;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function Profile({ profile, desktop }: ProfileProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!profile) {
    return (
      <div className={cn('flex flex-col gap-6', desktop ? 'max-w-[900px] p-8 px-10 pb-16' : 'p-4')}>
        <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
          <CardContent className="p-6 text-center text-[13px] text-ink-3">
            Couldn&apos;t load your profile. Sign in or try refreshing.
          </CardContent>
        </Card>
      </div>
    );
  }

  const startEdit = () => {
    setDraft(profile.displayName);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    const name = draft.trim();
    if (name.length < 2 || name.length > 30) {
      setError('Display name must be 2-30 characters');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile(name);
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update name');
      }
    });
  };

  const statCards: { label: string; value: string | number }[] = [
    { label: 'Picks', value: profile.picksMade },
    { label: 'Wins', value: profile.wins },
    { label: 'Stage', value: profile.currentStage },
  ];

  return (
    <div className={cn('flex flex-col gap-6', desktop ? 'max-w-[900px] p-8 px-10 pb-16' : 'p-4')}>
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div
          className="display flex items-center justify-center rounded-full bg-surface-2 border border-survive-border shrink-0"
          style={{
            width: desktop ? 72 : 56,
            height: desktop ? 72 : 56,
            fontSize: desktop ? 24 : 18,
            color: 'var(--ink-2)',
          }}
        >
          {initials(profile.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  maxLength={30}
                  autoFocus
                  disabled={pending}
                  aria-label="Display name"
                  className="max-w-[260px]"
                />
                <Button size="sm" onClick={save} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
              </div>
              {error && <div className="text-[12px] text-destructive">{error}</div>}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="display truncate"
                  style={{ fontSize: desktop ? 28 : 22, lineHeight: 1 }}
                >
                  {profile.displayName.toUpperCase()}
                </div>
                <Button size="xs" variant="outline" onClick={startEdit}>
                  Edit
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {profile.username && (
                  <span className="text-[13px] text-ink-3">@{profile.username}</span>
                )}
                {profile.status && <StatusChip status={profile.status} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-2.5 grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="ring-0 border-survive-border bg-surface rounded-[14px]">
            <CardContent className="p-3 text-center">
              <div
                className="display mono"
                style={{
                  fontSize: desktop ? 32 : 24,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div className="eyebrow mt-1.5" style={{ fontSize: 9 }}>
                {stat.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Potential winnings */}
      <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
        <CardContent className={cn(desktop ? 'p-6' : 'p-4')}>
          <div className="eyebrow mb-2">Potential winnings</div>
          <PotCounter value={profile.potShare} size={desktop ? 'lg' : 'md'} />
          <div className="text-[11px] text-ink-3 mt-2">
            Your share of the pot if you survive
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
