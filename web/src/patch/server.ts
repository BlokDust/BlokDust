// Sharing backend client (CHG-0003, SPEC-SHARING-BACKEND): v1's SAVE / SAVE_AS against the Worker API.
// v1 kept a composition's SessionId (the right to overwrite it) in localStorage; v2 keeps the edit token the same way.
import type { Patch } from './loadPatch.ts';

/** Where the API lives: the Worker serving this page (relative to the page; embeds pin <base>). */
const api = (path: string) => new URL(`api/${path}`, document.baseURI).toString();
const TOKENS_KEY = 'blokdust2.editTokens';

export interface ServerConfig { turnstileSiteKey: string; saving: boolean; freesound: boolean }
let configPromise: Promise<ServerConfig | null> | null = null;
/** null when there is no backend (static hosting, the plugin, the Tailscale review build): sharing falls back to URLs. */
export function serverConfig(): Promise<ServerConfig | null> {
  configPromise ??= fetch(api('config'), { cache: 'no-store' })
    .then(r => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() as Promise<ServerConfig> : null))
    .catch(() => null);
  return configPromise;
}

/** Server share ids (never start with "p": Phase 1 `?c=p…` links carry the patch itself). */
export const isServerId = (c: string) => /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(c);

/** Whether a save left the patch in the gallery, and why not when it couldn't be (SPEC-SHARING-GALLERY R1). */
export interface GalleryState { published: boolean; reason?: string }
export interface Saved { id: string; rev: number; url: string; parent: string | null; gallery?: GalleryState }
export interface LoadedPatch { id: string; rev: number; title: string; parent: string | null; updated: number; patch: Patch;
  /** The signed-in account owns it (SPEC-SHARING-ACCOUNTS R9). */ mine?: boolean; /** Its account's handle. */ by?: string | null;
  /** Roughly how often it was opened (SPEC-SHARING-GALLERY R14), and whether it is in the gallery. */ views?: number; published?: boolean }

function tokens(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}') as Record<string, string>; } catch { return {}; }
}
/** v1 App.SessionId: the edit token for this composition, if this browser created it. */
export const editToken = (id: string | null): string | null => (id ? tokens()[id] ?? null : null);
/** Patches the signed-in account owns (SPEC-SHARING-ACCOUNTS R9): saved over from any device, without a token. */
export const accountOwned = new Set<string>();
/** This browser may save over `id`: it made it (edit token), or the signed-in account owns it. */
export const canOverwrite = (id: string | null): boolean => !!id && (!!editToken(id) || accountOwned.has(id));
/** Every edit token this browser holds (claimed by an account on sign-in, R9). */
export const allEditTokens = (): { id: string; token: string }[] => Object.entries(tokens()).map(([id, token]) => ({ id, token }));
function keepToken(id: string, token: string): void {
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...tokens(), [id]: token })); } catch { /* private mode: overwrite unavailable later */ }
}

// ---- Turnstile (invisible): one fresh token per save ----
interface TurnstileApi { render(el: HTMLElement, o: Record<string, unknown>): string; execute(id: string): void; reset(id: string): void; remove(id: string): void }
let turnstileLoad: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  turnstileLoad ??= new Promise((resolve, reject) => {
    const w = window as unknown as { turnstile?: TurnstileApi };
    if (w.turnstile) { resolve(w.turnstile); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => { turnstileLoad = null; reject(new Error('could not load the bot check')); };
    document.head.appendChild(s);
  });
  return turnstileLoad;
}
export async function turnstileToken(siteKey: string): Promise<string> {
  const t = await loadTurnstile();
  const host = document.createElement('div');
  // Invisible widget; if Cloudflare ever needs an interaction it shows its own small box here.
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:20';
  document.body.appendChild(host);
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('bot check timed out')), 60000);
      const id = t.render(host, {
        sitekey: siteKey, size: 'invisible', execution: 'execute', appearance: 'interaction-only',
        callback: (tok: string) => { clearTimeout(timer); resolve(tok); },
        'error-callback': () => { clearTimeout(timer); reject(new Error('bot check failed')); },
      });
      t.execute(id);
    });
  } finally { host.remove(); }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(api(path), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j as T;
}

export interface SaveInput { patch: Patch; title: string; thumb: string | null; /** In the gallery or not (undefined: leave it). */ gallery?: boolean }
/**
 * v1 SAVE (overwrite `id` when this browser holds its edit token) or SAVE_AS (a new id, `parent` = the patch it
 * came from). Returns null when the backend is unavailable, so the caller can fall back to a URL link.
 */
export async function save(mode: 'save' | 'saveAs', currentId: string | null, input: SaveInput): Promise<Saved | null> {
  const cfg = await serverConfig();
  if (!cfg?.saving) return null;
  const turnstile = await turnstileToken(cfg.turnstileSiteKey);
  const token = editToken(currentId);
  if (mode === 'save' && currentId && canOverwrite(currentId)) {
    try {
      return await call<Saved>('PUT', `patches/${currentId}`, { ...input, turnstile }, token);
    } catch (e) {
      if ((e as { status?: number }).status !== 403 && (e as { status?: number }).status !== 404) throw e;
      // Not ours any more (token lost or patch deleted): save as new, as v1 did when it had no SessionId.
    }
  }
  const fresh = mode === 'save' && currentId && canOverwrite(currentId) ? await turnstileToken(cfg.turnstileSiteKey) : turnstile;
  const r = await call<Saved & { editToken: string }>('POST', 'patches', { ...input, parent: currentId ?? undefined, turnstile: fresh });
  keepToken(r.id, r.editToken);
  return { id: r.id, rev: r.rev, url: r.url, parent: r.parent, gallery: r.gallery };
}

/** A shared patch by id (latest revision); null if it does not exist or there is no backend. */
export async function load(id: string): Promise<LoadedPatch | null> {
  try {
    const p = await call<LoadedPatch>('GET', `patches/${id}`);
    if (p.mine) accountOwned.add(id);
    return p;
  } catch { return null; }
}
