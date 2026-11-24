// The page as it opens: its URL, host (website, embed or plugin), start patch and session.
import { accountOwned, editToken, canOverwrite, MISSING_TEXT } from '../../patch/server.ts';
import { applyHostLabels, App } from '../../v1ui/shim.ts';
import { setAudioSession } from '../../audio/session';
import { EngineNode, engineModule } from '../../audio/engineNode.ts';
import { initialPatch } from '../startPatch.ts';
import { startSentry } from '../../analytics/sentry.ts';
import { startAnalytics, pageRate, track, hostOf, flushAnalytics } from '../../analytics/client.ts';
import { pluginValues } from '../pluginValues.ts';
import { pluginUsageStats } from '../../analytics/pluginStats.ts';
import { stage } from './pixi.ts';

export const params = new URLSearchParams(location.search);

/** Back from Google sign-in (`?account=in|new`, SPEC-SHARING-ACCOUNTS R2a). */
export let signInReturn!: string | null;

export const juce = (window as unknown as { __JUCE__?: { backend: JuceBackend } }).__JUCE__
  ?.backend;

export const embedId = embedIdFromPage();

// A plugin's code to approve (SHARING-0011): `?link=CODE` (the site's /link?code= sends people here). It is kept
// for this tab while the person signs in (Google and Apple leave the page and come back), for 10 minutes.
export const LINK_KEY = 'blokdust2.link';

export let linkArrival!: string | null;

export const pendingLink = (): string | null => {
  try {
    const v = JSON.parse(sessionStorage.getItem(LINK_KEY) ?? 'null') as {
      code: string;
      at: number;
    } | null;
    return v && Date.now() - v.at < 600_000 ? v.code : null;
  } catch {
    return linkArrival;
  }
};

export const forgetLink = () => {
  try {
    sessionStorage.removeItem(LINK_KEY);
  } catch {
    /* nothing kept */
  }
};

// START has nothing to wait for (owner, 2026-11-12: it took seconds): the AudioContext (suspended until a press
// resumes it), the worklet and the WASM are made now, alongside the patch, fonts and stage. The context's creation
// also blocks the page for a moment, which now falls before the start screen shows. An embed (several may share a
// page, each with its own context) only fetches and compiles the WASM ahead; its PLAY makes its context.
export let audio!: { ctx: AudioContext; module: Promise<WebAssembly.Module> } | null;

export let start!: import('../startPatch.ts').Start;

/** Plugin: values the plugin keeps (bd_get / bd_values), such as the install's usage stats choice (R7). */
export let values!: import('../pluginValues.ts').PluginValuesClient | null;

export let pluginStats!: { get(): boolean; set(on: boolean): void } | null;

/** Session totals for session_summary (sent when the page goes). */
export const usage = { blocksMax: 0, blocksDeleted: 0, undos: 0, keys: false, midi: false };

export let session!: { id: string | null; dirty: boolean };

// A link that opened no patch (owner, 2026-11-18): it leaves the address bar (a reload starts as usual), and the
// message bar says why once the stage shows. This browser's autosave is left as it was (autosaveIsThis is off).
export let missingNote!: string | null;

/** SAVE / SHARE's MAKE VIDEO (CHG-0022): hidden until the video export gets its own round of work (owner, 2026-11-17,
 * CHG-0035). `?video=1` shows it (its tests, and that work). */
export const VIDEO_EXPORT = new URLSearchParams(location.search).get('video') === '1';

/** sessionStorage key: a sign-in begun from SAVE / SHARE goes back there (CHG-0035). */
export const AFTER_SIGN_IN = 'bd.afterSignIn';

/** Link-preview size (Open Graph's recommended 1.91:1; server/src/pages.ts THUMB). */
export const THUMB = { width: 1200, height: 630 } as const;

export interface JuceBackend {
  emitEvent(id: string, payload: unknown): void;
  addEventListener<T>(id: string, fn: (payload: T) => void): unknown;
}

// v1's type names, plus the post-2.0 blocks' menu ids

