// The public gallery (SPEC-SHARING-GALLERY, SHARING-0009): signed-in users publish, like, report;
// anyone browses. Reports hide a patch (not @blokdust's); `pnpm bd gallery` reviews them.
import type { Env } from './env.ts';
import { textOf } from '../../shared/text.ts';
import { HttpError, json } from './http.ts';
import { isOffensive } from './moderation.ts';
import { ID_RE } from './patches.ts';
import { currentUser, requireUser } from './auth/session.ts';

export const PAGE = 20;
/** The site's own account: its patches are EXAMPLES and TUTORIALS (R16); the name is reserved. */
export const OFFICIAL = 'blokdust';
export type Sort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
/** R9: reports that hide a patch (5: throwaway accounts are cheap; security review, PR 13). */
export const REPORTS_TO_HIDE = 5;
const HOUR = 3_600_000;

async function body<T>(req: Request): Promise<T> {
  const raw = await req.text();
  if (raw.length > 8 * 1024) throw new HttpError(413, 'request too large');
  try {
    return JSON.parse(raw || '{}') as T;
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
  ...(patchJson.macros ?? []).flatMap((macro) => macro.blocks ?? []),
];
/** R3: why a patch can't be in the gallery (others can't hear one's own files, DATA-0005). */
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
        .map((b) => textOf(b.type))
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
/** After a save (R1, R5): `on` publishes (refreshing title and blocks), off unpublishes, undefined
 * keeps it. Only a signed-in owner with a name publishes (R2). Returns published, or why not. */
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
  const latestPatch = await latest(env, id);
  if (!latestPatch) return { published: false };
  const patch = JSON.parse(latestPatch.json) as PatchJson;
  const reason =
    notPublishable(patch) ??
    (!latestPatch.title.trim()
      ? 'Give the patch a name first.'
      : isOffensive(latestPatch.title)
        ? 'Please choose another name for the patch.'
        : null);
  if (reason) {
    if (was) await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
    return { published: false, reason };
  }
  // @blokdust's patches start in EXAMPLES (R16; `bd gallery kind` makes one a tutorial).
  await env.DB.prepare(
    `INSERT INTO gallery (patch_id, user_id, title, blocks, published, kind) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(patch_id) DO UPDATE SET title = excluded.title, blocks = excluded.blocks`,
  )
    .bind(
      id,
      ownerId,
      latestPatch.title,
      blockTypes(patch),
      Date.now(),
      owner.handle === OFFICIAL ? 'example' : '',
    )
    .run();
  return { published: true };
}

/** DELETE /api/gallery/:id: its owner (account, or browser with the token) unpublishes (R6). */
export async function unpublish(
  env: Env,
  id: string,
  mayEdit: (id: string) => Promise<boolean>,
): Promise<Response> {
  if (!(await mayEdit(id))) throw new HttpError(403, 'not your patch');
  const result = await env.DB.prepare('DELETE FROM gallery WHERE patch_id = ?').bind(id).run();
  if (!result.meta.changes) throw new HttpError(404, 'not in the gallery');
  return json({ published: false });
}

/** GET /api/gallery?sort=popular|top|new|examples|tutorials&q=&page= (R7, R8, R16): `q` matches
 * titles, block types and names, `@name` one person; sorts' formulas are in the queries below. */
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
  const query = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 40);
  const where = ['g.hidden = 0'],
    binds: unknown[] = [];
  if (kind) {
    where.push('g.kind = ?');
    binds.push(kind);
  }
  for (const word of query.split(/\s+/).filter(Boolean).slice(0, 4)) {
    if (word.startsWith('@')) {
      const handle = word.slice(1);
      where.push('u.handle = ?');
      binds.push(handle);
      continue;
    }
    where.push(
      "(lower(g.title) LIKE ? ESCAPE '\\' OR g.blocks LIKE ? ESCAPE '\\' OR u.handle LIKE ? ESCAPE '\\')",
    );
    const like = `%${word.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
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
        .map((row) => ({ ...row, liked: !!row.liked, mine: !!me && row.by === me.handle })),
      page,
      more: rows.length > PAGE,
      sort,
      q: query,
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
  const entry = await env.DB.prepare('SELECT likes FROM gallery WHERE patch_id = ?')
    .bind(id)
    .first<{ likes: number }>();
  return json({ liked: on !== false, likes: entry?.likes ?? 0 });
}

/** POST /api/gallery/:id/report {reason}: signed in, once each; hidden at REPORTS_TO_HIDE (R9),
 * except @blokdust's, whose reports wait for `bd gallery reports`. */
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
