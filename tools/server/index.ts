// bd server — the sharing backend (CHG-0003, SPEC-SHARING-BACKEND): Cloudflare Worker + D1 in server/.
//   pnpm bd server dev [--port 8787] [--real]      local Worker on web/dist (local D1 in .cache/server/dev). Default: test
//                                                   Turnstile keys; --real uses the Freesound key from ~/.config/blokdust
//   pnpm bd server setup --env staging|production  create the D1 database and the Turnstile widget (Cloudflare API via
//                                                   wrangler's login), save their ids outside the checkout, keep the
//                                                   Turnstile secret in ~/.config/blokdust (never in the repo)
//   pnpm bd server secret --env staging|production upload TURNSTILE_SECRET, FREESOUND_TOKEN and (if kept)
//                                                   GOOGLE_CLIENT_SECRET (~/.config/blokdust/google_client_secret)
//                                                   APPLE_PRIVATE_KEY (~/.config/blokdust/apple_private_key.p8)
//   pnpm bd server deploy --env staging|production [--no-build]  build web/dist, apply D1 migrations, deploy
//   pnpm bd server smoke --env staging|production | --url <base>  the sharing e2e suite against a deployed Worker
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { SERVER_DIR, WRANGLER, run, startLocal } from './lib.ts';
import { CONFIG_DIR, requiredSetting, saveSettings } from '../lib/local-config.ts';
import { envKey, publicUrl as siteUrl, workerUrl, remoteConfig, type EnvName } from './config.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const SECRETS = CONFIG_DIR;

function envName(): EnvName {
  const e = opt('--env');
  if (e !== 'staging' && e !== 'production') throw new Error('--env staging|production required');
  return e;
}
const workerName = (e: EnvName) => (e === 'staging' ? 'blokdust-staging' : 'blokdust');
const dbName = workerName;
const hostsOf = (e: EnvName) => [...new Set([new URL(workerUrl(e)).host, new URL(siteUrl(e)).host])];
const secretFile = (name: string) => join(SECRETS, name);
const readSecret = (name: string) => (existsSync(secretFile(name)) ? readFileSync(secretFile(name), 'utf8').trim() : '');

/** The OAuth token wrangler keeps after `wrangler login` (refreshed by running a wrangler command first). */
async function cfToken(): Promise<string> {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  await run([WRANGLER, 'whoami'], { quiet: true });
  const f = join(homedir(), 'Library/Preferences/.wrangler/config/default.toml');
  const t = existsSync(f) ? readFileSync(f, 'utf8').match(/oauth_token = "([^"]+)"/)?.[1] : undefined;
  if (!t) throw new Error('not logged in: run `npx wrangler login` in server/');
  return t;
}
async function cf<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${requiredSetting('CLOUDFLARE_ACCOUNT_ID')}${path}`, {
    method, headers: { authorization: `Bearer ${await cfToken()}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json() as { success: boolean; result: T; errors: unknown[] };
  if (!j.success) throw new Error(`${method} ${path}: ${JSON.stringify(j.errors)}`);
  return j.result;
}

async function setup(): Promise<void> {
  const e = envName();
  // D1
  const dbs = await cf<{ uuid: string; name: string }[]>('GET', '/d1/database?per_page=100');
  let db = dbs.find(d => d.name === dbName(e));
  if (!db) { db = await cf<{ uuid: string; name: string }>('POST', '/d1/database', { name: dbName(e) }); console.error(`created D1 ${db.name}`); }
  saveSettings({ [envKey(e, 'DATABASE_ID')]: db.uuid });
  // Turnstile (invisible), bound to the Worker's hostname
  const hosts = hostsOf(e);
  type Widget = { sitekey: string; name: string; secret?: string; domains: string[]; mode: string };
  const widgets = await cf<Widget[]>('GET', '/challenges/widgets?per_page=50');
  let w: Widget | undefined = widgets.find(x => x.name === workerName(e));
  if (!w) {
    w = await cf<Widget>('POST', '/challenges/widgets', { name: workerName(e), domains: hosts, mode: 'invisible' });
    console.error(`created Turnstile widget ${w.name} for ${hosts.join(', ')}`);
  } else if (hosts.some(h => !w!.domains.includes(h))) {
    // Add hosts, keep any already there.
    const domains = [...new Set([...w.domains, ...hosts])];
    w = { ...await cf<Widget>('PUT', `/challenges/widgets/${w.sitekey}`, { name: w.name, domains, mode: w.mode }), secret: undefined };
    console.error(`Turnstile widget ${w.name} now allows ${domains.join(', ')}`);
  }
  if (!w.secret && !readSecret(`turnstile_${e}`)) {
    w = { ...w, ...await cf<{ sitekey: string; secret: string; name: string }>('POST', `/challenges/widgets/${w.sitekey}/rotate_secret`, { invalidate_immediately: true }) };
    console.error(`rotated the Turnstile secret for ${w.name} (no local copy)`);
  }
  if (w.secret) writeFileSync(secretFile(`turnstile_${e}`), w.secret, { mode: 0o600 });
  saveSettings({ [envKey(e, 'TURNSTILE_SITE_KEY')]: w.sitekey });
  console.log(JSON.stringify({ env: e, configured: true }));
}

