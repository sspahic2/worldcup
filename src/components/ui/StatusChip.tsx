'use client';

import type { PoolStatus } from '@/types';

function Dot({ c }: { c: string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: c,
        display: 'inline-block',
      }}
    />
  );
}

export function StatusChip({ status }: { status: PoolStatus }) {
  if (status === 'alive')
    return (
      <span className="chip chip-alive">
        <Dot c="var(--alive)" /> Alive
      </span>
    );
  if (status === 'redemption')
    return (
      <span className="chip chip-red">
        <Dot c="var(--redemption)" /> Redemption
      </span>
    );
  if (status === 'eliminated')
    return (
      <span className="chip chip-out">
        <Dot c="var(--eliminated)" /> Out
      </span>
    );
  if (status === 'won')
    return <span className="chip chip-alive">&#127942; Won</span>;
  return <span className="chip chip-neutral">&mdash;</span>;
}

export { Dot };
