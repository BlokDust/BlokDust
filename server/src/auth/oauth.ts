// What Google and Apple sign-in share (SPEC-SHARING-ACCOUNTS R2a, R2b): the return path, and signing in once the
// provider has confirmed who it is (a new account if this provider account is new here).
import type { Env } from '../env.ts';
import { publicBase } from '../http.ts';
import { cookie, currentUser, newUserId, startSession } from './session.ts';
import { countNewAccount, mayCreateAccount } from './newAccounts.ts';

/**
 * Where to go back to: a path on this site only (never another site: an open redirect). Checked the way the browser
 * and `new URL` will read it, not as text: the URL parser drops tabs and newlines and reads `\` as `/`, so
 * "/<TAB>/evil.example" is "//evil.example" (security review, PR 13).
 */
export function safeReturn(r: string | null): string {
  if (!r || !r.startsWith('/')) return '/';
  const probe = 'https://return.invalid';
  try {
    const u = new URL(r, probe);
    if (u.origin !== probe) return '/';
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path.length <= 512 ? path : '/';
  } catch {
    return '/';
  }
}

/**
 * Back from `provider` with its account `subject`. Signed out: sign in as the BlokDust account it belongs to, or a new
 * one. Signed in (Settings › ACCOUNT › SIGN-IN METHODS, R7a): add it to this account; if it already belongs to
 * another BlokDust account it is refused and nothing changes (R7b: never switch accounts behind the user's back).
 * The page learns what happened from `?account=`: new | in | limit | linked-<provider> | taken-<provider>.
 */
export async function finishSignIn(
  env: Env,
  req: Request,
  provider: 'google' | 'apple',
  subject: string,
  back: string | undefined,
): Promise<Response> {
  const now = Date.now();
  const owner = (
    await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND subject = ?')
      .bind(provider, subject)
      .first<{ user_id: string }>()
  )?.user_id;
  let asked = '/';
  try {
    asked = decodeURIComponent(back ?? '/');
  } catch {
    /* a mangled cookie: go home */
  }
  const target = new URL(safeReturn(asked), publicBase(env, req) + '/');
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(req, 'bd_oauth', '', 0));
  const go = (account: string) => {
    target.searchParams.set('account', account);
    headers.set('location', target.toString());
    return new Response(null, { status: 302, headers });
  };
  const me = await currentUser(env, req);
  if (me) {
    if (owner && owner !== me.id) return go(`taken-${provider}`);
    if (!owner)
      await env.DB.prepare(
        'INSERT INTO identities (provider, subject, user_id, created) VALUES (?, ?, ?, ?)',
      )
        .bind(provider, subject, me.id, now)
        .run();
    return go(owner ? 'in' : `linked-${provider}`); // the session already there stays
  }
  let userId = owner,
    fresh = false;
  if (!userId) {
    // R1b: no new account today from this network; the app says so in Settings › SIGN IN.
    if (!(await mayCreateAccount(env, req))) return go('limit');
    userId = newUserId();
    fresh = true;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id, handle, created) VALUES (?, NULL, ?)').bind(
        userId,
        now,
      ),
      ...(await countNewAccount(env, req)),
      env.DB.prepare(
        'INSERT INTO identities (provider, subject, user_id, created) VALUES (?, ?, ?, ?)',
      ).bind(provider, subject, userId, now),
    ]);
  }
  headers.append('set-cookie', await startSession(env, req, userId));
  return go(fresh ? 'new' : 'in'); // the app skips its start screen; a new account picks its name
}
