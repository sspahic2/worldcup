'use client';

import { Icon } from '@/components/ui/Icon';
import type { UserPool } from '@/types';

interface DesktopSidebarProps {
  view: string;
  onNav: (view: string) => void;
  groupKey: string;
  onGroupChange: (key: string) => void;
  theme: string;
  onToggleTheme: () => void;
  pools: Record<string, UserPool | null>;
}

const NAV_ITEMS = [
  { k: 'dashboard', i: 'home', l: 'Dashboard' },
  { k: 'bracket', i: 'bracket', l: 'Bracket' },
  { k: 'leaderboard', i: 'list', l: 'Leaderboard' },
  { k: 'profile', i: 'user', l: 'My Pools' },
  { k: 'create', i: 'plus', l: 'Join / Create' },
  { k: 'admin', i: 'settings', l: 'Admin' },
];

export function DesktopSidebar({
  view,
  onNav,
  groupKey,
  onGroupChange,
  theme,
  onToggleTheme,
  pools,
}: DesktopSidebarProps) {
  const joined = Object.entries(pools).filter(([, v]) => v) as [string, UserPool][];

  return (
    <div
      style={{
        width: 260,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="flame" size={16} />
        </div>
        <span className="display" style={{ fontSize: 22 }}>
          SURVIVE
        </span>
      </div>

      {/* Navigation */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Navigate
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((it) => {
            const active = view === it.k;
            return (
              <button
                key={it.k}
                onClick={() => onNav(it.k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <Icon name={it.i} size={16} /> {it.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Your tracks */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Your tracks
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {joined.map(([k, v]) => {
            const active = groupKey === k;
            const dotColor =
              v.status === 'alive'
                ? 'var(--alive)'
                : v.status === 'redemption'
                ? 'var(--redemption)'
                : 'var(--eliminated)';
            return (
              <button
                key={k}
                onClick={() => {
                  onGroupChange(k);
                  onNav('dashboard');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: active ? 'var(--surface)' : 'transparent',
                  fontSize: 13,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                <span className="display" style={{ fontSize: 14 }}>
                  Group {k}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 'auto' }}
                >
                  ${(v.pot / 1000).toFixed(1)}k
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="btn btn-ghost btn-sm"
        style={{ justifyContent: 'flex-start' }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  );
}
