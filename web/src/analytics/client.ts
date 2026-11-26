// Usage analytics (SPEC-SHARING-USAGE-ANALYTICS): server/src/events.ts's events, batched
// to POST api/events. No cookies or ids; only the user's opt-out (R7) is stored on the device.
import {
  EVENTS,
  type EventBatch,
  type EventName,
  type Surface,
} from '../../../server/src/events.ts';
import { VERSION } from '../version.ts';

const OPT_OUT_KEY = 'blokdust2.analytics';

/** The user's choice (R7): what they chose here; otherwise off when their browser asks sites not to
 * track (GPC). */
export function analyticsAllowed(): boolean {
  try {
    const item = localStorage.getItem(OPT_OUT_KEY);
    if (item === 'off') return false;
    if (item === 'on') return true;
  } catch {
    /* storage blocked: default */
  }
  return !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
}
/** The About switch. Turning it on takes effect from the next visit; off stops at once. */
export function setAnalyticsAllowed(on: boolean): void {
  try {
    localStorage.setItem(OPT_OUT_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode */
  }
  if (!on) client?.stop();
}

type Ev = EventBatch['events'][number];
class Client {
  private queue: Ev[] = [];
  private counts = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  constructor(
    private readonly url: string,
    private readonly surface: Surface,
    private readonly weight: number,
  ) {
    // Hidden (tab switch, app switch, close): send what there is, the page may not come back (R5).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
    addEventListener('pagehide', () => {
      this.flush(true);
    });
  }
  track(
    event: EventName,
    strings?: Record<string, string>,
    numbers?: Record<string, number>,
  ): void {
    if (this.stopped || !(event in EVENTS)) return;
    this.queue.push({
      e: event,
      ...(strings ? { s: strings } : {}),
      ...(numbers ? { n: numbers } : {}),
    });
    if (this.queue.length >= 20) this.flush(false);
    else
      this.timer ??= setTimeout(() => {
        this.flush(false);
      }, 60_000);
  }
  /** Counted per key and sent as one event per key on flush (block_added by type): R2's low
   * volume. */
  count(event: EventName, key: string, by = 1): void {
    if (this.stopped) return;
    const k = `${event}\u0000${key}`;
    this.counts.set(k, (this.counts.get(k) ?? 0) + by);
    this.timer ??= setTimeout(() => {
      this.flush(false);
    }, 60_000);
  }
  flush(leaving: boolean): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.stopped) return;
    for (const [k, value] of this.counts) {
      const [event, key] = k.split('\u0000') as [EventName, string];
      const prop = Object.keys(
        Object.hasOwn(EVENTS, event) && 'strings' in EVENTS[event]
          ? (EVENTS[event] as { strings: object }).strings
          : {},
      )[0];
      if (prop) this.queue.push({ e: event, s: { [prop]: key }, n: { count: value } });
    }
    this.counts.clear();
    while (this.queue.length) {
      const batch: EventBatch = {
        surface: this.surface,
        v: VERSION,
        w: this.weight,
        events: this.queue.splice(0, 50),
      };
      const body = JSON.stringify(batch);
      // Leaving: a beacon survives the page closing; else a request (keepalive in case it closes).
      if (
        leaving &&
        'sendBeacon' in navigator &&
        navigator.sendBeacon(this.url, new Blob([body], { type: 'application/json' }))
      )
        continue;
      void fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }
  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.counts.clear();
    clearTimeout(this.timer);
  }
}

let client: Client | null = null;

/** Start for this page (R5): a session sends events with probability `rate` (from the Worker), each
 * standing for 1/rate sessions. Nothing when the rate is 0 (kill switch) or the user said no. */
export function startAnalytics(surface: Surface, rate: number, random = Math.random): boolean {
  if (!(rate > 0) || !analyticsAllowed() || random() >= rate) return false;
  client = new Client(
    new URL('api/events', document.baseURI).toString(),
    surface,
    Math.min(1000, 1 / rate),
  );
  return true;
}
/** The Worker's rate for this page (the `blokdust-analytics` meta tag); 0 without one (static
 * hosting, the plugin). */
export const pageRate = () =>
  Number(
    document.querySelector<HTMLMetaElement>('meta[name="blokdust-analytics"]')?.content ?? 0,
  ) || 0;

export const track = (
  event: EventName,
  strings?: Record<string, string>,
  numbers?: Record<string, number>,
) => client?.track(event, strings, numbers);
export const count = (event: EventName, key: string, by = 1) => client?.count(event, key, by);
export const flushAnalytics = (leaving = false) => client?.flush(leaving);
export const analyticsActive = () => !!client;

/** A host name for referrer / embed_host (R2): no path, no query, no "www.". */
export function hostOf(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host && host !== location.hostname ? host : undefined;
  } catch {
    return undefined;
  }
}
