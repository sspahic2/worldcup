'use client';

import { Icon } from '@/components/ui/Icon';

const ITEMS = [
  { k: 'dashboard', icon: 'home', label: 'Home' },
  { k: 'bracket', icon: 'bracket', label: 'Bracket' },
  { k: 'leaderboard', icon: 'list', label: 'Pool' },
  { k: 'profile', icon: 'user', label: 'Me' },
];

interface BottomNavProps {
  view: string;
  onNav: (view: string) => void;
}

export function BottomNav({ view, onNav }: BottomNavProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        padding: '10px 0 20px',
        zIndex: 50,
      }}
    >
      {ITEMS.map((it) => {
        const active = view === it.k;
        return (
          <button
            key={it.k}
            onClick={() => onNav(it.k)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: active ? 'var(--survive-accent)' : 'var(--ink-3)',
            }}
          >
            <Icon name={it.icon} size={20} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
