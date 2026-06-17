import { NextResponse, after } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { notifyWelcome } from '@/lib/email/notify';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  const supabase = await createClient();

  // Welcome email on first sign-in (profile creation + global-pool join happen
  // in a DB trigger). sendOnce inside makes this a no-op on every later sign-in;
  // after() keeps it off the redirect's critical path.
  const succeed = (userId?: string) => {
    if (userId) after(() => notifyWelcome(userId));
    return NextResponse.redirect(`${origin}${next}`);
  };

  // token_hash flow — email links (magic link / signup confirm). Stateless, so
  // it works cross-device: the link can be requested on desktop and opened on
  // phone. Preferred path; email templates emit ?token_hash=&type=.
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return succeed(data.user?.id);
  }

  // PKCE code flow — same-browser / OAuth. Needs the code verifier stored by the
  // browser that initiated sign-in, so it fails on cross-device email clicks.
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return succeed(data.user?.id);
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
