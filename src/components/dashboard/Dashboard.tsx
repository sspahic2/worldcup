'use client';

import { Flag } from '@/components/ui/Flag';
import { StatusChip } from '@/components/ui/StatusChip';
import { StageBar } from '@/components/ui/StageBar';
import { PotCounter } from '@/components/ui/PotCounter';
import { Countdown } from '@/components/ui/Countdown';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Icon } from '@/components/ui/Icon';
import { MatchCard } from './MatchCard';
import { PickTimeline } from './PickTimeline';
import { TEAMS, GROUPS, groupFixtures, STAGE_LABELS } from '@/lib/data/teams';
import type { UserPool, GroupKey } from '@/types';

interface DashboardProps {
  groupKey: string;
  pool: UserPool;
  onPick: (match: { md: number | string; a: string; b: string; venue: string; date: string; knockout?: boolean }) => void;
  onOpenBracket: () => void;
  onOpenLeaderboard: () => void;
  onOpenRedemption: () => void;
  desktop: boolean;
}

export function Dashboard({
  groupKey,
  pool,
  onPick,
  onOpenBracket,
  onOpenLeaderboard,
  onOpenRedemption,
  desktop,
}: DashboardProps) {
  const fixtures = groupFixtures(groupKey as GroupKey);
  const stageLabel = STAGE_LABELS[pool.stage] || pool.stage;
  const usedTeams = Object.entries(pool.picks || {})
    .filter(([, v]) => v && !v.endsWith('_L'))
    .map(([, v]) => v!);

  const upcoming = pool.stage.startsWith('MD')
    ? fixtures.filter((f) => `MD${f.md}` === pool.stage)
    : [
        {
          md: pool.stage,
          a: GROUPS[groupKey as GroupKey][0],
          b: GROUPS[groupKey as GroupKey][2],
          venue: 'New York',
          date: 'Jul 04',
          knockout: true,
        },
      ];

  return (
    <div
      style={{
        padding: desktop ? '32px 40px 60px' : '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: desktop ? 1200 : '100%',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: desktop ? 28 : 20,
            gap: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">D-Block Degens &middot; Survivor Pool</div>
            <div className="display" style={{ fontSize: desktop ? 84 : 48, lineHeight: 0.9, marginTop: 6 }}>
              GROUP&nbsp;{groupKey}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {GROUPS[groupKey as GroupKey].map((c) => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Flag code={c} size={desktop ? 'lg' : 'sm'} />
                  <span style={{ fontSize: desktop ? 13 : 11, fontWeight: 600, letterSpacing: '0.02em' }}>
                    {TEAMS[c]}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <StatusChip status={pool.status} />
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: desktop ? '2fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div
            className="card"
            style={{
              padding: desktop ? 24 : 16,
              gridColumn: desktop ? 'span 1' : 'span 2',
              background: desktop
                ? 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, var(--surface)) 0%, var(--surface) 60%)'
                : 'var(--surface)',
            }}
          >
            <div className="eyebrow">Pot</div>
            <div style={{ marginTop: 8 }}>
              <PotCounter value={pool.pot} size={desktop ? 'xl' : 'md'} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 12 }}>
              <span className="mono">{pool.players}</span> players &middot;{' '}
              <span className="mono">${pool.buyIn}</span> buy-in &middot; Split {pool.survivors} ways ={' '}
              <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                ${Math.round(pool.pot / pool.survivors).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="card" style={{ padding: desktop ? 24 : 16 }}>
            <div className="eyebrow">Survivors</div>
            <div className="display mono" style={{ fontSize: desktop ? 56 : 36, marginTop: 8 }}>
              {pool.survivors}
              <span style={{ fontSize: '0.5em', color: 'var(--ink-3)' }}>/{pool.players}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
              {Math.round((pool.survivors / pool.players) * 100)}% still in
            </div>
          </div>
          <div className="card" style={{ padding: desktop ? 24 : 16 }}>
            <div className="eyebrow">Current Stage</div>
            <div className="display" style={{ fontSize: desktop ? 24 : 22, marginTop: 8, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {stageLabel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>Locks Fri 9:00 PM ET</div>
          </div>
        </div>

        {/* Stage progress */}
        <div style={{ padding: 16, background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <StageBar current={pool.stage} status={pool.status} />
        </div>
      </div>

      {/* Redemption banner */}
      {pool.status === 'redemption' && (
        <button onClick={onOpenRedemption} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'color-mix(in oklab, var(--redemption) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--redemption) 40%, transparent)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--redemption)',
                color: 'var(--redemption-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="flame" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--redemption)' }}>
                REDEMPTION ELIGIBLE
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
                Lost in QF. Pick the 3rd Place winner to buy your way into the Final.
              </div>
            </div>
            <Icon name="chevron-right" />
          </div>
        </button>
      )}

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: desktop ? '1.6fr 1fr' : '1fr', gap: desktop ? 24 : 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionHeader
              eyebrow="Next"
              title={`Your ${pool.stage} Pick`}
              right={<Countdown hours={2} mins={47} />}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              {upcoming.map((f, i) => (
                <MatchCard key={i} match={f} usedTeams={usedTeams} onPick={() => onPick(f)} />
              ))}
            </div>
          </div>

          {!desktop && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onOpenBracket}>
                <Icon name="bracket" size={16} /> View bracket
              </button>
              <button className="btn btn-ghost" onClick={onOpenLeaderboard}>
                <Icon name="list" size={16} /> Leaderboard
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionHeader eyebrow="History" title="Your picks" />
            <PickTimeline picks={pool.picks as Record<string, string | null | undefined>} status={pool.status} />
          </div>
          {desktop && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onOpenBracket}>
                <Icon name="bracket" size={16} /> Bracket
              </button>
              <button className="btn btn-ghost" onClick={onOpenLeaderboard}>
                <Icon name="list" size={16} /> Leaderboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
