import { createAdminClient } from '@/lib/supabase/admin';
import { lockTimeFor } from '@/lib/picks/lock-rules';
import { STAGES } from '@/lib/data/teams';
import { sendEmail, type EmailContent } from './resend';
import * as templates from './templates';

/**
 * Email orchestration. Everything here runs with the service-role client and
 * is fail-soft: errors are logged, never thrown into the calling action/cron.
 *
 * NEVER import this module from client components.
 */

export type NotificationType =
  | 'welcome'
  | 'pick_deadline_24h'
  | 'pick_last_call'
  | 'stage_survived'
  | 'eliminated'
  | 'redemption_activated'
  | 'new_stage_open'
  | 'winner_crowned';

export interface Recipient {
  email: string;
  name: string;
}

/**
 * Resolve a user's email + display name. Email lives on auth.users (not
 * exposed via PostgREST), so it comes from the auth admin API; the name comes
 * from profiles.display_name.
 */
export async function getRecipient(userId: string): Promise<Recipient | null> {
  const supabase = createAdminClient();
  const [userRes, profileRes] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
  ]);

  const email = userRes.data?.user?.email;
  if (userRes.error || !email) {
    console.error(`[email] no email found for user ${userId}:`, userRes.error);
    return null;
  }
  return { email, name: profileRes.data?.display_name ?? 'player' };
}

/**
 * Send a notification at most once per (user, type, stage).
 *
 * Inserts into notifications_sent first (on-conflict-do-nothing) and only
 * sends when the insert actually created a row, so concurrent triggers and
 * cron re-runs are truly idempotent. Stage-less notifications use stage ''.
 *
 * Returns true only when an email was actually dispatched.
 */
export async function sendOnce(
  userId: string,
  type: NotificationType,
  stage: string | null,
  content: EmailContent,
  to?: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notifications_sent')
    .upsert(
      { user_id: userId, type, stage: stage ?? '' },
      { onConflict: 'user_id,type,stage', ignoreDuplicates: true },
    )
    .select('id');
  if (error) {
    console.error(`[email] notifications_sent insert failed (${type}/${stage}):`, error);
    return false;
  }
  if (!data || data.length === 0) return false; // already sent

  const email = to ?? (await getRecipient(userId))?.email;
  if (!email) return false;

  return sendEmail({ to: email, ...content });
}

/**
 * Pick confirmation / change email. Sent on every successful save (no dedupe
 * — a user changing their pick twice gets two emails by design).
 */
export async function notifyPickSaved(input: {
  userId: string;
  stage: string;
  teamCode: string;
  previousTeamCode: string | null;
  kickoffUtc: string;
}): Promise<void> {
  try {
    const recipient = await getRecipient(input.userId);
    if (!recipient) return;

    const changed = input.previousTeamCode !== null && input.previousTeamCode !== input.teamCode;
    const content = changed
      ? templates.pickChanged(recipient.name, input.previousTeamCode!, input.teamCode, input.stage)
      : templates.pickConfirmed(
          recipient.name,
          input.teamCode,
          input.stage,
          lockTimeFor(input.kickoffUtc),
        );
    await sendEmail({ to: recipient.email, ...content });
  } catch (e) {
    console.error('[email] notifyPickSaved failed:', e);
  }
}

export interface ResolvedPickNotification {
  poolMemberId: string;
  stage: string;
  teamCode: string;
  won: boolean;
}

/**
 * Stage-survived / eliminated emails after match resolution. Deduped via
 * sendOnce(type, stage) per member, so cron re-runs never double-send.
 */
export async function notifyPickResults(results: ResolvedPickNotification[]): Promise<void> {
  if (results.length === 0) return;

  try {
    const supabase = createAdminClient();
    const memberIds = [...new Set(results.map((r) => r.poolMemberId))];
    const { data: members, error } = await supabase
      .from('pool_members')
      .select('id, user_id')
      .in('id', memberIds);
    if (error) {
      console.error('[email] notifyPickResults member lookup failed:', error);
      return;
    }
    const userIdByMember = new Map(
      ((members ?? []) as { id: string; user_id: string }[]).map((m) => [m.id, m.user_id]),
    );

    for (const r of results) {
      const userId = userIdByMember.get(r.poolMemberId);
      if (!userId) continue;

      const recipient = await getRecipient(userId);
      if (!recipient) continue;

      if (r.won) {
        const stageIdx = (STAGES as readonly string[]).indexOf(r.stage);
        const nextStage = stageIdx >= 0 ? (STAGES[stageIdx + 1] ?? null) : null;
        await sendOnce(
          userId,
          'stage_survived',
          r.stage,
          templates.stageSurvived(recipient.name, r.teamCode, r.stage, nextStage),
          recipient.email,
        );
      } else {
        await sendOnce(
          userId,
          'eliminated',
          r.stage,
          templates.eliminated(recipient.name, r.teamCode, r.stage),
          recipient.email,
        );
      }
    }
  } catch (e) {
    console.error('[email] notifyPickResults failed:', e);
  }
}

/** Welcome email on first sign-in. sendOnce keeps it to exactly one per user. */
export async function notifyWelcome(userId: string): Promise<void> {
  try {
    const recipient = await getRecipient(userId);
    if (!recipient) return;
    await sendOnce(userId, 'welcome', null, templates.welcome(recipient.name), recipient.email);
  } catch (e) {
    console.error('[email] notifyWelcome failed:', e);
  }
}
