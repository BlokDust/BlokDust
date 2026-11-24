// The public gallery (SPEC-SHARING-GALLERY, SHARING-0009): signed-in users publish with the gallery switch on SAVE; anyone browses
// (newest, or popular: likes and remixes over age); signed-in users like (no down votes) and report. Reports hide a
// patch at REPORTS_TO_HIDE (never @blokdust's own); the site owner reviews with `pnpm bd gallery`.
import type { Env } from './env.ts';
import { HttpError, json } from './http.ts';
import { isOffensive } from './moderation.ts';
import { ID_RE } from './patches.ts';
import { currentUser, requireUser } from './auth/session.ts';

export const PAGE = 20;
/** The site's own account (owner review 3): its patches are the EXAMPLES and TUTORIALS (R16). The name is reserved. */
export const OFFICIAL = 'blokdust';
export type Sort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
/** R9: reports that hide a patch (5, not 3: throwaway accounts are cheap; security review, PR 13). */
export const REPORTS_TO_HIDE = 5;
const HOUR = 3_600_000;

async function body<T>(req: Request): Promise<T> {
  const t = await req.text();
  if (t.length > 8 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(t || '{}') as T;
  } catch {
    throw new HttpError(400, 'body must be JSON');
  }
}

interface PatchJson {
  blocks?: { type?: unknown; params?: Record<string, unknown> }[];
  macros?: { blocks?: { type?: unknown; params?: Record<string, unknown> }[] }[];
}
/** Every block in the patch, Stage insides included. */
export const allBlocks = (patchJson: PatchJson) => [
  ...(patchJson.blocks ?? []),
  ...(patchJson.macros ?? []).flatMap((m) => m.blocks ?? []),
];
/** R3: why a patch can't be in the gallery (others can't hear the user's own audio files: DATA-0005), or null. */
export function notPublishable(patchJson: PatchJson): string | null {
  const bs = allBlocks(patchJson);
  if (!bs.length) return 'Add some blocks first.';
  if (bs.some((b) => typeof b.params?.track === 'string' && b.params.track.startsWith('file:')))
    return 'This patch uses audio files from your device, which others can’t hear. Use Freesound sounds to publish it.';
  if (bs.some((b) => b.type === 'source.recorder'))
    return 'Recordings stay on your device, so a patch with a Recorder can’t be published.';
  return null;
}
const blockTypes = (patchJson: PatchJson) =>
  [
    ...new Set(
      allBlocks(patchJson)
        .map((b) => String(b.type ?? ''))
        .filter(Boolean),
    ),
  ]
    .sort()
    .join(' ');

async function latest(
  env: Env,
  id: string,
): Promise<{ owner_id: string | null; title: string; json: string } | null> {
  if (!ID_RE.test(id)) return null;
  return env.DB.prepare(
    'SELECT p.owner_id, r.title, r.json FROM patches p JOIN revisions r ON r.patch_id = p.id AND r.rev = p.rev WHERE p.id = ? AND p.deleted = 0',
  )
    .bind(id)
    .first();
}

export const SIGN_IN_TO_PUBLISH = 'Only signed-in users can publish to the gallery.';
/**
 * After a save (R1, R5): `on` puts the patch in the gallery (or keeps it there with its latest title and blocks), off
 * takes it out; undefined leaves it as it is, refreshed. Only a signed-in owner with a name can publish (R2; owner,
 * 2026-11-15: accountability and ownership). Returns whether it is published, and why not when it can't be.
 */
