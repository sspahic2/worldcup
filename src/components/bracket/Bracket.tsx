'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Flag } from '@/components/ui/Flag';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useCompetitionData } from '@/lib/adapters/context';
import { isLostCode, baseTeamCode } from '@/lib/picks/pick-codes';
import { cn } from '@/lib/utils';
import type { UserPool } from '@/types';
import type { MatchInfo, TeamInfo } from '@/lib/adapters/types';

interface BracketProps {
  groupKey: string;
  pool: UserPool;
  desktop: boolean;
}

interface BracketSlot {
  team: TeamInfo | null;
  result: 'W' | 'L' | null;
  score?: string;
}

interface BracketRound {
  stage: string;
  label: string;
  matches: Array<{
    home: BracketSlot;
    away: BracketSlot;
    status: string;
    displayDate: string;
  }>;
}

function SlotCard({ slot }: { slot: BracketSlot }) {
  const borderColor =
    slot.result === 'W'
      ? 'border-alive/60'
      : slot.result === 'L'
        ? 'border-eliminated/60'
        : 'border-survive-border';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-surface',
        borderColor,
        slot.result === 'L' && 'opacity-50'
      )}
    >
      {slot.team ? (
        <>
          <Flag code={slot.team.code} crest={slot.team.crest} size="sm" />
          <span className="text-[12px] font-semibold tracking-tight flex-1 truncate">
            {slot.team.shortName}
          </span>
          {slot.score && (
            <span className="mono text-[11px] font-bold text-ink-2">{slot.score}</span>
          )}
          {slot.result === 'W' && (
            <span className="chip chip-alive" style={{ fontSize: 9, padding: '2px 5px' }}>W</span>
          )}
          {slot.result === 'L' && (
            <span className="chip chip-out" style={{ fontSize: 9, padding: '2px 5px' }}>L</span>
          )}
        </>
      ) : (
        <>
          <span
            style={{
              width: 20,
              height: 14,
              borderRadius: 2,
              border: '1px dashed var(--border-2)',
              flexShrink: 0,
            }}
          />
          <span className="text-[12px] text-ink-4">TBD</span>
        </>
      )}
    </div>
  );
}

function MatchRow({ match }: { match: BracketRound['matches'][0] }) {
  return (
    <div className="flex flex-col gap-1">
      <SlotCard slot={match.home} />
      <SlotCard slot={match.away} />
      <div className="text-center text-[9px] text-ink-4 mt-0.5">{match.displayDate}</div>
    </div>
  );
}

function buildMatchSlot(team: MatchInfo['homeTeam'], score: number | null, isWinner: boolean, isFinished: boolean): BracketSlot {
  return {
    team: team || null,
    result: isFinished ? (isWinner ? 'W' : 'L') : null,
    score: isFinished && score !== null ? String(score) : undefined,
  };
}

