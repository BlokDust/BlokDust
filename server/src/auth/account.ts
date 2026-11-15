// The signed-in account (SPEC-SHARING-ACCOUNTS R4, R6, R8–R11).
import type { Env } from '../env.ts';
import { HttpError, json, sameDigest, sha256Hex } from '../http.ts';
import { handleProblem } from '../moderation.ts';
import { ID_RE } from '../patches.ts';
import { withCookies } from './passkey.ts';
import { currentUser, endSession, requireUser } from './session.ts';

/** Patches per claim request (R9). */
export const CLAIM_MAX = 90;

async function body<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 64 * 1024) throw new HttpError(413, 'request too large');
  try { return JSON.parse(t || '{}') as T; } catch { throw new HttpError(400, 'body must be JSON'); }
}

/** GET /api/me — who is signed in, how, and whether Google sign-in is offered here. */
export async function me(env: Env, req: Request): Promise<Response> {
  const u = await currentUser(env, req);
  const google = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  if (!u) return json({ user: null, google }, 200, { 'cache-control': 'no-store' });
  const [pk, ids] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM credentials WHERE user_id = ?').bind(u.id).first<{ n: number }>(),
    env.DB.prepare('SELECT provider FROM identities WHERE user_id = ?').bind(u.id).all<{ provider: string }>(),
  ]);
  return json({ user: { id: u.id, handle: u.handle, passkeys: pk?.n ?? 0, providers: ids.results.map(r => r.provider) }, google }, 200, { 'cache-control': 'no-store' });
}

/** PUT /api/me/handle {handle} (R6). */
export async function setHandle(env: Env, req: Request): Promise<Response> {
  const u = await requireUser(env, req);
  const { handle: raw } = await body<{ handle?: unknown }>(req);
  const handle = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const problem = handleProblem(handle);
  if (problem) throw new HttpError(400, problem);
  try { await env.DB.prepare('UPDATE users SET handle = ? WHERE id = ?').bind(handle, u.id).run(); }
  catch (e) { if (String(e).includes('UNIQUE')) throw new HttpError(409, 'That name is taken.'); throw e; }
  return json({ user: { id: u.id, handle } });
}

/** POST /api/auth/logout {everywhere?} (R4). */
export async function logout(env: Env, req: Request): Promise<Response> {
  const { everywhere } = await body<{ everywhere?: unknown }>(req);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', await endSession(env, req, everywhere === true));
  return withCookies({ ok: true }, headers);
}

/** DELETE /api/me — the account, its sign-ins and sessions, and its patches (R10). */
export async function deleteAccount(env: Env, req: Request): Promise<Response> {
  const u = await requireUser(env, req);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM gallery WHERE user_id = ? OR patch_id IN (SELECT id FROM patches WHERE owner_id = ?)').bind(u.id, u.id),
    env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM reports WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM revisions WHERE patch_id IN (SELECT id FROM patches WHERE owner_id = ?)').bind(u.id),
    // The ids stay taken (as a deleted patch's do) so an old link can never open someone else's patch.
    env.DB.prepare('UPDATE patches SET deleted = 1, owner_id = NULL, updated = ? WHERE owner_id = ?').bind(Date.now(), u.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM credentials WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM identities WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
    // Their likes went: recount what they had liked.
    env.DB.prepare('UPDATE gallery SET likes = (SELECT COUNT(*) FROM likes l WHERE l.patch_id = gallery.patch_id)'),
  ]);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', await endSession(env, req, false));
  return withCookies({ ok: true }, headers);
}

/**
 * POST /api/me/claim {patches: [{id, token}]} (R9): patches this browser made (it holds their edit tokens) become the
 * account's. A token that doesn't match, or a patch with another owner, is skipped.
 */
export async function claim(env: Env, req: Request): Promise<Response> {
  const u = await requireUser(env, req);
  const { patches } = await body<{ patches?: { id?: unknown; token?: unknown }[] }>(req);
  // One select and one batch (D1 allows few queries per request and 100 bound values per query): the client sends
  // at most CLAIM_MAX at a time.
  if (!Array.isArray(patches) || patches.length > CLAIM_MAX) throw new HttpError(400, `patches must be a list of at most ${CLAIM_MAX}`);
  const asked = new Map<string, string>();
  for (const p of patches) if (typeof p.id === 'string' && typeof p.token === 'string' && ID_RE.test(p.id)) asked.set(p.id, p.token);
  if (!asked.size) return json({ claimed: [] });
  const ids = [...asked.keys()];
  const rows = (await env.DB.prepare(`SELECT id, edit_hash, owner_id FROM patches WHERE deleted = 0 AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids).all<{ id: string; edit_hash: string; owner_id: string | null }>()).results;
  const claimed: string[] = [];
  for (const r of rows) if ((!r.owner_id || r.owner_id === u.id) && sameDigest(await sha256Hex(asked.get(r.id)!), r.edit_hash)) claimed.push(r.id);
  if (claimed.length) await env.DB.batch(claimed.map(id => env.DB.prepare('UPDATE patches SET owner_id = ? WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)').bind(u.id, id, u.id)));
  return json({ claimed });
}

/** GET /api/me/patches — the account's patches, newest first (R8). */
export async function myPatches(env: Env, req: Request): Promise<Response> {
  const u = await requireUser(env, req);
  const r = await env.DB.prepare('SELECT id, title, rev, created, updated FROM patches WHERE owner_id = ? AND deleted = 0 ORDER BY updated DESC LIMIT 500').bind(u.id).all();
  return json({ patches: r.results }, 200, { 'cache-control': 'no-store' });
}
