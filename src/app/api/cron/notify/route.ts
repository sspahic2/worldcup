import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { lockTimeFor } from '@/lib/picks/lock-rules';
import { STAGES } from '@/lib/data/teams';
import { GLOBAL_POOL_ID } from '@/lib/pool-data';
import { sendOnce } from '@/lib/email/notify';
import {
  pickDeadline24h,
  pickLastCall,
  newStageOpen,
  redemptionActivated,
  winnerCrowned,
} from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

const HOUR_MS = 60 * 60 * 1000;

interface OpenMatchRow {
  stage: string;
  utc_date: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  status: 'alive' | 'redemption' | 'eliminated' | 'won';
}

/**
 * Scheduled notification sweep for the global pool:
 *  - pick deadline reminders (24h and 2h before the stage locks)
 *  - new-stage-open announcements
 *  - redemption-window and winner emails driven by member status
 *
 * Every send goes through sendOnce, so hourly re-runs never double-send.
 */
async function run(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${expected}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const sent = {
      deadline24h: 0,
      lastCall: 0,
      newStageOpen: 0,
      redemption: 0,
      winner: 0,
    };

    // Current stage: first canonical stage with an unfinished cached match
    // (mirrors getCurrentStage in pool-data, which is request/cookie scoped).
    const { data: openData, error: openErr } = await supabase
      .from('match_cache')
      .select('stage, utc_date')
      .neq('status', 'FINISHED');
    if (openErr) throw openErr;
    const openMatches = (openData ?? []) as OpenMatchRow[];

    const currentStage =
      STAGES.find((s) => openMatches.some((m) => m.stage === s)) ?? null;

    const { data: memberData, error: memberErr } = await supabase
      .from('pool_members')
      .select('id, user_id, status')
      .eq('pool_id', GLOBAL_POOL_ID);
    if (memberErr) throw memberErr;
    const members = (memberData ?? []) as MemberRow[];

    // Bulk-load display names; emails are resolved lazily inside sendOnce
    // only when a notification actually fires.
    const userIds = [...new Set(members.map((m) => m.user_id))];
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      if (profileErr) throw profileErr;
      for (const p of (profiles ?? []) as { id: string; display_name: string }[]) {
        nameById.set(p.id, p.display_name);
      }
    }
    const nameFor = (userId: string) => nameById.get(userId) ?? 'player';

    // ── Pick reminders + new-stage announcements ──────────────────
    if (currentStage) {
      const stageKickoffs = openMatches
        .filter((m) => m.stage === currentStage)
        .map((m) => new Date(m.utc_date).getTime())
        .sort((a, b) => a - b);
      const firstKickoff = new Date(stageKickoffs[0]);

      // Earliest lock for the stage that is still in the future.
      const upcomingLock = stageKickoffs
        .map((k) => lockTimeFor(new Date(k).toISOString()))
        .find((lock) => lock.getTime() > now.getTime());
      const hoursUntilLock = upcomingLock
        ? (upcomingLock.getTime() - now.getTime()) / HOUR_MS
        : null;

      const active = members.filter(
        (m) => m.status === 'alive' || m.status === 'redemption',
      );

      const activeIds = active.map((m) => m.id);
      const pickedMemberIds = new Set<string>();
      if (activeIds.length > 0) {
        const { data: pickData, error: pickErr } = await supabase
          .from('picks')
          .select('pool_member_id')
          .eq('stage', currentStage)
          .in('pool_member_id', activeIds);
        if (pickErr) throw pickErr;
        for (const p of (pickData ?? []) as { pool_member_id: string }[]) {
          pickedMemberIds.add(p.pool_member_id);
        }
      }

      for (const member of active) {
        if (pickedMemberIds.has(member.id)) continue;
        const name = nameFor(member.user_id);

        if (
          await sendOnce(
            member.user_id,
            'new_stage_open',
            currentStage,
            newStageOpen(name, currentStage, firstKickoff),
          )
        ) {
          sent.newStageOpen++;
        }

        if (upcomingLock && hoursUntilLock !== null && hoursUntilLock <= 24) {
          if (
            await sendOnce(
              member.user_id,
              'pick_deadline_24h',
              currentStage,
              pickDeadline24h(name, currentStage, upcomingLock),
            )
          ) {
            sent.deadline24h++;
          }
        }

        if (upcomingLock && hoursUntilLock !== null && hoursUntilLock <= 2) {
          if (
            await sendOnce(
              member.user_id,
              'pick_last_call',
              currentStage,
              pickLastCall(name, currentStage, upcomingLock),
            )
          ) {
            sent.lastCall++;
          }
        }
      }

      // ── Redemption window open ──────────────────────────────────
      for (const member of members) {
        if (member.status !== 'redemption') continue;
        if (
          await sendOnce(
            member.user_id,
            'redemption_activated',
            currentStage,
            redemptionActivated(nameFor(member.user_id), currentStage),
          )
        ) {
          sent.redemption++;
        }
      }
    }

    // ── Winner crowned ────────────────────────────────────────────
    const winners = members.filter((m) => m.status === 'won');
    if (winners.length > 0) {
      const { data: summary } = await supabase
        .from('pool_summary')
        .select('pot, won_count')
        .eq('pool_id', GLOBAL_POOL_ID)
        .maybeSingle();
      const pot = Number(summary?.pot ?? 0);
      const wonCount = Number(summary?.won_count ?? winners.length);
      const share = wonCount > 0 ? Math.round(pot / wonCount) : 0;

      for (const member of winners) {
        if (
          await sendOnce(
            member.user_id,
            'winner_crowned',
            null,
            winnerCrowned(nameFor(member.user_id), share),
          )
        ) {
          sent.winner++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      currentStage,
      sent,
      ranAt: now.toISOString(),
    });
  } catch (e) {
    console.error('[cron/notify] failed:', e);
    const detail =
      e instanceof Error ? e.message
      : typeof e === 'object' && e !== null ? JSON.stringify(e)
      : String(e);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
