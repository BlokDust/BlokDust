// Plugin sign-in (CHG-0039, SHARING-0011): a signed-in plugin's own key, and the device code that gets it. The plugin
// asks for a code, the person approves it on the website (signed in as usual there), and the plugin's next poll takes
// the key, once. Only hashes are kept: of the key, of the device code and of the code the person sees.
import type { Env } from '../env.ts';
import { HttpError, b64urlBytes, json, publicBase, sha256Hex } from '../http.ts';
import { APP_KEY_DAYS, appKeyOf, requireUser } from './session.ts';

const DAY = 86_400_000;
const DEVICE_MS = 10 * 60_000;
/** Seconds between polls; faster is refused (RFC 8628 slow_down). */
export const POLL_SECONDS = 5;
/** The code people read and type: no vowels (no words), no 0/O/1/I/U/Y (no misreading). 28^8 ≈ 3.8e11. */
const ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ23456789';

async function body<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 16 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(t || '{}') as T;
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}

/** Eight characters of ALPHABET, evenly drawn (rejection sampling), as XXXX-XXXX. */
function newUserCode(): string {
  const out: string[] = [],
    limit = 256 - (256 % ALPHABET.length);
  while (out.length < 8)
    for (const b of crypto.getRandomValues(new Uint8Array(16)))
      if (b < limit && out.length < 8) out.push(ALPHABET[b % ALPHABET.length]);
  return `${out.slice(0, 4).join('')}-${out.slice(4).join('')}`;
}
/** A typed code as stored: capitals, the dash where it goes; null if it can't be one. */
export function normaliseCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 && [...c].every((ch) => ALPHABET.includes(ch))
    ? `${c.slice(0, 4)}-${c.slice(4)}`
    : null;
}
/** What the plugin calls itself ("BlokDust on Mac"): printable, one line, 60 characters at most. */
function deviceName(raw: unknown): string {
  const s =
    typeof raw === 'string'
      ? raw
          .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60)
      : '';
  return s || 'BlokDust';
}

/** A new key for `userId`, named `name`: the key itself (shown to the plugin once) and its public id. */
export async function createKey(
  env: Env,
  userId: string,
  name: string,
): Promise<{ key: string; id: string }> {
  const key = `bdk_${b64urlBytes(32)}`,
    id = b64urlBytes(9),
    now = Date.now();
  await env.DB.prepare(
    'INSERT INTO app_keys (id, key_hash, user_id, name, created, last_used, expires) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, await sha256Hex(key), userId, deviceName(name), now, now, now + APP_KEY_DAYS * DAY)
    .run();
  return { key, id };
}

/** POST /api/device/start {name} — a device code and the code to show (from a plugin; no account needed). */
export async function deviceStart(env: Env, req: Request): Promise<Response> {
  const { name } = await body<{ name?: unknown }>(req);
  const deviceCode = b64urlBytes(32),
    now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    const userCode = newUserCode();
    try {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM device_codes WHERE expires < ?').bind(now),
        env.DB.prepare(
          'INSERT INTO device_codes (code_hash, user_code_hash, name, created, expires) VALUES (?, ?, ?, ?, ?)',
        ).bind(
          await sha256Hex(deviceCode),
          await sha256Hex(userCode),
          deviceName(name),
          now,
          now + DEVICE_MS,
        ),
      ]);
      const site = publicBase(env, req);
      return json(
        {
          deviceCode,
          userCode,
          verifyUrl: `${site}/link?code=${userCode}`,
          verifyAt: `${new URL(site).host}${new URL(site).pathname.replace(/\/$/, '')}/link`,
          interval: POLL_SECONDS,
          expiresIn: DEVICE_MS / 1000,
        },
        200,
        { 'cache-control': 'no-store' },
      );
    } catch (error) {
      if (!String(error).includes('UNIQUE')) throw error;
    }
  }
  throw new HttpError(500, 'could not make a code');
}

/**
 * POST /api/device/poll {deviceCode} — pending (202), approved (200, with the key, once), denied (403), expired or
 * unknown (410), or too soon (429).
 */
