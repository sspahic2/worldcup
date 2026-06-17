import { NextResponse, type NextRequest } from 'next/server';
import { syncMatchCache, resolvePicks } from '@/lib/match-resolution';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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
    const sync = await syncMatchCache();
    const resolution = await resolvePicks();

    // Backfill catch-up picks for members who joined while a match was in
    // play (their join-time trigger saw no finished matches yet). Non-fatal.
    let catchupPicksAssigned = 0;
    const { data: backfilled, error: backfillError } = await createAdminClient().rpc(
      'backfill_catchup_picks',
    );
    if (backfillError) {
      console.error('[cron/resolve-matches] catch-up backfill failed:', backfillError);
    } else {
      catchupPicksAssigned = backfilled ?? 0;
    }

    // Auto-loss: members with no pick for a fully-finished group stage are
    // eliminated in that track. Runs after catch-up so late joiners are safe.
    let membersAutoEliminated = 0;
    const { data: autoOut, error: autoOutError } = await createAdminClient().rpc(
      'eliminate_missing_picks',
    );
    if (autoOutError) {
      console.error('[cron/resolve-matches] missing-pick elimination failed:', autoOutError);
    } else {
      membersAutoEliminated = autoOut ?? 0;
    }

    // Materialise knockout lives: one per group a player survived. Idempotent,
    // so it's safe to run every cron as more groups close out.
    let knockoutLivesCreated = 0;
    const { data: livesCreated, error: livesError } = await createAdminClient().rpc(
      'create_knockout_lives',
    );
    if (livesError) {
      console.error('[cron/resolve-matches] knockout-lives creation failed:', livesError);
    } else {
      knockoutLivesCreated = livesCreated ?? 0;
    }

    return NextResponse.json({
      ok: true,
      sync,
      resolution,
      catchupPicksAssigned,
      membersAutoEliminated,
      knockoutLivesCreated,
      ranAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron/resolve-matches] failed:', e);
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
