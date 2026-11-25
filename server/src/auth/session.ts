// Sessions (SPEC-SHARING-ACCOUNTS R3–R5): a random token in an HttpOnly cookie, its SHA-256 in D1;
// changes with the cookie must come from this site (Origin check on top of SameSite=Lax).
import type { Env } from '../env.ts';
import { HttpError, b64urlBytes, publicBase, sha256Hex } from '../http.ts';

export const SESSION_DAYS = 30;
const DAY = 86_400_000;

export interface User {
  id: string;
  handle: string | null;
  created: number;
}

/** Secure cookies on https; plain http only for local dev and tests. `__Host-` needs Secure. */
const secure = (req: Request) => new URL(req.url).protocol === 'https:';
export const cookieName = (req: Request, name: string) => (secure(req) ? `__Host-${name}` : name);

export function cookie(req: Request, name: string, value: string, maxAgeSeconds: number): string {
  return `${cookieName(req, name)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure(req) ? '; Secure' : ''}`;
}
export function readCookie(req: Request, name: string): string | null {
  const want = cookieName(req, name);
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === want) return part.slice(i + 1).trim();
  }
  return null;
}

/** R5: a request that changes state with the session cookie must say it comes from this site. */
export function sameOrigin(env: Env, req: Request): void {
  const origin = req.headers.get('origin');
  const allowed = new Set([new URL(req.url).origin, new URL(publicBase(env, req)).origin]);
  if (!origin || !allowed.has(origin)) throw new HttpError(403, 'cross-site request refused');
}

/** A new session for `userId`: its Set-Cookie header. */
export async function startSession(env: Env, req: Request, userId: string): Promise<string> {
  const token = b64urlBytes(32),
    now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)',
  )
    .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * DAY)
    .run();
  return cookie(req, 'bd_session', token, SESSION_DAYS * 86_400);
}

/** A plugin's key in this request (CHG-0039, SHARING-0011): `Authorization: Bearer bdk_…`, else
 * null. Patches' edit tokens travel in the same header without the prefix. */
export function appKeyOf(req: Request): string | null {
  const bearer = /^Bearer (bdk_[A-Za-z0-9_-]{20,64})$/.exec(req.headers.get('authorization') ?? '');
  return bearer ? bearer[1] : null;
}
export const APP_KEY_DAYS = 180;
const HOUR = 3_600_000;
/** The account a plugin key belongs to; a key past its life is deleted. Used, it lives 180 days
 * more (written at most hourly). */
async function userForKey(env: Env, key: string): Promise<User | null> {
  const hash = await sha256Hex(key),
    now = Date.now();
  const row = await env.DB.prepare(
    'SELECT u.id, u.handle, u.created, k.expires, k.last_used FROM app_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?',
  )
    .bind(hash)
    .first<User & { expires: number; last_used: number | null }>();
  if (!row) return null;
  if (row.expires <= now) {
    await env.DB.prepare('DELETE FROM app_keys WHERE key_hash = ?').bind(hash).run();
    return null;
  }
  if (!row.last_used || now - row.last_used > HOUR)
    await env.DB.prepare('UPDATE app_keys SET last_used = ?, expires = ? WHERE key_hash = ?')
      .bind(now, now + APP_KEY_DAYS * DAY, hash)
      .run();
  return { id: row.id, handle: row.handle, created: row.created };
}

/** The signed-in user, or null; past half its life a session is extended (R3). `app`: takes a
 * plugin's key too (SHARING-0011), and a request with a key is never the cookie's user. */
export async function currentUser(
  env: Env,
  req: Request,
  opts: { app?: boolean } = {},
): Promise<User | null> {
  const key = appKeyOf(req);
  if (key) return opts.app ? userForKey(env, key) : null;
  const token = readCookie(req, 'bd_session');
  if (!token || token.length > 64) return null;
  const hash = await sha256Hex(token),
    now = Date.now();
  const row = await env.DB.prepare(
    'SELECT u.id, u.handle, u.created, s.expires FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
  )
    .bind(hash)
    .first<User & { expires: number }>();
  if (!row) return null;
  if (row.expires <= now) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
    return null;
  }
  if (row.expires - now < (SESSION_DAYS * DAY) / 2)
    await env.DB.prepare('UPDATE sessions SET expires = ? WHERE token_hash = ?')
      .bind(now + SESSION_DAYS * DAY, hash)
      .run();
  return { id: row.id, handle: row.handle, created: row.created };
}

export async function requireUser(
  env: Env,
  req: Request,
  opts: { app?: boolean } = {},
): Promise<User> {
  const user = await currentUser(env, req, opts);
  if (!user) throw new HttpError(401, 'sign in first');
  return user;
}

/** Sign out this session, or all the user's (`everywhere`); returns the clearing Set-Cookie. */
export async function endSession(env: Env, req: Request, everywhere: boolean): Promise<string> {
  const token = readCookie(req, 'bd_session');
  if (token) {
    const hash = await sha256Hex(token);
    if (everywhere)
      await env.DB.prepare(
        'DELETE FROM sessions WHERE user_id = (SELECT user_id FROM sessions WHERE token_hash = ?)',
      )
        .bind(hash)
        .run();
    else await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
  }
  return cookie(req, 'bd_session', '', 0);
}

export const newUserId = () => b64urlBytes(12);
