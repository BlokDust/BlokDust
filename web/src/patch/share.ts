// Phase 1 sharing without a server (CHG-0002 1.11): the patch itself travels in the URL as `?c=<token>`, the same
// parameter v1 used for its server composition ids, so Phase 2 can swap tokens for ids without changing the UI.
// Token = base64url(deflate-raw(JSON)), prefixed with "p" so server ids (Phase 2) can never be mistaken for one.
// Local autosave keeps the working patch across reloads (localStorage; samples are never stored, DATA-0005).
import type { Patch } from './loadPatch.ts';

const PREFIX = 'p';
const AUTOSAVE_KEY = 'blokdust2.autosave';
const SESSION_KEY = 'blokdust2.session';

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function encodePatch(patch: Patch): Promise<string> {
  return (
    PREFIX +
    b64url(
      await pipe(
        new TextEncoder().encode(JSON.stringify(patch)),
        new CompressionStream('deflate-raw'),
      ),
    )
  );
}

export async function decodePatch(token: string): Promise<Patch | null> {
  if (!token.startsWith(PREFIX)) return null;
  try {
    const json = new TextDecoder().decode(
      await pipe(unb64url(token.slice(PREFIX.length)), new DecompressionStream('deflate-raw')),
    );
    const p = JSON.parse(json);
    return p?.format === 'blokdust.patch' ? (p as Patch) : null;
  } catch {
    return null;
  }
}

/** The share URL v1's Share panel shows: this page + `?c=<token>` (+ `&t=Title` added by the panel). */
export async function shareUrlFor(patch: Patch): Promise<string> {
  return `${location.protocol}//${location.host}${location.pathname}?c=${await encodePatch(patch)}`;
}

export function saveLocal(patch: Patch): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(patch));
  } catch {
    /* private mode / quota: autosave is best effort */
  }
}
export function loadLocal(): Patch | null {
  try {
    const item = localStorage.getItem(AUTOSAVE_KEY);
    const p = item ? JSON.parse(item) : null;
    return p?.format === 'blokdust.patch' ? (p as Patch) : null;
  } catch {
    return null;
  }
}

/** Which saved composition the autosave belongs to, and whether it has unsaved edits (CHG-0003): reopening its
 * `?c=<id>` link then restores the edits instead of the saved version. */
export interface Session {
  id: string | null;
  dirty: boolean;
}
export function loadSession(): Session {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
    return session && typeof session === 'object'
      ? { id: typeof session.id === 'string' ? session.id : null, dirty: !!session.dirty }
      : { id: null, dirty: false };
  } catch {
    return { id: null, dirty: false };
  }
}
export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* best effort */
  }
}