export async function devicePoll(env: Env, req: Request): Promise<Response> {
  const { deviceCode } = await body<{ deviceCode?: unknown }>(req);
  if (typeof deviceCode !== 'string' || deviceCode.length > 64)
    throw new HttpError(400, 'deviceCode required');
  const hash = await sha256Hex(deviceCode),
    now = Date.now(),
    noStore = { 'cache-control': 'no-store' };
  const row = await env.DB.prepare(
    'SELECT expires, polled, user_id, denied FROM device_codes WHERE code_hash = ?',
  )
    .bind(hash)
    .first<{ expires: number; polled: number; user_id: string | null; denied: number }>();
  if (!row || row.expires < now) return json({ status: 'expired' }, 410, noStore);
  if (row.denied) {
    await env.DB.prepare('DELETE FROM device_codes WHERE code_hash = ?').bind(hash).run();
    return json({ status: 'denied' }, 403, noStore);
  }
  if (row.user_id) {
    // Taken once: the row goes in the same statement that reads it, so two polls can't both get a key.
    const taken = await env.DB.prepare(
      'DELETE FROM device_codes WHERE code_hash = ? AND user_id IS NOT NULL RETURNING user_id, name',
    )
      .bind(hash)
      .first<{ user_id: string; name: string }>();
    if (taken) {
      const { key } = await createKey(env, taken.user_id, taken.name);
      const u = await env.DB.prepare('SELECT handle FROM users WHERE id = ?')
        .bind(taken.user_id)
        .first<{ handle: string | null }>();
      return json({ status: 'approved', key, user: { handle: u?.handle ?? null } }, 200, noStore);
    }
  }
  if (now - row.polled < (POLL_SECONDS - 1) * 1000)
    return json({ status: 'slow_down', interval: POLL_SECONDS }, 429, noStore);
  await env.DB.prepare('UPDATE device_codes SET polled = ? WHERE code_hash = ?')
    .bind(now, hash)
    .run();
  return json({ status: 'pending' }, 202, noStore);
}

/** The waiting code `code` (signed in on the website), or 404. */
async function waiting(
  env: Env,
  code: unknown,
): Promise<{ user_code_hash: string; name: string; created: number }> {
  const c = normaliseCode(code);
  const row = c
    ? await env.DB.prepare(
        'SELECT user_code_hash, name, created FROM device_codes WHERE user_code_hash = ? AND expires > ? AND user_id IS NULL AND denied = 0',
      )
        .bind(await sha256Hex(c), Date.now())
        .first<{ user_code_hash: string; name: string; created: number }>()
    : null;
  if (!row)
    throw new HttpError(
      404,
      'That code is not waiting. It may have expired: start again in BlokDust.',
    );
  return row;
}

/** GET /api/device/code?code= — what asks to sign in, so the website can say (the website's session only). */
export async function deviceInfo(env: Env, req: Request, url: URL): Promise<Response> {
  await requireUser(env, req);
  const row = await waiting(env, url.searchParams.get('code'));
  return json({ name: row.name, created: row.created }, 200, { 'cache-control': 'no-store' });
}

/** POST /api/device/approve {code, approve} — signs that plugin in to this account, or turns it away (the website's
 * session only: a plugin key can't approve another device). */
export async function deviceApprove(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  const b = await body<{ code?: unknown; approve?: unknown }>(req);
  const row = await waiting(env, b.code);
  const r =
    b.approve === true
      ? await env.DB.prepare(
          'UPDATE device_codes SET user_id = ? WHERE user_code_hash = ? AND user_id IS NULL AND denied = 0',
        )
          .bind(user.id, row.user_code_hash)
          .run()
      : await env.DB.prepare(
          'UPDATE device_codes SET denied = 1 WHERE user_code_hash = ? AND user_id IS NULL',
        )
          .bind(row.user_code_hash)
          .run();
  if (!r.meta.changes) throw new HttpError(409, 'That code was answered already.');
  return json({ ok: true, approved: b.approve === true, name: row.name });
}

/** GET /api/me/apps — the plugins signed in to this account (the website's session only). */
export async function listApps(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  const r = await env.DB.prepare(
    'SELECT id, name, created, last_used AS lastUsed FROM app_keys WHERE user_id = ? AND expires > ? ORDER BY last_used DESC',
  )
    .bind(user.id, Date.now())
    .all();
  return json({ apps: r.results }, 200, { 'cache-control': 'no-store' });
}

/** DELETE /api/me/apps {id} — signs that plugin out (the website's session only). */
export async function removeApp(env: Env, req: Request): Promise<Response> {
  const user = await requireUser(env, req);
  const { id } = await body<{ id?: unknown }>(req);
  if (typeof id !== 'string' || id.length > 32) throw new HttpError(400, 'id required');
  const r = await env.DB.prepare('DELETE FROM app_keys WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();
  if (!r.meta.changes) throw new HttpError(404, 'no such app');
  return json({ ok: true });
}

/** A plugin signing out: its own key goes. */
export async function endKey(env: Env, req: Request): Promise<boolean> {
  const key = appKeyOf(req);
  if (!key) return false;
  await env.DB.prepare('DELETE FROM app_keys WHERE key_hash = ?')
    .bind(await sha256Hex(key))
    .run();
  return true;
}
