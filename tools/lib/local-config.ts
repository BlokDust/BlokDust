// SPEC-PROCESS-PRIVATE-OPERATIONAL-CONFIGURATION R1–R3: host settings never live in a checkout.
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

export const CONFIG_DIR = resolve(process.env.BLOKDUST_CONFIG_DIR || resolve(homedir(), '.config/blokdust'));
const repo = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
// Resolve existing ancestors too: an external symlink must not create a new directory inside the checkout.
let ancestor = CONFIG_DIR;
const missing: string[] = [];
while (!existsSync(ancestor)) { missing.unshift(basename(ancestor)); ancestor = dirname(ancestor); }
const actualDir = resolve(realpathSync(ancestor), ...missing);
const rel = relative(repo, actualDir);
if (!rel || (rel.split(sep)[0] !== '..' && !isAbsolute(rel))) {
  throw new Error('BLOKDUST_CONFIG_DIR must be outside the checkout');
}
const file = resolve(CONFIG_DIR, 'config.env');
const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
const allowed = (key: string) => /^BLOKDUST_[A-Z0-9_]+$/.test(key) || key === 'CLOUDFLARE_ACCOUNT_ID';
export const setting = (key: string, fallback = '') => process.env[key] ?? local[key] ?? fallback;
export function requiredSetting(key: string): string {
  const value = setting(key);
  if (!value.trim()) throw new Error(`Missing ${key}; set it in the external config.env or environment (see config.example.env)`);
  return value;
}
export function configEnvironment(): NodeJS.ProcessEnv {
  return { ...Object.fromEntries(Object.entries(local).filter(([key]) => allowed(key))), ...process.env };
}
export function saveSettings(values: Record<string, string>): void {
  if (Object.keys(values).some(key => !allowed(key))) throw new Error('Unsupported local setting');
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const current = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  writeFileSync(file, Object.entries({ ...current, ...values }).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
  chmodSync(file, 0o600);
}

// Shell entry points use this to inherit parsed dotenv values without `source`/`eval` or printing them.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--exec') {
  const [command, ...args] = process.argv.slice(3);
  if (!command) throw new Error('Expected a command after --exec');
  const child = spawnSync(command, args, { stdio: 'inherit', env: { ...configEnvironment(), BLOKDUST_CONFIG_LOADED: '1' } });
  process.exit(child.status ?? 1);
}
