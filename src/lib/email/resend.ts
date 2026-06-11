import { Resend } from 'resend';

/**
 * Thin Resend wrapper. Lazily instantiated so importing this module never
 * requires RESEND_API_KEY (dev and CI builds must not crash without it).
 *
 * NEVER expose this module to the browser.
 */

const FALLBACK_FROM = 'Survive WC2026 <onboarding@resend.dev>';

let client: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export interface EmailContent {
  subject: string;
  html: string;
}

export interface SendEmailInput extends EmailContent {
  to: string;
}

/**
 * Send a transactional email. Fail-soft by design: a missing API key or a
 * Resend error is logged and swallowed — email must never break the action
 * (pick submission, match resolution, …) that triggered it.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? FALLBACK_FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] send failed for "${subject}" to ${to}:`, e);
    return false;
  }
}
