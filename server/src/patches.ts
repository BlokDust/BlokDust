// Patch storage (SPEC-SHARING-BACKEND R1–R7): create (v1 SAVE_AS), save (v1 SAVE, only with the
// edit token the creator's browser keeps, as v1's SessionId), load, delete, thumbnails.
import { LIMITS, type Env } from './env.ts';
import { isC0Control, replaceChars } from '../../shared/text.ts';
import { HttpError, b64urlBytes, json, publicBase, sameDigest, sha256Hex } from './http.ts';
import { verifyTurnstile } from './turnstile.ts';
import { appKeyOf, currentUser, sameOrigin } from './auth/session.ts';
import { afterSave } from './gallery.ts';
import { blockTally } from './stats.ts';
import { addActivity, readActivity } from './activity.ts';

const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Share ids: 10 base62 chars, never starting with "p" (`?c=p…` links carry the patch, R5b). */
export const ID_RE = /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/;

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let id = '';
  for (let i = 0; i < 10; i++) {
    let char = ID_CHARS[bytes[i] % 62];
    if (i === 0 && char === 'p') char = 'P';
    id += char;
  }
  return id;
}

interface SaveBody {
  patch?: unknown;
  title?: unknown;
  thumb?: unknown;
  parent?: unknown;
  turnstile?: unknown;
  /** SPEC-SHARING-GALLERY R1: in the gallery or not. */ gallery?: unknown;
  /** Running totals to add to the signed-in account (SPEC-SHARING-ACCOUNTS R16). */
  activity?: unknown;
}

async function readBody(req: Request): Promise<SaveBody> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 1024 * 1024) throw new HttpError(413, 'request too large');
  const text = await req.text();
  if (text.length > 1024 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(text) as SaveBody;
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}

/** The patch as stored: a v2 patch, re-serialised, at most 64 KB (SPEC-PATCH-FORMAT-V2 R6). */
function validPatch(patch: unknown): string {
  const fields = patch as { format?: unknown; version?: unknown; blocks?: unknown } | null;
  if (
    !fields ||
    typeof fields !== 'object' ||
    fields.format !== 'blokdust.patch' ||
    fields.version !== 2 ||
    !Array.isArray(fields.blocks)
  )
    throw new HttpError(400, 'not a BlokDust v2 patch');
  const json = JSON.stringify(fields);
  if (new TextEncoder().encode(json).length > LIMITS.patchBytes)
    throw new HttpError(413, 'patch larger than 64 KB');
  return json;
}

function validTitle(title: unknown): string {
  if (title === undefined || title === null) return '';
  if (typeof title !== 'string') throw new HttpError(400, 'title must be a string');
  return replaceChars(title, isC0Control).trim().slice(0, LIMITS.titleChars);
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function validThumb(thumb: unknown): Uint8Array | null {
  if (thumb === undefined || thumb === null || thumb === '') return null;
  if (typeof thumb !== 'string') throw new HttpError(400, 'thumb must be base64 PNG');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(thumb.replace(/^data:image\/png;base64,/, '')), (char) =>
      char.charCodeAt(0),
    );
  } catch {
    throw new HttpError(400, 'thumb must be base64 PNG');
  }
  if (bytes.length > LIMITS.thumbBytes) throw new HttpError(413, 'thumbnail too large');
  if (!PNG_SIG.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'thumb must be a PNG');
  return bytes;
}

function shareUrl(env: Env, req: Request, id: string, title: string): string {
  const titleQuery = title ? `&t=${encodeURI(title)}` : '';
  return `${publicBase(env, req)}/?c=${id}${titleQuery}`;
}

interface Row {
  id: string;
  title: string;
  parent: string | null;
  edit_hash: string;
  rev: number;
  created: number;
  updated: number;
  deleted: number;
  owner_id: string | null;
}

async function row(env: Env, id: string): Promise<Row | null> {
  if (!ID_RE.test(id)) return null;
  const stored = await env.DB.prepare('SELECT * FROM patches WHERE id = ?').bind(id).first<Row>();
  return stored && !stored.deleted ? stored : null;
}

/** May this request change patch `id` (save over, delete, unpublish)? See authorise. */
export async function mayEdit(env: Env, req: Request, id: string): Promise<boolean> {
  const stored = await row(env, id);
  if (!stored) return false;
  try {
    await authorise(env, req, stored);
    return true;
  } catch {
    return false;
  }
}

/** The patch's edit token (the browser that made it), or the account that owns it, signed in on
 * this site (SPEC-SHARING-ACCOUNTS R9: an account's patches can be saved from any device). */
async function authorise(env: Env, req: Request, row: Row): Promise<void> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token && sameDigest(await sha256Hex(token), row.edit_hash)) return;
  // A signed-in plugin's key (SHARING-0011): the owner (no cookie, so no Origin check).
  if (row.owner_id && appKeyOf(req)) {
    if ((await currentUser(env, req, { app: true }))?.id === row.owner_id) return;
  } else if (row.owner_id) {
    const user = await currentUser(env, req);
    if (user?.id === row.owner_id) {
      sameOrigin(env, req);
      return;
    }
  }
  throw new HttpError(403, 'not your patch (missing or wrong edit token)');
}

