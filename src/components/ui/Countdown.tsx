'use client';

import { useEffect, useState } from 'react';
import { lockTimeFor } from '@/lib/picks/lock-rules';

interface CountdownProps {
  /** ISO 8601 UTC kickoff time — counts down to the pick lock (60 min before kickoff). */
  kickoffUtc: string;
  label?: string;
}

function formatRemaining(targetMs: number, nowMs: number): string {
  const totalSecs = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

export function Countdown({ kickoffUtc, label }: CountdownProps) {
  const targetMs = lockTimeFor(kickoffUtc).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= targetMs) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= targetMs) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const locked = now >= targetMs;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: locked ? 'var(--ink-4)' : 'var(--survive-accent)',
        }}
        className={locked ? undefined : 'animate-pulse-glow'}
        suppressHydrationWarning
      />
      <span
        style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
        suppressHydrationWarning
      >
        {locked ? 'Locked' : (label ?? 'Locks in')}
      </span>
      {!locked && (
        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }} suppressHydrationWarning>
          {formatRemaining(targetMs, now)}
        </span>
      )}
    </div>
  );
}
