// Optional accounts, browser side (SPEC-SHARING-ACCOUNTS, SHARING-0008): passkeys through SimpleWebAuthn's browser
// helpers (loaded only when used), Google through a redirect, and the account's patches. The session is an HttpOnly
// cookie the page never sees.
import { accountOwned, allEditTokens, serverConfig, turnstileToken } from '../patch/server.ts';
import { activity } from './activity.ts';

const api = (path: string) => new URL(`api/${path}`, document.baseURI).toString();

/** Settings › ACCOUNT's numbers (SPEC-SHARING-ACCOUNTS R15), from `GET /api/me?stats=1`. */
export interface AccountStats {
  since: number; patches: number; remixes: number; remixed: number; likes: number; opens: number;
  mostRemixed: { id: string; title: string; n: number } | null;
  favourites: { type: string; patches: number; count: number }[];
  /** R16: running totals the server has (this browser may have more waiting: see activity.ts). */
  playMs: number; blocksAdded: number; particles: number; laserTurns: number;
}
export interface Account { id: string; handle: string | null; passkeys: number; providers: string[]; stats?: AccountStats }
export interface Me { user: Account | null; google: boolean; apple?: boolean }
export interface AccountPatch { id: string; title: string; rev: number; created: number; updated: number }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(api(path), { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j as T;
}

/** Who is signed in; null when there is no backend (static hosting, the plugin). `stats`: with the account's stats
 * (R15), in the same request. */
export async function me(stats = false): Promise<Me | null> {
  try { return await call<Me>('GET', stats ? 'me?stats=1' : 'me'); } catch { return null; }
}

/** The passkey ceremony was cancelled by the user (closed the system dialog): not an error to show. */
export const cancelled = (e: unknown) => ['NotAllowedError', 'AbortError'].includes((e as Error).name) || /cancel|not allowed/i.test((e as Error).message ?? '');

/** A new account with a passkey (R1): the name, the bot check, then the device makes the passkey. */
export async function signUpWithPasskey(handle: string): Promise<Account> {
  const cfg = await serverConfig();
  if (!cfg?.saving) throw new Error('Accounts are not available here.');
  const { startRegistration } = await import('@simplewebauthn/browser');
  const optionsJSON = await call<Parameters<typeof startRegistration>[0]['optionsJSON']>('POST', 'auth/passkey/register/options', { handle, turnstile: await turnstileToken(cfg.turnstileSiteKey) });
  const response = await startRegistration({ optionsJSON });
  return (await call<{ user: Account }>('POST', 'auth/passkey/register/verify', { response })).user;
}

/** Another passkey for the signed-in account (e.g. this phone as well as that laptop). */
export async function addPasskey(): Promise<void> {
  const { startRegistration } = await import('@simplewebauthn/browser');
  const optionsJSON = await call<Parameters<typeof startRegistration>[0]['optionsJSON']>('POST', 'auth/passkey/register/options', {});
  await call('POST', 'auth/passkey/register/verify', { response: await startRegistration({ optionsJSON }) });
}

/** Sign in with a passkey this device has for this site (R2). */
export async function signInWithPasskey(): Promise<Account> {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  const optionsJSON = await call<Parameters<typeof startAuthentication>[0]['optionsJSON']>('POST', 'auth/passkey/login/options', {});
  const response = await startAuthentication({ optionsJSON });
  return (await call<{ user: Account }>('POST', 'auth/passkey/login/verify', { response })).user;
}

/** Sign in with Google (R2a) or Apple (R2b): leaves the page and comes back here with `?account=in|new`. */
export function signInWith(provider: 'google' | 'apple'): void {
  const back = location.pathname + location.search.replace(/([?&])account=[^&]*&?/, '$1').replace(/[?&]$/, '');
  location.assign(`${api(`auth/${provider}/start`)}?return=${encodeURIComponent(back)}`);
}
export const signInWithGoogle = () => signInWith('google');

export const signOut = (everywhere = false) => call('POST', 'auth/logout', { everywhere });
export const deleteAccount = () => call('DELETE', 'me');
export const setHandle = async (handle: string) => (await call<{ user: Account }>('PUT', 'me/handle', { handle })).user;

/** R9: the patches this browser made become the account's (90 per request: the server's limit). */
export async function claimMine(): Promise<string[]> {
  const all = allEditTokens(), claimed: string[] = [];
  for (let i = 0; i < all.length; i += 90) claimed.push(...(await call<{ claimed: string[] }>('POST', 'me/claim', { patches: all.slice(i, i + 90) })).claimed);
  for (const id of claimed) accountOwned.add(id);
  return claimed;
}

/** R8: the account's patches, newest first. */
export async function accountPatches(): Promise<AccountPatch[]> {
  const { patches } = await call<{ patches: AccountPatch[] }>('GET', 'me/patches');
  for (const p of patches) accountOwned.add(p.id);
  return patches;
}

/** R16: whether the server takes the page-close request (ACTIVITY_BEACON); known before the page closes. */
let beacon = false;
export function watchActivityBeacon(): void { void serverConfig().then(c => { beacon = !!c?.activityBeacon; }); }

/** R16: the page is closing; send what it counted, once, when signed in and the server takes it. Synchronous (a
 * pagehide handler), with keepalive so the request outlives the page. */
export function sendActivityOnClose(signedIn: boolean): void {
  if (!beacon || !signedIn) { activity.keep(); return; }
  const a = activity.toSend();
  if (!a) return;
  activity.sent(a);  // counted as sent now: the page may be gone before the answer (rather lose a little than count it twice)
  void fetch(api('me/activity'), { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(a) }).catch(() => {});
}
