'use client';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 16, color = 'currentColor', className }: IconProps) {
  const s = {
    width: size,
    height: size,
    strokeWidth: 1.8,
    stroke: color,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const svgProps = { viewBox: '0 0 24 24', ...s, className };

  switch (name) {
    case 'arrow-right':
      return <svg {...svgProps}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case 'arrow-left':
      return <svg {...svgProps}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case 'chevron-right':
      return <svg {...svgProps}><path d="M9 6l6 6-6 6" /></svg>;
    case 'chevron-down':
      return <svg {...svgProps}><path d="M6 9l6 6 6-6" /></svg>;
    case 'check':
      return <svg {...svgProps}><path d="M5 12l5 5L20 7" /></svg>;
    case 'lock':
      return <svg {...svgProps}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
    case 'trophy':
      return <svg {...svgProps}><path d="M7 4h10v5a5 5 0 01-10 0V4zM5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3M8 21h8M12 17v4" /></svg>;
    case 'plus':
      return <svg {...svgProps}><path d="M12 5v14M5 12h14" /></svg>;
    case 'close':
      return <svg {...svgProps}><path d="M6 6l12 12M6 18L18 6" /></svg>;
    case 'share':
      return <svg {...svgProps}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>;
    case 'copy':
      return <svg {...svgProps}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>;
    case 'grid':
      return <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case 'list':
      return <svg {...svgProps}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case 'bracket':
      return <svg {...svgProps}><path d="M4 4h3v7h4M4 20h3v-7h4M20 4h-3v7h-4M20 20h-3v-7h-4" /></svg>;
    case 'home':
      return <svg {...svgProps}><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'user':
      return <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
    case 'flame':
      return <svg {...svgProps}><path d="M12 3s5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 1 0 2 1 2 2 0 2-3 2-8z" /></svg>;
    case 'skull':
      return <svg {...svgProps}><path d="M5 11a7 7 0 0114 0v4l-2 2v3H7v-3l-2-2v-4z" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><path d="M11 17h2" /></svg>;
    case 'sun':
      return <svg {...svgProps}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>;
    case 'moon':
      return <svg {...svgProps}><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z" /></svg>;
    case 'settings':
      return <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case 'bolt':
      return <svg {...svgProps}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
    case 'dot-menu':
      return <svg {...svgProps}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
    case 'google':
      return (
        <svg {...svgProps} fill="currentColor" stroke="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    default:
      return null;
  }
}
