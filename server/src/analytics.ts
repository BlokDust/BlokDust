// Usage analytics (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS): POST /api/events writes allow-listed events to Workers
// Analytics Engine; the Worker records a few events itself. Nothing identifying is stored: web visitors are a hash of
// a salt that changes every day (and is then deleted) with the IP and user agent; plugins send a random install id,
// stored only as a hash. Raw IPs are never written.
import type { Env } from './env.ts';
import {
  EVENTS,
  MAX_BATCH_BYTES,
  MAX_EVENTS_PER_BATCH,
  SURFACES,
  checkString,
  type EventDef,
  type EventName,
  type Surface,
} from './events.ts';
import { HttpError, json, limit, sha256Hex } from './http.ts';

/** The share of sessions that send events (R5): ANALYTICS_RATE, 0 (off) … 1 (all). Unset or invalid: off. */
export function analyticsRate(env: Env): number {
  const r = Number((env.ANALYTICS_RATE ?? '').trim());
  return env.EVENTS && Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/** What the page needs to know (R5, R9): written into the page and /api/config. */
export function clientConfig(env: Env): { rate: number; sentryDsn: string; sentryEnv: string } {
  return {
    rate: analyticsRate(env),
    sentryDsn: (env.SENTRY_DSN ?? '').trim(),
    sentryEnv: (env.SENTRY_ENVIRONMENT ?? '').trim(),
  };
}

// ---- the daily salt (R4) ----
let salt: { day: string; value: string } | null = null;
const today = () => new Date().toISOString().slice(0, 10);
export async function dailySalt(env: Env): Promise<string> {
  const day = today();
  if (salt?.day === day) return salt.value;
  const fresh = crypto.randomUUID();
  let value = fresh;
  try {
    // Every isolate must use the same salt on the same day, or one visitor counts once per isolate: D1 holds it, and
    // yesterday's is deleted, after which no hash can be linked to another day's.
    await env.DB.prepare('INSERT OR IGNORE INTO analytics_salt (day, salt) VALUES (?, ?)')
      .bind(day, fresh)
      .run();
    value =
      (await env.DB.prepare('SELECT salt FROM analytics_salt WHERE day = ?')
        .bind(day)
        .first<string>('salt')) ?? fresh;
    await env.DB.prepare('DELETE FROM analytics_salt WHERE day < ?').bind(day).run();
  } catch (e) {
    console.error('analytics salt', e);
  }
  salt = { day, value };
  return value;
}
async function visitorOf(env: Env, req: Request): Promise<string> {
  const ip = req.headers.get('cf-connecting-ip') ?? 'local',
    ua = req.headers.get('user-agent') ?? '';
  return (await sha256Hex(`${await dailySalt(env)}|${ip}|${ua}`)).slice(0, 16);
}

/** Coarse OS and browser from the user agent (R2): never the string itself. */
export function deviceOf(ua: string): { os: string; browser: string } {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : /CrOS/.test(ua)
        ? 'chromeos'
        : /Windows/.test(ua)
          ? 'windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macos'
            : /Linux/.test(ua)
              ? 'linux'
              : 'other';
  const browser = /Edg\//.test(ua)
    ? 'edge'
    : /OPR\//.test(ua)
      ? 'opera'
      : /SamsungBrowser/.test(ua)
        ? 'samsung'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'chrome'
            : /Safari\//.test(ua) && /Version\//.test(ua)
              ? 'safari'
              : 'other';
  return { os, browser };
}

const PLUGIN_SURFACES: readonly Surface[] = ['standalone', 'vst3', 'au', 'auv3'];
const VERSION_RE = /^[0-9A-Za-z.+-]{1,24}$/;
const INSTALL_RE = /^[0-9a-f-]{16,64}$/i;
const clampNum = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(-1e9, Math.min(1e9, n)) : 0;

interface Point {
  e: EventName;
  strings: (string | null | undefined)[];
  numbers: number[];
}
function write(
  env: Env,
  common: {
    surface: string;
    v: string;
    os: string;
    browser: string;
    country: string;
    visitor: string;
    w: number;
  },
  p: Point,
): void {
  env.EVENTS?.writeDataPoint({
    indexes: [p.e],
    blobs: [
      p.e,
      common.surface,
      common.v,
      common.os,
      common.browser,
      common.country,
      common.visitor,
      ...p.strings.map((s) => s ?? ''),
    ],
    doubles: [common.w, ...p.numbers],
  });
}
/** An event's properties in schema order, checked (R3); null when the event isn't one a client may send. */
function pointOf(name: unknown, s: unknown, n: unknown, fromServer: boolean): Point | null {
  if (typeof name !== 'string' || !Object.hasOwn(EVENTS, name)) return null;
  const def: EventDef = EVENTS[name as EventName];
  if (!!def.server !== fromServer) return null;
  const sv = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>,
    nv = (n && typeof n === 'object' ? n : {}) as Record<string, unknown>;
  return {
    e: name as EventName,
    strings: Object.entries(def.strings ?? {}).map(([k, rule]) => checkString(rule, sv[k])),
    numbers: (def.numbers ?? []).map((k) => clampNum(nv[k])),
  };
}

/** POST /api/events (R3): a batch from the web app or a plugin. Answers how many were accepted. */
export async function ingest(env: Env, req: Request): Promise<Response> {
  if (analyticsRate(env) <= 0) return json({ accepted: 0, off: true }, 200); // R5: switched off (or no dataset)
  await limit(env.EVENTS_LIMIT, req, 'events');
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BATCH_BYTES) throw new HttpError(413, 'batch too large');
  const text = await req.text();
  if (text.length > MAX_BATCH_BYTES) throw new HttpError(413, 'batch too large');
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'bad json');
  }
  if (!body || typeof body !== 'object') throw new HttpError(400, 'bad batch');
  const surface = body.surface as Surface;
  if (!SURFACES.includes(surface)) throw new HttpError(400, 'bad surface');
  const v = typeof body.v === 'string' && VERSION_RE.test(body.v) ? body.v : null;
  if (!v) throw new HttpError(400, 'bad version');
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length > MAX_EVENTS_PER_BATCH) throw new HttpError(400, 'bad events');
  const isPlugin = PLUGIN_SURFACES.includes(surface);
  const install =
    isPlugin && typeof body.install === 'string' && INSTALL_RE.test(body.install)
      ? body.install
      : null;
  const w =
    typeof body.w === 'number' && Number.isFinite(body.w) ? Math.max(1, Math.min(1000, body.w)) : 1;
  const device = deviceOf(req.headers.get('user-agent') ?? '');
  const os = isPlugin ? (checkString('token', body.os) ?? 'other') : device.os;
  const common = {
    surface,
    v,
    os,
    browser: isPlugin ? 'plugin' : device.browser,
    country: ((req as { cf?: { country?: string } }).cf?.country ?? 'XX').slice(0, 2),
    // R8: a plugin is counted by its install (hashed); everything else by the daily visitor hash (R4).
    visitor: install
      ? (await sha256Hex(`install|${install}`)).slice(0, 16)
      : await visitorOf(env, req),
    w,
  };
  let accepted = 0;
  for (const ev of events) {
    const o = (ev && typeof ev === 'object' ? ev : {}) as Record<string, unknown>;
    const p = pointOf(o.e, o.s, o.n, false);
    if (!p) continue;
    if (p.e.startsWith('plugin_') && !install) continue; // R8: plugin events only from a plugin
    write(env, common, p);
    accepted++;
  }
  return json({ accepted }, 200);
}

/** An event the Worker records itself (R6), e.g. a share. Never throws; costs no extra request. */
export async function record(
  env: Env,
  req: Request,
  name: EventName,
  s: Record<string, string> = {},
  n: Record<string, number> = {},
): Promise<void> {
  try {
    if (analyticsRate(env) <= 0) return;
    const p = pointOf(name, s, n, true);
    if (!p) return;
    const device = deviceOf(req.headers.get('user-agent') ?? '');
    write(
      env,
      {
        surface: 'web',
        v: 'server',
        ...device,
        country: ((req as { cf?: { country?: string } }).cf?.country ?? 'XX').slice(0, 2),
        visitor: await visitorOf(env, req),
        w: 1,
      },
      p,
    );
  } catch (e) {
    console.error('analytics record', e);
  }
}
