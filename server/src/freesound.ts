// Freesound proxy (DATA-0005, SPEC-SHARING-BACKEND R8): the API key stays a Worker secret; responses are normalised
// and cached so many users share one key's rate limit. Audio is never proxied: previews come from Freesound's CDN,
// which allows cross-origin requests.
import { LIMITS, type Env } from './env.ts';
import { HttpError, json } from './http.ts';

export interface FreesoundSound {
  id: number;
  name: string;
  username: string;
  /** Short licence name shown in the attribution line. */
  license: 'CC0' | 'CC-BY' | 'CC-BY-NC';
  licenseUrl: string;
  duration: number;
  preview: string;
  url: string;
}

const FIELDS = 'id,name,username,license,duration,previews,url';

function licenseOf(url: string): FreesoundSound['license'] | null {
  if (/publicdomain\/zero/.test(url)) return 'CC0';
  if (/licenses\/by-nc\//.test(url)) return 'CC-BY-NC';
  if (/licenses\/by\//.test(url)) return 'CC-BY';
  return null; // Sampling+ and anything else: not accepted (DATA-0005)
}

function normalise(s: Record<string, unknown>): FreesoundSound | null {
  const license = licenseOf(String(s.license ?? ''));
  const previews = s.previews as Record<string, string> | undefined;
  const preview = previews?.['preview-hq-mp3'] ?? previews?.['preview-lq-mp3'];
  if (!license || !preview || typeof s.id !== 'number') return null;
  return {
    id: s.id,
    name: String(s.name ?? ''),
    username: String(s.username ?? ''),
    license,
    licenseUrl: String(s.license),
    duration: Number(s.duration ?? 0),
    preview,
    url: String(s.url ?? `https://freesound.org/s/${s.id}/`),
  };
}

async function upstream(
  env: Env,
  path: string,
  params: Record<string, string>,
  ctx: ExecutionContext,
): Promise<Record<string, unknown>> {
  if (!env.FREESOUND_TOKEN) throw new HttpError(503, 'Freesound is not configured');
  const base = (env.FREESOUND_API || 'https://freesound.org/apiv2').replace(/\/+$/, '');
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Cache by the upstream URL (no key in it: the key travels in a header).
  const cacheKey = new Request(url.toString());
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const r = await fetch(url.toString(), {
    headers: { authorization: `Token ${env.FREESOUND_TOKEN}` },
  });
  if (r.status === 404) throw new HttpError(404, 'no such sound');
  if (r.status === 429) throw new HttpError(503, 'Freesound is busy; try again in a minute');
  if (!r.ok) throw new HttpError(502, `Freesound error ${r.status}`);
  const body = await r.text();
  ctx.waitUntil(
    cache.put(
      cacheKey,
      new Response(body, {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
      }),
    ),
  );
  return JSON.parse(body);
}

/** GET /api/freesound/search?q=…[&max=s]: up to 150 sounds of at most `max` seconds (v1's per-block limits: Sample 510,
 * Granular 240, Convolver 12; never above 510), CC0/BY/BY-NC only. */
export async function search(env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) throw new HttpError(400, 'q required');
  const max = Math.min(
    LIMITS.maxSampleSeconds,
    Math.max(1, Math.round(Number(url.searchParams.get('max')) || LIMITS.maxSampleSeconds)),
  );
  const d = await upstream(
    env,
    '/search/text/',
    {
      query: q,
      page_size: '150',
      fields: FIELDS,
      sort: 'score',
      filter: `duration:[0 TO ${max}] license:("Attribution" OR "Creative Commons 0" OR "Attribution NonCommercial")`,
    },
    ctx,
  );
  const results = ((d.results as Record<string, unknown>[]) ?? [])
    .map(normalise)
    .filter((s): s is FreesoundSound => !!s);
  // Any origin may read it: the plugin's WebView page is not served by this Worker (CHG-0004 3.6).
  return json({ query: q, count: results.length, results }, 200, {
    'cache-control': 'public, max-age=3600',
    'access-control-allow-origin': '*',
  });
}

/** GET /api/freesound/sounds/:id: one sound (a shared patch's recipient resolves its preview URL here). */
export async function sound(env: Env, id: string, ctx: ExecutionContext): Promise<Response> {
  if (!/^\d{1,10}$/.test(id)) throw new HttpError(400, 'bad id');
  const s = normalise(await upstream(env, `/sounds/${id}/`, { fields: FIELDS }, ctx));
  if (!s) throw new HttpError(404, 'sound unavailable or not under an accepted licence');
  return json(s, 200, {
    'cache-control': 'public, max-age=86400',
    'access-control-allow-origin': '*',
  });
}
