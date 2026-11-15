// The public gallery (SPEC-SHARING-GALLERY, SHARING-0009): signed-in users publish their saved patches; anyone browses
// (newest, or popular: likes and remixes over age); signed-in users like (no down votes) and report. Reports hide a
// patch at REPORTS_TO_HIDE; the site owner reviews with `pnpm bd gallery`.
import type { Env } from './env.ts';
import { HttpError, json } from './http.ts';
import { isOffensive } from './moderation.ts';
import { ID_RE } from './patches.ts';
import { currentUser, requireUser } from './auth/session.ts';

export const PAGE = 20;
export const REPORTS_TO_HIDE = 3;
const HOUR = 3_600_000;

async function body<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 8 * 1024) throw new HttpError(413, 'request too large');
  try { return JSON.parse(t || '{}') as T; } catch { throw new HttpError(400, 'body must be JSON'); }
}

interface PatchJson { blocks?: { type?: unknown; params?: Record<string, unknown> }[]; macros?: { blocks?: { type?: unknown; params?: Record<string, unknown> }[] }[] }
/** Every block in the patch, Stage insides included. */
const allBlocks = (p: PatchJson) => [...(p.blocks ?? []), ...(p.macros ?? []).flatMap(m => m.blocks ?? [])];
/** R3: why a patch can't be in the gallery (others can't hear the user's own audio files: DATA-0005), or null. */
export function notPublishable(p: PatchJson): string | null {
  const bs = allBlocks(p);
  if (!bs.length) return 'Add some blocks first.';
  if (bs.some(b => typeof b.params?.track === 'string' && (b.params.track as string).startsWith('file:')))
    return 'This patch uses audio files from your device, which others can’t hear. Use Freesound sounds to publish it.';
  if (bs.some(b => b.type === 'source.recorder')) return 'Recordings stay on your device, so a patch with a Recorder can’t be published.';
  return null;
}
const blockTypes = (p: PatchJson) => [...new Set(allBlocks(p).map(b => String(b.type ?? '')).filter(Boolean))].sort().join(' ');

async function latest(env: Env, id: string): Promise<{ owner_id: string | null; title: string; json: string } | null> {
  if (!ID_RE.test(id)) return null;
  return env.DB.prepare('SELECT p.owner_id, r.title, r.json FROM patches p JOIN revisions r ON r.patch_id = p.id AND r.rev = p.rev WHERE p.id = ? AND p.deleted = 0')
    .bind(id).first();
}

/** POST /api/gallery/:id — publish (R1–R4): the owner, with a name, a portable patch and a clean title. */
export async function publish(env: Env, req: Request, id: string): Promise<Response> {
  const u = await requireUser(env, req);
  if (!u.handle) throw new HttpError(400, 'Choose your name first (ACCOUNT).');
  const p = await latest(env, id);
  if (!p) throw new HttpError(404, 'no such patch');
  if (p.owner_id !== u.id) throw new HttpError(403, 'Only your own patches can be published.');
  const patch = JSON.parse(p.json) as PatchJson, why = notPublishable(patch);
  if (why) throw new HttpError(400, why);
  if (!p.title.trim()) throw new HttpError(400, 'Give the patch a name first.');
  if (isOffensive(p.title)) throw new HttpError(400, 'Please choose another name for the patch.');
  await env.DB.prepare(`INSERT INTO gallery (patch_id, user_id, title, blocks, published) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(patch_id) DO UPDATE SET title = excluded.title, blocks = excluded.blocks`)
    .bind(id, u.id, p.title, blockTypes(patch), Date.now()).run();
  return json({ published: true });
}

/** Called after a save (R5): a published patch shows its latest title and blocks; one that can't stay is withdrawn. */
export async function refreshPublished(env: Env, id: string): Promise<void> {
  const g = await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ?').bind(id).first();
  if (!g) return;
  const p = await latest(env, id);
  if (!p) return;
  const patch = JSON.parse(p.json) as PatchJson;
  if (notPublishable(patch) || !p.title.trim() || isOffensive(p.title)) await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
  else await env.DB.prepare('UPDATE gallery SET title = ?, blocks = ? WHERE patch_id = ?').bind(p.title, blockTypes(patch), id).run();
}

/** DELETE /api/gallery/:id — the owner takes it out (R6). */
export async function unpublish(env: Env, req: Request, id: string): Promise<Response> {
  const u = await requireUser(env, req);
  const r = await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ? AND user_id = ?').bind(id, u.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'not in the gallery');
  return json({ published: false });
}

