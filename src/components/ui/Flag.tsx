'use client';

import Image from 'next/image';
import { FLAGS } from '@/lib/data/flags';
import { TEAMS } from '@/lib/data/teams';

interface FlagProps {
  code: string;
  /** Crest image URL (e.g. from football-data). Rendered instead of the CSS flag when set. */
  crest?: string;
  size?: 'sm' | 'lg' | 'xl';
}

const SIZES: Record<'sm' | 'lg' | 'xl', { w: number; h: number }> = {
  sm: { w: 20, h: 14 },
  lg: { w: 32, h: 22 },
  xl: { w: 56, h: 40 },
};

export function Flag({ code, crest, size = 'sm' }: FlagProps) {
  const f = FLAGS[code];
  const cls = size === 'lg' ? 'flag flag-lg' : size === 'xl' ? 'flag flag-xl' : 'flag';

  if (crest) {
    const { w, h } = SIZES[size];
    return (
      <Image
        src={crest}
        alt={TEAMS[code] || code}
        title={TEAMS[code] || code}
        width={w}
        height={h}
        className={cls}
        style={{ objectFit: 'contain', boxShadow: 'none' }}
      />
    );
  }

  if (!f) return <span className={cls} style={{ background: '#555' }} title={code} />;

  const { colors, dir } = f;
  let style: React.CSSProperties = {};

  if (dir === 's') {
    style = { background: colors[0] };
  } else if (dir === 'v') {
    const stops = colors
      .map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`)
      .join(',');
    style = { background: `linear-gradient(90deg, ${stops})` };
  } else if (dir === 'h') {
    const stops = colors
      .map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`)
      .join(',');
    style = { background: `linear-gradient(180deg, ${stops})` };
  } else if (dir === 'd') {
    style = { background: `linear-gradient(135deg, ${colors[0]} 60%, ${colors[1]} 60%)` };
  } else if (dir === 'x') {
    style = {
      background: colors[0],
      backgroundImage: `linear-gradient(90deg, transparent 42%, ${colors[1]} 42% 58%, transparent 58%), linear-gradient(0deg, transparent 38%, ${colors[1]} 38% 62%, transparent 62%)`,
    };
  } else if (dir === 'q') {
    style = {
      background: `conic-gradient(from 0deg, ${colors[0]} 25%, ${colors[1]} 25% 50%, ${colors[2]} 50% 75%, ${colors[3]} 75%)`,
    };
  }

  return (
    <span
      className={cls}
      style={style}
      title={TEAMS[code] || code}
      aria-label={TEAMS[code] || code}
    />
  );
}
