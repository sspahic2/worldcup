'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { Separator } from '@/components/ui/separator';
import { GROUPS } from '@/lib/data/teams';
import { cn } from '@/lib/utils';
import { createPool, joinPool } from '@/app/actions/pools';
import type { GroupKey } from '@/types';

interface CreateJoinProps {
  onClose: () => void;
  onCreate: () => void;
  desktop: boolean;
}

type TabKey = 'join' | 'create';

const GROUP_KEYS = Object.keys(GROUPS) as GroupKey[];
const BUY_IN_OPTIONS = [25, 50, 100, 250, 500];

export function CreateJoin({ onClose, onCreate, desktop }: CreateJoinProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('join');
  const [roomCode, setRoomCode] = useState('');
  const [poolName, setPoolName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null);
  const [buyIn, setBuyIn] = useState(100);

  const showJoinPreview = roomCode.length >= 4;

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      try {
        await joinPool(roomCode);
        router.refresh();
        onCreate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to join pool');
      }
    });
  };

  const handleCreate = () => {
    if (!selectedGroup || !poolName) return;
    setError(null);
    startTransition(async () => {
      try {
        await createPool({ name: poolName, groupKey: selectedGroup, buyIn });
        router.refresh();
        onCreate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create pool');
      }
    });
  };

  return (
    <div className={cn('flex flex-col gap-5', desktop ? 'max-w-[560px] p-8 pb-12' : 'p-4 pb-8')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="display" style={{ fontSize: 24, lineHeight: 1 }}>
          JOIN OR CREATE
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-[10px] bg-bg-2">
        <button
          onClick={() => setTab('join')}
          className={cn(
            'flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            tab === 'join'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-3 hover:text-ink-2'
          )}
        >
          Join
        </button>
        <button
          onClick={() => setTab('create')}
          className={cn(
            'flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            tab === 'create'
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-3 hover:text-ink-2'
          )}
        >
          Create
        </button>
      </div>

      {/* Join tab */}
      {tab === 'join' && (
        <div className="flex flex-col gap-4">
          {/* Room code input */}
          <div>
            <label className="eyebrow block mb-2">Room code</label>
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              className="h-12 text-center mono text-lg tracking-[0.15em] border-survive-border bg-surface focus-visible:border-survive-accent"
            />
          </div>

          {/* Join button */}
          <Button
            onClick={handleJoin}
            disabled={!showJoinPreview || pending}
            className={cn(
              'h-12 text-[14px] font-semibold',
              'bg-survive-accent text-survive-accent-ink hover:bg-survive-accent/90',
              'disabled:opacity-40'
            )}
          >
            {pending ? 'Joining...' : 'Join pool'}
          </Button>
        </div>
      )}

      {/* Create tab */}
      {tab === 'create' && (
        <div className="flex flex-col gap-4">
          {/* Pool name */}
          <div>
            <label className="eyebrow block mb-2">Pool name</label>
            <Input
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="My Survivor Pool"
              className="h-11 border-survive-border bg-surface focus-visible:border-survive-accent"
            />
          </div>

          {/* Group picker */}
          <div>
            <label className="eyebrow block mb-2">Group</label>
            <div className="grid grid-cols-6 gap-1.5">
              {GROUP_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedGroup(key)}
                  className={cn(
                    'h-10 rounded-lg text-[14px] font-bold display transition-all',
                    selectedGroup === key
                      ? 'bg-survive-accent text-survive-accent-ink'
                      : 'bg-surface border border-survive-border text-ink-2 hover:border-border-2 hover:text-ink'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Buy-in selector */}
          <div>
            <label className="eyebrow block mb-2">Buy-in</label>
            <div className="flex gap-1.5">
              {BUY_IN_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBuyIn(amount)}
                  className={cn(
                    'flex-1 h-10 rounded-lg mono text-[13px] font-semibold transition-all',
                    buyIn === amount
                      ? 'bg-survive-accent text-survive-accent-ink'
                      : 'bg-surface border border-survive-border text-ink-2 hover:border-border-2 hover:text-ink'
                  )}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Preview card */}
          {selectedGroup && poolName && (
            <Card className="ring-0 border-survive-border bg-surface rounded-[14px] rise">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-bold">{poolName}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">
                      Group {selectedGroup} &middot; ${buyIn} buy-in
                    </div>
                  </div>
                  <div className="display" style={{ fontSize: 18 }}>
                    GROUP {selectedGroup}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {GROUPS[selectedGroup].map((c) => (
                    <span key={c} className="inline-flex items-center gap-1">
                      <Flag code={c} size="sm" />
                      <span className="text-[10px] text-ink-3 font-medium">{c}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={!selectedGroup || !poolName || pending}
            className={cn(
              'h-12 text-[14px] font-semibold',
              'bg-survive-accent text-survive-accent-ink hover:bg-survive-accent/90',
              'disabled:opacity-40'
            )}
          >
            {pending ? 'Creating...' : 'Create pool'}
          </Button>
        </div>
      )}

      {error && (
        <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
