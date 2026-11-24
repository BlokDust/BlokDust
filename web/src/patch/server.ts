// Sharing backend client (CHG-0003, SPEC-SHARING-BACKEND): v1's SAVE / SAVE_AS against the Worker API.
// v1 kept a composition's SessionId (the right to overwrite it) in localStorage; v2 keeps the edit token the same way.
import { apiUrl } from './site.ts';
import type { Patch } from './loadPatch.ts';
import { activity } from '../account/activity.ts';
import { appKey } from '../account/appKey.ts';

/** Where the API lives: the Worker serving this page (relative to the page; embeds pin <base>). */
const api = apiUrl;
const TOKENS_KEY = 'blokdust2.editTokens';

export interface ServerConfig {
  turnstileSiteKey: string;
  saving: boolean;
  freesound: boolean;
  /** SPEC-SHARING-ACCOUNTS R16: the page-close activity request is on (off: saves still carry it). */ activityBeacon?: boolean;
}
let configPromise: Promise<ServerConfig | null> | null = null;
/** null when there is no backend (static hosting, the plugin, the Tailscale review build): sharing falls back to URLs. */
export function serverConfig(): Promise<ServerConfig | null> {
  configPromise ??= fetch(api('config'), { cache: 'no-store' })
    .then((response) =>
      response.ok && (response.headers.get('content-type') ?? '').includes('json')
        ? (response.json() as Promise<ServerConfig>)
        : null,
    )
    .catch(() => null);
  return configPromise;
}

/** Server share ids (never start with "p": Phase 1 `?c=p…` links carry the patch itself). */
export const isServerId = (c: string) => /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(c);

/** Whether a save left the patch in the gallery, and why not when it couldn't be (SPEC-SHARING-GALLERY R1). */
export interface GalleryState {
  published: boolean;
  reason?: string;
}
export interface Saved {
  id: string;
  rev: number;
  url: string;
  parent: string | null;
  gallery?: GalleryState;
}
export interface LoadedPatch {
  id: string;
  rev: number;
  title: string;
  parent: string | null;
  updated: number;
  patch: Patch;
  /** The signed-in account owns it (SPEC-SHARING-ACCOUNTS R9). */ mine?: boolean;
  /** Its account's handle. */ by?: string | null;
  /** Roughly how often it was opened (SPEC-SHARING-GALLERY R14), and whether it is in the gallery. */ views?: number;
  published?: boolean;
  /** Its likes, and whether the signed-in user liked it. */ likes?: number;
  liked?: boolean;
}

function tokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
/** v1 App.SessionId: the edit token for this composition, if this browser created it. */
export const editToken = (id: string | null): string | null => (id ? (tokens()[id] ?? null) : null);
/** Patches the signed-in account owns (SPEC-SHARING-ACCOUNTS R9): saved over from any device, without a token. */
export const accountOwned = new Set<string>();
/** This browser may save over `id`: it made it (edit token), or the signed-in account owns it. */
export const canOverwrite = (id: string | null): boolean =>
  !!id && (!!editToken(id) || accountOwned.has(id));
/** Every edit token this browser holds (claimed by an account on sign-in, R9). */
export const allEditTokens = (): { id: string; token: string }[] =>
  Object.entries(tokens()).map(([id, token]) => ({ id, token }));
function keepToken(id: string, token: string): void {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...tokens(), [id]: token }));
  } catch {
    /* private mode: overwrite unavailable later */
  }
}

// ---- Turnstile (invisible): one fresh token per save ----
interface TurnstileApi {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
  remove(id: string): void;
}
let turnstileLoad: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  turnstileLoad ??= new Promise((resolve, reject) => {
    const w = window as unknown as { turnstile?: TurnstileApi };
    if (w.turnstile) {
      resolve(w.turnstile);
      return;
    }
    const hTMLScriptElement = document.createElement('script');
    hTMLScriptElement.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    hTMLScriptElement.async = true;
    hTMLScriptElement.onload = () => {
      w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile missing'));
    };
    hTMLScriptElement.onerror = () => {
      turnstileLoad = null;
      reject(new Error('could not load the bot check'));
    };
    document.head.appendChild(hTMLScriptElement);
  });
  return turnstileLoad;
}
export async function turnstileToken(siteKey: string): Promise<string> {
  const turnstileApi = await loadTurnstile();
  const host = document.createElement('div');
  // Invisible widget; if Cloudflare ever needs an interaction it shows its own small box here.
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:20';
  document.body.appendChild(host);
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('bot check timed out'));
      }, 60000);
      const id = turnstileApi.render(host, {
        sitekey: siteKey,
        size: 'invisible',
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (tok: string) => {
          clearTimeout(timer);
          resolve(tok);
        },
        'error-callback': () => {
          clearTimeout(timer);
          reject(new Error('bot check failed'));
        },
      });
      turnstileApi.execute(id);
    });
  } finally {
    host.remove();
  }
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  token ??= appKey(); // a signed-in plugin is its account (SHARING-0011)
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(api(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(j.error ?? `HTTP ${response.status}`), {
      status: response.status,
    });
  return j as T;
}

