// Passkeys (WebAuthn) with SimpleWebAuthn (SPEC-SHARING-ACCOUNTS R1, R2, R7; SHARING-0008). Discoverable credentials:
// signing in needs no name, the device offers its passkeys for this site. A one-time challenge lives in D1 for five
// minutes, found by a random id in a short-lived cookie.
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Env } from '../env.ts';
import { HttpError, b64urlBytes, json, publicBase } from '../http.ts';
import { handleProblem } from '../moderation.ts';
import { cookie, currentUser, newUserId, readCookie, startSession } from './session.ts';
import { verifyTurnstile } from '../turnstile.ts';
import { countNewAccount, requireMayCreateAccount } from './newAccounts.ts';

const RP_NAME = 'BlokDust';
const CHALLENGE_MS = 5 * 60_000;

/** The relying party: this site's host and origin (the public one, or this request's in local dev). */
export function rp(env: Env, req: Request): { id: string; origins: string[] } {
  const pub = new URL(publicBase(env, req)), here = new URL(req.url);
  return { id: pub.hostname, origins: [...new Set([pub.origin, here.origin])] };
}

async function readJson<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 64 * 1024) throw new HttpError(413, 'request too large');
  try { return JSON.parse(t || '{}') as T; } catch { throw new HttpError(400, 'body must be JSON'); }
}

async function keepChallenge(env: Env, req: Request, challenge: string, kind: string, data: string): Promise<string> {
  const id = b64urlBytes(18), now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM challenges WHERE expires < ?').bind(now),
    env.DB.prepare('INSERT INTO challenges (id, challenge, kind, data, expires) VALUES (?, ?, ?, ?, ?)').bind(id, challenge, kind, data, now + CHALLENGE_MS),
  ]);
  return cookie(req, 'bd_challenge', id, CHALLENGE_MS / 1000);
}
/** Take (and delete) the challenge this browser was given for `kind`. */
async function takeChallenge(env: Env, req: Request, kind: string): Promise<{ challenge: string; data: string }> {
  const id = readCookie(req, 'bd_challenge');
  if (!id) throw new HttpError(400, 'no sign-in in progress; try again');
  const row = await env.DB.prepare('DELETE FROM challenges WHERE id = ? RETURNING challenge, kind, data, expires').bind(id).first<{ challenge: string; kind: string; data: string; expires: number }>();
  if (!row || row.kind !== kind || row.expires < Date.now()) throw new HttpError(400, 'sign-in expired; try again');
  return row;
}
const clearChallenge = (req: Request) => cookie(req, 'bd_challenge', '', 0);

/**
 * POST /api/auth/passkey/register/options {handle, turnstile} — a new account (R1), or, signed in, another passkey
 * for this account (no handle needed then).
 */
