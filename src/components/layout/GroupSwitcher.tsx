'use client';

import type { UserPool } from '@/types';

interface GroupSwitcherProps {
  current: string;
  onChange: (key: string) => void;
  pools: Record<string, UserPool | null>;
}

export function GroupSwitcher({ current, onChange, pools }: GroupSwitcherProps) {
  const joined = Object.entries(pools).filter(([, v]) => v) as [string, UserPool][];

  return (
    <div
      className="scroll"
      style={{
        padding: '14px 16px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        maxWidth: '100%',
      }}
    >
      {joined.map(([k, v]) => {
        const active = current === k;
        const dotColor =
          v.status === 'alive'
            ? 'var(--alive)'
            : v.status === 'redemption'
            ? 'var(--redemption)'
            : 'var(--eliminated)';
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: active ? 'var(--ink)' : 'var(--surface)',
              color: active ? 'var(--bg)' : 'var(--ink-2)',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
              flexShrink: 0,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }} />
            <span className="display" style={{ fontSize: 14, letterSpacing: 0 }}>
              GROUP {k}
            </span>
          </button>
        );
      })}
    </div>
  );
}
