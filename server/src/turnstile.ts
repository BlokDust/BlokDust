// Turnstile siteverify (SHARING-0001): saves, and new accounts (SPEC-SHARING-ACCOUNTS R1).
import type { Env } from './env.ts';
import { HttpError } from './http.ts';

/** Turnstile (SHARING-0001): every save must carry a token Cloudflare accepts. Fails closed without a secret. */
export async function verifyTurnstile(env: Env, req: Request, token: unknown): Promise<void> {
  if (!env.TURNSTILE_SECRET) throw new HttpError(503, 'saving is not configured');
  if (typeof token !== 'string' || !token) throw new HttpError(403, 'bot check missing');
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = req.headers.get('cf-connecting-ip');
  if (ip) form.append('remoteip', ip);
  const url = env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  let ok = false;
  try {
    const r = await fetch(url, { method: 'POST', body: form });
    ok = r.ok && ((await r.json()) as { success?: boolean }).success === true;
  } catch { throw new HttpError(503, 'bot check unavailable'); }
  if (!ok) throw new HttpError(403, 'bot check failed');
}