/** Accounts R16: a save carries the browser's running totals, added when someone is signed in. */
async function withActivity(env: Env, userId: string | null, raw: unknown): Promise<boolean> {
  const a = userId ? readActivity(raw) : null;
  if (!a || !userId) return false;
  await addActivity(env, userId, a).run();
  return true;
}

/** POST /api/patches: a new share id (v1 "generate share link"; `parent` records a remix). */
export async function createPatch(env: Env, req: Request): Promise<Response> {
  const body = await readBody(req);
  const patch = validPatch(body.patch),
    title = validTitle(body.title),
    thumb = validThumb(body.thumb),
    blocks = blockTally(body.patch);
  let parent: string | null = null;
  if (body.parent !== undefined && body.parent !== null && body.parent !== '') {
    if (typeof body.parent !== 'string' || !(await row(env, body.parent)))
      throw new HttpError(400, 'unknown parent');
    parent = body.parent;
  }
  // A signed-in plugin saves with its key, no bot check: its account passed one when made.
  const viaKey = appKeyOf(req) ? await currentUser(env, req, { app: true }) : null;
  if (!viaKey) await verifyTurnstile(env, req, body.turnstile);
  // signed in: the account's patch (R9)
  const owner = viaKey?.id ?? (await currentUser(env, req))?.id ?? null;
  const editToken = b64urlBytes(24),
    editHash = await sha256Hex(editToken),
    now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId();
    try {
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO patches (id, title, parent, edit_hash, rev, created, updated, owner_id, blocks) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
        ).bind(id, title, parent, editHash, now, now, owner, blocks),
        env.DB.prepare(
          'INSERT INTO revisions (patch_id, rev, json, title, thumb, created) VALUES (?, 1, ?, ?, ?, ?)',
        ).bind(id, patch, title, thumb, now),
      ]);
      const gallery = await afterSave(env, id, owner, body.gallery === true ? true : undefined);
      const activity = await withActivity(env, owner, body.activity);
      return json(
        { id, rev: 1, editToken, parent, url: shareUrl(env, req, id, title), gallery, activity },
        201,
      );
    } catch (error) {
      if (!String(error).includes('UNIQUE')) throw error; // id collision: try another
    }
  }
  throw new HttpError(500, 'could not allocate an id');
}

/** PUT /api/patches/:id: a new revision under the same id (v1 SAVE, "overwrite"). */
export async function savePatch(env: Env, req: Request, id: string): Promise<Response> {
  const stored = await row(env, id);
  if (!stored) throw new HttpError(404, 'no such patch');
  await authorise(env, req, stored);
  const body = await readBody(req);
  const patch = validPatch(body.patch),
    title = validTitle(body.title),
    thumb = validThumb(body.thumb);
  // authorised above as the owner
  const viaKey = appKeyOf(req) ? await currentUser(env, req, { app: true }) : null;
  if (!viaKey) await verifyTurnstile(env, req, body.turnstile);
  const now = Date.now(),
    rev = stored.rev + 1,
    blocks = blockTally(body.patch);
  const res = await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO revisions (patch_id, rev, json, title, thumb, created) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(id, rev, patch, title, thumb, now),
    // Guarded on the revision we read: two concurrent saves cannot both win.
    env.DB.prepare(
      'UPDATE patches SET rev = ?, title = ?, updated = ?, blocks = ? WHERE id = ? AND rev = ?',
    ).bind(rev, title, now, blocks, id, stored.rev),
  ]);
  if (!res[1].meta.changes) throw new HttpError(409, 'saved elsewhere at the same time; try again');
  // SPEC-SHARING-GALLERY R1, R5: in or out of the gallery as asked; in, with the latest version.
  const gallery = await afterSave(
    env,
    id,
    stored.owner_id,
    typeof body.gallery === 'boolean' ? body.gallery : undefined,
  );
  const activity = body.activity
    ? await withActivity(
        env,
        viaKey?.id ?? (await currentUser(env, req))?.id ?? null,
        body.activity,
      )
    : false;
  return json({
    id,
    rev,
    parent: stored.parent,
    url: shareUrl(env, req, id, title),
    gallery,
    activity,
  });
}

export interface Loaded {
  id: string;
  rev: number;
  title: string;
  parent: string | null;
  created: number;
  updated: number;
  patch: unknown;
  hasThumb: boolean;
  /** The owning account's handle (SPEC-SHARING-ACCOUNTS R12), when it has one. */ by:
    string | null;
}

