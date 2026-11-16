// Patch storage (SPEC-SHARING-BACKEND R1–R7): create (v1 SAVE_AS / "generate link" / "create new"), save (v1 SAVE,
// "overwrite": only with the edit token the creator's browser keeps, as v1's SessionId), load, delete, thumbnails.
import { LIMITS, type Env } from './env.ts';
import { HttpError, b64urlBytes, json, publicBase, sameDigest, sha256Hex } from './http.ts';
import { verifyTurnstile } from './turnstile.ts';
import { currentUser, sameOrigin } from './auth/session.ts';
import { afterSave } from './gallery.ts';
import { blockTally } from './stats.ts';
import { addActivity, readActivity } from './activity.ts';

const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** Share ids: 10 base62 chars that never start with "p" (Phase 1 `?c=p…` links carry the patch itself, R5b). */
export const ID_RE = /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/;

function newId(): string {
  const r = crypto.getRandomValues(new Uint8Array(10));
  let s = '';
  for (let i = 0; i < 10; i++) {
    let c = ID_CHARS[r[i] % 62];
    if (i === 0 && c === 'p') c = 'P';
    s += c;
  }
  return s;
}

interface SaveBody { patch?: unknown; title?: unknown; thumb?: unknown; parent?: unknown; turnstile?: unknown; /** SPEC-SHARING-GALLERY R1: in the gallery or not. */ gallery?: unknown;
  /** SPEC-SHARING-ACCOUNTS R16: running totals to add to the signed-in account. */ activity?: unknown }

async function readBody(req: Request): Promise<SaveBody> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 1024 * 1024) throw new HttpError(413, 'request too large');
  const text = await req.text();
  if (text.length > 1024 * 1024) throw new HttpError(413, 'request too large');
  try { return JSON.parse(text) as SaveBody; } catch { throw new HttpError(400, 'body must be JSON'); }
}

/** The patch as stored: a v2 patch object, re-serialised, at most 64 KB (SPEC-PATCH-FORMAT-V2 R6). */
function validPatch(p: unknown): string {
  const o = p as { format?: unknown; version?: unknown; blocks?: unknown } | null;
  if (!o || typeof o !== 'object' || o.format !== 'blokdust.patch' || o.version !== 2 || !Array.isArray(o.blocks))
    throw new HttpError(400, 'not a BlokDust v2 patch');
  const s = JSON.stringify(o);
  if (new TextEncoder().encode(s).length > LIMITS.patchBytes) throw new HttpError(413, 'patch larger than 64 KB');
  return s;
}

function validTitle(t: unknown): string {
  if (t === undefined || t === null) return '';
  if (typeof t !== 'string') throw new HttpError(400, 'title must be a string');
  return t.replace(/[\u0000-\u001f]/g, '').trim().slice(0, LIMITS.titleChars);
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function validThumb(t: unknown): Uint8Array | null {
  if (t === undefined || t === null || t === '') return null;
  if (typeof t !== 'string') throw new HttpError(400, 'thumb must be base64 PNG');
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(t.replace(/^data:image\/png;base64,/, '')), c => c.charCodeAt(0)); }
  catch { throw new HttpError(400, 'thumb must be base64 PNG'); }
  if (bytes.length > LIMITS.thumbBytes) throw new HttpError(413, 'thumbnail too large');
  if (!PNG_SIG.every((b, i) => bytes[i] === b)) throw new HttpError(400, 'thumb must be a PNG');
  return bytes;
}

function shareUrl(env: Env, req: Request, id: string, title: string): string {
  const t = title ? `&t=${encodeURI(title)}` : '';
  return `${publicBase(env, req)}/?c=${id}${t}`;
}

interface Row { id: string; title: string; parent: string | null; edit_hash: string; rev: number; created: number; updated: number; deleted: number; owner_id: string | null }

async function row(env: Env, id: string): Promise<Row | null> {
  if (!ID_RE.test(id)) return null;
  const r = await env.DB.prepare('SELECT * FROM patches WHERE id = ?').bind(id).first<Row>();
  return r && !r.deleted ? r : null;
}

/** May this request change patch `id` (save over, delete, unpublish)? See authorise. */
export async function mayEdit(env: Env, req: Request, id: string): Promise<boolean> {
  const r = await row(env, id);
  if (!r) return false;
  try { await authorise(env, req, r); return true; } catch { return false; }
}

