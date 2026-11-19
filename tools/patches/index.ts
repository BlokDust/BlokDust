// bd patches — rewrite stored patches whose block settings changed shape (migrate.ts; CHG-0040: Random Note and Chord).
//   pnpm bd patches migrate --files <file …>                      patch files: a patch, or a golden fixture's "patch"
//   pnpm bd patches migrate --env staging|production [--dry-run]  every revision in that env's D1
//   pnpm bd patches migrate --local <state> [--dry-run]           a local test state (.cache/server/<state>)
// D1: exports the database to .cache/backups/ first, then updates each changed revision in place.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WRANGLER, run } from '../server/lib.ts';
import { remoteConfig, type EnvName } from '../server/config.ts';
import { migratePatch } from './migrate.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const dry = args.includes('--dry-run');

function target(): { db: string[]; name: string } {
  const local = opt('--local'), env = opt('--env');
  if (local) return { db: ['blokdust-dev', '--local', '--persist-to', resolve('.cache/server', local)], name: `local-${local}` };
  if (env !== 'staging' && env !== 'production') throw new Error('--files, --env staging|production or --local <state> required');
  const e = env as EnvName;
  return { db: [e === 'staging' ? 'blokdust-staging' : 'blokdust', '--remote', '--env', e, '--config', remoteConfig(e)], name: e };
}
async function sql<T>(db: string[], command: string): Promise<T[]> {
  const file = resolve('.cache', `patches-${process.pid}.sql`);
  const long = command.length > 4000;
  if (long) writeFileSync(file, command);
  const r = await run([WRANGLER, 'd1', 'execute', ...db, '--json', ...(long ? ['--file', file] : ['--command', command])], { quiet: true });
  if (r.code) throw new Error(`d1 execute failed:\n${r.out}`);
  // The JSON starts on a line of its own (wrangler's warnings before it can contain brackets too).
  const at = r.out.search(/^\[/m);
  let j: { results?: T[] }[] = [];
  if (at >= 0) j = JSON.parse(r.out.slice(at));
  else if (!long) throw new Error(`d1 execute answered without JSON:\n${r.out}`);
  return j.map(x => x.results ?? []).filter(x => x.length).pop() ?? [];
}
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;

async function migrateD1(): Promise<unknown> {
  const { db, name } = target();
  let backup: string | null = null;
  if (!dry) {
    mkdirSync(resolve('.cache/backups'), { recursive: true });
    backup = resolve('.cache/backups', `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
    const r = await run([WRANGLER, 'd1', 'export', ...db, '--output', backup], { quiet: true });
    if (r.code) throw new Error(`d1 export failed (nothing changed):\n${r.out}`);
  }
  const rows = await sql<{ patch_id: string; rev: number; json: string }>(db,
    `SELECT patch_id, rev, json FROM revisions WHERE json LIKE '%"fx.chord"%' OR json LIKE '%"fx.random-note"%'`);
  const changed: { id: string; rev: number; blocks: number }[] = [];
  for (const r of rows) {
    let patch: Parameters<typeof migratePatch>[0];
    try { patch = JSON.parse(r.json); } catch { continue; }
    const n = migratePatch(patch);
    if (!n) continue;
    changed.push({ id: r.patch_id, rev: r.rev, blocks: n });
    if (!dry) await sql(db, `UPDATE revisions SET json = ${q(JSON.stringify(patch))} WHERE patch_id = ${q(r.patch_id)} AND rev = ${r.rev}`);
  }
  return { env: name, dryRun: dry, backup, revisions: rows.length, changed };
}

function migrateFiles(files: string[]): unknown {
  const out: { file: string; blocks: number }[] = [];
  for (const f of files) {
    const o = JSON.parse(readFileSync(f, 'utf8'));
    const patch = o.format === 'blokdust.patch' ? o : o.patch;
    const n = patch ? migratePatch(patch) : 0;
    if (n && !dry) writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
    out.push({ file: f, blocks: n });
  }
  return { dryRun: dry, files: out };
}

if (args[0] !== 'migrate') { console.error('usage: pnpm bd patches migrate --files <file …> | --env staging|production | --local <state> [--dry-run]'); process.exit(2); }
const i = args.indexOf('--files');
const result = i >= 0 ? migrateFiles(args.slice(i + 1).filter(a => !a.startsWith('--'))) : await migrateD1();
console.log(JSON.stringify(result, null, 2));
