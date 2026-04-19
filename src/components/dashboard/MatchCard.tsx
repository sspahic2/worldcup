'use client';

import { Flag } from '@/components/ui/Flag';
import { TEAMS } from '@/lib/data/teams';
import type { Match } from '@/types';

function TeamSlot({ code, used, right }: { code: string; used: boolean; right?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexDirection: right ? 'row-reverse' : 'row',
        opacity: used ? 0.35 : 1,
      }}
    >
      <Flag code={code} size="lg" />
      <div style={{ textAlign: right ? 'right' : 'left' }}>
        <div
          className="display"
          style={{ fontSize: 20, textDecoration: used ? 'line-through' : 'none' }}
        >
          {TEAMS[code]}
        </div>
        {used && (
          <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>USED</div>
        )}
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  usedTeams: string[];
  onPick: () => void;
}

export function MatchCard({ match, usedTeams, onPick }: MatchCardProps) {
  const aUsed = usedTeams.includes(match.a);
  const bUsed = usedTeams.includes(match.b);

  return (
    <button
      className="card"
      onClick={onPick}
      style={{ padding: 14, textAlign: 'left', cursor: 'pointer', width: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="eyebrow">
            {match.knockout ? match.md : `MD${match.md}`} &middot; {match.date}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{match.venue}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <TeamSlot code={match.a} used={aUsed} />
        <span className="display mono" style={{ fontSize: 16, color: 'var(--ink-4)' }}>
          V
        </span>
        <TeamSlot code={match.b} used={bUsed} right />
      </div>
    </button>
  );
}