/** The patch's edit token (the browser that made it), or the account that owns it, signed in on this site
 * (SPEC-SHARING-ACCOUNTS R9: an account's patches can be saved from any device). */
async function authorise(env: Env, req: Request, r: Row): Promise<void> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token && sameDigest(await sha256Hex(token), r.edit_hash)) return;
  if (r.owner_id) {
    const u = await currentUser(env, req);
    if (u?.id === r.owner_id) { sameOrigin(env, req); return; }
  }
  throw new HttpError(403, 'not your patch (missing or wrong edit token)');
}

/** R16 of accounts: a save carries the browser's running totals; added when someone is signed in. */
async function withActivity(env: Env, userId: string | null, raw: unknown): Promise<boolean> {
  const a = userId ? readActivity(raw) : null;
  if (!a || !userId) return false;
  await addActivity(env, userId, a).run();
  return true;
}

/** POST /api/patches: a new share id (v1 "generate share link" and "create new"; `parent` records the remix). */
export async function createPatch(env: Env, req: Request): Promise<Response> {
  const body = await readBody(req);
  const patch = validPatch(body.patch), title = validTitle(body.title), thumb = validThumb(body.thumb), blocks = blockTally(body.patch);
  let parent: string | null = null;
  if (body.parent !== undefined && body.parent !== null && body.parent !== '') {
    if (typeof body.parent !== 'string' || !(await row(env, body.parent))) throw new HttpError(400, 'unknown parent');
    parent = body.parent;
  }
  await verifyTurnstile(env, req, body.turnstile);
  const owner = (await currentUser(env, req))?.id ?? null;  // signed in: the account's patch (R9)
  const editToken = b64urlBytes(24), editHash = await sha256Hex(editToken), now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId();
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO patches (id, title, parent, edit_hash, rev, created, updated, owner_id, blocks) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)')
          .bind(id, title, parent, editHash, now, now, owner, blocks),
        env.DB.prepare('INSERT INTO revisions (patch_id, rev, json, title, thumb, created) VALUES (?, 1, ?, ?, ?, ?)')
          .bind(id, patch, title, thumb, now),
      ]);
      const gallery = await afterSave(env, id, owner, body.gallery === true ? true : undefined);
      const activity = await withActivity(env, owner, body.activity);
      return json({ id, rev: 1, editToken, parent, url: shareUrl(env, req, id, title), gallery, activity }, 201);
    } catch (e) {
      if (!String(e).includes('UNIQUE')) throw e;  // id collision: try another
    }
  }
  throw new HttpError(500, 'could not allocate an id');
}

/** PUT /api/patches/:id: a new revision under the same id (v1 SAVE, "overwrite"). */
export async function savePatch(env: Env, req: Request, id: string): Promise<Response> {
  const r = await row(env, id);
  if (!r) throw new HttpError(404, 'no such patch');
  await authorise(env, req, r);
  const body = await readBody(req);
  const patch = validPatch(body.patch), title = validTitle(body.title), thumb = validThumb(body.thumb);
  await verifyTurnstile(env, req, body.turnstile);
  const now = Date.now(), rev = r.rev + 1, blocks = blockTally(body.patch);
  const res = await env.DB.batch([
    env.DB.prepare('INSERT INTO revisions (patch_id, rev, json, title, thumb, created) VALUES (?, ?, ?, ?, ?, ?)').bind(id, rev, patch, title, thumb, now),
    // Guarded on the revision we read: two concurrent saves cannot both win.
    env.DB.prepare('UPDATE patches SET rev = ?, title = ?, updated = ?, blocks = ? WHERE id = ? AND rev = ?').bind(rev, title, now, blocks, id, r.rev),
  ]);
  if (!res[1].meta.changes) throw new HttpError(409, 'saved elsewhere at the same time; try again');
  // SPEC-SHARING-GALLERY R1, R5: in or out of the gallery as asked; published, it shows the latest title and blocks.
  const gallery = await afterSave(env, id, r.owner_id, typeof body.gallery === 'boolean' ? body.gallery : undefined);
  const activity = body.activity ? await withActivity(env, (await currentUser(env, req))?.id ?? null, body.activity) : false;
  return json({ id, rev, parent: r.parent, url: shareUrl(env, req, id, title), gallery, activity });
}