export async function loadPatch(env: Env, id: string): Promise<Loaded | null> {
  const stored = await row(env, id);
  if (!stored) return null;
  const revision = await env.DB.prepare(
    'SELECT json, title, thumb IS NOT NULL AS has_thumb FROM revisions WHERE patch_id = ? AND rev = ?',
  )
    .bind(id, stored.rev)
    .first<{ json: string; title: string; has_thumb: number }>();
  if (!revision) return null;
  const by = stored.owner_id
    ? ((
        await env.DB.prepare('SELECT handle FROM users WHERE id = ?')
          .bind(stored.owner_id)
          .first<{ handle: string | null }>()
      )?.handle ?? null)
    : null;
  return {
    id,
    rev: stored.rev,
    title: revision.title,
    parent: stored.parent,
    created: stored.created,
    updated: stored.updated,
    patch: JSON.parse(revision.json),
    hasThumb: !!revision.has_thumb,
    by,
  };
}

/** A patch that was deleted (its id stays taken): 410, so the app can say so (R4b). */
export async function wasDeleted(env: Env, id: string): Promise<boolean> {
  return (
    ID_RE.test(id) &&
    !!(await env.DB.prepare('SELECT 1 FROM patches WHERE id = ? AND deleted = 1').bind(id).first())
  );
}

/** GET /api/patches/:id: the latest revision. */
export async function getPatch(
  env: Env,
  req: Request,
  id: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  const loaded = await loadPatch(env, id);
  if (!loaded)
    throw (await wasDeleted(env, id))
      ? new HttpError(410, 'this patch has been deleted')
      : new HttpError(404, 'no such patch');
  // SPEC-SHARING-GALLERY R14: roughly how often it opens in the app (not pages or previews).
  const counting = env.DB.prepare('UPDATE patches SET views = views + 1 WHERE id = ?')
    .bind(id)
    .run()
    .catch(() => {});
  if (ctx) ctx.waitUntil(counting);
  else await counting;
  const views =
    (
      await env.DB.prepare('SELECT views FROM patches WHERE id = ?')
        .bind(id)
        .first<{ views: number }>()
    )?.views ?? 0;
  const published = !!(await env.DB.prepare(
    'SELECT 1 FROM gallery WHERE patch_id = ? AND hidden = 0',
  )
    .bind(id)
    .first());
  // `mine`: the signed-in account owns it, so this device may save over it without the token (R9).
  const owner = (
    await env.DB.prepare('SELECT owner_id FROM patches WHERE id = ?')
      .bind(id)
      .first<{ owner_id: string | null }>()
  )?.owner_id;
  const me = await currentUser(env, req, { app: true }),
    mine = !!owner && me?.id === owner;
  // Its likes, and whether the signed-in user liked it (the star by its credit on the stage).
  const likes = published
    ? ((
        await env.DB.prepare('SELECT likes FROM gallery WHERE patch_id = ?')
          .bind(id)
          .first<{ likes: number }>()
      )?.likes ?? 0)
    : 0;
  const liked =
    !!me &&
    published &&
    !!(await env.DB.prepare('SELECT 1 FROM likes WHERE patch_id = ? AND user_id = ?')
      .bind(id, me.id)
      .first());
  return json({ ...loaded, mine, views, published, likes, liked }, 200, {
    'cache-control': 'no-cache',
    'access-control-allow-origin': '*',
    vary: 'cookie',
  });
}

/** GET /api/patches/:id/thumb.png[?rev=n]: the PNG saved with that revision (latest by default). */
export async function getThumb(env: Env, id: string, revParam: string | null): Promise<Response> {
  const stored = await row(env, id);
  if (!stored) throw new HttpError(404, 'no such patch');
  const rev = revParam && /^\d+$/.test(revParam) ? Number(revParam) : stored.rev;
  const revision = await env.DB.prepare(
    'SELECT thumb FROM revisions WHERE patch_id = ? AND rev = ?',
  )
    .bind(id, rev)
    .first<{ thumb: ArrayBuffer | number[] | null }>();
  // D1 hands BLOB columns back as an array of byte values.
  const bytes = revision?.thumb ? new Uint8Array(revision.thumb as ArrayLike<number>) : null;
  if (!bytes?.length) throw new HttpError(404, 'no thumbnail');
  // A revision's thumbnail never changes: cache it hard when the URL names the revision.
  const cache = revParam ? 'public, max-age=31536000, immutable' : 'public, max-age=60';
  return new Response(bytes, {
    headers: {
      'content-type': 'image/png',
      'cache-control': cache,
      'access-control-allow-origin': '*',
    },
  });
}

/** DELETE /api/patches/:id: its creator removes it (delete token); revisions go, the id stays. */
export async function deletePatch(env: Env, req: Request, id: string): Promise<Response> {
  const stored = await row(env, id);
  if (!stored) throw new HttpError(404, 'no such patch');
  await authorise(env, req, stored);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id),
    env.DB.prepare('DELETE FROM revisions WHERE patch_id = ?').bind(id),
    env.DB.prepare('UPDATE patches SET deleted = 1, updated = ? WHERE id = ?').bind(Date.now(), id),
  ]);
  return new Response(null, { status: 204 });
}
