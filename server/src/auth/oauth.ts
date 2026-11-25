// What Google and Apple sign-in share (SPEC-SHARING-ACCOUNTS R2a, R2b): the return path, and
// signing in once the provider has confirmed who it is.
import type { Env } from '../env.ts';
import { publicBase } from '../http.ts';
import { cookie, currentUser, newUserId, startSession } from './session.ts';
import { countNewAccount, mayCreateAccount } from './newAccounts.ts';

/** The way back: a path on this site only (no open redirect), read as `new URL` does (tabs drop,
 * `\` is `/`: "/<TAB>/evil.example" is "//evil.example"; security review, PR 13). */
export function safeReturn(requested: string | null): string {
  if (!requested?.startsWith('/')) return '/';
  const probe = 'https://return.invalid';
  try {
    const url = new URL(requested, probe);
    if (url.origin !== probe) return '/';
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.length <= 512 ? path : '/';
  } catch {
    return '/';
  }
}

/** Back from `provider` with `subject`: signed out, sign in (or create); signed in, add it (R7a)
 * unless taken (R7b). `?account=`: new | in | limit | linked-<p> | taken-<p>. */
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
