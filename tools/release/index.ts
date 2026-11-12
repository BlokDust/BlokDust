// bd release — publish the plugin installers (CHG-0005 task 12; owner 2026-11-11: served from downloads.funputs.com).
//   pnpm bd release check              the installers for package.json's version exist, match their .sha256, and the
//                                      macOS one is notarised (stapled ticket) — nothing is uploaded
//   pnpm bd release publish --dry-run  the same, plus where each file would go
//   pnpm bd release publish            upload to R2 `funputs-releases` at releases/blokdust/<version>/ (new files only:
//                                      refuses a version that is already there), check each URL serves the same bytes,
//                                      then write web/src/releases.json (commit it and deploy the site)
// Funputs' own files are untouched. Its download-analytics Worker counts these as product `blokdust`, per version
// (FUNPUTS PR "count BlokDust downloads"; the file names follow its <PRODUCT>-<version>-Mac|Windows pattern).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BUCKET = 'funputs-releases';
const BASE_URL = 'https://downloads.funputs.com';
const DIST = 'build/plugin-release/dist';
const WRANGLER = 'server/node_modules/.bin/wrangler';
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
const FILES = [
  { os: 'macos' as const, file: `BlokDust-${VERSION}-Mac.pkg`, type: 'application/octet-stream' },
  // Windows: the installer and README.txt in a zip (CHG-0010). Funputs' download-analytics Worker counts .exe/.msi and
  // BUNDLE zips only, so these downloads are not counted until it learns <PRODUCT>-<version>-Windows.zip.
  { os: 'windows' as const, file: `BlokDust-${VERSION}-Windows.zip`, type: 'application/zip' },
];
const key = (file: string) => `releases/blokdust/${VERSION}/${file}`;
const sha256 = (buf: Buffer | Uint8Array) => createHash('sha256').update(buf).digest('hex');

function check() {
  const problems: string[] = [];
  const files = FILES.map(f => {
    const path = join(DIST, f.file);
    if (!existsSync(path)) { problems.push(`${path} missing (bd ${f.os === 'macos' ? 'plugin' : 'win'} package)`); return { ...f, path, sha: '', bytes: 0 }; }
    const sha = sha256(readFileSync(path));
    const side = existsSync(`${path}.sha256`) ? readFileSync(`${path}.sha256`, 'utf8').split(/\s+/)[0] : '';
    if (side !== sha) problems.push(`${f.file}: .sha256 doesn't match the file`);
    return { ...f, path, sha, bytes: statSync(path).size };
  });
  const pkg = files.find(f => f.os === 'macos')!;
  if (existsSync(pkg.path) && spawnSync('xcrun', ['stapler', 'validate', pkg.path], { encoding: 'utf8' }).status !== 0)
    problems.push(`${pkg.file} is not notarised (no stapled ticket): bd plugin package`);
  return { files, problems };
}

async function publish(dryRun: boolean) {
  const { files, problems } = check();
  if (problems.length) { console.log(JSON.stringify({ version: VERSION, problems })); process.exit(1); }
  // Immutable: a published URL never changes. Publish a corrected build as a new version.
  for (const f of files) {
    const r = await fetch(`${BASE_URL}/${key(f.file)}`, { method: 'HEAD' });
    if (r.status !== 404) { console.log(JSON.stringify({ version: VERSION, problems: [`${key(f.file)} already exists (HTTP ${r.status}): bump the version`] })); process.exit(1); }
  }
  const plan = files.map(f => ({ file: f.file, key: `${BUCKET}/${key(f.file)}`, url: `${BASE_URL}/${key(f.file)}`, sha256: f.sha, bytes: f.bytes }));
  if (dryRun) { console.log(JSON.stringify({ version: VERSION, dryRun: true, plan })); return; }
  for (const f of files) for (const [path, name, type] of [[f.path, f.file, f.type], [`${f.path}.sha256`, `${f.file}.sha256`, 'text/plain']]) {
    const r = spawnSync(WRANGLER, ['r2', 'object', 'put', `${BUCKET}/${key(name)}`, '--file', path, '--content-type', type, '--remote'], { encoding: 'utf8', cwd: process.cwd() });
    if (r.status !== 0) throw new Error(`upload ${name}: ${r.stderr}`);
  }
  // What people will download is what was built.
  for (const p of plan) {
    const got = Buffer.from(await (await fetch(`${p.url}?source=release-check`)).arrayBuffer());
    if (sha256(got) !== p.sha256) throw new Error(`${p.url} serves different bytes`);
  }
  const manifest = { version: VERSION, published: new Date().toISOString().slice(0, 10),
    ...Object.fromEntries(files.map(f => [f.os, { file: f.file, url: `${BASE_URL}/${key(f.file)}`, sha256: f.sha, bytes: f.bytes }])) };
  writeFileSync('web/src/releases.json', `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ version: VERSION, published: plan, manifest: 'web/src/releases.json (commit it, then deploy the site)' }));
}

const cmd = process.argv[2];
if (cmd === 'check') { const c = check(); console.log(JSON.stringify({ version: VERSION, files: c.files.map(f => ({ file: f.file, bytes: f.bytes, sha256: f.sha })), problems: c.problems })); if (c.problems.length) process.exit(1); }
else if (cmd === 'publish') await publish(process.argv.includes('--dry-run'));
else { console.error('usage: bd release check | publish [--dry-run]'); process.exit(2); }
