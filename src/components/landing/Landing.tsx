'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Flag } from '@/components/ui/Flag';
import { Icon } from '@/components/ui/Icon';
import { Separator } from '@/components/ui/separator';
import { useCompetitionData } from '@/lib/adapters/context';
import { cn } from '@/lib/utils';

interface LandingProps {
  onEnter: () => void;
  desktop: boolean;
}

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'JOIN A POOL',
    desc: 'Pick any of the 12 World Cup groups. Buy in with your crew. Everyone starts equal.',
  },
  {
    num: '02',
    title: 'PICK A WINNER',
    desc: 'Each round, pick one team to win. You can never reuse a team. If they lose, you\'re out.',
  },
  {
    num: '03',
    title: 'SURVIVE TO WIN',
    desc: 'Last ones standing after the Final split the pot. Eliminated? Redemption round gives you one last shot.',
  },
];

const MOCK_POTS: Record<string, number> = {
  A: 2400, B: 3600, C: 1800, D: 8800, E: 3200, F: 5400,
  G: 2200, H: 2600, I: 4100, J: 1200, K: 1400, L: 900,
};

export function Landing({ onEnter, desktop }: LandingProps) {
  const { groups } = useCompetitionData();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Navbar */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b border-survive-border"
        style={{ background: 'var(--bg)' }}
      >
        <div className="flex items-center gap-2.5">
          <Icon name="flame" size={20} color="var(--survive-accent)" />
          <span
            className="display"
            style={{ fontSize: 18, letterSpacing: '0.06em', color: 'var(--ink)' }}
          >
            SURVIVE
          </span>
        </div>

        {desktop && (
          <div className="flex items-center gap-6">
            <a href="#how" className="text-[13px] font-medium text-ink-3 hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#groups" className="text-[13px] font-medium text-ink-3 hover:text-ink transition-colors">
              Groups
            </a>
            <a href="#" className="text-[13px] font-medium text-ink-3 hover:text-ink transition-colors">
              Prizes
            </a>
          </div>
        )}

        <Button
          variant="outline"
          className="border-survive-border bg-surface text-ink hover:bg-surface-2"
          onClick={onEnter}
        >
          Sign in
        </Button>
      </nav>

      {/* Hero */}
      <section
        className={cn(
          'flex flex-col items-center text-center grid-bg',
          desktop ? 'px-10 pt-24 pb-20' : 'px-5 pt-14 pb-14'
        )}
      >
        <div
          className="eyebrow mb-5"
          style={{ color: 'var(--survive-accent)' }}
        >
          World Cup 2026 &middot; Survivor Pools
        </div>

        <h1
          className="display"
          style={{
            fontSize: desktop ? 120 : 58,
            lineHeight: 0.88,
            maxWidth: desktop ? 900 : 400,
          }}
        >
          ONE PICK.{' '}
          <span style={{ color: 'var(--survive-accent)' }}>ONE SHOT.</span>{' '}
          WIN THE POT.
        </h1>

        <p
          className="mt-5 text-ink-3 max-w-[500px]"
          style={{ fontSize: desktop ? 16 : 14, lineHeight: 1.6 }}
        >
          Join a pool tied to any of the 12 World Cup groups. Pick a winner each
          round, never reuse a team, survive to the Final. Last ones standing
          split the pot.
        </p>

        <div className={cn('flex gap-3 mt-8', !desktop && 'flex-col w-full')}>
          <Button
            onClick={onEnter}
            className={cn(
              'bg-survive-accent text-survive-accent-ink hover:bg-survive-accent/90',
              desktop ? 'h-12 px-8 text-[15px]' : 'h-11 text-[14px]'
            )}
          >
            Join a pool
          </Button>
          <Button
            variant="ghost"
            onClick={onEnter}
            className={cn(
              'text-ink-2 hover:text-ink',
              desktop ? 'h-12 px-8 text-[15px]' : 'h-11 text-[14px]'
            )}
          >
            Create a pool
          </Button>
        </div>
      </section>

      <Separator className="bg-survive-border" />

      {/* How it works */}
      <section
        id="how"
        className={cn(
          'flex flex-col items-center',
          desktop ? 'px-10 py-20' : 'px-5 py-12'
        )}
      >
        <div className="eyebrow mb-3">How it works</div>
        <h2
          className="display mb-10 text-center"
          style={{ fontSize: desktop ? 48 : 32, lineHeight: 0.9 }}
        >
          THREE STEPS TO GLORY
        </h2>

        <div className={cn('grid gap-6 w-full max-w-[900px]', desktop ? 'grid-cols-3' : 'grid-cols-1')}>
          {HOW_IT_WORKS.map((step) => (
            <div key={step.num} className="flex flex-col gap-3">
              <span
                className="display mono"
                style={{
                  fontSize: 48,
                  color: 'var(--survive-accent)',
                  lineHeight: 1,
                }}
              >
                {step.num}
              </span>
              <h3
                className="display"
                style={{ fontSize: 20, lineHeight: 1 }}
              >
                {step.title}
              </h3>
              <p className="text-[14px] text-ink-3 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="bg-survive-border" />

      {/* Groups grid */}
      <section
        id="groups"
        className={cn(
          'flex flex-col items-center',
          desktop ? 'px-10 py-20' : 'px-5 py-12'
        )}
      >
        <div className="eyebrow mb-3">12 Groups</div>
        <h2
          className="display mb-10 text-center"
          style={{ fontSize: desktop ? 48 : 32, lineHeight: 0.9 }}
        >
          PICK YOUR BATTLEGROUND
        </h2>

        <div className={cn('grid gap-3 w-full max-w-[1000px]', desktop ? 'grid-cols-6' : 'grid-cols-2')}>
          {groups.map((group) => (
            <button key={group.key} onClick={onEnter} className="text-left w-full">
              <Card className="ring-0 border-survive-border bg-surface rounded-[14px] hover:border-border-2 transition-colors">
                <CardContent className="p-3 flex flex-col gap-2.5">
                  <div className="display" style={{ fontSize: 20, lineHeight: 1 }}>
                    GROUP {group.key}
                  </div>
                  <div className="flex gap-1">
                    {group.teams.map((t) => (
                      <Flag key={t.code} code={t.code} crest={t.crest} size="sm" />
                    ))}
                  </div>
                  <span className="mono text-[12px] text-ink-3 font-semibold">
                    {group.teams.map(t => t.shortName).join(' · ')}
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <Separator className="bg-survive-border" />

      {/* Footer */}
      <footer className="flex items-center justify-center px-6 py-8 text-[12px] text-ink-4">
        &copy; 2026 Survive. All rights reserved.
      </footer>
    </div>
  );
}