/** A server share id from `/embed/<id>` (the Worker also names it in a meta tag). */
export function embedIdFromPage(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="blokdust-embed"]')?.content;
  return meta || (location.pathname.match(/\/embed\/([^/]+)\/?$/)?.[1] ?? null);
}

/** v1 App.SessionId: the right to save over a composition: this browser's edit token, or, when the signed-in account
 * owns it (SPEC-SHARING-ACCOUNTS R9), a marker (the cookie does the rest). */
export const accountOwnedClear = () => accountOwned.clear();

export const sessionFor = (id: string | null): string | null =>
  editToken(id) ?? (canOverwrite(id) ? 'account' : null);

export function setSession<Value extends typeof session>(value: Value): Value {
  session = value;
  return value;
}

export async function init(): Promise<void> {
  signInReturn = params.get('account');
  applyHostLabels(!!juce);
  linkArrival = !juce && !embedId ? params.get('link') : null;
  if (linkArrival !== null) {
    try {
      sessionStorage.setItem(
        LINK_KEY,
        JSON.stringify({ code: linkArrival.slice(0, 16), at: Date.now() }),
      );
    } catch {
      /* private window: the code goes with this page only */
    }
    params.delete('link');
    history.replaceState(
      null,
      '',
      `${location.pathname}${params.size ? `?${params.toString()}` : ''}`,
    );
  }
  audio =
    !juce && !embedId
      ? (() => {
          setAudioSession('playback'); // before the context exists, or iOS's silent switch mutes it
          const ctx = new AudioContext({ latencyHint: 'interactive' });
          const module = EngineNode.prepare(ctx);
          module.catch(() => {
            /* reported when START awaits it */
          });
          return { ctx, module };
        })()
      : null;
  if (!juce && embedId)
    engineModule().catch(() => {
      /* reported when PLAY needs it */
    });
  start = await initialPatch(params, embedId, !!juce);
  // Usage analytics and error reports (SHARING-0010): the website and embeds only; the plugin's page has no Worker (its
  // daily ping is native, R8). Off when the Worker's rate is 0 or the user turned it off (R5, R7).
  if (!juce) {
    const surface = embedId ? 'embed' : 'web';
    void startSentry(surface).catch(() => {
      /* no error reports: nothing to do */
    });
    if (startAnalytics(surface, pageRate())) {
      const ancestor = (location as Location & { ancestorOrigins?: DOMStringList })
        .ancestorOrigins?.[0];
      track('session_start', {
        referrer: embedId ? undefined : hostOf(document.referrer),
        embed_host: embedId ? hostOf(ancestor ?? document.referrer) : undefined,
      } as Record<string, string>);
      if (typeof WebAssembly === 'undefined') track('wasm_unsupported');
      if (start.source) track('patch_opened', { source: start.source });
    }
  }
  values = juce ? pluginValues(juce) : null;
  pluginStats = juce && values ? pluginUsageStats(juce, values, () => stage.redraw()) : null;
  addEventListener('pagehide', () => {
    track('session_summary', undefined, {
      seconds: Math.round(performance.now() / 1000),
      blocks_max: usage.blocksMax,
      blocks_deleted: usage.blocksDeleted,
      undos: usage.undos,
    });
    flushAnalytics(true);
  });
  // v1 App.CompositionId / App.SessionId: the open composition and (if this browser made it) the right to overwrite it.
  App.CompositionId = start.id;
  App.SessionId = sessionFor(start.id);
  session = { id: start.id, dirty: false };
  missingNote = start.missing && !juce ? MISSING_TEXT[start.missing] : null;
  if (missingNote && !embedId) {
    history.replaceState(null, '', location.pathname);
    params.delete('t');
  }
  // v1's Share panel reads the title from `&t=` (GetTitleFromUrl): put a saved title there when the link had none.
  if (start.title && !params.has('t') && !embedId)
    history.replaceState(
      null,
      '',
      `${location.pathname}?c=${start.id}&t=${encodeURI(start.title)}`,
    );
}