export function Bracket({ groupKey, pool, desktop }: BracketProps) {
  const { matches, matchesByGroup, teamLookup, crestLookup } = useCompetitionData();

  // Group stage matches for this group
  const groupMatches = matchesByGroup[groupKey] || [];

  // Knockout matches (all groups feed into these)
  const r32Matches = matches.filter(m => m.stage === 'R32');
  const r16Matches = matches.filter(m => m.stage === 'R16');
  const qfMatches = matches.filter(m => m.stage === 'QF');
  const sfMatches = matches.filter(m => m.stage === 'SF');
  const finalMatches = matches.filter(m => m.stage === 'F');

  // Build rounds from real data
  function buildRound(label: string, stageMatches: MatchInfo[]): BracketRound {
    return {
      stage: label,
      label,
      matches: stageMatches.map(m => {
        const isFinished = m.status === 'FINISHED';
        const homeWin = m.score.winner === 'HOME';
        const awayWin = m.score.winner === 'AWAY';
        return {
          home: buildMatchSlot(m.homeTeam, m.score.home, homeWin, isFinished),
          away: buildMatchSlot(m.awayTeam, m.score.away, awayWin, isFinished),
          status: m.status,
          displayDate: m.displayDate,
        };
      }),
    };
  }

  // Group stage split by matchday
  const md1 = groupMatches.filter(m => m.stage === 'MD1');
  const md2 = groupMatches.filter(m => m.stage === 'MD2');
  const md3 = groupMatches.filter(m => m.stage === 'MD3');

  const rounds: BracketRound[] = [
    buildRound('MD1', md1),
    buildRound('MD2', md2),
    buildRound('MD3', md3),
    buildRound('R32', r32Matches.slice(0, 2)), // show first 2 for space
    buildRound('R16', r16Matches.slice(0, 2)),
    buildRound('QF→F', [...qfMatches.slice(0, 1), ...finalMatches.slice(0, 1)]),
  ];

  // User's picks
  const pickEntries = Object.entries(pool.picks).filter(
    ([, v]) => v !== null && v !== undefined
  ) as [string, string][];

  return (
    <div className={cn('flex flex-col gap-6', desktop ? 'max-w-[1200px] p-8 px-10 pb-16' : 'p-4')}>
      {/* Header */}
      <div>
        <div className="eyebrow">Group {groupKey} &middot; Bracket</div>
        <div className="display mt-2" style={{ fontSize: desktop ? 48 : 32, lineHeight: 0.9 }}>
          TOURNAMENT PATH
        </div>
      </div>

      {/* Group stage fixtures — the core view */}
      <div>
        <SectionHeader eyebrow={`Group ${groupKey}`} title="Group Stage" />
        {desktop ? (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Matchday 1', matches: md1 },
              { label: 'Matchday 2', matches: md2 },
              { label: 'Matchday 3', matches: md3 },
            ].map((md) => (
              <div key={md.label}>
                <div className="eyebrow text-center mb-2">{md.label}</div>
                <div className="flex flex-col gap-3">
                  {md.matches.map((m) => {
                    const isFinished = m.status === 'FINISHED';
                    return (
                      <Card key={m.id} className="ring-0 border-survive-border bg-surface rounded-xl">
                        <CardContent className="p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            {m.homeTeam ? (
                              <>
                                <Flag code={m.homeTeam.code} crest={m.homeTeam.crest} />
                                <span className="text-sm font-semibold flex-1 truncate">{m.homeTeam.shortName}</span>
                              </>
                            ) : (
                              <span className="text-sm text-ink-4 flex-1">TBD</span>
                            )}
                            <span className="mono text-sm font-bold w-5 text-center">
                              {isFinished ? m.score.home : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.awayTeam ? (
                              <>
                                <Flag code={m.awayTeam.code} crest={m.awayTeam.crest} />
                                <span className="text-sm font-semibold flex-1 truncate">{m.awayTeam.shortName}</span>
                              </>
                            ) : (
                              <span className="text-sm text-ink-4 flex-1">TBD</span>
                            )}
                            <span className="mono text-sm font-bold w-5 text-center">
                              {isFinished ? m.score.away : ''}
                            </span>
                          </div>
                          <div className="text-[10px] text-ink-4 text-center mt-0.5">
                            {m.displayDate} &middot;{' '}
                            <span className={cn(
                              isFinished ? 'text-alive' :
                              m.status === 'IN_PLAY' ? 'text-redemption' :
                              'text-ink-4'
                            )}>
                              {m.status === 'TIMED' ? 'Scheduled' : m.status}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scroll pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {[
              { label: 'MD1', matches: md1 },
              { label: 'MD2', matches: md2 },
              { label: 'MD3', matches: md3 },
            ].map((md) => (
              <div key={md.label} className="flex-shrink-0" style={{ minWidth: 220, scrollSnapAlign: 'start' }}>
                <div className="eyebrow text-center mb-2">{md.label}</div>
                <div className="flex flex-col gap-2">
                  {md.matches.map((m) => (
                    <Card key={m.id} className="ring-0 border-survive-border bg-surface rounded-xl">
                      <CardContent className="p-2.5 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {m.homeTeam && <Flag code={m.homeTeam.code} crest={m.homeTeam.crest} />}
                          <span className="text-[12px] font-semibold flex-1 truncate">{m.homeTeam?.shortName || 'TBD'}</span>
                          {m.status === 'FINISHED' && <span className="mono text-xs font-bold">{m.score.home}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {m.awayTeam && <Flag code={m.awayTeam.code} crest={m.awayTeam.crest} />}
                          <span className="text-[12px] font-semibold flex-1 truncate">{m.awayTeam?.shortName || 'TBD'}</span>
                          {m.status === 'FINISHED' && <span className="mono text-xs font-bold">{m.score.away}</span>}
                        </div>
                        <div className="text-[9px] text-ink-4 text-center">{m.displayDate}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Knockout stage preview */}
      <div>
        <SectionHeader eyebrow="Knockout" title="Road to the Final" />
        <div className={cn('grid gap-3', desktop ? 'grid-cols-4' : 'grid-cols-2')}>
          {[
            { label: 'Round of 32', matches: r32Matches, count: r32Matches.length },
            { label: 'Round of 16', matches: r16Matches, count: r16Matches.length },
            { label: 'Quarter-finals', matches: qfMatches, count: qfMatches.length },
            { label: 'Semi-finals → Final', matches: [...sfMatches, ...finalMatches], count: sfMatches.length + finalMatches.length },
          ].map((round) => (
            <Card key={round.label} className="ring-0 border-survive-border bg-surface rounded-xl">
              <CardContent className="p-3">
                <div className="eyebrow mb-2">{round.label}</div>
                <div className="display text-2xl">{round.count}</div>
                <div className="text-[11px] text-ink-4 mt-1">
                  {round.matches.filter(m => m.homeTeam && m.awayTeam).length > 0
                    ? `${round.matches.filter(m => m.status === 'FINISHED').length} played`
                    : 'Teams TBD'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* User picks summary */}
      {pickEntries.length > 0 && (
        <div>
          <div className="eyebrow mb-3">Your picks so far</div>
          <div className="flex flex-wrap gap-2">
            {pickEntries.map(([stage, pick]) => {
              const lost = isLostCode(pick);
              const code = baseTeamCode(pick);
              const name = teamLookup[code] || code;
              return (
                <div
                  key={stage}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
                    lost ? 'border-eliminated/40 bg-eliminated/8' : 'border-alive/40 bg-alive/8'
                  )}
                >
                  <span className="mono text-[10px] text-ink-3 font-semibold">{stage}</span>
                  <Flag code={code} crest={crestLookup[code]} />
                  <span className="text-[12px] font-semibold">{name}</span>
                  {lost ? (
                    <span className="chip chip-out" style={{ fontSize: 9, padding: '1px 4px' }}>L</span>
                  ) : (
                    <span className="chip chip-alive" style={{ fontSize: 9, padding: '1px 4px' }}>W</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