async function putSecret(e: EnvName, name: string, value: string): Promise<void> {
  if (!value) throw new Error(`no value for ${name} (run setup, or add ${SECRETS}/…)`);
  const { spawn } = await import('node:child_process');
  await new Promise<void>((res, rej) => {
    const p = spawn(WRANGLER, ['secret', 'put', name, '--env', e, '--config', remoteConfig(e)], { cwd: SERVER_DIR, stdio: ['pipe', 'inherit', 'inherit'] });
    p.stdin.end(value);
    p.on('close', c => (c ? rej(new Error(`wrangler secret put ${name} failed`)) : res()));
  });
}

async function secret(): Promise<void> {
  const e = envName();
  await putSecret(e, 'TURNSTILE_SECRET', readSecret(`turnstile_${e}`));
  await putSecret(e, 'FREESOUND_TOKEN', readSecret('freesound_token'));
  const secrets = ['TURNSTILE_SECRET', 'FREESOUND_TOKEN'];
  // Sign in with Google (SPEC-SHARING-ACCOUNTS R2a), when its client secret is kept here.
  const google = readSecret('google_client_secret');
  if (google) { await putSecret(e, 'GOOGLE_CLIENT_SECRET', google); secrets.push('GOOGLE_CLIENT_SECRET'); }
  // Sign in with Apple (R2b): the .p8 key from Apple, kept as apple_private_key.p8.
  const apple = readSecret('apple_private_key.p8');
  if (apple) { await putSecret(e, 'APPLE_PRIVATE_KEY', apple); secrets.push('APPLE_PRIVATE_KEY'); }
  console.log(JSON.stringify({ env: e, secrets }));
}

async function deploy(): Promise<void> {
  const e = envName();
  const config = remoteConfig(e);
  if (!args.includes('--no-build')) {
    const b = await run(['pnpm', 'web:build'], { cwd: process.cwd() });
    if (b.code) throw new Error('web build failed');
  }
  // Cloudflare's D1 API sometimes fails a request transiently (seen 2026-11-07): retry before giving up.
  let m = { code: 1, out: '' };
  for (let i = 0; i < 4 && m.code; i++) {
    if (i) { console.error(`migrations failed; retrying (${i}/3)`); await new Promise(r => setTimeout(r, 3000 * i)); }
    m = await run([WRANGLER, 'd1', 'migrations', 'apply', dbName(e), '--remote', '--env', e, '--config', config]);
  }
  if (m.code) throw new Error('migrations failed');
  const d = await run([WRANGLER, 'deploy', '--env', e, '--config', config]);
  if (d.code) throw new Error('deploy failed');
  console.log(JSON.stringify({ env: e, deployed: true }));
}

async function dev(): Promise<void> {
  const real = args.includes('--real');
  const vars: Record<string, string> = real
    ? { TURNSTILE_SECRET: '1x0000000000000000000000000000000AA', FREESOUND_TOKEN: readSecret('freesound_token') }
    : { TURNSTILE_SECRET: '1x0000000000000000000000000000000AA' };
  const s = await startLocal({ name: 'dev', vars, port: Number(opt('--port') ?? 8787), fresh: false });
  console.error(`BlokDust Worker on ${s.url} (Ctrl-C to stop)${real ? '' : ' — Freesound off; add --real to use the key'}`);
  await new Promise<void>(r => process.on('SIGINT', () => r()));
  await s.stop();
}

async function smoke(): Promise<void> {
  const url = opt('--url') ?? siteUrl(envName());
  const r = await run(['node', 'tests/e2e/sharing.ts', '--remote', url], { cwd: process.cwd() });
  process.exitCode = r.code;
}

const commands: Record<string, () => Promise<void>> = { dev, setup, secret, deploy, smoke, config: async () => { remoteConfig(envName()); console.log(JSON.stringify({ configured: true })); } };
if (!commands[cmd]) { console.error('usage: pnpm bd server dev|setup|secret|deploy|smoke|config'); process.exit(2); }
commands[cmd]().catch(err => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
