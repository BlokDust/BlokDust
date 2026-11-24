// bd gallery — review the public gallery (SPEC-SHARING-GALLERY R9-R10): what was reported, and hide, keep or remove.
//   pnpm bd gallery reports  --env staging|production | --local <state dir name>
//   pnpm bd gallery hide <id> | keep <id> | remove <id>  (same --env / --local)
// hide: out of the gallery until kept. keep: reports cleared, shown again. remove: unpublished (the patch and its link
// stay; the owner can publish again). Uses wrangler's D1 commands (remote: the env's database through `wrangler login`).
//
// The site's own account, @blokdust (owner review 3, SPEC-SHARING-GALLERY R16): its patches are the EXAMPLES and
// TUTORIALS. Nobody can choose the name, so:
//   pnpm bd gallery presets  (--env … | --local …)   publish web/src/patch/presets/*.blokdust as @blokdust's EXAMPLES
//                                                     (makes the account, without sign-ins, if there is none; skips
//                                                     titles it already has)
//   pnpm bd gallery official <name>                  give account @<name>'s sign-ins and patches to @blokdust, so
//                                                     signing in that way is signing in as @blokdust (make a fresh
//                                                     account for it first: it is emptied and deleted)
//   pnpm bd gallery kind <id> example|tutorial|none  move one of @blokdust's patches between EXAMPLES and TUTORIALS
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { WRANGLER, run } from '../server/lib.ts';
import { remoteConfig, type EnvName } from '../server/config.ts';

const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const cmd = args[0],
  id = args[1];
const ID_RE = /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/;

