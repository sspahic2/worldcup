'use client';

import { STAGES } from '@/lib/data/teams';
import type { PoolStatus } from '@/types';

const STAGE_SHORT: Record<string, string> = {
  MD1: 'MD1', MD2: 'MD2', MD3: 'MD3', R32: 'R32',
  R16: 'R16', QF: 'QF', SF: 'SF', F: 'F',
};

export function StageBar({ current, status }: { current: string; status: PoolStatus }) {
  const idx = STAGES.indexOf(current as typeof STAGES[number]);

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {STAGES.map((s, i) => {
        const done = i < idx;
        const now = i === idx;
        const elim = status === 'eliminated' && i === idx;
        const red = status === 'redemption' && s === 'QF';
        let bg = 'var(--border)';
        if (done) bg = 'var(--ink-3)';
        if (now) bg = 'var(--accent)';
        if (elim) bg = 'var(--eliminated)';
        if (red) bg = 'var(--redemption)';

        return (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                height: now ? 6 : 4,
                background: bg,
                borderRadius: 2,
                transition: 'all 0.2s',
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9,
                color: now ? 'var(--ink)' : 'var(--ink-4)',
                textAlign: 'center',
                fontWeight: now ? 600 : 400,
              }}
            >
              {STAGE_SHORT[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
