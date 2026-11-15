// bd gallery — review the public gallery (SPEC-SHARING-GALLERY R9-R10): what was reported, and hide, keep or remove.
//   pnpm bd gallery reports  --env staging|production | --local <state dir name>
//   pnpm bd gallery hide <id> | keep <id> | remove <id>  (same --env / --local)
// hide: out of the gallery until kept. keep: reports cleared, shown again. remove: unpublished (the patch and its link
// stay; the owner can publish again). Uses wrangler's D1 commands (remote: the env's database through `wrangler login`).
import { resolve } from 'node:path';
import { WRANGLER, run } from '../server/lib.ts';
import { remoteConfig, type EnvName } from '../server/config.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const cmd = args[0], id = args[1];
const ID_RE = /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/;

function target(): string[] {
  const local = opt('--local'), env = opt('--env');
  if (local) return ['blokdust-dev', '--local', '--persist-to', resolve('.cache/server', local)];
  if (env !== 'staging' && env !== 'production') throw new Error('--env staging|production or --local <state> required');
  const e = env as EnvName;
  return [e === 'staging' ? 'blokdust-staging' : 'blokdust', '--remote', '--env', e, '--config', remoteConfig(e)];
}
async function sql<T>(command: string): Promise<T[]> {
  const r = await run([WRANGLER, 'd1', 'execute', ...target(), '--json', '--command', command], { quiet: true });
  if (r.code) throw new Error(`d1 execute failed:\n${r.out}`);
  const j = JSON.parse(r.out.slice(r.out.indexOf('['))) as { results: T[] }[];
  return j[0]?.results ?? [];
}

async function main(): Promise<void> {
  if (cmd === 'reports') {
    const rows = await sql(`SELECT g.patch_id AS id, g.title, u.handle AS by, g.reports, g.hidden,
      (SELECT group_concat(r.reason, ' | ') FROM reports r WHERE r.patch_id = g.patch_id) AS reasons
      FROM gallery g JOIN users u ON u.id = g.user_id WHERE g.reports > 0 OR g.hidden > 0 ORDER BY g.reports DESC LIMIT 200`);
    console.log(JSON.stringify({ reported: rows }, null, 2));
    return;
  }
  if (!id || !ID_RE.test(id)) throw new Error('usage: pnpm bd gallery hide|keep|remove <patch id> (--env … | --local …)');
  if (cmd === 'hide') await sql(`UPDATE gallery SET hidden = 2 WHERE patch_id = '${id}'`);
  else if (cmd === 'keep') await sql(`DELETE FROM reports WHERE patch_id = '${id}'; UPDATE gallery SET reports = 0, hidden = 0 WHERE patch_id = '${id}'`);
  else if (cmd === 'remove') await sql(`DELETE FROM gallery WHERE patch_id = '${id}'`);
  else throw new Error(`unknown command ${cmd}`);
  console.log(JSON.stringify({ [cmd]: id, done: true }));
}
main().catch(e => { console.error(String((e as Error).message ?? e)); process.exit(1); });
