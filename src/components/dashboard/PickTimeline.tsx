'use client';

import { Flag } from '@/components/ui/Flag';
import { STAGES, TEAMS } from '@/lib/data/teams';
import { isLostCode, baseTeamCode } from '@/lib/picks/pick-codes';
import { useCompetitionData } from '@/lib/adapters/context';
import type { PoolStatus } from '@/types';

interface PickTimelineProps {
  picks: Record<string, string | null | undefined>;
  status: PoolStatus;
  currentStage?: string;
}

export function PickTimeline({ picks, currentStage }: PickTimelineProps) {
  const { crestLookup } = useCompetitionData();
  const items = [
    { stage: 'MD1', pick: picks.MD1 },
    { stage: 'MD2', pick: picks.MD2 },
    { stage: 'MD3', pick: picks.MD3 },
    { stage: 'R32', pick: picks.R32 },
    { stage: 'R16', pick: picks.R16 },
    { stage: 'QF', pick: picks.QF },
    { stage: 'SF', pick: picks.SF },
    { stage: 'F', pick: picks.F },
  ].filter((i) => i.pick !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {items.map((it, i) => {
        const lost = isLostCode(it.pick);
        const code = it.pick ? baseTeamCode(it.pick) : it.pick;
        const pending = !it.pick;
        // Stage only advances once its matches resolve, so a non-lost pick at
        // or beyond the current stage is still awaiting its result.
        const unresolved =
          !lost &&
          currentStage !== undefined &&
          STAGES.indexOf(it.stage as (typeof STAGES)[number]) >=
            STAGES.indexOf(currentStage as (typeof STAGES)[number]);

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div
              className="mono"
              style={{ width: 36, fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}
            >
              {it.stage}
            </div>
            {pending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-4)' }}>
                <div
                  style={{
                    width: 20,
                    height: 14,
                    borderRadius: 2,
                    border: '1px dashed var(--border-2)',
                  }}
                />
                <span style={{ fontSize: 13 }}>No pick yet</span>
              </div>
            ) : (
              <>
                <Flag code={code!} crest={crestLookup[code!]} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                    textDecoration: lost ? 'line-through' : 'none',
                    color: lost ? 'var(--ink-4)' : 'var(--ink)',
                  }}
                >
                  {TEAMS[code!]}
                </span>
                {lost ? (
                  <span className="chip chip-out">L</span>
                ) : unresolved ? (
                  <span className="chip" style={{ color: 'var(--ink-3)' }}>
                    TBD
                  </span>
                ) : (
                  <span className="chip chip-alive">W</span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