export interface SaveInput {
  patch: Patch;
  title: string;
  thumb: string | null;
  /** In the gallery or not (undefined: leave it). */ gallery?: boolean;
}
/**
 * v1 SAVE (overwrite `id` when this browser holds its edit token) or SAVE_AS (a new id, `parent` = the patch it
 * came from). Returns null when the backend is unavailable, so the caller can fall back to a URL link.
 */
export async function save(
  mode: 'save' | 'saveAs',
  currentId: string | null,
  input: SaveInput,
): Promise<Saved | null> {
  const cfg = await serverConfig();
  if (!cfg?.saving) return null;
  // A signed-in plugin saves with its key and no bot check (its page can't run Turnstile; SHARING-0011).
  const bot = () => (appKey() ? Promise.resolve(undefined) : turnstileToken(cfg.turnstileSiteKey));
  const turnstile = await bot();
  const token = editToken(currentId);
  // R16 of accounts: the running totals go with the save (added when signed in; otherwise they keep waiting here).
  const sending = activity.toSend(),
    credit = <T extends { activity?: boolean }>(r: T) => {
      if (r.activity && sending) activity.sent(sending);
      return r;
    };
  input = { ...input, ...(sending ? { activity: sending } : {}) };
  if (mode === 'save' && currentId && canOverwrite(currentId)) {
    try {
      return credit(
        await call<Saved & { activity?: boolean }>(
          'PUT',
          `patches/${currentId}`,
          { ...input, turnstile },
          token,
        ),
      );
    } catch (error) {
      if (
        (error as { status?: number }).status !== 403 &&
        (error as { status?: number }).status !== 404
      )
        throw error;
      // Not ours any more (token lost or patch deleted): save as new, as v1 did when it had no SessionId.
    }
  }
  const fresh = mode === 'save' && currentId && canOverwrite(currentId) ? await bot() : turnstile;
  const r = credit(
    await call<Saved & { editToken: string; activity?: boolean }>('POST', 'patches', {
      ...input,
      parent: currentId ?? undefined,
      turnstile: fresh,
    }),
  );
  keepToken(r.id, r.editToken);
  return { id: r.id, rev: r.rev, url: r.url, parent: r.parent, gallery: r.gallery };
}

/** Why a link opened no patch (owner, 2026-11-18): deleted by its creator, never a patch (or a malformed link), or the
 * server couldn't be reached. Shown in the message bar. */
export type Missing = 'deleted' | 'unknown' | 'offline';
export const MISSING_TEXT: Record<Missing, string> = {
  deleted: 'This patch has been deleted.',
  unknown: 'This link doesn’t lead to a patch. Check it was copied in full.',
  offline: 'This patch couldn’t be loaded. Check your connection and try again.',
};
/** A shared patch by id (latest revision), or why there is none. */
export async function loadOrWhy(id: string): Promise<LoadedPatch | { missing: Missing }> {
  try {
    const loadedPatch = await call<LoadedPatch>('GET', `patches/${id}`);
    if (loadedPatch.mine) accountOwned.add(id);
    return loadedPatch;
  } catch (error) {
    const status = (error as { status?: number }).status;
    return { missing: status === 410 ? 'deleted' : status === 404 ? 'unknown' : 'offline' };
  }
}
/** Delete one of the user's saved patches (the account owns it, or this browser holds its edit token): its link stops
 * opening it and it leaves the gallery (SPEC-SHARING-ACCOUNTS R8a). Already gone counts as done. */
export async function remove(id: string): Promise<void> {
  try {
    await call('DELETE', `patches/${id}`, undefined, editToken(id));
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
  }
  accountOwned.delete(id);
}
/** A shared patch by id (latest revision); null if it does not exist or there is no backend. */
export async function load(id: string): Promise<LoadedPatch | null> {
  const r = await loadOrWhy(id);
  return 'missing' in r ? null : r;
}
