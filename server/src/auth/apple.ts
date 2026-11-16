// Sign in with Apple (SPEC-SHARING-ACCOUNTS R2b, owner 2026-11-15: Google, Apple and passkeys). OpenID Connect
// authorisation code flow. No scopes are asked for (no name, no email), so Apple answers with a plain GET redirect
// (response_mode=query) and the SameSite=Lax state cookie comes back with it. The client secret is a short-lived
// ES256 JWT signed with the Sign in with Apple key (WebCrypto). As with Google, the ID token comes straight from Apple's
// token endpoint over TLS, so its issuer, audience and expiry are checked, not its signature (OIDC Core 3.1.3.7).
import { decodeIdToken, generateState } from 'arctic';
import type { Env } from '../env.ts';
import { HttpError, publicBase } from '../http.ts';
import { cookie, readCookie } from './session.ts';
import { finishSignIn, safeReturn } from './oauth.ts';

const AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const TOKEN_URL = 'https://appleid.apple.com/auth/token';
const ISSUER = 'https://appleid.apple.com';

export const appleConfigured = (env: Env) => !!(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
const redirectUri = (env: Env, req: Request) => `${publicBase(env, req)}/api/auth/apple/callback`;

/** The .p8 key from Apple (PEM, PKCS#8) as DER bytes. */
function pkcs8(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
const b64url = (b: Uint8Array | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
/** Apple's client secret: an ES256 JWT from the team, about the Services ID, for five minutes. */
async function clientSecret(env: Env): Promise<string> {
  const key = await crypto.subtle.importKey('pkcs8', pkcs8(env.APPLE_PRIVATE_KEY!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const msg = `${b64url(JSON.stringify({ alg: 'ES256', kid: env.APPLE_KEY_ID }))}.${b64url(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: now, exp: now + 300, aud: ISSUER, sub: env.APPLE_CLIENT_ID }))}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(msg)));
  return `${msg}.${b64url(sig)}`;
}

/** GET /api/auth/apple/start?return=/… */
export function appleStart(env: Env, req: Request, url: URL): Response {
  const state = generateState(), back = safeReturn(url.searchParams.get('return'));
  if (!appleConfigured(env)) throw new HttpError(503, 'Apple sign-in is not configured');
  const to = new URL(env.APPLE_AUTH_URL || AUTH_URL);
  for (const [k, v] of Object.entries({ response_type: 'code', response_mode: 'query', client_id: env.APPLE_CLIENT_ID!, redirect_uri: redirectUri(env, req), state })) to.searchParams.set(k, v);
  const headers = new Headers({ location: to.toString(), 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(req, 'bd_oauth', `${state}.apple.${encodeURIComponent(back)}`, 600));
  return new Response(null, { status: 302, headers });
}

/** GET /api/auth/apple/callback?code&state */
export async function appleCallback(env: Env, req: Request, url: URL): Promise<Response> {
  const [state, kind, back] = (readCookie(req, 'bd_oauth') ?? '').split('.');
  const code = url.searchParams.get('code');
  if (!state || kind !== 'apple' || !code || url.searchParams.get('state') !== state) throw new HttpError(400, 'sign-in expired or was not started here; try again');
  if (!appleConfigured(env)) throw new HttpError(503, 'Apple sign-in is not configured');
  let claims: { iss?: string; aud?: string | string[]; sub?: string; exp?: number };
  try {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(env, req), client_id: env.APPLE_CLIENT_ID!, client_secret: await clientSecret(env) });
    const r = await fetch(env.APPLE_TOKEN_URL || TOKEN_URL, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' } });
    const j = await r.json() as { id_token?: string };
    if (!r.ok || !j.id_token) throw new Error('no id token');
    claims = decodeIdToken(j.id_token) as typeof claims;
  } catch { throw new HttpError(401, 'Apple did not confirm the sign-in'); }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!claims.sub || claims.iss !== (env.APPLE_ISSUER || ISSUER) || !aud.includes(env.APPLE_CLIENT_ID) || !claims.exp || claims.exp * 1000 < Date.now())
    throw new HttpError(401, 'Apple sign-in could not be verified');
  return finishSignIn(env, req, 'apple', claims.sub, back);
}
