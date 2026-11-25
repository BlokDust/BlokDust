// The signed-in account (SPEC-SHARING-ACCOUNTS R4, R6, R8–R11).
import { appleConfigured } from './apple.ts';
import type { Env } from '../env.ts';
import { HttpError, json, sameDigest, sha256Hex } from '../http.ts';
import { handleProblem } from '../moderation.ts';
import { ID_RE } from '../patches.ts';
import { withCookies } from './passkey.ts';
import { appKeyOf, currentUser, endSession, requireUser } from './session.ts';
import { endKey } from './appKeys.ts';
import { accountStats } from '../stats.ts';
import { addActivity, beaconOn, parseBody, readActivity } from '../activity.ts';

/** Patches per claim request (R9). */
export const CLAIM_MAX = 90;

async function body<T>(req: Request): Promise<T> {
  const raw = await req.text();
  if (raw.length > 64 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(raw || '{}') as T;
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}

/** GET /api/me — who is signed in, how, and whether Google and Apple sign-in are offered here.
 * `?stats=1` (Settings › ACCOUNT) adds the account's stats (R15) to the same answer. */
export async function me(env: Env, req: Request, url?: URL): Promise<Response> {
  // a signed-in plugin too (SHARING-0011)
  const current = await currentUser(env, req, { app: true });
  const google = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
    apple = appleConfigured(env);
  if (!current) return json({ user: null, google, apple }, 200, { 'cache-control': 'no-store' });
  // The website's ACCOUNT also lists the plugins signed in (SHARING-0011), in one answer (R15).
  const wantApps = url?.searchParams.get('stats') === '1' && !appKeyOf(req);
  const [pks, ids, stats, apps] = await Promise.all([
    env.DB.prepare(
      'SELECT id, created, last_used FROM credentials WHERE user_id = ? ORDER BY created',
    )
      .bind(current.id)
      .all<{ id: string; created: number; last_used: number | null }>(),
    env.DB.prepare('SELECT provider, created FROM identities WHERE user_id = ? ORDER BY created')
      .bind(current.id)
      .all<{ provider: string; created: number }>(),
    url?.searchParams.get('stats') === '1'
      ? accountStats(env, current.id, current.created)
      : undefined,
    wantApps
      ? env.DB.prepare(
          'SELECT id, name, created, last_used AS lastUsed FROM app_keys WHERE user_id = ? AND expires > ? ORDER BY last_used DESC',
        )
          .bind(current.id, Date.now())
          .all()
      : undefined,
  ]);
  // R7a: every way in, for SIGN-IN METHODS: Google, Apple, then the passkeys (oldest first).
  const order = (provider: string) => (provider === 'google' ? 0 : provider === 'apple' ? 1 : 2);
  const methods = [
    ...ids.results
      .sort((a, b) => order(a.provider) - order(b.provider))
      .map((method) => ({ kind: method.provider, created: method.created })),
    ...pks.results.map((result) => ({
      kind: 'passkey',
      id: result.id,
      created: result.created,
      lastUsed: result.last_used,
    })),
  ];
  return json(
    {
      user: {
        id: current.id,
        handle: current.handle,
        passkeys: pks.results.length,
        providers: ids.results.map((result) => result.provider),
        methods,
        ...(stats ? { stats } : {}),
        ...(apps ? { apps: apps.results } : {}),
      },
      google,
      apple,
    },
    200,
    { 'cache-control': 'no-store' },
  );
}

/** DELETE /api/me/methods {kind: google|apple|passkey, id?} (R7c): one way in goes, never the last.
 * The check and the delete are one statement, so two at once can't leave an account with none. */
export async function removeMethod(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  const { kind, id } = await body<{ kind?: unknown; id?: unknown }>(req);
  const others =
    '((SELECT COUNT(*) FROM identities WHERE user_id = ?1) + (SELECT COUNT(*) FROM credentials WHERE user_id = ?1)) > 1';
  let result: D1Result, exists: unknown;
  if (kind === 'google' || kind === 'apple') {
    result = await env.DB.prepare(
      `DELETE FROM identities WHERE user_id = ?1 AND provider = ?2 AND ${others}`,
    )
      .bind(user.id, kind)
      .run();
    exists =
      !result.meta.changes &&
      (await env.DB.prepare('SELECT 1 FROM identities WHERE user_id = ? AND provider = ?')
        .bind(user.id, kind)
        .first());
  } else if (kind === 'passkey' && typeof id === 'string' && id.length <= 1024) {
    result = await env.DB.prepare(
      `DELETE FROM credentials WHERE user_id = ?1 AND id = ?2 AND ${others}`,
    )
      .bind(user.id, id)
      .run();
    exists =
      !result.meta.changes &&
      (await env.DB.prepare('SELECT 1 FROM credentials WHERE user_id = ? AND id = ?')
        .bind(user.id, id)
        .first());
  } else throw new HttpError(400, 'kind must be google, apple or passkey (with its id)');
  if (!result.meta.changes)
    throw exists
      ? new HttpError(409, 'This is your only way to sign in. Add another first.')
      : new HttpError(404, 'no such sign-in method');
  return json({ ok: true });
}

/** PUT /api/me/handle {handle} (R6). */
export async function setHandle(env: Env, req: Request): Promise<Response> {
  // a new account made in the iPad app names itself there
  const current = await requireUser(env, req, { app: true });
  const { handle: raw } = await body<{ handle?: unknown }>(req);
  const handle = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const problem = handleProblem(handle);
  if (problem) throw new HttpError(400, problem);
  try {
    await env.DB.prepare('UPDATE users SET handle = ? WHERE id = ?').bind(handle, current.id).run();
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new HttpError(409, 'That name is taken.');
    throw error;
  }
  return json({ user: { id: current.id, handle } });
}

/** POST /api/auth/logout {everywhere?} (R4). */
export async function logout(env: Env, req: Request): Promise<Response> {
  // a plugin signing out: its key goes (SHARING-0011)
  if (await endKey(env, req)) return json({ ok: true });
  const { everywhere } = await body<{ everywhere?: unknown }>(req);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', await endSession(env, req, everywhere === true));
  return withCookies({ ok: true }, headers);
}

/** DELETE /api/me — the account, its sign-ins and sessions, and its patches (R10). */
export async function deleteAccount(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM gallery WHERE user_id = ? OR patch_id IN (SELECT id FROM patches WHERE owner_id = ?)',
    ).bind(user.id, user.id),
    // Their likes go: recount only what they had liked, before the likes are deleted (one write per
    // liked patch, not one per gallery row; security review, PR 13).
    env.DB.prepare(
      `UPDATE gallery SET likes = (SELECT COUNT(*) FROM likes l WHERE l.patch_id = gallery.patch_id AND l.user_id != ?)
      WHERE patch_id IN (SELECT patch_id FROM likes WHERE user_id = ?)`,
    ).bind(user.id, user.id),
    env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM reports WHERE user_id = ?').bind(user.id),
    env.DB.prepare(
      'DELETE FROM revisions WHERE patch_id IN (SELECT id FROM patches WHERE owner_id = ?)',
    ).bind(user.id),
    // The ids stay taken (as a deleted patch's) so an old link never opens someone else's patch.
    env.DB.prepare(
      'UPDATE patches SET deleted = 1, owner_id = NULL, updated = ? WHERE owner_id = ?',
    ).bind(Date.now(), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM app_keys WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM device_codes WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM credentials WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM identities WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', await endSession(env, req, false));
  return withCookies({ ok: true }, headers);
}

/** POST /api/me/claim {patches: [{id, token}]} (R9): this browser's patches become the account's;
 * a wrong token, or another owner's patch, is skipped. */
export async function claim(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  const { patches } = await body<{ patches?: { id?: unknown; token?: unknown }[] }>(req);
  // One select and one batch (D1 allows few queries per request and 100 bound values per query):
  // the client sends at most CLAIM_MAX at a time.
  if (!Array.isArray(patches) || patches.length > CLAIM_MAX)
    throw new HttpError(400, `patches must be a list of at most ${CLAIM_MAX}`);
  const asked = new Map<string, string>();
  for (const patch of patches)
    if (typeof patch.id === 'string' && typeof patch.token === 'string' && ID_RE.test(patch.id))
      asked.set(patch.id, patch.token);
  if (!asked.size) return json({ claimed: [] });
  const ids = [...asked.keys()];
  const rows = (
    await env.DB.prepare(
      `SELECT id, edit_hash, owner_id FROM patches WHERE deleted = 0 AND id IN (${ids.map(() => '?').join(',')})`,
    )
      .bind(...ids)
      .all<{ id: string; edit_hash: string; owner_id: string | null }>()
  ).results;
  const claimed: string[] = [];
  for (const claimedRow of rows) {
    const token = asked.get(claimedRow.id);
    if (
      token !== undefined &&
      (!claimedRow.owner_id || claimedRow.owner_id === user.id) &&
      sameDigest(await sha256Hex(token), claimedRow.edit_hash)
    )
      claimed.push(claimedRow.id);
  }
  if (claimed.length)
    await env.DB.batch(
      claimed.map((id) =>
        env.DB.prepare(
          'UPDATE patches SET owner_id = ? WHERE id = ? AND (owner_id IS NULL OR owner_id = ?)',
        ).bind(user.id, id, user.id),
      ),
    );
  return json({ claimed });
}

/** GET /api/me/patches — the account's patches, newest first (R8). */
export async function myPatches(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req, { app: true });
  const result = await env.DB.prepare(
    'SELECT id, title, rev, created, updated FROM patches WHERE owner_id = ? AND deleted = 0 ORDER BY updated DESC LIMIT 500',
  )
    .bind(user.id)
    .all();
  return json({ patches: result.results }, 200, { 'cache-control': 'no-store' });
}

/** POST /api/me/activity: what the closing page counted (R16); ACTIVITY_BEACON=off answers with no
 * write, and the browser keeps it for its next save. */
export async function postActivity(env: Env, req: Request): Promise<Response> {
  if (!beaconOn(env)) return json({ added: false }); // off: no session lookup, no write
  const user = await requireUser(env, req, { app: true });
  const a = readActivity(await parseBody(req));
  if (a) await addActivity(env, user.id, a).run();
  return json({ added: !!a });
}
