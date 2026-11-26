// New accounts per network per day (SPEC-SHARING-ACCOUNTS R1b): checked before a passkey or account
// is made (no orphan passkey on the device), counted once the account exists.
import type { Env } from '../env.ts';
import { dailySalt } from '../analytics.ts';
import { HttpError, sha256Hex } from '../http.ts';

/** New accounts a network may make per UTC day (ACCOUNTS_PER_DAY; a school class shares one IP). */
export const DEFAULT_PER_DAY = 10;
export const LIMIT_MESSAGE = 'Cannot create any more new accounts today.';

const today = () => new Date().toISOString().slice(0, 10);
const perDay = (env: Env) => {
  const limit = Number(env.ACCOUNTS_PER_DAY);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_PER_DAY;
};
async function keyOf(env: Env, req: Request): Promise<string> {
  return sha256Hex(
    `${await dailySalt(env)}|accounts|${req.headers.get('cf-connecting-ip') ?? 'local'}`,
  );
}

/** Whether this network may make another account today. */
export async function mayCreateAccount(env: Env, req: Request): Promise<boolean> {
  const made = await env.DB.prepare('SELECT n FROM new_accounts WHERE key = ? AND day = ?')
    .bind(await keyOf(env, req), today())
    .first<number>('n');
  return (made ?? 0) < perDay(env);
}
export async function requireMayCreateAccount(env: Env, req: Request): Promise<void> {
  if (!(await mayCreateAccount(env, req))) throw new HttpError(429, LIMIT_MESSAGE);
}

/** The statement that counts one new account for this network (run in the account's own batch). */
export async function countNewAccount(env: Env, req: Request): Promise<D1PreparedStatement[]> {
  const day = today();
  return [
    env.DB.prepare('DELETE FROM new_accounts WHERE day < ?').bind(day),
    env.DB.prepare(
      'INSERT INTO new_accounts (key, day, n) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1',
    ).bind(await keyOf(env, req), day),
  ];
}
