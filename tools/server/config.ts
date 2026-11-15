// SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R4: remote config is generated outside the checkout.
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { CONFIG_DIR, requiredSetting, setting } from '../lib/local-config.ts';

export type EnvName = 'staging' | 'production';
export const envKey = (env: EnvName, suffix: string) => `BLOKDUST_${env.toUpperCase()}_${suffix}`;
export const publicUrl = (env: EnvName) => requiredSetting(envKey(env, 'PUBLIC_URL'));
export const workerUrl = (env: EnvName) => `https://${env === 'staging' ? 'blokdust-staging' : 'blokdust'}.${requiredSetting('BLOKDUST_WORKERS_SUBDOMAIN')}.workers.dev`;

export function remoteConfig(env: EnvName): string {
  // The template uses standalone line comments only, so URLs inside strings remain untouched.
  const config = JSON.parse(readFileSync('server/wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const server = resolve('server');
  delete config.$schema;
  config.main = resolve(server, config.main);
  config.account_id = requiredSetting('CLOUDFLARE_ACCOUNT_ID');
  for (const c of [config, ...Object.values(config.env ?? {})] as any[]) {
    if (c.assets) c.assets.directory = resolve(server, c.assets.directory);
    for (const db of c.d1_databases ?? []) db.migrations_dir = resolve(server, db.migrations_dir);
  }
  const target = config.env[env];
  target.d1_databases[0].database_id = requiredSetting(envKey(env, 'DATABASE_ID'));
  target.vars.PUBLIC_BASE_URL = publicUrl(env);
  target.vars.TURNSTILE_SITE_KEY = requiredSetting(envKey(env, 'TURNSTILE_SITE_KEY'));
  // Sign in with Google (SPEC-SHARING-ACCOUNTS R2a): optional; the client secret is a Worker secret (`bd server secret`).
  const google = setting('BLOKDUST_GOOGLE_CLIENT_ID').trim();
  if (google) target.vars.GOOGLE_CLIENT_ID = google;
  // Avoid validating unrelated remote placeholders in the other environment.
  config.env = { [env]: target };
  const hash = createHash('sha256').update(server).digest('hex').slice(0, 16);
  const dir = resolve(CONFIG_DIR, 'generated', hash);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = resolve(dir, `wrangler.${env}.json`);
  // Esbuild discovers the entrypoint's tsconfig; Wrangler rebases an explicit tsconfig against its config directory.
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}
