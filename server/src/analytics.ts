// Usage analytics (SHARING-0010): allow-listed events, and the Worker's own, into Analytics Engine.
// Nothing identifying: visitors a daily-salted hash of IP and agent; plugins a hashed install id.
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

/** The share of sessions that send events (R5): ANALYTICS_RATE 0 (off) to 1 (all); unset: off. */
export function analyticsRate(env: Env): number {
  const rate = Number((env.ANALYTICS_RATE ?? '').trim());
  return env.EVENTS && Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 0;
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
    // Every isolate must use the same salt on the same day, or one visitor counts once per isolate:
    // D1 holds it, and yesterday's is deleted, after which no hash can be linked to another day's.
    await env.DB.prepare('INSERT OR IGNORE INTO analytics_salt (day, salt) VALUES (?, ?)')
      .bind(day, fresh)
      .run();
    value =
      (await env.DB.prepare('SELECT salt FROM analytics_salt WHERE day = ?')
        .bind(day)
        .first<string>('salt')) ?? fresh;
    await env.DB.prepare('DELETE FROM analytics_salt WHERE day < ?').bind(day).run();
  } catch (failure) {
    console.error('analytics salt', failure);
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
    : ua.includes('Android')
      ? 'android'
      : ua.includes('CrOS')
        ? 'chromeos'
        : ua.includes('Windows')
          ? 'windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macos'
            : ua.includes('Linux')
              ? 'linux'
              : 'other';
  const browser = ua.includes('Edg/')
    ? 'edge'
    : ua.includes('OPR/')
      ? 'opera'
      : ua.includes('SamsungBrowser')
        ? 'samsung'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'chrome'
            : ua.includes('Safari/') && ua.includes('Version/')
              ? 'safari'
              : 'other';
  return { os, browser };
}

const PLUGIN_SURFACES: readonly Surface[] = ['standalone', 'vst3', 'au', 'auv3'];
const VERSION_RE = /^[0-9A-Za-z.+-]{1,24}$/;
const INSTALL_RE = /^[0-9a-f-]{16,64}$/i;
const clampNum = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(-1e9, Math.min(1e9, value)) : 0;

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
  point: Point,
): void {
  env.EVENTS?.writeDataPoint({
    indexes: [point.e],
    blobs: [
      point.e,
      common.surface,
      common.v,
      common.os,
      common.browser,
      common.country,
      common.visitor,
      ...point.strings.map((string) => string ?? ''),
    ],
    doubles: [common.w, ...point.numbers],
  });
}
/** An event's properties in schema order, checked (R3); null if a client may not send it. */
function pointOf(
  name: unknown,
  stringProps: unknown,
  numberProps: unknown,
  fromServer: boolean,
): Point | null {
  if (typeof name !== 'string' || !Object.hasOwn(EVENTS, name)) return null;
  const def: EventDef = EVENTS[name as EventName];
  if (!!def.server !== fromServer) return null;
  const sv = (stringProps && typeof stringProps === 'object' ? stringProps : {}) as Record<
      string,
      unknown
    >,
    nv = (numberProps && typeof numberProps === 'object' ? numberProps : {}) as Record<
      string,
      unknown
    >;
  return {
    e: name as EventName,
    strings: Object.entries(def.strings ?? {}).map(([k, rule]) => checkString(rule, sv[k])),
    numbers: (def.numbers ?? []).map((k) => clampNum(nv[k])),
  };
}

/** POST /api/events (R3): a batch from the web app or a plugin. Answers how many were accepted. */
export async function ingest(env: Env, req: Request): Promise<Response> {
  // R5: switched off (or no dataset)
  if (analyticsRate(env) <= 0) return json({ accepted: 0, off: true }, 200);
  await limit(env.EVENTS_LIMIT, req, 'events');
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BATCH_BYTES) throw new HttpError(413, 'batch too large');
  const text = await req.text();
  if (text.length > MAX_BATCH_BYTES) throw new HttpError(413, 'batch too large');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'bad json');
  }
  if (!parsed || typeof parsed !== 'object') throw new HttpError(400, 'bad batch');
  const body = parsed as Record<string, unknown>;
  const surface = body.surface as Surface;
  if (!SURFACES.includes(surface)) throw new HttpError(400, 'bad surface');
  const version = typeof body.v === 'string' && VERSION_RE.test(body.v) ? body.v : null;
  if (!version) throw new HttpError(400, 'bad version');
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length > MAX_EVENTS_PER_BATCH) throw new HttpError(400, 'bad events');
  const isPlugin = PLUGIN_SURFACES.includes(surface);
  const install =
    isPlugin && typeof body.install === 'string' && INSTALL_RE.test(body.install)
      ? body.install
      : null;
  const weight =
    typeof body.w === 'number' && Number.isFinite(body.w) ? Math.max(1, Math.min(1000, body.w)) : 1;
  const device = deviceOf(req.headers.get('user-agent') ?? '');
  const os = isPlugin ? (checkString('token', body.os) ?? 'other') : device.os;
  const common = {
    surface,
    v: version,
    os,
    browser: isPlugin ? 'plugin' : device.browser,
    country: ((req as { cf?: { country?: string } }).cf?.country ?? 'XX').slice(0, 2),
    // R8: a plugin is counted by its hashed install, all else by the daily visitor hash (R4).
    visitor: install
      ? (await sha256Hex(`install|${install}`)).slice(0, 16)
      : await visitorOf(env, req),
    w: weight,
  };
  let accepted = 0;
  for (const ev of events) {
    const fields = (ev && typeof ev === 'object' ? ev : {}) as Record<string, unknown>;
    const point = pointOf(fields.e, fields.s, fields.n, false);
    if (!point) continue;
    if (point.e.startsWith('plugin_') && !install) continue; // R8: plugin events only from a plugin
    write(env, common, point);
    accepted++;
  }
  return json({ accepted }, 200);
}

/** An event the Worker records itself (R6), e.g. a share. Never throws; costs no extra request. */
export async function record(
  env: Env,
  req: Request,
  name: EventName,
  strings: Record<string, string> = {},
  numbers: Record<string, number> = {},
): Promise<void> {
  try {
    if (analyticsRate(env) <= 0) return;
    const point = pointOf(name, strings, numbers, true);
    if (!point) return;
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
      point,
    );
  } catch (failure) {
    console.error('analytics record', failure);
  }
}