/**
 * GET /api/gallery?sort=popular|new&q=&page= (R7, R8). `q`: words matched in titles and block types ("laser", "tone");
 * `@name` lists one person's patches. Popular: (likes + 2·remixes + 1) / (hours since published + 2), a simple decay so
 * new patches get a chance.
 */
export async function list(env: Env, req: Request, url: URL): Promise<Response> {
  const me = await currentUser(env, req), now = Date.now();
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'popular';
  const page = Math.max(1, Math.min(500, Number(url.searchParams.get('page')) || 1));
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 40);
  const where = ['g.hidden = 0'], binds: unknown[] = [];
  let handle: string | null = null;
  for (const w of q.split(/\s+/).filter(Boolean).slice(0, 4)) {
    if (w.startsWith('@')) { handle = w.slice(1); where.push('u.handle = ?'); binds.push(handle); continue; }
    where.push("(lower(g.title) LIKE ? ESCAPE '\\' OR g.blocks LIKE ? ESCAPE '\\')");
    const like = `%${w.replace(/[\\%_]/g, c => `\\${c}`)}%`;
    binds.push(like, like);
  }
  const remixes = '(SELECT COUNT(*) FROM patches c WHERE c.parent = g.patch_id AND c.deleted = 0)';
  const order = sort === 'new' ? 'g.published DESC' : `((g.likes + 2 * ${remixes} + 1) * ${HOUR}.0 / (? - g.published + 2 * ${HOUR})) DESC, g.published DESC`;
  const sql = `SELECT g.patch_id AS id, g.title, u.handle AS by, g.likes, ${remixes} AS remixes, g.published,
      ${me ? 'EXISTS (SELECT 1 FROM likes l WHERE l.patch_id = g.patch_id AND l.user_id = ?)' : '0'} AS liked
    FROM gallery g JOIN users u ON u.id = g.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`;
  const args = [...(me ? [me.id] : []), ...binds, ...(sort === 'new' ? [] : [now]), PAGE + 1, (page - 1) * PAGE];
  const rows = (await env.DB.prepare(sql).bind(...args).all<{ id: string; title: string; by: string; likes: number; remixes: number; published: number; liked: number }>()).results;
  return json({ items: rows.slice(0, PAGE).map(r => ({ ...r, liked: !!r.liked, mine: !!me && r.by === me.handle })), page, more: rows.length > PAGE, sort, q },
    200, { 'cache-control': 'no-store' });
}

/** POST /api/gallery/:id/like {on} — signed in; one like per person (R8; no down votes). */
export async function like(env: Env, req: Request, id: string): Promise<Response> {
  const u = await requireUser(env, req);
  const { on } = await body<{ on?: unknown }>(req);
  if (!(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ? AND hidden = 0').bind(id).first())) throw new HttpError(404, 'not in the gallery');
  const stmt = on === false
    ? env.DB.prepare('DELETE FROM likes WHERE patch_id = ? AND user_id = ?').bind(id, u.id)
    : env.DB.prepare('INSERT OR IGNORE INTO likes (patch_id, user_id, created) VALUES (?, ?, ?)').bind(id, u.id, Date.now());
  await env.DB.batch([stmt, env.DB.prepare('UPDATE gallery SET likes = (SELECT COUNT(*) FROM likes WHERE patch_id = ?) WHERE patch_id = ?').bind(id, id)]);
  const g = await env.DB.prepare('SELECT likes FROM gallery WHERE patch_id = ?').bind(id).first<{ likes: number }>();
  return json({ liked: on !== false, likes: g?.likes ?? 0 });
}

/** POST /api/gallery/:id/report {reason} — signed in; once per person; hidden at REPORTS_TO_HIDE (R9). */
export async function report(env: Env, req: Request, id: string): Promise<Response> {
  const u = await requireUser(env, req);
  const { reason } = await body<{ reason?: unknown }>(req);
  if (!(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ?').bind(id).first())) throw new HttpError(404, 'not in the gallery');
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO reports (patch_id, user_id, reason, created) VALUES (?, ?, ?, ?)').bind(id, u.id, typeof reason === 'string' ? reason.slice(0, 200) : '', Date.now()),
    env.DB.prepare(`UPDATE gallery SET reports = (SELECT COUNT(*) FROM reports WHERE patch_id = ?),
      hidden = CASE WHEN hidden = 2 THEN 2 WHEN (SELECT COUNT(*) FROM reports WHERE patch_id = ?) >= ${REPORTS_TO_HIDE} THEN 1 ELSE hidden END WHERE patch_id = ?`).bind(id, id, id),
  ]);
  return json({ reported: true });
}
