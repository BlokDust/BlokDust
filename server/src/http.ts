import type { Env } from './env.ts';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: 'internal error' }, 500);
}

/** A path prefix without a trailing slash: "" or e.g. "/blokdust". */
export function prefix(v: string | undefined): string {
  const b = (v ?? '').trim().replace(/\/+$/, '');
  return b && !b.startsWith('/') ? `/${b}` : b;
}

/** Base path without a trailing slash: "" or "/blokdust". */
export const basePath = (env: Env) => prefix(env.BASE_PATH);

/** The web build's place in the asset store: "" or e.g. "/blokdust" (no trailing slash). */
export const assetBase = (env: Env) => prefix(env.ASSET_BASE);

/** The public URL prefix for links (SHARING-0004): PUBLIC_BASE_URL, else this request's origin + base path. */
export function publicBase(env: Env, req: Request): string {
  const configured = (env.PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return configured || new URL(req.url).origin + basePath(env);
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function b64urlBytes(n: number): string {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...d].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string compare (equal-length hex digests). */
export function sameDigest(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** 429 when this client (by IP) is over a per-minute limit. Without the binding (old config) nothing is limited. */
export async function limit(binding: RateLimit | undefined, req: Request, what: string): Promise<void> {
  if (!binding) return;
  const key = `${what}:${req.headers.get('cf-connecting-ip') ?? 'local'}`;
  const { success } = await binding.limit({ key });
  if (!success) throw new HttpError(429, 'too many requests; try again in a minute');
}
