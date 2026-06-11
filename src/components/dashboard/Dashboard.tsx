'use client';

import { useState } from 'react';
import { Flag } from '@/components/ui/Flag';
import { StatusChip } from '@/components/ui/StatusChip';
import { StageBar } from '@/components/ui/StageBar';
import { PotCounter } from '@/components/ui/PotCounter';
import { Countdown } from '@/components/ui/Countdown';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent } from '@/components/ui/card';
import { MatchCard } from './MatchCard';
import { PickTimeline } from './PickTimeline';
import { STAGE_LABELS, TEAMS } from '@/lib/data/teams';
import { usedTeams } from '@/lib/picks/pick-codes';
import type { UserPool } from '@/types';
import type { MatchInfo, TeamInfo } from '@/lib/adapters/types';

type UpcomingMatch = {
  id?: number;
  md: number | string;
  a: string;
  b: string;
  venue: string;
  date: string;
  utcDate?: string;
  knockout?: boolean;
};

interface DashboardProps {
  groupKey: string;
  pool: UserPool;
  /** The user's pending pick for the current stage, if any. */
  stagePick?: string | null;
  groupTeams: TeamInfo[];
  groupMatches: MatchInfo[];
  /** Number of members still alive (excludes redemption) — pot splits between these. */
  aliveCount: number;
  crestLookup: Record<string, string>;
  teamLookup: Record<string, string>;
  onPick: (match: UpcomingMatch) => void;
  onOpenBracket: () => void;
  onOpenLeaderboard: () => void;
  onOpenRedemption: () => void;
  desktop: boolean;
}

export function Dashboard({
  groupKey,
  pool,
  stagePick,
  groupTeams,
  groupMatches,
  aliveCount,
  crestLookup,
  teamLookup,
  onPick,
  onOpenBracket,
  onOpenLeaderboard,
  onOpenRedemption,
  desktop,
}: DashboardProps) {
  const stageLabel = STAGE_LABELS[pool.stage] || pool.stage;
  // Teams burned in *previous* stages. The current stage's own pick is
  // excluded so the user can still change it (or keep it) before lock.
  const burnedTeams = usedTeams(pool.picks, pool.stage);

  // Pot splits between alive members only (redemption members have no share) —
  // same rule as the leaderboard and profile pot shares.
  // TODO: swap to the shared `potShare` helper from '@/lib/pool-data' once it
  // is exported and consumable from a client component (pool-data currently
  // pulls in the server-only Supabase client).
  const splitCount = aliveCount > 0 ? aliveCount : pool.survivors;
  const aliveShare = splitCount > 0 ? Math.round(pool.pot / splitCount) : 0;

  // Real, still-pickable fixtures for the current stage: not started yet and
  // sorted by kickoff so the countdown targets the next match. Picks are
  // never offered without a real match id. The "now" snapshot is taken once
  // on mount; PickFlow and the server re-check lock state in real time.
  const [nowMs] = useState(() => Date.now());
  const upcoming: UpcomingMatch[] = groupMatches
    .filter(
      (m) =>
        m.stage === pool.stage &&
        m.homeTeam &&
        m.awayTeam &&
        (m.status === 'SCHEDULED' || m.status === 'TIMED') &&
        new Date(m.utcDate).getTime() > nowMs,
    )
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .map((m) => ({
      id: typeof m.id === 'number' ? m.id : undefined,
      md: m.matchday ?? pool.stage,
      a: m.homeTeam!.code,
      b: m.awayTeam!.code,
      venue: m.venue || 'TBD',
      date: m.displayDate,
      utcDate: m.utcDate,
      knockout: !pool.stage.startsWith('MD'),
    }));

  // The fixture the current pick belongs to, so the indicator card can jump
  // straight back into PickFlow (change/remove live there).
  const pickedMatch = stagePick
    ? upcoming.find((m) => m.a === stagePick || m.b === stagePick)
    : undefined;
  const stagePickName = stagePick
    ? teamLookup[stagePick] || TEAMS[stagePick] || stagePick
    : null;

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
              {groupTeams.map((t) => (
                <span key={t.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Flag code={t.code} crest={t.crest || crestLookup[t.code]} size={desktop ? 'lg' : 'sm'} />
                  <span style={{ fontSize: desktop ? 13 : 11, fontWeight: 600, letterSpacing: '0.02em' }}>
                    {teamLookup[t.code] || t.name}
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
                ? 'linear-gradient(135deg, color-mix(in oklab, var(--survive-accent) 10%, var(--surface)) 0%, var(--surface) 60%)'
                : 'var(--surface)',
            }}
          >
            <div className="eyebrow">Pot</div>
            <div style={{ marginTop: 8 }}>
              <PotCounter value={pool.pot} size={desktop ? 'xl' : 'md'} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 12 }}>
              <span className="mono">{pool.players}</span> players &middot;{' '}
              <span className="mono">${pool.buyIn}</span> buy-in &middot; Split {splitCount} ways ={' '}
              <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                ${aliveShare.toLocaleString()}
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
              right={upcoming[0]?.utcDate ? <Countdown kickoffUtc={upcoming[0].utcDate} /> : undefined}
            />
            {stagePick && (
              <Card
                className="ring-0 rounded-[14px] bg-surface mb-2.5"
                style={{
                  border: '1px solid color-mix(in oklab, var(--survive-accent) 45%, var(--border))',
                }}
              >
                <CardContent className="p-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Flag code={stagePick} crest={crestLookup[stagePick]} size="lg" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="eyebrow">Your pick &middot; {stageLabel}</div>
                      <div
                        className="display"
                        style={{
                          fontSize: 24,
                          lineHeight: 1.1,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stagePickName}
                      </div>
                    </div>
                    <span className="chip chip-alive">Locked in</span>
                    {pickedMatch && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onPick(pickedMatch)}
                        style={{ flexShrink: 0 }}
                      >
                        Change
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {upcoming.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {upcoming.map((f, i) => (
                  <MatchCard
                    key={f.id ?? i}
                    match={f}
                    usedTeams={burnedTeams}
                    crestLookup={crestLookup}
                    onPick={() => onPick(f)}
                  />
                ))}
              </div>
            ) : (
              <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
                <CardContent className="p-6 text-center">
                  <div className="display" style={{ fontSize: 22 }}>
                    Fixtures TBD
                  </div>
                  <p className="text-[13px] text-ink-3 mt-2 mb-0">
                    No upcoming {stageLabel} matches for Group {groupKey} yet. Picks open once
                    fixtures are confirmed.
                  </p>
                </CardContent>
              </Card>
            )}
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
            <PickTimeline picks={pool.picks as Record<string, string | null | undefined>} status={pool.status} currentStage={pool.stage} />
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
