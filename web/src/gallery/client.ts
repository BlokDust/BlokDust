// The public gallery, browser side (SPEC-SHARING-GALLERY, SHARING-0009).
const api = (path: string) => new URL(`api/${path}`, document.baseURI).toString();

export interface GalleryItem { id: string; title: string; by: string; likes: number; remixes: number; published: number; liked: boolean; mine: boolean }
export interface GalleryPage { items: GalleryItem[]; page: number; more: boolean }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(api(path), { method, credentials: 'same-origin', headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw Object.assign(new Error(r.status === 401 ? 'Sign in on the ACCOUNT tab first.' : j.error ?? `HTTP ${r.status}`), { status: r.status });
  return j as T;
}

export const browse = (sort: 'popular' | 'new', q: string, page: number) =>
  call<GalleryPage>('GET', `gallery?sort=${sort}&q=${encodeURIComponent(q)}&page=${page}`);
export const publish = (id: string) => call('POST', `gallery/${id}`, {});
export const unpublish = (id: string) => call('DELETE', `gallery/${id}`);
export const like = (id: string, on: boolean) => call<{ liked: boolean; likes: number }>('POST', `gallery/${id}/like`, { on });
export const report = (id: string, reason = '') => call('POST', `gallery/${id}/report`, { reason });
