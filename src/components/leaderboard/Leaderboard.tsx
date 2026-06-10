'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import type { UserPool, PoolStatus } from '@/types';

interface LeaderboardProps {
  groupKey: string;
  pool: UserPool;
  desktop: boolean;
}

type FilterKey = 'all' | 'alive' | 'redemption' | 'out';

interface LeaderboardRow {
  rank: number;
  username: string;
  stage: string;
  streak: number;
  potShare: number;
  status: PoolStatus;
  isYou: boolean;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'alive', label: 'Alive' },
  { key: 'redemption', label: 'Redemption' },
  { key: 'out', label: 'Out' },
];

function buildMockRows(pool: UserPool): LeaderboardRow[] {
  const potPerSurvivor = pool.survivors > 0 ? Math.round(pool.pot / pool.survivors) : 0;

  const rows: LeaderboardRow[] = [
    { rank: 1, username: 'zak_attack', stage: 'R16', streak: 5, potShare: potPerSurvivor, status: 'alive', isYou: false },
    { rank: 2, username: 'the_oracle', stage: 'R16', streak: 5, potShare: potPerSurvivor, status: 'alive', isYou: false },
    { rank: 3, username: 'alex_k', stage: 'R16', streak: 4, potShare: potPerSurvivor, status: 'alive', isYou: true },
    { rank: 4, username: 'futbol_fanatic', stage: 'R16', streak: 4, potShare: potPerSurvivor, status: 'alive', isYou: false },
    { rank: 5, username: 'pitch_invader', stage: 'QF', streak: 3, potShare: 0, status: 'redemption', isYou: false },
    { rank: 6, username: 'keeper99', stage: 'R16', streak: 4, potShare: potPerSurvivor, status: 'alive', isYou: false },
    { rank: 7, username: 'hat_trick', stage: 'R32', streak: 2, potShare: 0, status: 'eliminated', isYou: false },
    { rank: 8, username: 'el_capitan', stage: 'R16', streak: 4, potShare: potPerSurvivor, status: 'alive', isYou: false },
    { rank: 9, username: 'volley_king', stage: 'MD3', streak: 1, potShare: 0, status: 'eliminated', isYou: false },
    { rank: 10, username: 'goal_machine', stage: 'R32', streak: 3, potShare: 0, status: 'eliminated', isYou: false },
  ];

  return rows;
}

export function Leaderboard({ groupKey, pool, desktop }: LeaderboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const rows = buildMockRows(pool);

  const filtered = rows.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'out') return r.status === 'eliminated';
    return r.status === activeFilter;
  });

  return (
    <div className={cn('flex flex-col gap-5', desktop ? 'max-w-[1200px] p-8 px-10 pb-16' : 'p-4')}>
      {/* Header */}
      <div>
        <div className="eyebrow">Group {groupKey} &middot; Leaderboard</div>
        <div
          className="display mt-2"
          style={{ fontSize: desktop ? 48 : 32, lineHeight: 0.9 }}
        >
          WHO&apos;S LEFT
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              'chip transition-colors cursor-pointer',
              activeFilter === f.key
                ? 'bg-surface-2 text-ink border border-border-2'
                : 'chip-neutral'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="ring-0 border-survive-border bg-surface rounded-[14px] overflow-hidden">
        <CardContent className="p-0">
          {filtered.map((row, i) => (
            <button
              key={row.rank}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/50',
                row.isYou && 'bg-survive-accent/5',
                i < filtered.length - 1 && 'border-b border-survive-border'
              )}
            >
              {/* Rank */}
              <span
                className="mono text-[13px] font-semibold text-ink-3"
                style={{ width: 28, textAlign: 'right' }}
              >
                {String(row.rank).padStart(2, '0')}
              </span>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold truncate">
                    {row.username}
                  </span>
                  {row.isYou && (
                    <Badge
                      variant="default"
                      className="text-[9px] px-1.5 py-0 h-4 bg-survive-accent text-survive-accent-ink"
                    >
                      YOU
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5">
                  {row.stage} &middot; {row.streak}W streak
                </div>
              </div>

              {/* Pot share (desktop only) */}
              {desktop && (
                <span className="mono text-[13px] font-semibold text-ink-2 w-20 text-right">
                  {row.potShare > 0 ? `$${row.potShare.toLocaleString()}` : '\u2014'}
                </span>
              )}

              {/* Status */}
              <StatusChip status={row.status} />

              {/* Chevron */}
              <Icon name="chevron-right" size={14} color="var(--ink-4)" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
