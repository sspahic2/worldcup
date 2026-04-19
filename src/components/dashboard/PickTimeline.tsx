'use client';

import { Flag } from '@/components/ui/Flag';
import { TEAMS } from '@/lib/data/teams';
import type { PoolStatus } from '@/types';

interface PickTimelineProps {
  picks: Record<string, string | null | undefined>;
  status: PoolStatus;
}

export function PickTimeline({ picks }: PickTimelineProps) {
  const items = [
    { stage: 'MD1', pick: picks.MD1 },
    { stage: 'MD2', pick: picks.MD2 },
    { stage: 'MD3', pick: picks.MD3 },
    { stage: 'R32', pick: picks.R32 },
    { stage: 'R16', pick: picks.R16 },
    { stage: 'QF', pick: picks.QF },
    { stage: 'SF', pick: picks.SF },
    { stage: 'F', pick: picks.F },
  ].filter((i) => i.pick !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {items.map((it, i) => {
        const lost = it.pick && it.pick.endsWith('_L');
        const code = lost ? it.pick!.replace('_L', '') : it.pick;
        const pending = !it.pick;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div
              className="mono"
              style={{ width: 36, fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}
            >
              {it.stage}
            </div>
            {pending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-4)' }}>
                <div
                  style={{
                    width: 20,
                    height: 14,
                    borderRadius: 2,
                    border: '1px dashed var(--border-2)',
                  }}
                />
                <span style={{ fontSize: 13 }}>No pick yet</span>
              </div>
            ) : (
              <>
                <Flag code={code!} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                    textDecoration: lost ? 'line-through' : 'none',
                    color: lost ? 'var(--ink-4)' : 'var(--ink)',
                  }}
                >
                  {TEAMS[code!]}
                </span>
                {lost ? (
                  <span className="chip chip-out">L</span>
                ) : (
                  <span className="chip chip-alive">W</span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