function target(): string[] {
  const local = opt('--local'),
    env = opt('--env');
  if (local) return ['blokdust-dev', '--local', '--persist-to', resolve('.cache/server', local)];
  if (env !== 'staging' && env !== 'production')
    throw new Error('--env staging|production or --local <state> required');
  const e = env as EnvName;
  return [
    e === 'staging' ? 'blokdust-staging' : 'blokdust',
    '--remote',
    '--env',
    e,
    '--config',
    remoteConfig(e),
  ];
}
async function sql<T>(command: string): Promise<T[]> {
  // Long statements (whole patches) go through a file: a command line has a length limit.
  const file = resolve('.cache', `gallery-${process.pid}.sql`);
  if (command.length > 4000) writeFileSync(file, command);
  const r = await run(
    [
      WRANGLER,
      'd1',
      'execute',
      ...target(),
      '--json',
      ...(command.length > 4000 ? ['--file', file] : ['--command', command]),
    ],
    { quiet: true },
  );
  if (r.code) throw new Error(`d1 execute failed:\n${r.out}`);
  let j: { results?: T[] }[] = [];
  // The JSON starts on a line of its own: wrangler's warnings before it hold brackets too ("[WARNING]").
  try {
    j = JSON.parse(r.out.slice(r.out.search(/^\[/m)));
  } catch {
    /* a --file import answers without rows */
  }
  // Several statements: the last one's rows (the SELECT comes last).
  return (
    j
      .map((x) => x.results ?? [])
      .filter((x) => x.length)
      .pop() ?? []
  );
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** A share id as the Worker makes them (server/src/patches.ts newId). */
function newId(): string {
  const r = randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) {
    const c = ID_CHARS[r[i] % 62];
    s += i === 0 && c === 'p' ? 'P' : c;
  }
  return s;
}
const OFFICIAL = 'blokdust';
async function officialId(make: boolean): Promise<string | null> {
  const u = await sql<{ id: string }>(`SELECT id FROM users WHERE handle = ${q(OFFICIAL)}`);
  if (u[0]) return u[0].id;
  if (!make) return null;
  const id = `u_${randomBytes(12).toString('hex')}`;
  await sql(
    `INSERT INTO users (id, handle, created) VALUES (${q(id)}, ${q(OFFICIAL)}, ${Date.now()})`,
  );
  return id;
}

/** The built-in presets, as @blokdust's first EXAMPLES, in their file order (EXAMPLES lists oldest first). */
async function presets(): Promise<void> {
  const owner = (await officialId(true))!,
    dir = resolve('web/src/patch/presets');
  const have = new Set(
    (
      await sql<{ title: string }>(`SELECT g.title FROM gallery g WHERE g.user_id = ${q(owner)}`)
    ).map((r) => r.title),
  );
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.blokdust'))
    .sort();
  const added: { id: string; title: string }[] = [];
  let t = Date.now();
  for (const f of files) {
    const patch = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as {
      meta?: { title?: string };
      blocks?: { type?: string }[];
    };
    const title = patch.meta?.title ?? f.replace(/^\d+-|\.blokdust$/g, '');
    if (have.has(title)) continue;
    const id = newId(),
      json = JSON.stringify(patch),
      blocks = [...new Set((patch.blocks ?? []).map((b) => String(b.type ?? '')).filter(Boolean))]
        .sort()
        .join(' ');
    // No edit token can match this hash: the patch changes only by @blokdust saving over it, signed in.
    const editHash = randomBytes(32).toString('hex');
    t += 1;
    await sql(`INSERT INTO patches (id, title, parent, edit_hash, rev, created, updated, owner_id) VALUES (${q(id)}, ${q(title)}, NULL, ${q(editHash)}, 1, ${t}, ${t}, ${q(owner)});
      INSERT INTO revisions (patch_id, rev, json, title, created) VALUES (${q(id)}, 1, ${q(json)}, ${q(title)}, ${t});
      INSERT INTO gallery (patch_id, user_id, title, blocks, published, kind) VALUES (${q(id)}, ${q(owner)}, ${q(title)}, ${q(blocks)}, ${t}, 'example')`);
    added.push({ id, title });
  }
  console.log(
    JSON.stringify({ official: OFFICIAL, added, skipped: files.length - added.length }, null, 2),
  );
}

/** @<name>'s sign-ins and patches become @blokdust's; the emptied account is deleted. */
async function official(name: string): Promise<void> {
  const from = (
    await sql<{ id: string }>(
      `SELECT id FROM users WHERE handle = ${q(name.replace(/^@/, '').toLowerCase())}`,
    )
  )[0]?.id;
  if (!from) throw new Error(`no account @${name}`);
  const to = await officialId(false);
  if (!to) {
    await sql(`UPDATE users SET handle = ${q(OFFICIAL)} WHERE id = ${q(from)}`);
    console.log(JSON.stringify({ renamed: name, to: OFFICIAL }));
    return;
  }
  if (to === from) throw new Error(`@${name} is @${OFFICIAL}`);
  const [a, b] = [q(from), q(to)];
  await sql(`UPDATE credentials SET user_id = ${b} WHERE user_id = ${a};
    UPDATE identities SET user_id = ${b} WHERE user_id = ${a};
    UPDATE sessions SET user_id = ${b} WHERE user_id = ${a};
    UPDATE patches SET owner_id = ${b} WHERE owner_id = ${a};
    UPDATE gallery SET user_id = ${b}, kind = CASE kind WHEN '' THEN 'example' ELSE kind END WHERE user_id = ${a};
    INSERT OR IGNORE INTO likes (patch_id, user_id, created) SELECT patch_id, ${b}, created FROM likes WHERE user_id = ${a};
    INSERT OR IGNORE INTO reports (patch_id, user_id, reason, created) SELECT patch_id, ${b}, reason, created FROM reports WHERE user_id = ${a};
    DELETE FROM users WHERE id = ${a}`);
  console.log(JSON.stringify({ merged: name, into: OFFICIAL }));
}

async function main(): Promise<void> {
  if (cmd === 'presets') {
    await presets();
    return;
  }
  if (cmd === 'official') {
    if (!id) throw new Error('usage: pnpm bd gallery official <name> (--env … | --local …)');
    await official(id);
    return;
  }
  if (cmd === 'kind') {
    const k = args[2];
    if (!id || !ID_RE.test(id) || !['example', 'tutorial', 'none'].includes(k))
      throw new Error('usage: pnpm bd gallery kind <patch id> example|tutorial|none');
    const owner = await officialId(false);
    if (!owner) throw new Error(`there is no @${OFFICIAL} account yet`);
    await sql(
      `UPDATE gallery SET kind = ${q(k === 'none' ? '' : k)} WHERE patch_id = ${q(id)} AND user_id = ${q(owner)}`,
    );
    console.log(JSON.stringify({ kind: k, id }));
    return;
  }
  if (cmd === 'reports') {
    const rows = await sql(`SELECT g.patch_id AS id, g.title, u.handle AS by, g.reports, g.hidden,
      (SELECT group_concat(r.reason, ' | ') FROM reports r WHERE r.patch_id = g.patch_id) AS reasons
      FROM gallery g JOIN users u ON u.id = g.user_id WHERE g.reports > 0 OR g.hidden > 0 ORDER BY g.reports DESC LIMIT 200`);
    console.log(JSON.stringify({ reported: rows }, null, 2));
    return;
  }
  if (!id || !ID_RE.test(id))
    throw new Error('usage: pnpm bd gallery hide|keep|remove <patch id> (--env … | --local …)');
  if (cmd === 'hide') await sql(`UPDATE gallery SET hidden = 2 WHERE patch_id = '${id}'`);
  else if (cmd === 'keep')
    await sql(
      `DELETE FROM reports WHERE patch_id = '${id}'; UPDATE gallery SET reports = 0, hidden = 0 WHERE patch_id = '${id}'`,
    );
  else if (cmd === 'remove') await sql(`DELETE FROM gallery WHERE patch_id = '${id}'`);
  else throw new Error(`unknown command ${cmd}`);
  console.log(JSON.stringify({ [cmd]: id, done: true }));
}
main().catch((e) => {
  console.error(String((e as Error).message ?? e));
  process.exit(1);
});
