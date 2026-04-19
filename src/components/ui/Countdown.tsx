'use client';

interface CountdownProps {
  hours?: number;
  mins?: number;
  label?: string;
}

export function Countdown({ hours = 4, mins = 23, label = 'Locks in' }: CountdownProps) {
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
          background: 'var(--accent)',
        }}
        className="animate-pulse-glow"
      />
      <span
        style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
        {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:17
      </span>
    </div>
  );
}
