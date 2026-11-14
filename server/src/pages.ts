// HTML pages with link previews (SHARING-0002, SPEC-SHARING-BACKEND R9–R11): the app's index.html with Open Graph,
// twitter:card and oEmbed discovery tags inserted for `?c=<id>` and `/embed/<id>`, and the oEmbed endpoint itself.
import type { Env } from './env.ts';
import { HttpError, assetBase, basePath, escapeHtml, json, publicBase } from './http.ts';
import { ID_RE, loadPatch, type Loaded } from './patches.ts';

export const THUMB = { width: 1200, height: 630 } as const;
/** Default embed size (v1's stage is landscape; 16:10 like the review viewport). */
const EMBED = { width: 640, height: 400 } as const;

const displayTitle = (p: Loaded | null) => (p?.title ? `${p.title} · BlokDust` : 'BlokDust');
const DESCRIPTION = 'A BlokDust creation: a visual music playground. Press play to hear it in your browser.';

function tags(env: Env, req: Request, id: string | null, p: Loaded | null, embed: boolean): string {
  const base = publicBase(env, req);
  const title = displayTitle(p);
  const pageUrl = id ? `${base}/?c=${id}${p?.title ? `&t=${encodeURI(p.title)}` : ''}` : `${base}/`;
  const out: string[] = [
    `<meta property="og:site_name" content="BlokDust">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(DESCRIPTION)}">`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
    `<meta name="description" content="${escapeHtml(DESCRIPTION)}">`,
  ];
  if (id && p) {
    const embedUrl = `${base}/embed/${id}`;
    if (p.hasThumb) {
      const img = `${base}/api/patches/${id}/thumb.png?rev=${p.rev}`;
      out.push(`<meta property="og:image" content="${escapeHtml(img)}">`, `<meta property="og:image:type" content="image/png">`,
        `<meta property="og:image:width" content="${THUMB.width}">`, `<meta property="og:image:height" content="${THUMB.height}">`,
        `<meta name="twitter:image" content="${escapeHtml(img)}">`);
    }
    // X gates player cards (SHARING-0002): attempted, not relied on; other sites use og:* or oEmbed.
    out.push(`<meta name="twitter:card" content="player">`, `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(DESCRIPTION)}">`,
      `<meta name="twitter:player" content="${escapeHtml(embedUrl)}">`,
      `<meta name="twitter:player:width" content="${EMBED.width}">`, `<meta name="twitter:player:height" content="${EMBED.height}">`,
      `<link rel="alternate" type="application/json+oembed" href="${escapeHtml(`${base}/oembed?url=${encodeURIComponent(pageUrl)}&format=json`)}" title="${escapeHtml(title)}">`,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}">`);
  } else {
    out.push(`<meta name="twitter:card" content="summary">`);
  }
  // The app reads these instead of re-fetching what the Worker already looked up.
  out.push(`<meta name="blokdust-base" content="${escapeHtml(base)}">`);
  if (embed && id) out.push(`<meta name="blokdust-embed" content="${escapeHtml(id)}">`);
  return out.join('\n    ');
}

/** `/`, `/index.html` (with or without `?c=`) and `/embed/<id>`: index.html plus preview tags. */
export async function page(env: Env, req: Request, url: URL, embedId: string | null): Promise<Response> {
  const c = embedId ?? url.searchParams.get('c');
  const id = c && ID_RE.test(c) ? c : null;
  const p = id ? await loadPatch(env, id) : null;
  if (embedId && !p) return new Response('No such BlokDust patch.', { status: 404, headers: { 'content-type': 'text/plain' } });
  const assetUrl = new URL(`${url.origin}${assetBase(env)}/`);
  const asset = await env.ASSETS.fetch(new Request(assetUrl.toString(), { headers: req.headers }));
  if (!asset.ok) return asset;
  const head = tags(env, req, id, p, !!embedId);
  // Embed pages live one level down (/embed/<id>); the build uses relative asset URLs, so pin the base.
  const baseTag = embedId ? `<base href="${escapeHtml(basePath(env))}/">\n    ` : '';
  const title = escapeHtml(embedId || p ? displayTitle(p) : 'BlokDust');
  const rewritten = new HTMLRewriter()
    .on('head', { element(e) { if (baseTag) e.prepend(baseTag, { html: true }); e.append(`    ${head}\n  `, { html: true }); } })
    .on('title', { element(e) { e.setInnerContent(title); } })
    .transform(asset);
  const headers = new Headers(rewritten.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-cache');
  // Embeds must be frameable anywhere; the app itself stays same-origin framed only.
  if (!embedId) headers.set('x-frame-options', 'SAMEORIGIN');
  return new Response(rewritten.body, { status: 200, headers });
}

/** GET /oembed?url=<share or embed URL>[&maxwidth&maxheight&format=json] (oembed.com §2.2, type "rich"). */
export async function oembed(env: Env, req: Request, url: URL): Promise<Response> {
  const format = url.searchParams.get('format') ?? 'json';
  if (format !== 'json') throw new HttpError(501, 'only json is supported');
  const target = url.searchParams.get('url');
  if (!target) throw new HttpError(400, 'url required');
  let t: URL;
  try { t = new URL(target); } catch { throw new HttpError(400, 'bad url'); }
  const base = new URL(publicBase(env, req) + '/');
  if (t.host !== base.host) throw new HttpError(404, 'not a BlokDust URL');
  const rel = t.pathname.startsWith(base.pathname) ? t.pathname.slice(base.pathname.length - 1) : t.pathname;
  const id = rel.match(/^\/embed\/([^/]+)\/?$/)?.[1] ?? t.searchParams.get('c');
  if (!id || !ID_RE.test(id)) throw new HttpError(404, 'not a BlokDust patch URL');
  const p = await loadPatch(env, id);
  if (!p) throw new HttpError(404, 'no such patch');
  const maxW = Number(url.searchParams.get('maxwidth')) || Infinity, maxH = Number(url.searchParams.get('maxheight')) || Infinity;
  const scale = Math.min(1, maxW / EMBED.width, maxH / EMBED.height);
  const width = Math.max(1, Math.floor(EMBED.width * scale)), height = Math.max(1, Math.floor(EMBED.height * scale));
  const root = publicBase(env, req);
  const src = `${root}/embed/${id}`;
  const body: Record<string, unknown> = {
    version: '1.0', type: 'rich', provider_name: 'BlokDust', provider_url: `${root}/`, title: displayTitle(p),
    width, height, cache_age: 3600,
    html: `<iframe src="${escapeHtml(src)}" width="${width}" height="${height}" style="border:0" allow="autoplay; fullscreen; midi" allowfullscreen loading="lazy" title="${escapeHtml(displayTitle(p))}"></iframe>`,
  };
  if (p.hasThumb) Object.assign(body, { thumbnail_url: `${root}/api/patches/${id}/thumb.png?rev=${p.rev}`, thumbnail_width: THUMB.width, thumbnail_height: THUMB.height });
  return json(body, 200, { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' });
}
