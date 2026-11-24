// BlokDust 2 Worker (SHARING-0001/0002/0004, SPEC-SHARING-BACKEND): serves the web build from static assets and the
// sharing API. Routes are relative to BASE_PATH so the app can live at `/` or under a prefix such as `/blokdust`.
import { submitSupport, expireSupport, supportHeaders } from './support.ts';
import type { Env } from './env.ts';
import { beaconOn } from './activity.ts';
import { HttpError, assetBase, basePath, errorResponse, json, limit, prefix } from './http.ts';
import { createPatch, deletePatch, getPatch, getThumb, mayEdit, savePatch } from './patches.ts';
import { oembed, page } from './pages.ts';
import { search, sound } from './freesound.ts';
import {
  claim,
  deleteAccount,
  logout,
  me,
  myPatches,
  postActivity,
  removeMethod,
  setHandle,
} from './auth/account.ts';
import { googleCallback, googleStart } from './auth/google.ts';
import { appleCallback, appleStart } from './auth/apple.ts';
import { loginOptions, loginVerify, registerOptions, registerVerify } from './auth/passkey.ts';
import { appKeyOf, sameOrigin } from './auth/session.ts';
import {
  deviceApprove,
  deviceInfo,
  devicePoll,
  deviceStart,
  listApps,
  removeApp,
} from './auth/appKeys.ts';
import {
  appSiteAssociation,
  appleApp,
  appleNonce,
  passkeyApp,
  passkeyOptions,
} from './auth/native.ts';
import { like, list as galleryList, report, unpublish } from './gallery.ts';
import { clientConfig, ingest, record } from './analytics.ts';
import { admin } from './admin.ts';

/**
 * The plugins' page (JUCE's WebView: juce:// on macOS and iPadOS, https://juce.backend elsewhere) may call the API
 * (CHG-0039): its origin, and only its, is allowed, never with credentials, so the site's cookies never go with
 * such a request; a plugin signs in with its own key (Authorization: Bearer bdk_…, auth/appKeys.ts).
 */
const PLUGIN_ORIGINS = new Set(['juce://juce.backend', 'https://juce.backend']);
export const pluginOrigin = (req: Request): string | null => {
  const header = req.headers.get('origin');
  return header && PLUGIN_ORIGINS.has(header) ? header : null;
};
const corsFor = (origin: string) => ({ 'access-control-allow-origin': origin, vary: 'Origin' });

