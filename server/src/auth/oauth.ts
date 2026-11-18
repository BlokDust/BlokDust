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
  } catch { return '/'; }
}

/** Sign in as the account linked to `provider`'s `subject`, linking it to the signed-in account (or a new one) first. */
export async function finishSignIn(env: Env, req: Request, provider: 'google' | 'apple', subject: string, back: string | undefined): Promise<Response> {
  const now = Date.now();
  let userId = (await env.DB.prepare('SELECT user_id FROM identities WHERE provider = ? AND subject = ?').bind(provider, subject).first<{ user_id: string }>())?.user_id;
  let asked = '/';
  try { asked = decodeURIComponent(back ?? '/'); } catch { /* a mangled cookie: go home */ }
  const target = new URL(safeReturn(asked), publicBase(env, req) + '/');
  const headers = new Headers({ 'cache-control': 'no-store' });
  headers.append('set-cookie', cookie(req, 'bd_oauth', '', 0));
  let fresh = false;
  if (!userId) {
    const me = await currentUser(env, req);  // signed in already: add this provider to the account
    if (!me && !(await mayCreateAccount(env, req))) {
      // R1b: no new account today from this network; the app says so in Settings › SIGN IN.
      target.searchParams.set('account', 'limit');
      headers.set('location', target.toString());
      return new Response(null, { status: 302, headers });
    }
    userId = me?.id ?? newUserId();
    fresh = !me;
    await env.DB.batch([
      ...(fresh ? [env.DB.prepare('INSERT INTO users (id, handle, created) VALUES (?, NULL, ?)').bind(userId, now), ...await countNewAccount(env, req)] : []),
      env.DB.prepare('INSERT INTO identities (provider, subject, user_id, created) VALUES (?, ?, ?, ?)').bind(provider, subject, userId, now),
    ]);
  }
  target.searchParams.set('account', fresh ? 'new' : 'in');  // the app skips its start screen; a new account picks its name
  headers.set('location', target.toString());
  headers.append('set-cookie', await startSession(env, req, userId));
  return new Response(null, { status: 302, headers });
}