export async function registerOptions(env: Env, req: Request): Promise<Response> {
  const body = await readJson<{ handle?: unknown; turnstile?: unknown }>(req);
  const me = await currentUser(env, req);
  let handle: string, userId: string, exclude: { id: string }[] = [];
  if (me) {
    handle = me.handle ?? 'blokdust'; userId = me.id;
    exclude = (await env.DB.prepare('SELECT id FROM credentials WHERE user_id = ?').bind(me.id).all<{ id: string }>()).results;
  } else {
    handle = typeof body.handle === 'string' ? body.handle.trim().toLowerCase() : '';
    const problem = handleProblem(handle);
    if (problem) throw new HttpError(400, problem);
    if (await env.DB.prepare('SELECT 1 FROM users WHERE handle = ?').bind(handle).first()) throw new HttpError(409, 'That name is taken.');
    await verifyTurnstile(env, req, body.turnstile);  // a new account: the bot check, as for saving (R1)
    await requireMayCreateAccount(env, req);  // R1b: before the device makes a passkey
    userId = newUserId();
  }
  const r = rp(env, req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME, rpID: r.id, userName: handle, userID: new Uint8Array(new TextEncoder().encode(userId)), attestationType: 'none',
    excludeCredentials: exclude.map(c => ({ id: c.id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  const set = await keepChallenge(env, req, options.challenge, 'register', JSON.stringify({ userId, handle, existing: !!me }));
  return json(options, 200, { 'set-cookie': set, 'cache-control': 'no-store' });
}

/** POST /api/auth/passkey/register/verify {response} — saves the passkey; a new account is created and signed in. */
export async function registerVerify(env: Env, req: Request): Promise<Response> {
  const body = await readJson<{ response?: RegistrationResponseJSON }>(req);
  const { challenge, data } = await takeChallenge(env, req, 'register');
  const { userId, handle, existing } = JSON.parse(data) as { userId: string; handle: string; existing: boolean };
  if (existing) { const me = await currentUser(env, req); if (me?.id !== userId) throw new HttpError(401, 'sign in first'); }
  const r = rp(env, req);
  let v;
  try { v = await verifyRegistrationResponse({ response: body.response!, expectedChallenge: challenge, expectedOrigin: r.origins, expectedRPID: r.id }); }
  catch (e) { throw new HttpError(400, `passkey not accepted: ${(e as Error).message}`); }
  if (!v.verified) throw new HttpError(400, 'passkey not accepted');
  const c = v.registrationInfo.credential, now = Date.now();
  const add = env.DB.prepare('INSERT INTO credentials (id, user_id, public_key, counter, transports, created) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(c.id, userId, c.publicKey, c.counter, (c.transports ?? []).join(','), now);
  try {
    if (existing) await add.run();
    else {
      await requireMayCreateAccount(env, req);  // R1b: another tab may have used the day's last one meanwhile
      await env.DB.batch([env.DB.prepare('INSERT INTO users (id, handle, created) VALUES (?, ?, ?)').bind(userId, handle, now), add, ...await countNewAccount(env, req)]);
    }
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, 'That name is taken.');
    throw e;
  }
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', clearChallenge(req));
  if (!existing) headers.append('set-cookie', await startSession(env, req, userId));
  return withCookies({ user: { id: userId, handle } }, headers);
}

/** POST /api/auth/passkey/login/options — the device picks one of its passkeys for this site (R2). */
export async function loginOptions(env: Env, req: Request): Promise<Response> {
  const options = await generateAuthenticationOptions({ rpID: rp(env, req).id, userVerification: 'preferred' });
  const set = await keepChallenge(env, req, options.challenge, 'login', '');
  return json(options, 200, { 'set-cookie': set, 'cache-control': 'no-store' });
}

/** POST /api/auth/passkey/login/verify {response} — signs in. */
export async function loginVerify(env: Env, req: Request): Promise<Response> {
  const body = await readJson<{ response?: AuthenticationResponseJSON }>(req);
  const { challenge } = await takeChallenge(env, req, 'login');
  const cred = await verifyAssertion(env, req, challenge, body.response);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', clearChallenge(req));
  headers.append('set-cookie', await startSession(env, req, cred.user_id));
  return withCookies({ user: { id: cred.user_id, handle: cred.handle } }, headers);
}

/** A passkey's answer to `challenge` checked against the credential it names; whose it is. (The website, and the iPad
 * app through the site's domain: SHARING-0011.) */
export async function verifyAssertion(env: Env, req: Request, challenge: string, response: AuthenticationResponseJSON | undefined): Promise<{ user_id: string; handle: string | null }> {
  const body = { response };
  const id = body.response?.id;
  if (typeof id !== 'string') throw new HttpError(400, 'no passkey');
  const cred = await env.DB.prepare('SELECT c.id, c.user_id, c.public_key, c.counter, c.transports, u.handle FROM credentials c JOIN users u ON u.id = c.user_id WHERE c.id = ?')
    .bind(id).first<{ id: string; user_id: string; public_key: ArrayBuffer | number[]; counter: number; transports: string; handle: string | null }>();
  if (!cred) throw new HttpError(401, 'This passkey is not known here. It may belong to a deleted account.');
  const r = rp(env, req);
  let v;
  try {
    v = await verifyAuthenticationResponse({ response: body.response!, expectedChallenge: challenge, expectedOrigin: r.origins, expectedRPID: r.id,
      credential: { id: cred.id, publicKey: new Uint8Array(cred.public_key as ArrayLike<number>), counter: cred.counter, transports: cred.transports ? cred.transports.split(',') : undefined } });
  } catch (e) { throw new HttpError(401, `passkey not accepted: ${(e as Error).message}`); }
  if (!v.verified) throw new HttpError(401, 'passkey not accepted');
  await env.DB.prepare('UPDATE credentials SET counter = ?, last_used = ? WHERE id = ?').bind(v.authenticationInfo.newCounter, Date.now(), cred.id).run();
  return { user_id: cred.user_id, handle: cred.handle };
}

/** A one-time challenge kept by id, for a caller without cookies (the iPad app, SHARING-0011). */
export async function keepChallengeById(env: Env, challenge: string, kind: string, data = ''): Promise<string> {
  const id = b64urlBytes(18), now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM challenges WHERE expires < ?').bind(now),
    env.DB.prepare('INSERT INTO challenges (id, challenge, kind, data, expires) VALUES (?, ?, ?, ?, ?)').bind(id, challenge, kind, data, now + CHALLENGE_MS),
  ]);
  return id;
}
/** Take (and delete) challenge `id` of `kind`. */
export async function takeChallengeById(env: Env, id: unknown, kind: string): Promise<{ challenge: string; data: string }> {
  if (typeof id !== 'string' || id.length > 64) throw new HttpError(400, 'no sign-in in progress; try again');
  const row = await env.DB.prepare('DELETE FROM challenges WHERE id = ? RETURNING challenge, kind, data, expires').bind(id).first<{ challenge: string; kind: string; data: string; expires: number }>();
  if (!row || row.kind !== kind || row.expires < Date.now()) throw new HttpError(400, 'sign-in expired; try again');
  return row;
}

/** JSON with several Set-Cookie headers (a plain object can hold only one). */
export function withCookies(body: unknown, headers: Headers, status = 200): Response {
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}