async function route(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const base = basePath(env);
  // The iPad app may use this site's passkeys (SHARING-0011): Apple reads this at the domain's root.
  if (
    url.pathname === '/.well-known/apple-app-site-association' &&
    (req.method === 'GET' || req.method === 'HEAD')
  )
    return appSiteAssociation(env);
  const m = req.method;
  const canonical = (env.PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '');
  // A former base path (SHARING-0006: funputs.com/blokdust, and staging's old …/blokdust/): its pages go to the same
  // page on the public site with a 302, so a landing page can replace the redirect later; its API answers in place.
  const legacy = prefix(env.LEGACY_BASE_PATH);
  if (
    legacy &&
    legacy !== base &&
    (url.pathname === legacy || url.pathname.startsWith(legacy + '/'))
  ) {
    const rest = url.pathname.slice(legacy.length) || '/';
    if (rest.startsWith('/api/')) url.pathname = base + rest;
    else if (m === 'GET' || m === 'HEAD')
      return Response.redirect(
        `${canonical || url.origin + base}${rest === '/index.html' ? '/' : rest}${url.search}`,
        302,
      );
    else return new Response('Not found', { status: 404 });
  }
  // Pages on another host than the public one (production's workers.dev) go there, so links handed out before the
  // move, or by plugin builds, open on the public site (SHARING-0004/0006).
  if (canonical && (m === 'GET' || m === 'HEAD') && new URL(canonical).host !== url.host) {
    const p =
      base && url.pathname.startsWith(base + '/')
        ? url.pathname.slice(base.length)
        : url.pathname === base
          ? '/'
          : url.pathname;
    if (p === '/' || p === '/index.html' || p.startsWith('/embed/'))
      return Response.redirect(`${canonical}${p === '/index.html' ? '/' : p}${url.search}`, 301);
  }
  if (base && url.pathname === base)
    return Response.redirect(`${url.origin}${base}/${url.search}`, 301);
  if (base && !url.pathname.startsWith(base + '/')) {
    // Outside the base path (a local `based` env, or a deployment under a prefix). Links made before the
    // move (`/?c=…`, `/embed/…`) go to their place under it; the API stays answerable at the root too, for plugin
    // builds that call it there (CHG-0005 task 10).
    const p = url.pathname;
    if (
      (m === 'GET' || m === 'HEAD') &&
      (p === '/' || p === '/index.html' || p.startsWith('/embed/') || p === '/oembed')
    )
      return Response.redirect(
        `${url.origin}${base}${p === '/index.html' ? '/' : p}${url.search}`,
        301,
      );
    if (!p.startsWith('/api/') && !p.startsWith('/admin/'))
      return new Response('Not found', { status: 404 });
  }
  const path =
    base && url.pathname.startsWith(base + '/') ? url.pathname.slice(base.length) : url.pathname;

  if (path === '/' || path === '/index.html') {
    if (m !== 'GET' && m !== 'HEAD') throw new HttpError(405, 'method not allowed');
    return page(env, req, url, null);
  }
  const embed = /^\/embed\/([^/]+)\/?$/.exec(path);
  if (embed && m === 'GET') return page(env, req, url, embed[1]);
  if (path === '/oembed' && m === 'GET') return oembed(env, req, url);
  // Where a plugin sends people to approve its code (SHARING-0011): the app, which asks (Settings › ACCOUNT).
  if (path === '/link' && (m === 'GET' || m === 'HEAD')) {
    const code = url.searchParams.get('code');
    return Response.redirect(
      `${url.origin}${base}/?link=${code ? encodeURIComponent(code.slice(0, 16)) : ''}`,
      302,
    );
  }

  // The plugins' preflight (above): GET/POST/PUT/DELETE with a key and JSON; no credentials.
  const plugin = pluginOrigin(req);
  if (plugin && m === 'OPTIONS' && path.startsWith('/api/') && path !== '/api/support')
    return new Response(null, {
      status: 204,
      headers: {
        ...corsFor(plugin),
        'access-control-allow-methods': 'GET, POST, PUT, DELETE',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400',
      },
    });
  if (path === '/api/support' && m === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        ...supportHeaders,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      },
    });
  if (path === '/api/support' && m === 'POST') return submitSupport(env, req);

  if (path === '/api/config' && m === 'GET')
    return json(
      {
        turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '',
        saving: !!env.TURNSTILE_SECRET,
        freesound: !!env.FREESOUND_TOKEN,
        activityBeacon: beaconOn(env),
        analytics: clientConfig(env),
      },
      200,
      { 'cache-control': 'no-cache' },
    );
  // Usage analytics (SHARING-0010): events in, and the private dashboard (behind Cloudflare Access).
  if (path === '/api/events') {
    if (m !== 'POST') throw new HttpError(405, 'method not allowed');
    return ingest(env, req);
  }
  if (path.startsWith('/admin/')) return admin(env, req, path);
  if (path === '/api/patches' && m === 'POST') {
    await limit(env.SAVE_LIMIT, req, 'save');
    const response = await createPatch(env, req);
    if (response.ok) ctx.waitUntil(record(env, req, 'patch_shared', { kind: 'new' }));
    return response;
  }
  const thumb = /^\/api\/patches\/([^/]+)\/thumb\.png$/.exec(path);
  if (thumb && m === 'GET') return getThumb(env, thumb[1], url.searchParams.get('rev'));
  const one = /^\/api\/patches\/([^/]+)$/.exec(path);
  if (one) {
    if (m === 'GET') return getPatch(env, req, one[1], ctx);
    if (m === 'PUT') {
      await limit(env.SAVE_LIMIT, req, 'save');
      const response = await savePatch(env, req, one[1]);
      if (response.ok) ctx.waitUntil(record(env, req, 'patch_shared', { kind: 'update' }));
      return response;
    }
    if (m === 'DELETE') return deletePatch(env, req, one[1]);
    throw new HttpError(405, 'method not allowed');
  }
  // ---- accounts (SPEC-SHARING-ACCOUNTS) ----
  if (path === '/api/me' && m === 'GET') return me(env, req, url);
  if (path === '/api/auth/google/start' && m === 'GET') {
    await limit(env.SAVE_LIMIT, req, 'auth');
    return googleStart(env, req, url);
  }
  if (path === '/api/auth/google/callback' && m === 'GET') return googleCallback(env, req, url);
  if (path === '/api/auth/apple/start' && m === 'GET') {
    await limit(env.SAVE_LIMIT, req, 'auth');
    return appleStart(env, req, url);
  }
  if (path === '/api/auth/apple/callback' && m === 'GET') return appleCallback(env, req, url);
  // ---- plugin sign-in (CHG-0039, SHARING-0011): a device code, approved on the website ----
  // The iPad app's native sign-in (SHARING-0011): keys in the body, no cookies, so no Origin check.
  if (path.startsWith('/api/app/')) {
    await limit(env.SAVE_LIMIT, req, 'device');
    if (path === '/api/app/apple/nonce' && m === 'POST') return appleNonce(env);
    if (path === '/api/app/apple' && m === 'POST') return appleApp(env, req);
    if (path === '/api/app/passkey/options' && m === 'POST') return passkeyOptions(env, req);
    if (path === '/api/app/passkey' && m === 'POST') return passkeyApp(env, req);
    throw new HttpError(404, 'no such endpoint');
  }
  if (path.startsWith('/api/device/')) {
    if (path === '/api/device/start' && m === 'POST') {
      await limit(env.SAVE_LIMIT, req, 'device');
      return deviceStart(env, req);
    }
    if (path === '/api/device/poll' && m === 'POST') {
      await limit(env.SEARCH_LIMIT, req, 'poll');
      return devicePoll(env, req);
    }
    if (path === '/api/device/code' && m === 'GET') return deviceInfo(env, req, url);
    if (path === '/api/device/approve' && m === 'POST') {
      sameOrigin(env, req);
      await limit(env.SAVE_LIMIT, req, 'device');
      return deviceApprove(env, req);
    }
    throw new HttpError(404, 'no such endpoint');
  }
  if (path.startsWith('/api/auth/') || path.startsWith('/api/me')) {
    // R5: cookie-authenticated changes only from this site. A plugin's key is no cookie (no CSRF); endpoints that don't
    // take keys read no user from such a request (session.ts currentUser).
    if (m !== 'GET' && !appKeyOf(req)) sameOrigin(env, req);
    if (path === '/api/me/apps' && m === 'GET') return listApps(env, req);
    if (path === '/api/me/apps' && m === 'DELETE') {
      if (appKeyOf(req)) sameOrigin(env, req);
      return removeApp(env, req);
    }
    if (path.startsWith('/api/auth/passkey/')) await limit(env.SAVE_LIMIT, req, 'auth');
    if (path === '/api/auth/passkey/register/options' && m === 'POST')
      return registerOptions(env, req);
    if (path === '/api/auth/passkey/register/verify' && m === 'POST')
      return registerVerify(env, req);
    if (path === '/api/auth/passkey/login/options' && m === 'POST') return loginOptions(env, req);
    if (path === '/api/auth/passkey/login/verify' && m === 'POST') return loginVerify(env, req);
    if (path === '/api/auth/logout' && m === 'POST') return logout(env, req);
    if (path === '/api/me' && m === 'DELETE') {
      await limit(env.SAVE_LIMIT, req, 'auth');
      return deleteAccount(env, req);
    }
    if (path === '/api/me/handle' && m === 'PUT') return setHandle(env, req);
    if (path === '/api/me/methods' && m === 'DELETE') {
      await limit(env.SAVE_LIMIT, req, 'auth');
      return removeMethod(env, req);
    }
    if (path === '/api/me/claim' && m === 'POST') return claim(env, req);
    if (path === '/api/me/patches' && m === 'GET') return myPatches(env, req);
    if (path === '/api/me/activity' && m === 'POST') {
      await limit(env.SAVE_LIMIT, req, 'activity');
      return postActivity(env, req);
    }
    throw new HttpError(404, 'no such endpoint');
  }
  // ---- gallery (SPEC-SHARING-GALLERY) ----
  if (path === '/api/gallery' && m === 'GET') {
    await limit(env.SEARCH_LIMIT, req, 'gallery');
    return galleryList(env, req, url);
  }
  const gal = /^\/api\/gallery\/([^/]+)(\/like|\/report)?$/.exec(path);
  if (gal) {
    if (m !== 'GET' && !appKeyOf(req)) sameOrigin(env, req); // a plugin's key: no cookie, no CSRF (SHARING-0011)
    await limit(env.SAVE_LIMIT, req, 'gallery');
    if (!gal[2] && m === 'DELETE') return unpublish(env, gal[1], (id) => mayEdit(env, req, id));
    if (gal[2] === '/like' && m === 'POST') return like(env, req, gal[1]);
    if (gal[2] === '/report' && m === 'POST') return report(env, req, gal[1]);
    throw new HttpError(405, 'method not allowed');
  }
  if (path.startsWith('/api/freesound/')) await limit(env.SEARCH_LIMIT, req, 'freesound');
  if (path === '/api/freesound/search' && m === 'GET') {
    try {
      const response = await search(env, url, ctx);
      ctx.waitUntil(
        response
          .clone()
          .json()
          .then((b) =>
            record(
              env,
              req,
              'freesound_search',
              {},
              { results: (b as { count?: number }).count ?? 0 },
            ),
          )
          .catch(() => {}),
      );
      return response;
    } catch (error) {
      ctx.waitUntil(
        record(
          env,
          req,
          'freesound_error',
          {},
          { status: error instanceof HttpError ? error.status : 500 },
        ),
      );
      throw error;
    }
  }
  const fs = /^\/api\/freesound\/sounds\/([^/]+)$/.exec(path);
  if (fs && m === 'GET') return sound(env, fs[1], ctx);
  if (path.startsWith('/api/')) throw new HttpError(404, 'no such endpoint');

  // Everything else is the static build, which sits at ASSET_BASE in the asset store (at its root in local dev).
  const assetUrl = new URL(url);
  assetUrl.pathname = assetBase(env) + path;
  return env.ASSETS.fetch(new Request(assetUrl.toString(), req));
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let response: Response;
    try {
      response = await route(req, env, ctx);
    } catch (error) {
      response = errorResponse(error);
      if (new URL(req.url).pathname.endsWith('/api/support'))
        for (const [k, value] of Object.entries(supportHeaders)) response.headers.set(k, value);
    }
    // The plugins' page reads the answer (CHG-0039); a response can be immutable (an asset fetch): copy it then.
    const plugin = pluginOrigin(req);
    if (
      plugin &&
      new URL(req.url).pathname.includes('/api/') &&
      !response.headers.has('access-control-allow-origin')
    ) {
      response = new Response(response.body, response);
      for (const [k, value] of Object.entries(corsFor(plugin))) response.headers.set(k, value);
    }
    return response;
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await expireSupport(env);
  },
} satisfies ExportedHandler<Env>;
