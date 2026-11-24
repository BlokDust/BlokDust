// Usage analytics event list (SPEC-SHARING-USAGE-ANALYTICS R2, SHARING-0010). Shared by the Worker (which accepts only
// these) and the web client (which only sends these). Pure TypeScript: no Worker or DOM types.
//
// Every event is written to Workers Analytics Engine as one data point:
//   index1  event name
//   blob1   event        blob2 surface   blob3 app version   blob4 os   blob5 browser   blob6 country   blob7 visitor
//   blob8…  the event's string properties, in the order listed below (up to 5)
//   double1 weight (1 / sample rate: one sent event stands for this many)   double2…  numeric properties, in order (up to 5)

/** A string property's allowed values: a fixed list, or a free token checked by the Worker (R3). */
export type Allowed = readonly string[] | 'token' | 'domain';
export interface EventDef {
  /** String properties, in blob order. */
  readonly strings?: Readonly<Record<string, Allowed>>;
  /** Numeric properties, in double order. */
  readonly numbers?: readonly string[];
  /** Sent by the Worker itself (R6), never accepted from a client. */
  readonly server?: boolean;
}

export const SURFACES = ['web', 'embed', 'mcp', 'standalone', 'vst3', 'au', 'auv3'] as const;
export type Surface = (typeof SURFACES)[number];

export const EVENTS = {
  // ---- sessions and reach ----
  session_start: { strings: { referrer: 'domain', embed_host: 'domain' } },
  audio_started: { numbers: ['seconds'] },
  audio_failed: { strings: { reason: 'token' } },
  wasm_unsupported: {},
  session_summary: { numbers: ['seconds', 'blocks_max', 'blocks_deleted', 'undos'] },
  perf: { strings: { fps: ['<20', '20-40', '40-55', '55+'] } },
  // ---- patches ----
  patch_created: { strings: { from: ['blank', 'reset'] } },
  patch_opened: {
    strings: { source: ['link', 'embed', 'file', 'preset', 'autosave', 'demo', 'v1'] },
  },
  patch_saved: { strings: { kind: ['file', 'link'] }, numbers: ['blocks'] },
  save_failed: { strings: { kind: ['file', 'link'] } },
  embed_opened_full: {},
  // ---- sound and input ----
  block_added: { strings: { type: 'token' }, numbers: ['count'] },
  sample_loaded: { strings: { source: ['freesound', 'file', 'default', 'recorded', 'generated'] } },
  midi_connected: { strings: { mpe: ['yes', 'no'] } },
  keyboard_played: {},
  // ---- counted by the Worker (R6) ----
  patch_shared: { strings: { kind: ['new', 'update'] }, server: true },
  freesound_search: { numbers: ['results'], server: true },
  freesound_error: { numbers: ['status'], server: true },
  // ---- plugins (R8): one ping a day per install, and errors the plugin catches ----
  plugin_active: {
    strings: { kind: ['instrument', 'fx'], host: 'token', host_version: 'token', arch: 'token' },
  },
  plugin_error: { strings: { where: 'token', code: 'token' } },
} as const satisfies Record<string, EventDef>;
export type EventName = keyof typeof EVENTS;

/** What a client sends: POST /api/events (R3). */
export interface EventBatch {
  surface: Surface;
  /** App version (package.json). */
  v: string;
  /** Weight: 1 / the sample rate the client was told (R5). */
  w?: number;
  /** Plugins only (R8): the random install id, hashed by the Worker before it is written. */
  install?: string;
  /** Plugins only: OS, as the plugin knows it better than a user agent. */
  os?: string;
  events: { e: EventName; s?: Record<string, string>; n?: Record<string, number> }[];
}

export const MAX_EVENTS_PER_BATCH = 50;
export const MAX_BATCH_BYTES = 8 * 1024;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9 ._:+()/-]{0,47}$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** A client-sent string checked against its rule (R3): the value to store, or null to drop the property. */
export function checkString(rule: Allowed, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (rule === 'token') return TOKEN_RE.test(value) ? value : null;
  if (rule === 'domain') {
    const d = value.toLowerCase();
    return d.length <= 64 && DOMAIN_RE.test(d) ? d : null;
  }
  return rule.includes(value) ? value : null;
}
