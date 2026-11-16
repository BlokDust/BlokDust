// BlokDust 2 Worker (SHARING-0001/0002/0004, SPEC-SHARING-BACKEND): serves the web build from static assets and the
// sharing API. Routes are relative to BASE_PATH so the app can live at `/` or under a prefix such as `/blokdust`.
import type { Env } from './env.ts';
import { beaconOn } from './activity.ts';
import { HttpError, assetBase, basePath, errorResponse, json, limit, prefix } from './http.ts';
import { createPatch, deletePatch, getPatch, getThumb, mayEdit, savePatch } from './patches.ts';
import { oembed, page } from './pages.ts';
import { search, sound } from './freesound.ts';
import { claim, deleteAccount, logout, me, myPatches, postActivity, setHandle } from './auth/account.ts';
import { googleCallback, googleStart } from './auth/google.ts';
import { appleCallback, appleStart } from './auth/apple.ts';
import { loginOptions, loginVerify, registerOptions, registerVerify } from './auth/passkey.ts';
import { sameOrigin } from './auth/session.ts';
import { like, list as galleryList, report, unpublish } from './gallery.ts';
import { clientConfig, ingest, record } from './analytics.ts';
import { admin } from './admin.ts';

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
    if (!p.startsWith('/api/') && !p.startsWith('/admin/')) return new Response('Not found', { status: 404 });
  }
  const path = base && url.pathname.startsWith(base + '/') ? url.pathname.slice(base.length) : url.pathname;

  if (path === '/' || path === '/index.html') {
    if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'method not allowed');
    return page(env, req, url, null);
  }
  const embed = path.match(/^\/embed\/([^/]+)\/?$/);
  if (embed && m === 'GET') return page(env, req, url, embed[1]);
  if (path === '/oembed' && m === 'GET') return oembed(env, req, url);

  if (path === '/api/config' && m === 'GET')
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '', saving: !!env.TURNSTILE_SECRET, freesound: !!env.FREESOUND_TOKEN, activityBeacon: beaconOn(env),
      analytics: clientConfig(env) }, 200, { 'cache-control': 'no-cache' });
  // Usage analytics (SHARING-0010): events in, and the private dashboard (behind Cloudflare Access).
  if (path === '/api/events') { if (m !== 'POST') throw new HttpError(405, 'method not allowed'); return ingest(env, req); }
  if (path.startsWith('/admin/')) return admin(env, req, path);
  if (path === '/api/patches' && m === 'POST') {
    await limit(env.SAVE_LIMIT, req, 'save');
    const r = await createPatch(env, req);
    if (r.ok) ctx.waitUntil(record(env, req, 'patch_shared', { kind: 'new' }));
    return r;
  }
  const thumb = path.match(/^\/api\/patches\/([^/]+)\/thumb\.png$/);
  if (thumb && m === 'GET') return getThumb(env, thumb[1], url.searchParams.get('rev'));
  const one = path.match(/^\/api\/patches\/([^/]+)$/);
  if (one) {
    if (m === 'GET') return getPatch(env, req, one[1], ctx);
    if (m === 'PUT') {
      await limit(env.SAVE_LIMIT, req, 'save');
      const r = await savePatch(env, req, one[1]);
      if (r.ok) ctx.waitUntil(record(env, req, 'patch_shared', { kind: 'update' }));
      return r;
    }
    if (m === 'DELETE') return deletePatch(env, req, one[1]);
    throw new HttpError(405, 'method not allowed');
  }
  // ---- accounts (SPEC-SHARING-ACCOUNTS) ----
  if (path === '/api/me' && m === 'GET') return me(env, req, url);
  if (path === '/api/auth/google/start' && m === 'GET') { await limit(env.SAVE_LIMIT, req, 'auth'); return googleStart(env, req, url); }
  if (path === '/api/auth/google/callback' && m === 'GET') return googleCallback(env, req, url);
  if (path === '/api/auth/apple/start' && m === 'GET') { await limit(env.SAVE_LIMIT, req, 'auth'); return appleStart(env, req, url); }
  if (path === '/api/auth/apple/callback' && m === 'GET') return appleCallback(env, req, url);
  if (path.startsWith('/api/auth/') || path.startsWith('/api/me')) {
    if (m !== 'GET') sameOrigin(env, req);  // R5: cookie-authenticated changes only from this site
    if (path.startsWith('/api/auth/passkey/')) await limit(env.SAVE_LIMIT, req, 'auth');
    if (path === '/api/auth/passkey/register/options' && m === 'POST') return registerOptions(env, req);
    if (path === '/api/auth/passkey/register/verify' && m === 'POST') return registerVerify(env, req);
    if (path === '/api/auth/passkey/login/options' && m === 'POST') return loginOptions(env, req);
    if (path === '/api/auth/passkey/login/verify' && m === 'POST') return loginVerify(env, req);
    if (path === '/api/auth/logout' && m === 'POST') return logout(env, req);
    if (path === '/api/me' && m === 'DELETE') return deleteAccount(env, req);
    if (path === '/api/me/handle' && m === 'PUT') return setHandle(env, req);
    if (path === '/api/me/claim' && m === 'POST') return claim(env, req);
    if (path === '/api/me/patches' && m === 'GET') return myPatches(env, req);
    if (path === '/api/me/activity' && m === 'POST') { await limit(env.SAVE_LIMIT, req, 'activity'); return postActivity(env, req); }
    throw new HttpError(404, 'no such endpoint');
  }
  // ---- gallery (SPEC-SHARING-GALLERY) ----
  if (path === '/api/gallery' && m === 'GET') { await limit(env.SEARCH_LIMIT, req, 'gallery'); return galleryList(env, req, url); }
  const gal = path.match(/^\/api\/gallery\/([^/]+)(\/like|\/report)?$/);
  if (gal) {
    if (m !== 'GET') sameOrigin(env, req);
    await limit(env.SAVE_LIMIT, req, 'gallery');
    if (!gal[2] && m === 'DELETE') return unpublish(env, gal[1], id => mayEdit(env, req, id));
    if (gal[2] === '/like' && m === 'POST') return like(env, req, gal[1]);
    if (gal[2] === '/report' && m === 'POST') return report(env, req, gal[1]);
    throw new HttpError(405, 'method not allowed');
  }
  if (path.startsWith('/api/freesound/')) await limit(env.SEARCH_LIMIT, req, 'freesound');
  if (path === '/api/freesound/search' && m === 'GET') {
    try {
      const r = await search(env, url, ctx);
      ctx.waitUntil(r.clone().json().then(b => record(env, req, 'freesound_search', {}, { results: (b as { count?: number }).count ?? 0 })).catch(() => {}));
      return r;
    } catch (e) {
      ctx.waitUntil(record(env, req, 'freesound_error', {}, { status: e instanceof HttpError ? e.status : 500 }));
      throw e;
    }
  }
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
    try { return await route(req, env, ctx); } catch (e) { return errorResponse(e); }
  },
} satisfies ExportedHandler<Env>;
