'use client';

interface PotCounterProps {
  value: number;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  prefix?: string;
}

export function PotCounter({ value, size = 'xl', prefix = '$' }: PotCounterProps) {
  const str = value.toLocaleString();
  const fontSize = size === 'xl' ? 72 : size === 'lg' ? 48 : size === 'md' ? 32 : 22;

  return (
    <div
      className="display mono"
      style={{
        fontSize,
        lineHeight: 0.85,
        letterSpacing: '-0.02em',
        display: 'flex',
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontSize: fontSize * 0.5, color: 'var(--ink-3)', marginRight: 4 }}>
        {prefix}
      </span>
      <span style={{ fontFeatureSettings: '"tnum"' }}>{str}</span>
    </div>
  );
}
