// An account's stats on Settings › ACCOUNT (SPEC-SHARING-ACCOUNTS R15, CHG-0027): numbers the database already has,
// read in one D1 batch when the tab asks for them (`GET /api/me?stats=1`), so the page costs no extra request.
import type { Env } from './env.ts';
import { allBlocks } from './gallery.ts';

/** A patch's block tally as kept in `patches.blocks`: "type:n" pairs, sorted by type; "-" for no blocks ('' is "not
 * counted yet": saved before migration 0006). */
export function blockTally(patch: unknown): string {
  const n = new Map<string, number>();
  for (const b of allBlocks(patch as Parameters<typeof allBlocks>[0])) {
    const t = typeof b.type === 'string' ? b.type : '';
    if (/^[a-z0-9.-]{1,40}$/.test(t)) n.set(t, (n.get(t) ?? 0) + 1);
  }
  return [...n].sort(([a], [b]) => a.localeCompare(b)).map(([t, c]) => `${t}:${c}`).join(' ') || '-';
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
  playMs: number; blocksAdded: number; particles: number; laserTurns: number;
  /** Up to 5 block types: in the most patches first, then the most of them. */
  favourites: { type: string; patches: number; count: number }[];
}

/** Patches saved before migration 0006 are counted when their owner first opens the tab, a few at a time. */
const BACKFILL = 25;
async function backfill(env: Env, userId: string): Promise<void> {
  const old = await env.DB.prepare(`SELECT p.id, r.json FROM patches p JOIN revisions r ON r.patch_id = p.id AND r.rev = p.rev
    WHERE p.owner_id = ? AND p.deleted = 0 AND p.blocks = '' LIMIT ${BACKFILL}`).bind(userId).all<{ id: string; json: string }>();
  if (!old.results.length) return;
  await env.DB.batch(old.results.map(r => {
    let tally = '-';
    try { tally = blockTally(JSON.parse(r.json)); } catch { /* unreadable: nothing to count */ }
    return env.DB.prepare('UPDATE patches SET blocks = ? WHERE id = ?').bind(tally, r.id);
  }));
}

export async function accountStats(env: Env, userId: string, since: number): Promise<Stats> {
  await backfill(env, userId);
  const q = (sql: string) => env.DB.prepare(sql).bind(userId);
  const [own, remixes, remixed, most, likes, tallies, totals] = await env.DB.batch([
    q('SELECT COUNT(*) AS n, COALESCE(SUM(views), 0) AS opens FROM patches WHERE owner_id = ? AND deleted = 0'),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE c.owner_id = ?1 AND c.deleted = 0 AND p.owner_id IS NOT ?1`).bind(userId),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE p.owner_id = ?1 AND p.deleted = 0 AND c.deleted = 0 AND c.owner_id IS NOT ?1`).bind(userId),
    env.DB.prepare(`SELECT p.id, p.title, COUNT(*) AS n FROM patches c JOIN patches p ON p.id = c.parent
      WHERE p.owner_id = ?1 AND p.deleted = 0 AND c.deleted = 0 AND c.owner_id IS NOT ?1
      GROUP BY p.id ORDER BY n DESC, p.updated DESC LIMIT 1`).bind(userId),
    q('SELECT COALESCE(SUM(likes), 0) AS n FROM gallery WHERE user_id = ?'),
    q("SELECT blocks FROM patches WHERE owner_id = ? AND deleted = 0 AND blocks NOT IN ('', '-') ORDER BY updated DESC LIMIT 500"),
    q('SELECT play_ms, blocks_added, particles, laser_turns FROM users WHERE id = ?'),
  ]);
  const first = <T>(r: D1Result) => r.results[0] as T | undefined;
  const t = first<{ play_ms: number; blocks_added: number; particles: number; laser_turns: number }>(totals);
  const fav = new Map<string, { patches: number; count: number }>();
  for (const { blocks } of tallies.results as { blocks: string }[]) for (const pair of blocks.split(' ')) {
    const [type, c] = pair.split(':'), f = fav.get(type) ?? { patches: 0, count: 0 };
    f.patches++; f.count += Number(c) || 0; fav.set(type, f);
  }
  const top = first<{ id: string; title: string; n: number }>(most);
  return {
    since,
    patches: first<{ n: number }>(own)?.n ?? 0,
    opens: first<{ opens: number }>(own)?.opens ?? 0,
    remixes: first<{ n: number }>(remixes)?.n ?? 0,
    remixed: first<{ n: number }>(remixed)?.n ?? 0,
    mostRemixed: top ? { id: top.id, title: top.title, n: top.n } : null,
    likes: first<{ n: number }>(likes)?.n ?? 0,
    playMs: t?.play_ms ?? 0, blocksAdded: t?.blocks_added ?? 0, particles: t?.particles ?? 0, laserTurns: t?.laser_turns ?? 0,
    favourites: [...fav].map(([type, f]) => ({ type, ...f }))
      .sort((a, b) => b.patches - a.patches || b.count - a.count || a.type.localeCompare(b.type)).slice(0, 5),
  };
}
