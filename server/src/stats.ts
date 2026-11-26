// An account's stats (SPEC-SHARING-ACCOUNTS R15, CHG-0027): numbers the database already has, read
// in one D1 batch when the tab asks (`GET /api/me?stats=1`), with no extra request.
import type { Env } from './env.ts';
import { allBlocks } from './gallery.ts';

/** A patch's block tally as kept in `patches.blocks`: "type:n" pairs, sorted by type; "-" for no
 * blocks ('' is "not counted yet": saved before migration 0006). */
export function blockTally(patch: unknown): string {
  const counts = new Map<string, number>();
  for (const b of allBlocks(patch as Parameters<typeof allBlocks>[0])) {
    const blockType = typeof b.type === 'string' ? b.type : '';
    if (/^[a-z0-9.-]{1,40}$/.test(blockType))
      counts.set(blockType, (counts.get(blockType) ?? 0) + 1);
  }
  return (
    [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(' ') || '-'
  );
}

export interface Stats {
  since: number;
  patches: number;
  /** The account's patches made from someone else's (SAVE AS on their patch: `parent`). */
  remixes: number;
  /** Times others made a patch from one of the account's. */
  remixed: number;
  /** The account's patch others remixed most, if any. */
  mostRemixed: { id: string; title: string; n: number } | null;
  likes: number;
  /** Times the account's patches were opened in the app (R14 of the gallery: rough). */
  opens: number;
  /** Running totals (R16): the browser's estimates. */
  playMs: number;
  blocksAdded: number;
  particles: number;
  laserTurns: number;
  /** Up to 6 block types (a row, or two of three on a phone): in the most patches, then most. */
  favourites: { type: string; patches: number; count: number }[];
}

/** Patches saved before migration 0006 count when their owner opens the tab, a few at once. */
const BACKFILL = 25;
async function backfill(env: Env, userId: string): Promise<void> {
  const old = await env.DB.prepare(
    `SELECT p.id, r.json FROM patches p JOIN revisions r ON r.patch_id = p.id AND r.rev = p.rev
    WHERE p.owner_id = ? AND p.deleted = 0 AND p.blocks = '' LIMIT ${BACKFILL}`,
  )
    .bind(userId)
    .all<{ id: string; json: string }>();
  if (!old.results.length) return;
  await env.DB.batch(
    old.results.map((result) => {
      let tally = '-';
      try {
        tally = blockTally(JSON.parse(result.json));
      } catch {
        /* unreadable: nothing to count */
      }
      return env.DB.prepare('UPDATE patches SET blocks = ? WHERE id = ?').bind(tally, result.id);
    }),
  );
}

export async function accountStats(env: Env, userId: string, since: number): Promise<Stats> {
  await backfill(env, userId);
  const query = (sql: string) => env.DB.prepare(sql).bind(userId);
  const [own, remixes, remixed, most, likes, tallies, totals] = await env.DB.batch([
    query(
      'SELECT COUNT(*) AS n, COALESCE(SUM(views), 0) AS opens FROM patches WHERE owner_id = ? AND deleted = 0',
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE c.owner_id = ?1 AND c.deleted = 0 AND p.owner_id IS NOT ?1`,
    ).bind(userId),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE p.owner_id = ?1 AND p.deleted = 0 AND c.deleted = 0 AND c.owner_id IS NOT ?1`,
    ).bind(userId),
    env.DB.prepare(
      `SELECT p.id, p.title, COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE p.owner_id = ?1 AND p.deleted = 0 AND c.deleted = 0 AND c.owner_id IS NOT ?1
      GROUP BY p.id ORDER BY n DESC, p.updated DESC LIMIT 1`,
    ).bind(userId),
    query('SELECT COALESCE(SUM(likes), 0) AS n FROM gallery WHERE user_id = ?'),
    query(
      "SELECT blocks FROM patches WHERE owner_id = ? AND deleted = 0 AND blocks NOT IN ('', '-') ORDER BY updated DESC LIMIT 500",
    ),
    query('SELECT play_ms, blocks_added, particles, laser_turns FROM users WHERE id = ?'),
  ]);
  const first = (result: D1Result) => result.results.at(0);
  const totalsRow = first(totals) as
    { play_ms: number; blocks_added: number; particles: number; laser_turns: number } | undefined;
  const fav = new Map<string, { patches: number; count: number }>();
  for (const { blocks } of tallies.results as { blocks: string }[])
    for (const pair of blocks.split(' ')) {
      const [type, value] = pair.split(':'),
        favourite = fav.get(type) ?? { patches: 0, count: 0 };
      favourite.patches++;
      favourite.count += Number(value) || 0;
      fav.set(type, favourite);
    }
  const top = first(most) as { id: string; title: string; n: number } | undefined;
  return {
    since,
    patches: (first(own) as { n: number } | undefined)?.n ?? 0,
    opens: (first(own) as { opens: number } | undefined)?.opens ?? 0,
    remixes: (first(remixes) as { n: number } | undefined)?.n ?? 0,
    remixed: (first(remixed) as { n: number } | undefined)?.n ?? 0,
    mostRemixed: top ? { id: top.id, title: top.title, n: top.n } : null,
    likes: (first(likes) as { n: number } | undefined)?.n ?? 0,
    playMs: totalsRow?.play_ms ?? 0,
    blocksAdded: totalsRow?.blocks_added ?? 0,
    particles: totalsRow?.particles ?? 0,
    laserTurns: totalsRow?.laser_turns ?? 0,
    favourites: [...fav]
      .map(([type, value]) => ({ type, ...value }))
      .sort((a, b) => b.patches - a.patches || b.count - a.count || a.type.localeCompare(b.type))
      .slice(0, 6), // a phone shows six (two rows of three)
  };
}
