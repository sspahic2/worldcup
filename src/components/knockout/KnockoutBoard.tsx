'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCompetitionData } from '@/lib/adapters/context';
import { submitKnockoutPick } from '@/app/actions/knockout';
import { Card, CardContent } from '@/components/ui/card';
import { Flag } from '@/components/ui/Flag';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Icon } from '@/components/ui/Icon';
import { STAGE_LABELS, TEAMS } from '@/lib/data/teams';
import { isLostCode, baseTeamCode } from '@/lib/picks/pick-codes';
import { cn } from '@/lib/utils';
import type { KnockoutData, KnockoutLife, Stage } from '@/types';

const STAGE_ORDER: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F'];

interface KnockoutBoardProps {
  knockout: KnockoutData;
  desktop: boolean;
}

export function KnockoutBoard({ knockout, desktop }: KnockoutBoardProps) {
  const { matchesByStage, teamLookup, crestLookup } = useCompetitionData();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeLife, setActiveLife] = useState<string | null>(null);

  const stage = knockout.stage;
  const stageLabel = STAGE_LABELS[stage] || stage;
  const roundMatches = (matchesByStage[stage] ?? []).filter((m) => m.homeTeam && m.awayTeam);

  const name = (code: string) => teamLookup[code] || TEAMS[code] || code;
  const matchForTeam = (team: string) =>
    roundMatches.find((m) => m.homeTeam!.code === team || m.awayTeam!.code === team);

  const teamsForLife = (life: KnockoutLife): string[] => {
    if (stage === 'R32' && life.sourceGroup) {
      return (knockout.qualifiersByGroup[life.sourceGroup] ?? []).filter((t) => matchForTeam(t));
    }
    const set = new Set<string>();
    for (const m of roundMatches) {
      set.add(m.homeTeam!.code);
      set.add(m.awayTeam!.code);
    }
    return [...set];
  };

  const pick = (lifeId: string, team: string) => {
    const match = matchForTeam(team);
    if (!match || typeof match.id !== 'number') {
      setError('No match found for that team this round');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await submitKnockoutPick({ lifeId, stage, teamCode: team, fdMatchId: match.id as number });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setActiveLife(null);
      router.refresh();
    });
  };

  const wrap = (children: React.ReactNode) => (
    <div className={cn('flex flex-col gap-6', desktop ? 'max-w-[1100px] p-8 px-10 pb-16' : 'p-4')}>
      <div>
        <div className="eyebrow">Knockouts &middot; {stageLabel}</div>
        <div className="display mt-2" style={{ fontSize: desktop ? 48 : 32, lineHeight: 0.9 }}>
          YOUR LIVES
        </div>
      </div>
      {children}
    </div>
  );

  if (!knockout.knockoutsOpen) {
    return wrap(
      <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
        <CardContent className="p-6 text-center">
          <div className="display" style={{ fontSize: 22 }}>Knockouts not open yet</div>
          <p className="text-[13px] text-ink-3 mt-2 mb-0">
            Once the group stage finishes, every group you survived becomes a life here.
          </p>
        </CardContent>
      </Card>,
    );
  }

  if (knockout.lives.length === 0) {
    return wrap(
      <Card className="ring-0 border-survive-border bg-surface rounded-[14px]">
        <CardContent className="p-6 text-center">
          <div className="display" style={{ fontSize: 22 }}>No lives left</div>
          <p className="text-[13px] text-ink-3 mt-2 mb-0">
            You didn&apos;t survive any group into the knockouts. Better luck next tournament.
          </p>
        </CardContent>
      </Card>,
    );
  }

  const aliveLives = knockout.lives.filter((l) => l.status === 'alive' || l.status === 'redemption');

  return wrap(
    <>
      <div className="text-[13px] text-ink-3">
        <span className="mono text-ink font-semibold">{aliveLives.length}</span> of{' '}
        <span className="mono">{knockout.lives.length}</span> lives alive &middot; pick a winner for
        each in the {stageLabel}.
      </div>

      {error && (
        <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <SectionHeader eyebrow={stageLabel} title="This round" />
      <div className="grid gap-3" style={{ gridTemplateColumns: desktop ? '1fr 1fr' : '1fr' }}>
        {knockout.lives.map((life) => {
          const out = life.status === 'eliminated';
          const current = life.picks[stage];
          const lost = isLostCode(current);
          const code = current ? baseTeamCode(current) : null;
          const options = out ? [] : teamsForLife(life);
          const expanded = activeLife === life.id;
          const lostStage = STAGE_ORDER.find((s) => life.pickResults[s] === 'lost');
          return (
            <Card
              key={life.id}
              className="ring-0 rounded-[14px] bg-surface"
              style={{
                border: out
                  ? '1px solid color-mix(in oklab, var(--eliminated) 35%, var(--border))'
                  : '1px solid var(--border)',
                opacity: out ? 0.6 : 1,
              }}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="eyebrow">
                    {life.isBonus ? 'Bonus life' : `Life · Group ${life.sourceGroup}`}
                  </div>
                  <span className={cn('chip', out ? 'chip-out' : 'chip-alive')} style={{ fontSize: 10 }}>
                    {out ? 'Out' : 'Alive'}
                  </span>
                </div>

                {code ? (
                  <div className="flex items-center gap-3">
                    <Flag code={code} crest={crestLookup[code]} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="eyebrow">{stageLabel} pick</div>
                      <div className="display" style={{ fontSize: 20, lineHeight: 1.1 }}>{name(code)}</div>
                    </div>
                    <span className={cn('chip', lost ? 'chip-out' : 'chip-alive')} style={{ fontSize: 10 }}>
                      {lost ? 'L' : 'Locked in'}
                    </span>
                    {!out && !lost && (
                      <button className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => setActiveLife(expanded ? null : life.id)}>
                        Change
                      </button>
                    )}
                  </div>
                ) : out ? (
                  <div className="text-[13px] text-ink-3">
                    Knocked out{lostStage ? ` in the ${STAGE_LABELS[lostStage] ?? lostStage}` : ''}.
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm self-start" disabled={isPending} onClick={() => setActiveLife(expanded ? null : life.id)}>
                    <Icon name="flame" size={14} /> Pick {stageLabel}
                  </button>
                )}

                {expanded && !out && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {options.length === 0 && (
                      <span className="text-[12px] text-ink-4">No fixtures available yet.</span>
                    )}
                    {options.map((t) => (
                      <button
                        key={t}
                        disabled={isPending}
                        onClick={() => pick(life.id, t)}
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold',
                          code === t ? 'border-survive-accent bg-survive-accent/10' : 'border-survive-border bg-bg-2',
                        )}
                      >
                        <Flag code={t} crest={crestLookup[t]} size="sm" />
                        {name(t)}
                      </button>
                    ))}
                  </div>
                )}

                {STAGE_ORDER.filter((s) => s !== stage && life.picks[s]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-survive-border mt-1">
                    {STAGE_ORDER.filter((s) => life.picks[s]).map((s) => {
                      const c = baseTeamCode(life.picks[s]!);
                      const l = isLostCode(life.picks[s]);
                      return (
                        <span key={s} className="inline-flex items-center gap-1 text-[10px] text-ink-3">
                          <span className="mono">{s}</span>
                          <Flag code={c} crest={crestLookup[c]} size="sm" />
                          <span className={l ? 'text-eliminated' : 'text-alive'}>{l ? 'L' : 'W'}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>,
  );
}
