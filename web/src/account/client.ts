// Optional accounts, browser side (SPEC-SHARING-ACCOUNTS, SHARING-0008): passkeys through SimpleWebAuthn's browser
// helpers (loaded only when used), Google through a redirect, and the account's patches. The session is an HttpOnly
// cookie the page never sees.
import { accountOwned, allEditTokens, serverConfig, turnstileToken } from '../patch/server.ts';

const api = (path: string) => new URL(`api/${path}`, document.baseURI).toString();

export interface Account { id: string; handle: string | null; passkeys: number; providers: string[] }
export interface Me { user: Account | null; google: boolean }
export interface AccountPatch { id: string; title: string; rev: number; created: number; updated: number }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(api(path), { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j as T;
}

/** Who is signed in; null when there is no backend (static hosting, the plugin). */
export async function me(): Promise<Me | null> {
  try { return await call<Me>('GET', 'me'); } catch { return null; }
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

/** Sign in with Google (R2a): leaves the page and comes back here with `?account=in|new`. */
export function signInWithGoogle(): void {
  const back = location.pathname + location.search.replace(/([?&])account=[^&]*&?/, '$1').replace(/[?&]$/, '');
  location.assign(`${api('auth/google/start')}?return=${encodeURIComponent(back)}`);
}

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
