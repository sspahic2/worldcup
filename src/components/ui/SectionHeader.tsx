'use client';

import type { ReactNode } from 'react';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}

export function SectionHeader({ eyebrow, title, right }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {eyebrow}
          </div>
        )}
        <div className="display" style={{ fontSize: 24, whiteSpace: 'nowrap' }}>
          {title}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}
