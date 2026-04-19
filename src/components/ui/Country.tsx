'use client';

import { Flag } from './Flag';
import { TEAMS } from '@/lib/data/teams';

interface CountryProps {
  code: string;
  name?: string;
  variant?: 'code' | 'name';
  size?: 'sm' | 'lg';
}

export function Country({ code, name, variant = 'code', size = 'sm' }: CountryProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'lg' ? 10 : 6,
        fontWeight: 600,
        letterSpacing: '-0.01em',
      }}
    >
      <Flag code={code} size={size} />
      <span style={{ fontSize: size === 'lg' ? 16 : 13 }}>
        {variant === 'name' ? (name || TEAMS[code]) : code}
      </span>
    </span>
  );
}
