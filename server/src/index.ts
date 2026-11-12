// BlokDust 2 Worker (SHARING-0001/0002/0004, SPEC-SHARING-BACKEND): serves the web build from static assets and the
// sharing API. Routes are relative to BASE_PATH so the app can live at `/` or under a prefix such as `/blokdust`.
import { submitSupport, expireSupport, supportHeaders } from './support.ts';
import type { Env } from './env.ts';
import { HttpError, assetBase, basePath, errorResponse, json, limit, prefix } from './http.ts';
import { createPatch, deletePatch, getPatch, getThumb, savePatch } from './patches.ts';
import { oembed, page } from './pages.ts';
import { search, sound } from './freesound.ts';

async function route(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const base = basePath(env);
  const m = req.method;
  const canonical = (env.PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '');
  // A former base path (SHARING-0006: funputs.com/blokdust, and staging's old …/blokdust/): its pages go to the same
  // page on the public site with a 302, so a landing page can replace the redirect later; its API answers in place.
  const legacy = prefix(env.LEGACY_BASE_PATH);
  if (legacy && legacy !== base && (url.pathname === legacy || url.pathname.startsWith(legacy + '/'))) {
    const rest = url.pathname.slice(legacy.length) || '/';
    if (rest.startsWith('/api/')) url.pathname = base + rest;
    else if (m === 'GET' || m === 'HEAD') return Response.redirect(`${canonical || url.origin + base}${rest === '/index.html' ? '/' : rest}${url.search}`, 302);
    else return new Response('Not found', { status: 404 });
  }
  // Pages on another host than the public one (production's workers.dev) go there, so links handed out before the
  // move, or by plugin builds, open on the public site (SHARING-0004/0006).
  if (canonical && (m === 'GET' || m === 'HEAD') && new URL(canonical).host !== url.host) {
    const p = base && url.pathname.startsWith(base + '/') ? url.pathname.slice(base.length) : url.pathname === base ? '/' : url.pathname;
    if (p === '/' || p === '/index.html' || p.startsWith('/embed/')) return Response.redirect(`${canonical}${p === '/index.html' ? '/' : p}${url.search}`, 301);
  }
  if (base && url.pathname === base) return Response.redirect(`${url.origin}${base}/${url.search}`, 301);
  if (base && !url.pathname.startsWith(base + '/')) {
    // Outside the base path (a local `based` env, or a deployment under a prefix). Links made before the
    // move (`/?c=…`, `/embed/…`) go to their place under it; the API stays answerable at the root too, for plugin
    // builds that call it there (CHG-0005 task 10).
    const p = url.pathname;
    if ((m === 'GET' || m === 'HEAD') && (p === '/' || p === '/index.html' || p.startsWith('/embed/') || p === '/oembed'))
      return Response.redirect(`${url.origin}${base}${p === '/index.html' ? '/' : p}${url.search}`, 301);
    if (!p.startsWith('/api/')) return new Response('Not found', { status: 404 });
  }
  const path = base && url.pathname.startsWith(base + '/') ? url.pathname.slice(base.length) : url.pathname;

  if (path === '/' || path === '/index.html') {
    if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'method not allowed');
    return page(env, req, url, null);
  }
  const embed = path.match(/^\/embed\/([^/]+)\/?$/);
  if (embed && m === 'GET') return page(env, req, url, embed[1]);
  if (path === '/oembed' && m === 'GET') return oembed(env, req, url);

  if (path === '/api/support' && m === 'OPTIONS') return new Response(null, { status: 204, headers: { ...supportHeaders, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
  if (path === '/api/support' && m === 'POST') return submitSupport(env, req);

  if (path === '/api/config' && m === 'GET')
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '', saving: !!env.TURNSTILE_SECRET, freesound: !!env.FREESOUND_TOKEN }, 200, { 'cache-control': 'no-cache' });
  if (path === '/api/patches' && m === 'POST') { await limit(env.SAVE_LIMIT, req, 'save'); return createPatch(env, req); }
  const thumb = path.match(/^\/api\/patches\/([^/]+)\/thumb\.png$/);
  if (thumb && m === 'GET') return getThumb(env, thumb[1], url.searchParams.get('rev'));
  const one = path.match(/^\/api\/patches\/([^/]+)$/);
  if (one) {
    if (m === 'GET') return getPatch(env, one[1]);
    if (m === 'PUT') { await limit(env.SAVE_LIMIT, req, 'save'); return savePatch(env, req, one[1]); }
    if (m === 'DELETE') return deletePatch(env, req, one[1]);
    throw new HttpError(405, 'method not allowed');
  }
  if (path.startsWith('/api/freesound/')) await limit(env.SEARCH_LIMIT, req, 'freesound');
  if (path === '/api/freesound/search' && m === 'GET') return search(env, url, ctx);
  const fs = path.match(/^\/api\/freesound\/sounds\/([^/]+)$/);
  if (fs && m === 'GET') return sound(env, fs[1], ctx);
  if (path.startsWith('/api/')) throw new HttpError(404, 'no such endpoint');

  // Everything else is the static build, which sits at ASSET_BASE in the asset store (at its root in local dev).
  const assetUrl = new URL(url);
  assetUrl.pathname = assetBase(env) + path;
  return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try { return await route(req, env, ctx); } catch (e) {
      const response = errorResponse(e);
      if (new URL(req.url).pathname.endsWith('/api/support')) for (const [k, v] of Object.entries(supportHeaders)) response.headers.set(k, v);
      return response;
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> { await expireSupport(env); },
} satisfies ExportedHandler<Env>;