export interface Loaded { id: string; rev: number; title: string; parent: string | null; created: number; updated: number; patch: unknown; hasThumb: boolean;
  /** The owning account's handle (SPEC-SHARING-ACCOUNTS R12), when it has one. */ by: string | null }

export async function loadPatch(env: Env, id: string): Promise<Loaded | null> {
  const r = await row(env, id);
  if (!r) return null;
  const v = await env.DB.prepare('SELECT json, title, thumb IS NOT NULL AS has_thumb FROM revisions WHERE patch_id = ? AND rev = ?')
    .bind(id, r.rev).first<{ json: string; title: string; has_thumb: number }>();
  if (!v) return null;
  const by = r.owner_id ? (await env.DB.prepare('SELECT handle FROM users WHERE id = ?').bind(r.owner_id).first<{ handle: string | null }>())?.handle ?? null : null;
  return { id, rev: r.rev, title: v.title, parent: r.parent, created: r.created, updated: r.updated, patch: JSON.parse(v.json), hasThumb: !!v.has_thumb, by };
}

/** GET /api/patches/:id: the latest revision. */
export async function getPatch(env: Env, req: Request, id: string, ctx?: ExecutionContext): Promise<Response> {
  const p = await loadPatch(env, id);
  if (!p) throw new HttpError(404, 'no such patch');
  // SPEC-SHARING-GALLERY R14: roughly how often it is opened in the app (pages and previews don't count).
  const counting = env.DB.prepare('UPDATE patches SET views = views + 1 WHERE id = ?').bind(id).run().catch(() => {});
  if (ctx) ctx.waitUntil(counting); else await counting;
  const views = (await env.DB.prepare('SELECT views FROM patches WHERE id = ?').bind(id).first<{ views: number }>())?.views ?? 0;
  const published = !!(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ? AND hidden = 0').bind(id).first());
  // `mine`: the signed-in account owns it, so this device may save over it without the edit token (R9).
  const owner = (await env.DB.prepare('SELECT owner_id FROM patches WHERE id = ?').bind(id).first<{ owner_id: string | null }>())?.owner_id;
  const me = await currentUser(env, req), mine = !!owner && me?.id === owner;
  // Its likes, and whether the signed-in user has liked it (the star by its credit on the stage, owner review 2).
  const likes = published ? (await env.DB.prepare('SELECT likes FROM gallery WHERE patch_id = ?').bind(id).first<{ likes: number }>())?.likes ?? 0 : 0;
  const liked = !!me && published && !!(await env.DB.prepare('SELECT 1 FROM likes WHERE patch_id = ? AND user_id = ?').bind(id, me.id).first());
  return json({ ...p, mine, views, published, likes, liked }, 200, { 'cache-control': 'no-cache', 'access-control-allow-origin': '*', vary: 'cookie' });
}

/** GET /api/patches/:id/thumb.png[?rev=n]: the PNG saved with that revision (latest by default). */
export async function getThumb(env: Env, id: string, revParam: string | null): Promise<Response> {
  const r = await row(env, id);
  if (!r) throw new HttpError(404, 'no such patch');
  const rev = revParam && /^\d+$/.test(revParam) ? Number(revParam) : r.rev;
  const v = await env.DB.prepare('SELECT thumb FROM revisions WHERE patch_id = ? AND rev = ?').bind(id, rev).first<{ thumb: ArrayBuffer | number[] | null }>();
  // D1 hands BLOB columns back as an array of byte values.
  const bytes = v?.thumb ? new Uint8Array(v.thumb as ArrayLike<number>) : null;
  if (!bytes?.length) throw new HttpError(404, 'no thumbnail');
  // A revision's thumbnail never changes: cache it hard when the URL names the revision.
  const cache = revParam ? 'public, max-age=31536000, immutable' : 'public, max-age=60';
  return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': cache, 'access-control-allow-origin': '*' } });
}

/** DELETE /api/patches/:id: the creator removes a patch (SHARING-0001 delete token); revisions go, the id stays taken. */
export async function deletePatch(env: Env, req: Request, id: string): Promise<Response> {
  const r = await row(env, id);
  if (!r) throw new HttpError(404, 'no such patch');
  await authorise(env, req, r);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id),
    env.DB.prepare('DELETE FROM revisions WHERE patch_id = ?').bind(id),
    env.DB.prepare('UPDATE patches SET deleted = 1, updated = ? WHERE id = ?').bind(Date.now(), id),
  ]);
  return new Response(null, { status: 204 });
}
