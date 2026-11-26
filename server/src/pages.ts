// HTML pages with link previews (SHARING-0002, SPEC-SHARING-BACKEND R9–R11): index.html with Open
// Graph, twitter:card and oEmbed tags for `?c=<id>` and `/embed/<id>`, and the oEmbed endpoint.
import type { Env } from './env.ts';
import { HttpError, assetBase, basePath, escapeHtml, json, publicBase } from './http.ts';
import { ID_RE, loadPatch, type Loaded } from './patches.ts';
import { clientConfig } from './analytics.ts';

export const THUMB = { width: 1200, height: 630 } as const;
/** Default embed size (v1's stage is landscape; 16:10 like the review viewport). */
const EMBED = { width: 640, height: 400 } as const;

/** The site's name: BlokDust 2, apart from v1's old domain (R9a). */
const BRAND = 'BlokDust 2';
/** The app's own page title (R9a). */
const HOME_TITLE = `${BRAND} | Build instruments and self-playing music`;
const displayTitle = (loaded: Loaded | null) =>
  loaded?.title ? `${loaded.title} · ${BRAND}` : BRAND;
/** Link previews show og:site_name (BRAND), so the card title is the patch's own (R9). */
const cardTitle = (loaded: Loaded | null) => loaded?.title || BRAND;
/** The guide's default card (glossary/src/content/site.md `defaultImage`), from the site build. */
const HOME_IMAGE = {
  src: '/guide-media/guide.jpg',
  alt: 'A BlokDust patch with a laser splitting into three beams.',
  width: 1200,
  height: 630,
} as const;
const DESCRIPTION =
  'Build instruments, create sounds and make self-playing musical worlds by connecting blocks. ' +
  'Available on the web, standalone and as VST3, AU and AUv3 plugins.';

function tags(
  env: Env,
  req: Request,
  id: string | null,
  loaded: Loaded | null,
  embed: boolean,
): string {
  const base = publicBase(env, req);
  const title = cardTitle(loaded);
  const pageUrl = id
    ? `${base}/?c=${id}${loaded?.title ? `&t=${encodeURI(loaded.title)}` : ''}`
    : `${base}/`;
  const out: string[] = [
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(DESCRIPTION)}">`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
    `<meta name="description" content="${escapeHtml(DESCRIPTION)}">`,
  ];
  if (id && loaded) {
    const embedUrl = `${base}/embed/${id}`;
    if (loaded.hasThumb) {
      const img = `${base}/api/patches/${id}/thumb.png?rev=${loaded.rev}`;
      out.push(
        `<meta property="og:image" content="${escapeHtml(img)}">`,
        `<meta property="og:image:type" content="image/png">`,
        `<meta property="og:image:width" content="${THUMB.width}">`,
        `<meta property="og:image:height" content="${THUMB.height}">`,
        `<meta name="twitter:image" content="${escapeHtml(img)}">`,
      );
    }
    // X gates player cards (SHARING-0002): tried, not relied on; others use og:* or oEmbed.
    out.push(
      `<meta name="twitter:card" content="player">`,
      `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(DESCRIPTION)}">`,
      `<meta name="twitter:player" content="${escapeHtml(embedUrl)}">`,
      `<meta name="twitter:player:width" content="${EMBED.width}">`,
      `<meta name="twitter:player:height" content="${EMBED.height}">`,
      `<link rel="alternate" type="application/json+oembed" href="${escapeHtml(`${base}/oembed?url=${encodeURIComponent(pageUrl)}&format=json`)}" title="${escapeHtml(title)}">`,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
    );
  } else if (!id) {
    // The app's own page (R9a): one canonical URL for `/`, `/index.html` and any unknown
    // query, and the guide's cover picture as its card.
    const img = `${base}${HOME_IMAGE.src}`;
    out.push(
      `<link rel="canonical" href="${escapeHtml(`${base}/`)}">`,
      `<meta property="og:image" content="${escapeHtml(img)}">`,
      `<meta property="og:image:width" content="${HOME_IMAGE.width}">`,
      `<meta property="og:image:height" content="${HOME_IMAGE.height}">`,
      `<meta property="og:image:alt" content="${escapeHtml(HOME_IMAGE.alt)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:image" content="${escapeHtml(img)}">`,
    );
  } else {
    out.push(`<meta name="twitter:card" content="summary">`);
  }
  // The app reads these instead of re-fetching what the Worker already looked up.
  out.push(`<meta name="blokdust-base" content="${escapeHtml(base)}">`);
  if (embed && id) out.push(`<meta name="blokdust-embed" content="${escapeHtml(id)}">`);
  // Analytics and errors (SHARING-0010 R5, R9): the share of sessions sending (0: off), Sentry.
  const a = clientConfig(env);
  out.push(`<meta name="blokdust-analytics" content="${a.rate}">`);
  if (a.sentryDsn)
    out.push(
      `<meta name="blokdust-sentry" content="${escapeHtml(a.sentryDsn)}">`,
      `<meta name="blokdust-sentry-env" content="${escapeHtml(a.sentryEnv)}">`,
    );
  return out.join('\n    ');
}

