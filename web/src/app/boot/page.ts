// The page as it opens: its URL, host (website, embed or plugin), start patch and session.
import { engineModule, EngineNode } from '../../audio/engineNode.ts';
import { setAudioSession } from '../../audio/session';
import { pluginUsageStats } from '../../analytics/pluginStats.ts';
import { accountOwned, canOverwrite, editToken, MISSING_TEXT } from '../../patch/server.ts';
import { App, applyHostLabels } from '../../v1ui/shim.ts';
import type { JuceBackend } from '../plugin/juceBackend.ts';
import { pluginValues, type PluginValuesClient } from '../pluginValues.ts';
import { initialPatch, type Start } from '../startPatch.ts';
import { takeLinkFromAddress } from './linkApproval.ts';
import { stage } from './pixi.ts';
import { sendSummaryWhenPageGoes, startSessionAnalytics } from './sessionAnalytics.ts';

export type { JuceBackend } from '../plugin/juceBackend.ts';

export const params = new URLSearchParams(location.search);
export const juce = (window as unknown as { __JUCE__?: { backend: JuceBackend } }).__JUCE__
  ?.backend;
export const embedId = embedIdFromPage();

/** SAVE / SHARE's MAKE VIDEO (CHG-0022), hidden until it gets its own work; `?video=1` shows it. */
export const VIDEO_EXPORT = params.get('video') === '1';
/** sessionStorage key: a sign-in begun from SAVE / SHARE goes back there (CHG-0035). */
export const AFTER_SIGN_IN = 'bd.afterSignIn';
/** Link-preview size: Open Graph's 1.91:1, as server/src/pages.ts THUMB. */
export const THUMB = { width: 1200, height: 630 } as const;

/** Back from Google sign-in (`?account=in|new`, SPEC-SHARING-ACCOUNTS R2a). */
export let signInReturn: string | null = null;
/** Made at load so START has nothing to wait for; an embed only compiles the WASM ahead. */
export let audio: { ctx: AudioContext; module: Promise<WebAssembly.Module> } | null = null;
export let start!: Start;
/** Values the plugin keeps (bd_get / bd_values), such as its usage stats choice (R7). */
export let values: PluginValuesClient | null = null;
export let pluginStats: { get: () => boolean; set: (on: boolean) => void } | null = null;
export let session!: { id: string | null; dirty: boolean };
/** Why a link opened no patch; the message bar says it once the stage shows. */
export let missingNote: string | null = null;

/** A server share id from `/embed/<id>` (the Worker also names it in a meta tag). */
export function embedIdFromPage(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="blokdust-embed"]')?.content;
  if (meta) return meta;
  return /\/embed\/([^/]+)\/?$/.exec(location.pathname)?.[1] ?? null;
}

export const accountOwnedClear = () => {
  accountOwned.clear();
};

/** v1 App.SessionId: this browser's edit token, or a marker when the account owns it (R9). */
export const sessionFor = (id: string | null): string | null =>
  editToken(id) ?? (canOverwrite(id) ? 'account' : null);

export function setSession<Value extends typeof session>(value: Value): Value {
  session = value;
  return value;
}

/** Making the context blocks the page a moment: now, before the start screen shows. */
function prepareAudio(): void {
  if (!juce && !embedId) {
    setAudioSession('playback'); // before the context exists, or iOS's silent switch mutes it
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    const module = EngineNode.prepare(ctx);
    module.catch(() => {
      /* reported when START awaits it */
    });
    audio = { ctx, module };
  }
  if (!juce && embedId)
    engineModule().catch(() => {
      /* reported when PLAY needs it */
    });
}

function openSession(): void {
  App.CompositionId = start.id;
  App.SessionId = sessionFor(start.id);
  session = { id: start.id, dirty: false };
  // A link that opened nothing leaves the address bar, so a reload starts as usual.
  missingNote = start.missing && !juce ? MISSING_TEXT[start.missing] : null;
  if (missingNote && !embedId) {
    history.replaceState(null, '', location.pathname);
    params.delete('t');
  }
  // v1's Share panel reads the title from `&t=` (GetTitleFromUrl).
  if (start.title && !params.has('t') && !embedId)
    history.replaceState(
      null,
      '',
      `${location.pathname}?c=${start.id}&t=${encodeURI(start.title)}`,
    );
}

export async function init(): Promise<void> {
  signInReturn = params.get('account');
  applyHostLabels(!!juce);
  takeLinkFromAddress();
  prepareAudio();
  start = await initialPatch(params, embedId, !!juce);
  startSessionAnalytics();
  values = juce ? pluginValues(juce) : null;
  pluginStats =
    juce && values
      ? pluginUsageStats(juce, values, () => {
          stage.redraw();
        })
      : null;
  sendSummaryWhenPageGoes();
  openSession();
}
