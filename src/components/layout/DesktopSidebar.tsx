'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useCompetitionData } from '@/lib/adapters/context';
import type { UserPool } from '@/types';

interface DesktopSidebarProps {
  view: string;
  onNav: (view: string) => void;
  groupKey: string;
  onGroupChange: (key: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onSignOut: () => void;
  groupKeys: string[];
  pool: UserPool | null;
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
  onSignOut,
  groupKeys,
  pool,
}: DesktopSidebarProps) {
  const { groupsLookup, teamLookup } = useCompetitionData();
  const dotColor =
    pool?.status === 'alive'
      ? 'var(--alive)'
      : pool?.status === 'redemption'
      ? 'var(--redemption)'
      : 'var(--eliminated)';

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
            background: 'var(--survive-accent)',
            color: 'var(--survive-accent-ink)',
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
        {pool && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              fontSize: 13,
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
            <span style={{ color: 'var(--ink-2)', textTransform: 'capitalize' }}>{pool.status}</span>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 'auto' }}
            >
              ${(pool.pot / 1000).toFixed(1)}k
            </span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupKeys.map((k) => {
            const active = groupKey === k;
            const codes = groupsLookup[k] ?? [];
            return (
              <button
                key={k}
                onClick={() => {
                  onGroupChange(k);
                  onNav('dashboard');
                }}
                title={codes.map((c) => teamLookup[c] || c).join(', ')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 2,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 13,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="display" style={{ fontSize: 14 }}>
                  Group {k}
                </span>
                {codes.length > 0 && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.02em',
                      color: 'var(--ink-4)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {codes.join(' · ')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Theme toggle + sign out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={onToggleTheme}
          className="btn btn-ghost btn-sm"
          style={{ justifyContent: 'flex-start' }}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="justify-start gap-2 text-ink-2 hover:text-ink"
        >
          <Icon name="logout" size={14} />
          Sign out
        </Button>
      </div>
    </div>
  );
}