/** `/`, `/index.html` (with or without `?c=`) and `/embed/<id>`: index.html plus preview tags. */
export async function page(
  env: Env,
  req: Request,
  url: URL,
  embedId: string | null,
): Promise<Response> {
  const shareId = embedId ?? url.searchParams.get('c');
  const id = shareId && ID_RE.test(shareId) ? shareId : null;
  const loaded = id ? await loadPatch(env, id) : null;
  if (embedId && !loaded)
    return new Response('No such BlokDust patch.', {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    });
  const assetUrl = new URL(`${url.origin}${assetBase(env)}/`);
  const asset = await env.ASSETS.fetch(new Request(assetUrl.toString(), { headers: req.headers }));
  if (!asset.ok) return asset;
  const head = tags(env, req, id, loaded, !!embedId);
  // Embed pages sit one level down (/embed/<id>) and assets are relative: pin the base.
  const baseTag = embedId ? `<base href="${escapeHtml(basePath(env))}/">\n    ` : '';
  const title = escapeHtml(embedId || loaded ? displayTitle(loaded) : HOME_TITLE);
  const rewritten = new HTMLRewriter()
    .on('head', {
      element(tag) {
        if (baseTag) tag.prepend(baseTag, { html: true });
        tag.append(`    ${head}\n  `, { html: true });
      },
    })
    .on('title', {
      element(tag) {
        tag.setInnerContent(title);
      },
    })
    .transform(asset);
  const headers = new Headers(rewritten.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-cache');
  // Embeds must be frameable anywhere; the app itself stays same-origin framed only.
  if (!embedId) headers.set('x-frame-options', 'SAMEORIGIN');
  return new Response(rewritten.body, { status: 200, headers });
}

/** GET /oembed?url=<share or embed URL>[&maxwidth&maxheight&format=json] (oembed.com §2.2). */
export async function oembed(env: Env, req: Request, url: URL): Promise<Response> {
  const format = url.searchParams.get('format') ?? 'json';
  if (format !== 'json') throw new HttpError(501, 'only json is supported');
  const target = url.searchParams.get('url');
  if (!target) throw new HttpError(400, 'url required');
  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    throw new HttpError(400, 'bad url');
  }
  const base = new URL(publicBase(env, req) + '/');
  if (targetUrl.host !== base.host) throw new HttpError(404, 'not a BlokDust URL');
  const rel = targetUrl.pathname.startsWith(base.pathname)
    ? targetUrl.pathname.slice(base.pathname.length - 1)
    : targetUrl.pathname;
  const id = /^\/embed\/([^/]+)\/?$/.exec(rel)?.[1] ?? targetUrl.searchParams.get('c');
  if (!id || !ID_RE.test(id)) throw new HttpError(404, 'not a BlokDust patch URL');
  const loaded = await loadPatch(env, id);
  if (!loaded) throw new HttpError(404, 'no such patch');
  const maxW = Number(url.searchParams.get('maxwidth')) || Infinity,
    maxH = Number(url.searchParams.get('maxheight')) || Infinity;
  const scale = Math.min(1, maxW / EMBED.width, maxH / EMBED.height);
  const width = Math.max(1, Math.floor(EMBED.width * scale)),
    height = Math.max(1, Math.floor(EMBED.height * scale));
  const root = publicBase(env, req);
  const src = `${root}/embed/${id}`;
  const body: Record<string, unknown> = {
    version: '1.0',
    type: 'rich',
    provider_name: BRAND,
    provider_url: `${root}/`,
    title: displayTitle(loaded),
    width,
    height,
    cache_age: 3600,
    html: `<iframe src="${escapeHtml(src)}" width="${width}" height="${height}" style="border:0" allow="autoplay; fullscreen; midi" allowfullscreen loading="lazy" title="${escapeHtml(displayTitle(loaded))}"></iframe>`,
  };
  if (loaded.hasThumb)
    Object.assign(body, {
      thumbnail_url: `${root}/api/patches/${id}/thumb.png?rev=${loaded.rev}`,
      thumbnail_width: THUMB.width,
      thumbnail_height: THUMB.height,
    });
  return json(body, 200, {
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=300',
  });
}
