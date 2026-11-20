// New accounts per network per day (SPEC-SHARING-ACCOUNTS R1b, CHG-0035; owner, 2026-11-17): one person could
// otherwise make account after account, e.g. to like their own patches. The bot check stops scripts; this stops
// repeats by hand. Checked before a passkey is made (so the device isn't left holding one for an account that never
// was) and before a Google or Apple account is made; counted once the account exists.
import type { Env } from '../env.ts';
import { dailySalt } from '../analytics.ts';
import { HttpError, sha256Hex } from '../http.ts';

/** New accounts a network may make in a UTC day (`ACCOUNTS_PER_DAY`; a school class shares one address). */
export const DEFAULT_PER_DAY = 10;
export const LIMIT_MESSAGE = 'Cannot create any more new accounts today.';

const today = () => new Date().toISOString().slice(0, 10);
const perDay = (env: Env) => { const n = Number(env.ACCOUNTS_PER_DAY); return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_PER_DAY; };
async function keyOf(env: Env, req: Request): Promise<string> {
  return sha256Hex(`${await dailySalt(env)}|accounts|${req.headers.get('cf-connecting-ip') ?? 'local'}`);
}

/** Whether this network may make another account today. */
export async function mayCreateAccount(env: Env, req: Request): Promise<boolean> {
  const n = await env.DB.prepare('SELECT n FROM new_accounts WHERE key = ? AND day = ?').bind(await keyOf(env, req), today()).first<number>('n');
  return (n ?? 0) < perDay(env);
}
export async function requireMayCreateAccount(env: Env, req: Request): Promise<void> {
  if (!(await mayCreateAccount(env, req))) throw new HttpError(429, LIMIT_MESSAGE);
}

/** The statement that counts one new account for this network (run in the account's own batch). */
export async function countNewAccount(env: Env, req: Request): Promise<D1PreparedStatement[]> {
  const day = today();
  return [
    env.DB.prepare('DELETE FROM new_accounts WHERE day < ?').bind(day),
    env.DB.prepare('INSERT INTO new_accounts (key, day, n) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1').bind(await keyOf(env, req), day),
  ];
}
