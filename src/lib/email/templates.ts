import type { EmailContent } from './resend';

/**
 * Transactional email templates for SURVIVE — World Cup 2026 Survivor.
 * Inline-styled HTML only (no external assets), dark-on-light, email-client safe.
 */

const STAGE_LABELS: Record<string, string> = {
  MD1: 'Matchday 1',
  MD2: 'Matchday 2',
  MD3: 'Matchday 3',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'the Final',
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function formatTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Minimal shared layout: SURVIVE wordmark, content card, muted footer. */
function layout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <p style="margin:0 0 16px;font-size:14px;font-weight:800;letter-spacing:4px;color:#18181b;">SURVIVE</p>
      <div style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:32px 28px;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#18181b;">${heading}</h1>
        ${bodyHtml}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
        SURVIVE — World Cup 2026 Survivor Pool. You receive these emails because you joined the pool.
      </p>
    </div>
  </body>
</html>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3f3f46;">${html}</p>`;
}

function strong(text: string): string {
  return `<strong style="color:#18181b;">${escapeHtml(text)}</strong>`;
}

export function welcome(name: string): EmailContent {
  const subject = 'Welcome to SURVIVE — World Cup 2026';
  const html = layout(
    `You're in, ${escapeHtml(name)}!`,
    p('Welcome to the World Cup 2026 Survivor Pool. The rules are simple:') +
      `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.8;color:#3f3f46;">
        <li>Pick ${strong('one team')} to win in every stage.</li>
        <li>You ${strong("can't reuse a team")} you've already picked.</li>
        <li>If your team loses, ${strong("you're eliminated")}.</li>
        <li>Outlast everyone and take the pot.</li>
      </ul>` +
      p('Picks lock 60 minutes before kickoff — get yours in early. Good luck!'),
  );
  return { subject, html };
}

export function pickConfirmed(
  name: string,
  team: string,
  stage: string,
  lockTime: Date,
): EmailContent {
  const subject = `Pick confirmed: ${team} for ${stageLabel(stage)}`;
  const html = layout(
    'Pick confirmed',
    p(`Hi ${escapeHtml(name)},`) +
      p(`Your pick of ${strong(team)} for ${strong(stageLabel(stage))} is in.`) +
      p(`You can still change it until ${strong(formatTime(lockTime))}. After that it's locked.`),
  );
  return { subject, html };
}

export function pickChanged(
  name: string,
  oldTeam: string,
  newTeam: string,
  stage: string,
): EmailContent {
  const subject = `Pick updated: ${newTeam} for ${stageLabel(stage)}`;
  const html = layout(
    'Pick updated',
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `Your ${strong(stageLabel(stage))} pick changed from ${strong(oldTeam)} to ${strong(newTeam)}.`,
      ) +
      p("If this wasn't you, log in and review your pick before it locks."),
  );
  return { subject, html };
}

export function pickDeadline24h(name: string, stage: string, lockTime: Date): EmailContent {
  const subject = `Reminder: no pick yet for ${stageLabel(stage)}`;
  const html = layout(
    'Your pick is due',
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `You haven't made a pick for ${strong(stageLabel(stage))} yet. Picks lock at ${strong(formatTime(lockTime))} — roughly 24 hours from now.`,
      ) +
      p('No pick means no way to survive the stage. Log in and lock one in.'),
  );
  return { subject, html };
}

export function pickLastCall(name: string, stage: string, lockTime: Date): EmailContent {
  const subject = `Last call: ${stageLabel(stage)} locks soon!`;
  const html = layout(
    'Last call — pick now',
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `${strong(stageLabel(stage))} locks at ${strong(formatTime(lockTime))} — about 2 hours from now, and you still have ${strong('no pick')}.`,
      ) +
      p('This is your final reminder. Log in now and make your pick.'),
  );
  return { subject, html };
}

export function stageSurvived(
  name: string,
  team: string,
  stage: string,
  nextStage: string | null,
): EmailContent {
  const subject = `You survived ${stageLabel(stage)}!`;
  const next = nextStage
    ? p(`Next up: ${strong(stageLabel(nextStage))}. Remember — you can't pick ${strong(team)} again.`)
    : p('Stay tuned for what comes next.');
  const html = layout(
    'You survived!',
    p(`Hi ${escapeHtml(name)},`) +
      p(`${strong(team)} won, and you advance past ${strong(stageLabel(stage))}.`) +
      next,
  );
  return { subject, html };
}

export function eliminated(name: string, team: string, stage: string): EmailContent {
  const subject = `Eliminated in ${stageLabel(stage)}`;
  const html = layout(
    "That's a loss",
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `${strong(team)} didn't win, so your run ends in ${strong(stageLabel(stage))}. You're eliminated from the pool.`,
      ) +
      p(
        'Keep an eye on your inbox — if a redemption window opens, you may get a shot to fight your way back in.',
      ),
  );
  return { subject, html };
}

export function redemptionActivated(name: string, stage: string): EmailContent {
  const subject = 'Redemption window open — pick again!';
  const html = layout(
    'A second chance',
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `The redemption window is open for ${strong(stageLabel(stage))}. You're back in — for now.`,
      ) +
      p('Make a pick before it locks and fight your way back into the pool.'),
  );
  return { subject, html };
}

export function newStageOpen(name: string, stage: string, firstKickoff: Date): EmailContent {
  const subject = `${stageLabel(stage)} is open — make your pick`;
  const html = layout(
    `${stageLabel(stage)} fixtures are live`,
    p(`Hi ${escapeHtml(name)},`) +
      p(
        `Fixtures for ${strong(stageLabel(stage))} are available. First kickoff: ${strong(formatTime(firstKickoff))}.`,
      ) +
      p("Picks lock 60 minutes before each match's kickoff — choose your team early."),
  );
  return { subject, html };
}

export function winnerCrowned(name: string, potShare: number): EmailContent {
  const subject = 'You won the pool!';
  const html = layout(
    'Champion!',
    p(`Congratulations ${escapeHtml(name)},`) +
      p(
        `You outlasted everyone. The World Cup 2026 Survivor Pool is complete, and your share of the pot is ${strong(`${potShare}`)}.`,
      ) +
      p('Take a bow — and see you in 2030.'),
  );
  return { subject, html };
}
