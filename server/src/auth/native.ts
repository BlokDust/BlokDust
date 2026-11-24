// The iPad app signs in natively (CHG-0039, SHARING-0011): Sign in with Apple (the app's code exchanged at Apple with
// the app's id as client, its token carrying the nonce this server issued) and passkeys (the site's domain, reached
// through the app's Associated Domains). The answer is a plugin key in the body, never a cookie, so these endpoints sit
// outside the cookie routes' Origin check (no ambient credentials to forge).
import { decodeIdToken } from 'arctic';
import {
  generateAuthenticationOptions,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import type { Env } from '../env.ts';
import { HttpError, b64urlBytes, json } from '../http.ts';
import { appleConfigured, clientSecret } from './apple.ts';
import { createKey } from './appKeys.ts';
import { keepChallengeById, rp, takeChallengeById, verifyAssertion } from './passkey.ts';
import { newUserId } from './session.ts';
import { LIMIT_MESSAGE, countNewAccount, mayCreateAccount } from './newAccounts.ts';

const TOKEN_URL = 'https://appleid.apple.com/auth/token';
const ISSUER = 'https://appleid.apple.com';
const noStore = { 'cache-control': 'no-store' };

async function body<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 64 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(t || '{}') as T;
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}

/** GET /.well-known/apple-app-site-association — the iPad app may use this site's passkeys (webcredentials). */
export function appSiteAssociation(env: Env): Response {
  if (!env.APPLE_TEAM_ID || !env.APPLE_APP_ID) return new Response('Not found', { status: 404 });
  return json({ webcredentials: { apps: [`${env.APPLE_TEAM_ID}.${env.APPLE_APP_ID}`] } }, 200, {
    'cache-control': 'public, max-age=3600',
  });
}

/** POST /api/app/apple/nonce — a one-time nonce for the app's Apple request (5 minutes). */
export async function appleNonce(env: Env): Promise<Response> {
  if (!appleConfigured(env) || !env.APPLE_APP_ID)
    throw new HttpError(503, 'Sign in with Apple is not set up for the app');
  const nonce = b64urlBytes(24);
  const id = await keepChallengeById(env, nonce, 'apple-app');
  return json({ id, nonce }, 200, noStore);
}

/** POST /api/app/apple {id, code, name} — Apple's code from the app: the account (a new one if this Apple account is
 * new here) and a key for this app. */
export async function appleApp(env: Env, req: Request): Promise<Response> {
  if (!appleConfigured(env) || !env.APPLE_APP_ID)
    throw new HttpError(503, 'Sign in with Apple is not set up for the app');
  const b = await body<{ id?: unknown; code?: unknown; name?: unknown }>(req);
  const { challenge: nonce } = await takeChallengeById(env, b.id, 'apple-app');
  if (typeof b.code !== 'string' || !b.code || b.code.length > 2048)
    throw new HttpError(400, 'code required');
  let claims: { iss?: string; aud?: string | string[]; sub?: string; exp?: number; nonce?: string };
  try {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: b.code,
      client_id: env.APPLE_APP_ID,
      client_secret: await clientSecret(env, env.APPLE_APP_ID),
    });
    const response = await fetch(env.APPLE_TOKEN_URL || TOKEN_URL, {
      method: 'POST',
      body: form,
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    });
    const j = (await response.json()) as { id_token?: string };
    if (!response.ok || !j.id_token) throw new Error('no id token');
    claims = decodeIdToken(j.id_token); // straight from Apple over TLS (OIDC Core 3.1.3.7)
  } catch {
    throw new HttpError(401, 'Apple did not confirm the sign-in');
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !claims.sub ||
    claims.iss !== (env.APPLE_ISSUER || ISSUER) ||
    !aud.includes(env.APPLE_APP_ID) ||
    !claims.exp ||
    claims.exp * 1000 < Date.now() ||
    claims.nonce !== nonce
  )
    throw new HttpError(401, 'Apple sign-in could not be verified');
  const owner = (
    await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND subject = ?')
      .bind('apple', claims.sub)
      .first<{ user_id: string }>()
  )?.user_id;
  let userId = owner,
    fresh = false;
  if (!userId) {
    if (!(await mayCreateAccount(env, req))) throw new HttpError(429, LIMIT_MESSAGE);
    userId = newUserId();
    fresh = true;
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, handle, created) VALUES (?, NULL, ?)').bind(
        userId,
        now,
      ),
      ...(await countNewAccount(env, req)),
      env.DB.prepare(
        'INSERT INTO identities (provider, subject, user_id, created) VALUES (?, ?, ?, ?)',
      ).bind('apple', claims.sub, userId, now),
    ]);
  }
  const { key } = await createKey(
    env,
    userId,
    typeof b.name === 'string' ? b.name : 'BlokDust on iPad',
  );
  const u = await env.DB.prepare('SELECT handle FROM users WHERE id = ?')
    .bind(userId)
    .first<{ handle: string | null }>();
  return json({ key, user: { handle: u?.handle ?? null }, fresh }, 200, noStore);
}

/** POST /api/app/passkey/options — a challenge for the app's passkey request (the site's domain as the relying party). */
export async function passkeyOptions(env: Env, req: Request): Promise<Response> {
  const r = rp(env, req);
  const options = await generateAuthenticationOptions({
    rpID: r.id,
    userVerification: 'preferred',
  });
  const id = await keepChallengeById(env, options.challenge, 'login-app');
  return json({ id, rpId: r.id, options }, 200, noStore);
}

/** POST /api/app/passkey {id, response, name} — the app's passkey answer: the account and a key for this app. */
export async function passkeyApp(env: Env, req: Request): Promise<Response> {
  const b = await body<{ id?: unknown; response?: AuthenticationResponseJSON; name?: unknown }>(
    req,
  );
  const { challenge } = await takeChallengeById(env, b.id, 'login-app');
  const cred = await verifyAssertion(env, req, challenge, b.response);
  const { key } = await createKey(
    env,
    cred.user_id,
    typeof b.name === 'string' ? b.name : 'BlokDust on iPad',
  );
  return json({ key, user: { handle: cred.handle } }, 200, noStore);
}
