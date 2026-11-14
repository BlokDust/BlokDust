// bd privacy: scan tracked source or all reachable history; never print private values.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { inspect, type Finding } from './rules.ts';
import { requiredSetting } from '../lib/local-config.ts';

const git = (...args: string[]) => {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status) throw new Error('Git privacy inspection failed');
  return r.stdout;
};
const cmd = process.argv[2] ?? 'check';
if (cmd === 'selftest') {
  const r = spawnSync(process.execPath, ['--test', 'tools/privacy/privacy.test.ts'], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
if (cmd !== 'check' && cmd !== 'history') throw new Error('usage: pnpm bd privacy check | history | selftest');
const findings: Finding[] = [];
let checked = 0;
function scan(file: string, text: string) {
  checked++;
  if (text.includes('\0')) return;
  findings.push(...inspect(file, text));
  // Compare sensitive identifiers without committing a denylist of real values.
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'BLOKDUST_APPLE_TEAM_ID', 'BLOKDUST_WORKERS_SUBDOMAIN',
    'BLOKDUST_STAGING_DATABASE_ID', 'BLOKDUST_PRODUCTION_DATABASE_ID',
    'BLOKDUST_STAGING_TURNSTILE_SITE_KEY', 'BLOKDUST_PRODUCTION_TURNSTILE_SITE_KEY']) {
    let value: string; try { value = requiredSetting(key); } catch { continue; }
    if (value.length < 8) continue;
    for (const [i, line] of text.split('\n').entries()) if (line.includes(value)) findings.push({ file, line: i + 1, category: 'local-identifier' });
  }
}
if (cmd === 'check') {
  for (const file of git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean)) {
    if (/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|config\.env|LOCAL\.md|id_rsa|id_ed25519)$/.test(file)) {
      findings.push({ file, line: 1, category: 'private-file' });
    }
    if (existsSync(file) && statSync(file).isFile()) scan(file, readFileSync(file, 'utf8'));
  }
} else {
  for (const object of git('rev-list', '--objects', '--all').trim().split('\n')) {
    const space = object.indexOf(' ');
    if (space < 0) continue;
    const sha = object.slice(0, space), file = object.slice(space + 1);
    if (git('cat-file', '-t', sha).trim() === 'blob') scan(`${sha.slice(0, 12)}:${file}`, git('cat-file', 'blob', sha));
  }
  scan('commit-metadata', git('log', '--all', '--format=%an <%ae>%n%cn <%ce>%n%B'));
}
console.log(JSON.stringify({ checked, findings }));
if (findings.length) process.exitCode = 1;
