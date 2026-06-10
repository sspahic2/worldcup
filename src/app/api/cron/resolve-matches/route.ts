import { NextResponse, type NextRequest } from 'next/server';
import { syncMatchCache, resolvePicks } from '@/lib/match-resolution';

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
    return NextResponse.json({
      ok: true,
      sync,
      resolution,
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
