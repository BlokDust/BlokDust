// Local Worker for development and tests: `wrangler dev` (workerd + local D1) serving web/dist and the sharing API.
import { spawn, type ChildProcess } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';

export const SERVER_DIR = resolve('server');
export const WRANGLER = join(SERVER_DIR, 'node_modules/.bin/wrangler');

export async function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

export function run(args: string[], opts: { cwd?: string; quiet?: boolean; env?: NodeJS.ProcessEnv } = {}): Promise<{ code: number; out: string }> {
  return new Promise(res => {
    const p = spawn(args[0], args.slice(1), { cwd: opts.cwd ?? SERVER_DIR, env: { ...process.env, ...opts.env, WRANGLER_SEND_METRICS: 'false' } });
    let out = '';
    p.stdout.on('data', d => { out += d; if (!opts.quiet) process.stderr.write(d); });
    p.stderr.on('data', d => { out += d; if (!opts.quiet) process.stderr.write(d); });
    p.on('close', code => res({ code: code ?? 1, out }));
  });
}

/** The base path of the local `based` env (SHARING-0004 tests; deployed envs serve web/dist at the root, SHARING-0006). */
export const SITE_BASE = 'blokdust';
/** Copy web/dist to .cache/server/site/<SITE_BASE>/: the asset store of the `based` env. */
export function buildSite(): void {
  if (!existsSync('web/dist/index.html')) throw new Error('web/dist missing: run `pnpm web:build`');
  const root = resolve('.cache/server/site');
  rmSync(root, { recursive: true, force: true });
  cpSync('web/dist', join(root, SITE_BASE), { recursive: true });
}

export interface LocalServer { url: string; stop(): Promise<void>; log(): string }

/**
 * Start the Worker locally. `vars` become an env file (mode 600, never in the repo): secrets such as
 * TURNSTILE_SECRET / FREESOUND_TOKEN and test overrides (TURNSTILE_VERIFY_URL, FREESOUND_API).
 */
export async function startLocal(opts: { name: string; vars: Record<string, string>; port?: number; fresh?: boolean; env?: string }): Promise<LocalServer> {
  if (!existsSync('web/dist/index.html')) throw new Error('web/dist missing: run `pnpm web:build`');
  const state = resolve('.cache/server', opts.name);
  if (opts.fresh !== false) rmSync(state, { recursive: true, force: true });
  mkdirSync(state, { recursive: true });
  const envFile = join(state, 'dev.env');
  writeFileSync(envFile, Object.entries(opts.vars).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join('\n') + '\n');
  chmodSync(envFile, 0o600);
  const envArgs = opts.env ? ['--env', opts.env] : [];
  if (opts.env) buildSite();
  const mig = await run([WRANGLER, 'd1', 'migrations', 'apply', 'blokdust-dev', '--local', '--persist-to', state, ...envArgs], { quiet: true });
  if (mig.code) throw new Error(`migrations failed:\n${mig.out}`);
  const supportMig = await run([WRANGLER, 'd1', 'migrations', 'apply', 'blokdust-support-dev', '--local', '--persist-to', state, ...envArgs], { quiet: true });
  if (supportMig.code) throw new Error(`support migrations failed:\n${supportMig.out}`);
  const port = opts.port ?? await freePort();
  let log = '';
  const child: ChildProcess = spawn(WRANGLER, ['dev', ...envArgs, '--port', String(port), '--ip', '127.0.0.1', '--persist-to', state, '--env-file', envFile,
    '--test-scheduled', '--show-interactive-dev-session=false', '--log-level', 'warn'], { cwd: SERVER_DIR, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  child.stdout?.on('data', d => (log += d));
  child.stderr?.on('data', d => (log += d));
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60000;
  for (;;) {
    try { const r = await fetch(`${url}/api/config`); if (r.ok) break; } catch { /* starting */ }
    if (child.exitCode !== null || Date.now() > deadline) { child.kill(); throw new Error(`wrangler dev did not start:\n${log}`); }
    await new Promise(r => setTimeout(r, 250));
  }
  return {
    url, log: () => log,
    stop: () => new Promise(r => { if (child.exitCode !== null) return r(); child.once('exit', () => r()); child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 5000); }),
  };
}