export async function afterSave(
  env: Env,
  id: string,
  ownerId: string | null,
  on: boolean | undefined,
): Promise<{ published: boolean; reason?: string }> {
  const was = !!(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ?').bind(id).first());
  if (on === false || (on === undefined && !was)) {
    if (was) await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
    return { published: false };
  }
  const owner = ownerId
    ? await env.DB.prepare('SELECT handle FROM users WHERE id = ?')
        .bind(ownerId)
        .first<{ handle: string | null }>()
    : null;
  if (!owner) return { published: false, reason: SIGN_IN_TO_PUBLISH };
  if (!owner.handle) return { published: false, reason: 'Choose your name in Settings first.' };
  const p = await latest(env, id);
  if (!p) return { published: false };
  const patch = JSON.parse(p.json) as PatchJson;
  const reason =
    notPublishable(patch) ??
    (!p.title.trim()
      ? 'Give the patch a name first.'
      : isOffensive(p.title)
        ? 'Please choose another name for the patch.'
        : null);
  if (reason) {
    if (was) await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
    return { published: false, reason };
  }
  // @blokdust's patches go in EXAMPLES when first published (R16; `bd gallery kind` makes one a tutorial).
  await env.DB.prepare(
    `INSERT INTO gallery (patch_id, user_id, title, blocks, published, kind) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(patch_id) DO UPDATE SET title = excluded.title, blocks = excluded.blocks`,
  )
    .bind(
      id,
      ownerId,
      p.title,
      blockTypes(patch),
      Date.now(),
      owner.handle === OFFICIAL ? 'example' : '',
    )
    .run();
  return { published: true };
}

/** DELETE /api/gallery/:id — the owner takes it out (R6): the account that owns it, or the browser with its edit token. */
export async function unpublish(
  env: Env,
  id: string,
  mayEdit: (id: string) => Promise<boolean>,
): Promise<Response> {
  if (!(await mayEdit(id))) throw new HttpError(403, 'not your patch');
  const r = await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
  if (!r.meta.changes) throw new HttpError(404, 'not in the gallery');
  return json({ published: false });
}

/**
 * GET /api/gallery?sort=popular|top|new|examples|tutorials&q=&page= (R7, R8; R16: EXAMPLES and TUTORIALS are @blokdust's,
 * oldest first, the order they were made in). `q`: words matched in titles, block types ("laser", "tone") and
 * names; `@name` lists exactly one person's patches. Popular: (likes + 2·remixes + 1) / (hours since published + 2), a simple decay so
 * new patches get a chance. Top (all time, CHG-0035): likes + 2·remixes, with no decay; newest first among equals.
 */
export async function list(env: Env, req: Request, url: URL): Promise<Response> {
  const me = await currentUser(env, req, { app: true }),
    now = Date.now();
  const searchParam = url.searchParams.get('sort'),
    sort: Sort =
      searchParam === 'top' ||
      searchParam === 'new' ||
      searchParam === 'examples' ||
      searchParam === 'tutorials'
        ? searchParam
        : 'popular';
  const kind = sort === 'examples' ? 'example' : sort === 'tutorials' ? 'tutorial' : null;
  const page = Math.max(1, Math.min(500, Number(url.searchParams.get('page')) || 1));
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 40);
  const where = ['g.hidden = 0'],
    binds: unknown[] = [];
  if (kind) {
    where.push('g.kind = ?');
    binds.push(kind);
  }
  let handle: string | null = null;
  for (const w of q.split(/\s+/).filter(Boolean).slice(0, 4)) {
    if (w.startsWith('@')) {
      handle = w.slice(1);
      where.push('u.handle = ?');
      binds.push(handle);
      continue;
    }
    where.push(
      "(lower(g.title) LIKE ? ESCAPE '\\' OR g.blocks LIKE ? ESCAPE '\\' OR u.handle LIKE ? ESCAPE '\\')",
    );
    const like = `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    binds.push(like, like, like);
  }
  const remixes = '(SELECT COUNT(*) FROM patches c WHERE c.parent = g.patch_id AND c.deleted = 0)';
  const order = kind
    ? 'g.published ASC'
    : sort === 'new'
      ? 'g.published DESC'
      : sort === 'top'
        ? `(g.likes + 2 * ${remixes}) DESC, g.published DESC`
        : `((g.likes + 2 * ${remixes} + 1) * ${HOUR}.0 / (? - g.published + 2 * ${HOUR})) DESC, g.published DESC`;
  const sql = `SELECT g.patch_id AS id, g.title, u.handle AS by, g.likes, ${remixes} AS remixes, g.published,
      (SELECT views FROM patches v WHERE v.id = g.patch_id) AS views,
      ${me ? 'EXISTS (SELECT 1 FROM likes l WHERE l.patch_id = g.patch_id AND l.user_id = ?)' : '0'} AS liked
    FROM gallery g JOIN users u ON u.id = g.user_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`;
  const args = [
    ...(me ? [me.id] : []),
    ...binds,
    ...(sort === 'popular' ? [now] : []),
    PAGE + 1,
    (page - 1) * PAGE,
  ];
  const rows = (
    await env.DB.prepare(sql)
      .bind(...args)
      .all<{
        id: string;
        title: string;
        by: string;
        likes: number;
        remixes: number;
        published: number;
        views: number;
        liked: number;
      }>()
  ).results;
  return json(
    {
      items: rows
        .slice(0, PAGE)
        .map((r) => ({ ...r, liked: !!r.liked, mine: !!me && r.by === me.handle })),
      page,
      more: rows.length > PAGE,
      sort,
      q,
    },
    200,
    { 'cache-control': 'no-store' },
  );
}

/** POST /api/gallery/:id/like {on} — signed in; one like per person (R8; no down votes). */
export async function like(env: Env, req: Request, id: string): Promise<Response> {
  const user = await requireUser(env, req, { app: true }); // a plugin's key too (SHARING-0011)
  const { on } = await body<{ on?: unknown }>(req);
  if (
    !(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ? AND hidden = 0')
      .bind(id)
      .first())
  )
    throw new HttpError(404, 'not in the gallery');
  const stmt =
    on === false
      ? env.DB.prepare('DELETE FROM likes WHERE patch_id = ? AND user_id = ?').bind(id, user.id)
      : env.DB.prepare(
          'INSERT OR IGNORE INTO likes (patch_id, user_id, created) VALUES (?, ?, ?)',
        ).bind(id, user.id, Date.now());
  await env.DB.batch([
    stmt,
    env.DB.prepare(
      'UPDATE gallery SET likes = (SELECT COUNT(*) FROM likes WHERE patch_id = ?) WHERE patch_id = ?',
    ).bind(id, id),
  ]);
  const g = await env.DB.prepare('SELECT likes FROM gallery WHERE patch_id = ?')
    .bind(id)
    .first<{ likes: number }>();
  return json({ liked: on !== false, likes: g?.likes ?? 0 });
}

/** POST /api/gallery/:id/report {reason} — signed in; once per person; hidden at REPORTS_TO_HIDE (R9), except
 * @blokdust's own patches (the EXAMPLES and TUTORIALS), whose reports are kept for `bd gallery reports` only. */
export async function report(env: Env, req: Request, id: string): Promise<Response> {
  const user = await requireUser(env, req, { app: true });
  const { reason } = await body<{ reason?: unknown }>(req);
  if (!(await env.DB.prepare('SELECT 1 FROM gallery WHERE patch_id = ?').bind(id).first()))
    throw new HttpError(404, 'not in the gallery');
  await env.DB.batch([
    env.DB.prepare(
      'INSERT OR IGNORE INTO reports (patch_id, user_id, reason, created) VALUES (?, ?, ?, ?)',
    ).bind(id, user.id, typeof reason === 'string' ? reason.slice(0, 200) : '', Date.now()),
    env.DB.prepare(
      `UPDATE gallery SET reports = (SELECT COUNT(*) FROM reports WHERE patch_id = ?),
      hidden = CASE WHEN hidden = 2 THEN 2
        WHEN (SELECT handle FROM users WHERE id = gallery.user_id) = ? THEN hidden
        WHEN (SELECT COUNT(*) FROM reports WHERE patch_id = ?) >= ${REPORTS_TO_HIDE} THEN 1 ELSE hidden END WHERE patch_id = ?`,
    ).bind(id, OFFICIAL, id, id),
  ]);
  return json({ reported: true });
}
