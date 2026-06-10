'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/StatusChip';
import { PotCounter } from '@/components/ui/PotCounter';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GROUPS, USER_POOLS } from '@/lib/data/teams';
import { cn } from '@/lib/utils';
import type { GroupKey, PoolStatus } from '@/types';

interface ProfileProps {
  onOpenGroup: (key: string) => void;
  desktop: boolean;
}

const STAT_CARDS: { label: string; value: number; status?: PoolStatus }[] = [
  { label: 'Pools', value: 10 },
  { label: 'Alive', value: 6, status: 'alive' },
  { label: 'Redemption', value: 1, status: 'redemption' },
  { label: 'Out', value: 2, status: 'eliminated' },
];

function statusColor(status?: PoolStatus): string {
  if (status === 'alive') return 'var(--alive)';
  if (status === 'redemption') return 'var(--redemption)';
  if (status === 'eliminated') return 'var(--eliminated)';
  return 'var(--ink)';
}

export function Profile({ onOpenGroup, desktop }: ProfileProps) {
  const pools = Object.entries(USER_POOLS).filter(
    ([, pool]) => pool !== null
  ) as [string, NonNullable<typeof USER_POOLS[string]>][];

  const joinableGroups = Object.entries(USER_POOLS)
    .filter(([, pool]) => pool === null)
    .map(([key]) => key);

  const totalPot = pools.reduce((sum, [, p]) => sum + (p.status === 'alive' || p.status === 'redemption' ? Math.round(p.pot / p.survivors) : 0), 0);

  return (
    <div className={cn('flex flex-col gap-6', desktop ? 'max-w-[900px] p-8 px-10 pb-16' : 'p-4')}>
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div
          className="display flex items-center justify-center rounded-full bg-surface-2 border border-survive-border"
          style={{
            width: desktop ? 72 : 56,
            height: desktop ? 72 : 56,
            fontSize: desktop ? 24 : 18,
            color: 'var(--ink-2)',
          }}
        >
          AK
        </div>
        <div>
          <div className="display" style={{ fontSize: desktop ? 28 : 22, lineHeight: 1 }}>
            ALEX K.
          </div>
          <div className="text-[13px] text-ink-3 mt-1">@akim</div>
        </div>
      </div>

      {/* Stats strip */}
      <div className={cn('grid gap-2.5', desktop ? 'grid-cols-4' : 'grid-cols-4')}>
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} className="ring-0 border-survive-border bg-surface rounded-[14px]">
            <CardContent className="p-3 text-center">
              <div
                className="display mono"
                style={{
                  fontSize: desktop ? 32 : 24,
                  color: statusColor(stat.status),
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
          <PotCounter value={totalPot} size={desktop ? 'lg' : 'md'} />
          <div className="text-[11px] text-ink-3 mt-2">
            Combined share across all active pools
          </div>
        </CardContent>
      </Card>

      {/* My pools */}
      <div>
        <SectionHeader eyebrow="Active" title="My pools" />
        <div className={cn('grid gap-2.5', desktop ? 'grid-cols-3' : 'grid-cols-2')}>
          {pools.map(([key, pool]) => {
            const teams = GROUPS[key as GroupKey] || [];
            return (
              <button
                key={key}
                onClick={() => onOpenGroup(key)}
                className="text-left w-full"
              >
                <Card className="ring-0 border-survive-border bg-surface rounded-[14px] hover:border-border-2 transition-colors h-full">
                  <CardContent className="p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="display" style={{ fontSize: 22, lineHeight: 1 }}>
                        GROUP {key}
                      </div>
                      <StatusChip status={pool.status} />
                    </div>
                    <div className="flex items-center gap-1">
                      {teams.slice(0, 4).map((c) => (
                        <Flag key={c} code={c} size="sm" />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-ink-3">
                        {pool.stage} &middot; {pool.survivors}/{pool.players}
                      </span>
                      <span className="mono text-[13px] font-semibold text-ink-2">
                        ${pool.pot.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}

          {/* Join card */}
          {joinableGroups.length > 0 && (
            <button
              onClick={() => onOpenGroup(joinableGroups[0])}
              className="text-left w-full"
            >
              <Card className="ring-0 border-survive-border bg-transparent rounded-[14px] border-dashed hover:border-border-2 transition-colors h-full">
                <CardContent className="p-3.5 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  <div
                    className="flex items-center justify-center rounded-[10px] border border-dashed border-survive-border"
                    style={{ width: 36, height: 36 }}
                  >
                    <Icon name="plus" size={16} color="var(--ink-4)" />
                  </div>
                  <span className="text-[12px] text-ink-3 font-semibold text-center">
                    Join Group {joinableGroups.join(', ')}
                  </span>
                </CardContent>
              </Card>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
