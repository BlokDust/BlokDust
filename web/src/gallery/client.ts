// The public gallery, browser side (SPEC-SHARING-GALLERY, SHARING-0009).
import { apiUrl } from '../patch/site.ts';
import { keyHeader } from '../account/appKey.ts';
const api = apiUrl;

export interface GalleryItem { id: string; title: string; by: string; likes: number; remixes: number; views: number; published: number; liked: boolean; mine: boolean }
export interface GalleryPage { items: GalleryItem[]; page: number; more: boolean }

async function call<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = body === undefined ? {} : { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  else Object.assign(headers, keyHeader());  // a signed-in plugin (SHARING-0011)
  const r = await fetch(api(path), { method, credentials: 'same-origin', headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(r.status === 401 ? 'Sign in first (Settings).' : j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j as T;
}

export type GallerySort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
export const browse = (sort: GallerySort, q: string, page: number) =>
  call<GalleryPage>('GET', `gallery?sort=${sort}&q=${encodeURIComponent(q)}&page=${page}`);
/** Out of the gallery: the owning account, or this browser's edit token (publishing itself is part of saving). */
export const unpublish = (id: string, token?: string | null) => call('DELETE', `gallery/${id}`, undefined, token);
export const like = (id: string, on: boolean) => call<{ liked: boolean; likes: number }>('POST', `gallery/${id}/like`, { on });
export const report = (id: string, reason = '') => call('POST', `gallery/${id}/report`, { reason });
