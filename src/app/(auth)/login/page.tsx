'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { authService } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'auth_failed' ? 'Sign-in failed. Please try again.' : null
  );

  // Implicit-flow magic links (e.g. admin-generated) deliver the session in
  // the URL fragment, which the PKCE browser client ignores — consume it here.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return;
    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (!sessionError) window.location.replace('/');
        else setError(sessionError.message);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await authService.sendMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // Code path: rescues users whose link opened in an in-app browser (Gmail
  // app). They type the 6-digit code here, in their real browser, and the
  // session is set in *this* browser — not the email client's WebView.
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, '');
    if (token.length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      await authService.verifyEmailOtp(email, token);
      window.location.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md ring-0 border-survive-border bg-surface rounded-2xl">
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-2 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-survive-accent text-survive-accent-ink">
              <Icon name="flame" size={22} />
            </div>
            <span className="display text-3xl">SURVIVE</span>
          </div>

          {sent ? (
            <div className="text-center flex flex-col gap-3">
              <h1 className="display text-2xl">Check your email</h1>
              <p className="text-sm text-ink-3">
                We sent a magic link and a 6-digit code to{' '}
                <span className="text-ink font-semibold">{email}</span>.
                Tap the link, or enter the code below.
              </p>

              {/* Code path — works even if the link opened in the Gmail app's
                  in-app browser. Typing the code here signs you in *here*. */}
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-3 mt-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={verifying}
                  className="h-12 bg-bg-2 border-survive-border text-center tracking-[0.4em] text-lg"
                />
                <Button
                  type="submit"
                  disabled={verifying || code.replace(/\s/g, '').length < 6}
                  className="w-full gap-3 h-12 text-sm font-semibold"
                >
                  {verifying ? 'Verifying…' : 'Verify code'}
                </Button>
              </form>

              {error && (
                <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setSent(false); setEmail(''); setCode(''); setError(null); }}
                className="text-xs text-ink-4 underline hover:text-ink-2 mt-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="display text-2xl mb-2">Sign In</h1>
                <p className="text-sm text-ink-3">
                  Join a World Cup 2026 survivor pool
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 bg-bg-2 border-survive-border"
                />
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full gap-3 h-12 text-sm font-semibold"
                >
                  {loading ? 'Sending...' : 'Email me a magic link'}
                </Button>
              </form>

              {error && (
                <div className="text-xs text-center text-redemption bg-redemption/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <p className="text-[11px] text-ink-4 text-center leading-relaxed">
                We&apos;ll email you a one-time link. No password required.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
