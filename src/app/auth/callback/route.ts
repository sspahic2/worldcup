import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyWelcome } from '@/lib/email/notify';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Welcome email on first sign-in (profile creation + global-pool join
      // happen in a DB trigger). sendOnce inside makes this a no-op on every
      // later sign-in; after() keeps it off the redirect's critical path.
      const userId = data.user?.id;
      if (userId) after(() => notifyWelcome(userId));
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
