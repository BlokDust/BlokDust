// The public gallery, browser side (SPEC-SHARING-GALLERY, SHARING-0009).
import { apiUrl } from '../patch/site.ts';
import { keyHeader } from '../account/appKey.ts';
const api = apiUrl;

export interface GalleryItem {
  id: string;
  title: string;
  by: string;
  likes: number;
  remixes: number;
  views: number;
  published: number;
  liked: boolean;
  mine: boolean;
}
export interface GalleryPage {
  items: GalleryItem[];
  page: number;
  more: boolean;
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> =
    body === undefined ? {} : { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  else Object.assign(headers, keyHeader()); // a signed-in plugin (SHARING-0011)
  const response = await fetch(api(path), {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok)
    throw Object.assign(
      new Error(
        response.status === 401
          ? 'Sign in first (Settings).'
          : (j.error ?? `HTTP ${response.status}`),
      ),
      { status: response.status },
    );
  return j as T;
}

export type GallerySort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
export const browse = (sort: GallerySort, query: string, page: number) =>
  call<GalleryPage>('GET', `gallery?sort=${sort}&q=${encodeURIComponent(query)}&page=${page}`);
/** Out of the gallery: the owning account, or this browser's edit token (publishing itself is part
 * of saving). */
export const unpublish = (id: string, token?: string | null) =>
  call('DELETE', `gallery/${id}`, undefined, token);
export const like = (id: string, on: boolean) =>
  call<{ liked: boolean; likes: number }>('POST', `gallery/${id}/like`, { on });
export const report = (id: string, reason = '') => call('POST', `gallery/${id}/report`, { reason });
