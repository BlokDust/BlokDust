import { SupportClient } from '../support/client.ts';
import { FeedbackPanel } from '../support/panel.ts';
// BlokDust 2 web app (CHG-0002): engine in an AudioWorklet, the v1-faithful stage, and v1's own UI (web/src/v1ui:
// header menus, options panel, zoom, bin, settings, share) driving it. The engine owns behaviour (ARCHITECTURE-0002);
// this file keeps the patch model (for autosave and share links) and mirrors it to the engine, stage and v1 UI.
import { PATCH_EXT, fileNameFor, insertBlocks, parsePatchFile, patchTitle } from '../patch/files.ts';
import { setAudioSession } from '../audio/session';
import { Application } from 'pixi.js';
import { EngineNode } from '../audio/engineNode.ts';
import type { Snapshot } from '../audio/protocol.ts';
import { CommandType, WasmEngine, defaultImpulse, hashAudio, hashStereo, hex, type Command } from '../engine/wasmEngine.ts';
import { engineModule } from '../audio/engineNode.ts';
import { App, applyHostLabels } from '../v1ui/shim.ts';
import { SAMPLE_GEN } from '../v1ui/ported/SampleGenData';
import { encodeWav } from '../audio/wav.ts';
import { BLOCKS, BLOCKS_BY_ID, type BlockDef } from '../generated/blocks.gen.ts';
import { drawBlocks } from '../stage/drawWorld.ts';
import { THEMES, type Theme } from '../generated/palettes.gen.ts';
import { loadPatch, relinks, targetCommands, type Macro, type Patch, type PatchBlock, type PatchSource } from '../patch/loadPatch.ts';
import { decodePatch, encodePatch, loadLocal, loadSession, saveLocal, saveSession } from '../patch/share.ts';
import { type GalleryState, type Missing, MISSING_TEXT, accountOwned, canOverwrite, editToken, isServerId, load as loadShared, loadOrWhy, remove as removeShared, save as saveShared } from '../patch/server.ts';
import * as account from '../account/client.ts';
import { appKey, setAppKey } from '../account/appKey.ts';
import { appPost, pollDevice, startDevice } from '../account/device.ts';
import { PLUGIN_SITE } from '../patch/site.ts';
import { audioInAsMicrophone } from '../patch/webInputs.ts';
import { activity } from '../account/activity.ts';
import * as gallery from '../gallery/client.ts';
import { DEFAULT_SOUNDS, PUBLIC_SITE, isDeadDefault, fetchFreesound, fingerprint, isPortable, openRemembered, pickAudioFile, refKey, rememberHandle, searchFreesound, type FileRef, type FreesoundRef, type SampleRef } from '../patch/samples.ts';
import { importV1, type V1Composition } from '../patch/importV1.ts';
import { Stage } from '../stage/Stage.ts';
import { drawLabels, labelAt, labelCssFont, labelRect, type Label } from '../stage/labels.ts';
import { drawInside, frameFor, inWindow, onClose } from '../stage/insideView.ts';
import { drawMakeStage, inBox, makeStageBox, type ButtonBox, type Rect } from '../stage/makeStageButton.ts';
import { frameBlocks } from '../stage/frameBlocks.ts';
import { starPos } from '../stage/starPos.ts';
import { gridToPx } from '../stage/metrics.ts';
import demo from '../demo/demo.patch.json';
import { attachNoteInputs, type MidiDevice } from '../input/keys.ts';
import { MpeParser } from '../input/mpe.ts';
import { loadV1Fonts } from '../chrome/v1Chrome.ts';
import { SAVE_WARNING, V1Scene, hideLinks } from '../v1ui/scene.ts';
import { COPY as PATCH_COPY } from '../v1ui/patches.ts';
import { SOUND_MAX, V1Block, withSound } from '../v1ui/blocks.ts';
import { LABEL_MENU_ID, openGateIds, setMenuHidden, setMonitors, setTableModule } from '../v1ui/newBlocks.ts';
import { padDown, padMove, padNotes, padUp, type PadHost } from '../v1ui/touchpadPanel.ts';
import { moveWavePinch, snapshotWave, startWavePinch, waveRowAt, wheelWave, type WavePinch } from '../v1ui/waveZoom.ts';
import { Waveform } from '../v1ui/ported/Core/Audio/Waveform';
import { drawUpArrow, type VideoChoice, type VideoProgressInfo } from '../v1ui/patches.ts';
import { videoSeconds } from '../video/length.ts';
import { startSource, type PatchSample } from '../video/sources.ts';
import { canShareFile, downloadFile, shareFile, videoFileName } from '../video/share.ts';
import type { Credit } from '../video/frame.ts';
import { analyticsAllowed, count, flushAnalytics, hostOf, pageRate, setAnalyticsAllowed, startAnalytics, track } from '../analytics/client.ts';
import { startSentry } from '../analytics/sentry.ts';

/** SAVE / SHARE's MAKE VIDEO (CHG-0022): hidden until the video export gets its own round of work (owner, 2026-11-17,
 * CHG-0035). `?video=1` shows it (its tests, and that work). */
const VIDEO_EXPORT = new URLSearchParams(location.search).get('video') === '1';
/** A dark theme: its background (palette 0) is dark (MODE STEREO, CONSOLE, SEA CUCUMBER, VOLCANOLOGIST). */
function isDarkTheme(t: Theme): boolean {
  const [r, g, b] = (t.colors[0].match(/[\d.]+/g) ?? ['0', '0', '0']).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}
/** sessionStorage key: a sign-in begun from SAVE / SHARE goes back there (CHG-0035). */
const AFTER_SIGN_IN = 'bd.afterSignIn';
/** Link-preview size (Open Graph's recommended 1.91:1; server/src/pages.ts THUMB). */
const THUMB = { width: 1200, height: 630 } as const;

interface JuceBackend {
  emitEvent(id: string, payload: unknown): void;
  addEventListener<T>(id: string, fn: (payload: T) => void): unknown;
}
interface ModelBlock { uid: string; type: string; x: number; y: number; params: Record<string, unknown> }

const typeIndex = (type: string) => BLOCKS.findIndex(b => b.id === type);
/** Params that hold engine ids of this session (an LFO's resolved target, AUDIO-0003): never taken from a patch. */
const SESSION_PARAMS = new Set(['targetBlock', 'targetParam']);
const DEF_BY_V1 = new Map<string, BlockDef>();
for (const d of BLOCKS) DEF_BY_V1.set(d.menuId, d);  // v1's type names, plus the post-2.0 blocks' menu ids

/** Tone r6 noteToFrequency ("c#4" → Hz), as v1's SampleGen calls it. */
const NOTE_INDEX: Record<string, number> = { cbb: -2, cb: -1, c: 0, 'c#': 1, cx: 2, dbb: 0, db: 1, d: 2, 'd#': 3, dx: 4, ebb: 2, eb: 3, e: 4, 'e#': 5, ex: 6,
  fbb: 3, fb: 4, f: 5, 'f#': 6, fx: 7, gbb: 5, gb: 6, g: 7, 'g#': 8, gx: 9, abb: 7, ab: 8, a: 9, 'a#': 10, ax: 11, bbb: 9, bb: 10, b: 11, 'b#': 12, bx: 13 };
function noteToFrequency(note: string): number {
  const parts = note.split(/(-?\d+)/);
  if (parts.length !== 3) return 0;
  return 440 * 2 ** ((NOTE_INDEX[parts[0].toLowerCase()] + (parseInt(parts[1], 10) + 1) * 12 - 69) / 12);
}

interface View { theme?: number; zoom?: number; drag?: { x: number; y: number } }
/** A server share id from `/embed/<id>` (the Worker also names it in a meta tag). */
function embedIdFromPage(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="blokdust-embed"]')?.content;
  return meta || (location.pathname.match(/\/embed\/([^/]+)\/?$/)?.[1] ?? null);
}
interface Start { patch: Patch; view: View; id: string | null; title?: string; /** The link opened no patch, and why. */ missing?: Missing; /** Its account's handle, when someone else's (SPEC-SHARING-GALLERY R15). */ by?: string | null; mine?: boolean; published?: boolean; liked?: boolean; likes?: number; views?: number;
  /** Where the patch came from (SPEC-SHARING-USAGE-ANALYTICS patch_opened). */ source?: 'link' | 'embed' | 'autosave' | 'demo' | 'v1' }
/** Start-up patch: a `?c=` share (server id: CHG-0003; `p…` token: Phase 1), else a `?v1=` v1 composition JSON
 * (DATA-0004, with its theme/zoom/offset), else the autosave, else the demo. */
async function initialPatch(params: URLSearchParams, embedId: string | null, plugin = false): Promise<Start> {
  // The plugin's patch comes only from the processor (bd_patch, with the DAW project). The web view keeps
  // localStorage between sessions, so its autosave would flash up first (owner, Logic, 2026-11-12).
  if (plugin) return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null };
  const c = embedId ?? params.get('c');
  if (c && isServerId(c)) {
    const session = loadSession(), local = loadLocal();
    // Unsaved edits to this same composition (autosave) win over its saved version, as before a reload.
    if (!embedId && session.id === c && session.dirty && local) return { patch: local, view: {}, id: c, source: 'autosave' };
    const r = await loadOrWhy(c);
    if (!('missing' in r)) return { patch: r.patch, view: {}, id: c, title: r.title, by: r.by ?? null, mine: !!r.mine, published: !!r.published, liked: !!r.liked, likes: r.likes ?? 0, views: r.views ?? 0, source: embedId ? 'embed' : 'link' };
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null, missing: r.missing };
  }
  if (c) {
    const p = await decodePatch(c);
    if (p) return { patch: p, view: {}, id: null, source: 'link' };
    // Not a patch link at all (a made-up or cut-off id): say so on a blank stage, not this browser's last one.
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null, missing: 'unknown' };
  }
  const v1 = params.get('v1');
  if (v1) { try { const r = importV1(JSON.parse(v1) as V1Composition); return { patch: r.patch, view: r.view, id: null, source: 'v1' }; } catch { /* fall through */ } }
  if (params.has('demo')) return { patch: demo as Patch, view: {}, id: null, source: 'demo' };
  const local = loadLocal();
  return { patch: local ?? (demo as Patch), view: {}, id: loadSession().id, source: local ? 'autosave' : 'demo' };
}

/** v1 App.SessionId: the right to save over a composition: this browser's edit token, or, when the signed-in account
 * owns it (SPEC-SHARING-ACCOUNTS R9), a marker (the cookie does the rest). */
const accountOwnedClear = () => accountOwned.clear();
const sessionFor = (id: string | null): string | null => editToken(id) ?? (canOverwrite(id) ? 'account' : null);

async function main() {
  const params = new URLSearchParams(location.search);
  /** Back from Google sign-in (`?account=in|new`, SPEC-SHARING-ACCOUNTS R2a). */
  const signInReturn = params.get('account');
  const juce = (window as unknown as { __JUCE__?: { backend: JuceBackend } }).__JUCE__?.backend;
  applyHostLabels(!!juce);
  const embedId = embedIdFromPage();
  // A plugin's code to approve (SHARING-0011): `?link=CODE` (the site's /link?code= sends people here). It is kept
  // for this tab while the person signs in (Google and Apple leave the page and come back), for 10 minutes.
  const LINK_KEY = 'blokdust2.link';
  const linkArrival = !juce && !embedId ? params.get('link') : null;
  if (linkArrival !== null) {
    try { sessionStorage.setItem(LINK_KEY, JSON.stringify({ code: linkArrival.slice(0, 16), at: Date.now() })); } catch { /* private window: the code goes with this page only */ }
    params.delete('link');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params.toString()}` : ''}`);
  }
  const pendingLink = (): string | null => {
    try { const v = JSON.parse(sessionStorage.getItem(LINK_KEY) ?? 'null') as { code: string; at: number } | null; return v && Date.now() - v.at < 600_000 ? v.code : null; }
    catch { return linkArrival; }
  };
  const forgetLink = () => { try { sessionStorage.removeItem(LINK_KEY); } catch { /* nothing kept */ } };
  // START has nothing to wait for (owner, 2026-11-12: it took seconds): the AudioContext (suspended until a press
  // resumes it), the worklet and the WASM are made now, alongside the patch, fonts and stage. The context's creation
  // also blocks the page for a moment, which now falls before the start screen shows. An embed (several may share a
  // page, each with its own context) only fetches and compiles the WASM ahead; its PLAY makes its context.
  const audio = !juce && !embedId ? (() => {
    setAudioSession('playback');  // before the context exists, or iOS's silent switch mutes it
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    const module = EngineNode.prepare(ctx);
    module.catch(() => { /* reported when START awaits it */ });
    return { ctx, module };
  })() : null;
  if (!juce && embedId) engineModule().catch(() => { /* reported when PLAY needs it */ });
  const start = await initialPatch(params, embedId, !!juce);
  // Usage analytics and error reports (SHARING-0010): the website and embeds only; the plugin's page has no Worker (its
  // daily ping is native, R8). Off when the Worker's rate is 0 or the user turned it off (R5, R7).
  if (!juce) {
    const surface = embedId ? 'embed' : 'web';
    void startSentry(surface).catch(() => { /* no error reports: nothing to do */ });
    if (startAnalytics(surface, pageRate())) {
      const ancestor = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins?.[0];
      track('session_start', { referrer: embedId ? undefined : hostOf(document.referrer), embed_host: embedId ? hostOf(ancestor ?? document.referrer) : undefined } as Record<string, string>);
      if (typeof WebAssembly === 'undefined') track('wasm_unsupported');
      if (start.source) track('patch_opened', { source: start.source });
    }
  }
  /** Plugin: the install's usage stats choice (R7), as the processor last said (bd_analytics). */
  let pluginStats = true;
  /** Session totals for session_summary (sent when the page goes). */
  const usage = { blocksMax: 0, blocksDeleted: 0, undos: 0, keys: false, midi: false };
  addEventListener('pagehide', () => {
    track('session_summary', undefined, { seconds: Math.round(performance.now() / 1000), blocks_max: usage.blocksMax, blocks_deleted: usage.blocksDeleted, undos: usage.undos });
    flushAnalytics(true);
  });
  // v1 App.CompositionId / App.SessionId: the open composition and (if this browser made it) the right to overwrite it.
  App.CompositionId = start.id; App.SessionId = sessionFor(start.id);
  let session = { id: start.id, dirty: false };
  // A link that opened no patch (owner, 2026-11-18): it leaves the address bar (a reload starts as usual), and the
  // message bar says why once the stage shows. This browser's autosave is left as it was (autosaveIsThis is off).
  const missingNote = start.missing && !juce ? MISSING_TEXT[start.missing] : null;
  if (missingNote && !embedId) { history.replaceState(null, '', location.pathname); params.delete('t'); }
  // v1's Share panel reads the title from `&t=` (GetTitleFromUrl): put a saved title there when the link had none.
  if (start.title && !params.has('t') && !embedId) history.replaceState(null, '', `${location.pathname}?c=${start.id}&t=${encodeURI(start.title)}`);
  // The colour theme is the user's preference, kept in this browser (owner review 3, 2026-11-16: it went back to the
  // first on every reload). `?theme=` (embeds, tests) comes first; a v1 composition's own theme only when none is kept.
  const THEME_KEY = 'blokdust.theme';
  const keptTheme = (() => { if (embedId) return null; try { const v = localStorage.getItem(THEME_KEY); return v === null ? null : Number(v); } catch { return null; } })();
  // A first visit (no theme kept, none asked for) gets a theme at random from those that match the system's light or
  // dark setting (owner, 2026-11-17, CHG-0035: shared patches in every colour, and the user's preference kept), and
  // keeps it. Automated browsers keep the first theme (their screenshots expect it) unless the URL asks (`firsttheme=1`).
  const firstTheme = (): number | null => {
    if (juce || embedId || (navigator.webdriver && params.get('firsttheme') !== '1')) return null;
    let dark = false;
    try { dark = matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* no media queries: light */ }
    const pool = THEMES.filter(t => isDarkTheme(t) === dark).map(t => t.index);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? 0;
    try { localStorage.setItem(THEME_KEY, String(pick)); } catch { /* private mode: picked again next time */ }
    return pick;
  };
  let theme: Theme = THEMES[Math.min(Number(params.get('theme') ?? keptTheme ?? start.view.theme ?? firstTheme() ?? 0), THEMES.length - 1)] ?? THEMES[0];

  const app = new Application();
  // Transparent: the static stage is an on-page Canvas2D layer behind Pixi (Stage 'canvas' renderer, UI-0005).
  await app.init({ width: window.innerWidth, height: window.innerHeight, resolution: devicePixelRatio, autoDensity: true, antialias: true, background: 0x000000, backgroundAlpha: 0 });
  document.getElementById('stage')!.appendChild(app.canvas);
  // The stage fills the window (as Pixi's resizeTo did), except while a text field is being typed into on a touch
  // screen: the keyboard only makes the window shorter, and laying the app out for that left it tiny and stuck when
  // the keyboard went (owner, iPhone, 2026-11-18). When the field lets go, the page scrolls back and is measured again.
  {
    const touch = matchMedia('(pointer: coarse)').matches;
    const typing = () => { const a = document.activeElement; return touch && !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
    let w = window.innerWidth, h = window.innerHeight;
    const fit = () => {
      const nw = window.innerWidth, nh = window.innerHeight;
      if (nw === w && (nh === h || typing())) return;
      w = nw; h = nh;
      app.renderer.resize(w, h);
    };
    window.addEventListener('resize', fit);
    document.addEventListener('focusout', () => { for (const t of [60, 350, 900]) setTimeout(() => { if (!typing()) { window.scrollTo(0, 0); fit(); } }, t); });
  }
  // iOS Safari's long-press magnifier and double-tap recognisers run on the touch stream, under Pointer Events:
  // cancelling pointerdown does not stop them, cancelling touchstart does (Funputs #45). Only the stage: text
  // fields and menus keep their defaults. The stage is driven by pointer events alone, so nothing is lost.
  document.getElementById('stage')!.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  // Two fingers on the stage are BlokDust's pinch zoom (CHG-0005 task 8), not Safari's page zoom (its gesture events
  // bypass touch-action on older iOS).
  document.getElementById('stage')!.addEventListener('gesturestart', e => e.preventDefault(), { passive: false } as AddEventListenerOptions);
  const stage = new Stage(app, theme);
  stage.setTheme(theme);
  await loadV1Fonts();

  // ---- model: the patch as the user sees it (autosaved; the share link encodes it) ----
  const model = new Map<number, ModelBlock>();
  const automation = new Map<string, number>();  // Dust 1–8 (plugin): "<id>:<param>" → slot
  const ccBySlot = new Map<number, number>();     // Dust slot → learned MIDI CC (CHG-0004 3.9)
  const v1Blocks = new Map<number, V1Block>();
  let seed = 1, nextId = 1;
  /** The patch tempo (SIMULATION-0003): saved only once set, so older patches stay byte-identical. */
  let tempo: number | undefined;
  /** The account's running totals are counted (SPEC-SHARING-ACCOUNTS R16): the website, not the plugin or embeds. */
  let countActivity = false;
  let engine: EngineNode | null = null;
  /** The plugin runs as the standalone app (the processor says so with its patch): no DAW to pass keys on to. */
  let standalone = false;
  /** The plugin runs on iPad (CHG-0025): no Trash. */
  let ios = false;
  /** Run once START has started audio and the stage shows (panels opened before it never slide in). */
  const afterStart: (() => void)[] = [];
  /** Commands to the engine (the plugin: to its processor), as given. */
  let sendRaw = (cmds: Command[]) => engine?.send(cmds);
  /**
   * Stage blocks (CHG-0021, SCOPE-0006). `macros`: what is inside each, by the Stage block's patch id.
   * `innerIds`: the engine ids its inner blocks have in this session. `inside`: the Stage being looked into; the page
   * then shows and edits its inner world, the outer world's blocks set aside (the engine runs both all along).
   */
  const macros = new Map<string, Macro>();
  const innerIds = new Map<string, { ids: Record<string, number>; nextId: number }>();
  /** The audio of samplers inside each Stage (by the Stage's and the block's patch ids): sent to its inner world when it
   * is built, and shown when it is looked into (owner, 2026-11-14: every block can go inside). */
  const innerSamples = new Map<string, Map<string, AudioBuffer>>();
  /** How many times each Stage's inner world has been built: audio that arrives for an older one is dropped. */
  const stageBuilds = new Map<string, number>();
  interface Outer { model: Map<number, ModelBlock>; v1Blocks: Map<number, V1Block>; samples: Map<number, AudioBuffer>; missing: Set<number>; labels: Label[];
    connectionOrder: [string, string][]; nextId: number; view: { x: number; y: number; zoom: number }; undo: unknown[]; redo: unknown[] }
  let inside: { stageId: number; stageUid: string; outer: Outer; image: HTMLCanvasElement; blockX: number; blockY: number; grid: number } | null = null;
  /** Commands for the world on screen: inside a Stage, they go to its inner world. */
  const send = (cmds: Command[]) => sendRaw(inside ? cmds.map(c => ({ ...c, stage: inside!.stageId })) : cmds);
  /** Which world the snapshots come from: Stage block `id`'s inner world, or 0 for the outer one (the plugin: its
   * processor, CHG-0038). */
  const viewWorld = (id: number) => { engine?.setView(id); juce?.emitEvent('bd_stageView', { stage: id }); };
  /** Plugin messages about a block name the world it is in: `stage` while looking into a Stage (CHG-0038). */
  const atStage = () => (inside ? { stage: inside.stageId } : {});
  /** The plugin's processor keeps the DAW project's patch: what is inside each Stage goes to it when that changes. */
  let sentMacros = '[]', macrosTimer: ReturnType<typeof setTimeout> | undefined;
  const syncMacros = () => {
    if (!juce) return;
    clearTimeout(macrosTimer);
    macrosTimer = setTimeout(() => {
      const ms = JSON.stringify(toPatch().macros ?? []);
      if (ms !== sentMacros) { sentMacros = ms; juce.emitEvent('bd_macros', { macros: JSON.parse(ms) }); }
    }, 50);
  };
  /** Sample references by `track` key (DATA-0005): the patch keeps the ones its blocks use. */
  const refs = new Map<string, SampleRef>();
  /** R4a (owner, 2026-11-12): the order the connected pairs connected in, as patch ids, oldest first. A source's
   * effects run in that order (v1). It starts from the opened patch and then follows the engine (each snapshot that
   * carries connections lists them oldest first); patches save it, and loading replays it (Relink). */
  let connectionOrder: [string, string][] = [];
  /** Labels (CHG-0020, UI-0011): notes on the stage, kept in the patch. */
  const labels: Label[] = [];
  /** Labels in the multi-selection, by id (owner, 2026-11-14): they move, copy, delete and go into a Stage with the
   * selected blocks (stage.selected holds the blocks). */
  const selectedLabels = new Set<string>();
  const selLabels = () => labels.filter(l => selectedLabels.has(l.id));
  const uidToId = () => new Map([...model].map(([id, b]) => [b.uid, id]));
  /** The world on screen as patch parts: its blocks, their connection order, its labels. */
  const worldParts = (m: Map<number, ModelBlock> = model, order = connectionOrder, lbls = labels) => {
    const uids = new Set([...m.values()].map(b => b.uid));
    return { blocks: [...m.values()].map(b => ({ id: b.uid, type: b.type, x: b.x, y: b.y, params: b.params })) as PatchBlock[],
      order: order.filter(([a, b]) => uids.has(a) && uids.has(b)), labels: lbls };
  };
  /** What is inside the Stage being looked into, as it is now. */
  const innerMacro = (): Macro => {
    const w = worldParts();
    return { block: inside!.stageUid, blocks: w.blocks, ...(w.order.length ? { connectionOrder: w.order } : {}), ...(w.labels.length ? { labels: w.labels.map(l => ({ ...l })) } : {}), view: currentView() };
  };
  /** The whole patch: the outer world, with what is inside each of its Stage blocks (R7). Looking into a Stage, the
   * inner world on screen is folded into its macro first. */
  /** SPEC-PATCH-FORMAT-V2 R11: the saved patches whose blocks were inserted into this one (owner review 3). */
  let sources: PatchSource[] = [];
  /** The sources that still have blocks here, with only those blocks. */
  const SOURCES_MAX = 32;  // the newest; older ones are still reachable through the newer sources' own lists
  const liveSources = (ids: Set<string>) => sources.map(s => ({ ...s, blocks: s.blocks.filter(b => ids.has(b)) })).filter(s => s.blocks.length).slice(-SOURCES_MAX);
  const readSources = (v: unknown): PatchSource[] => Array.isArray(v) ? v.filter((s): s is PatchSource => !!s && typeof s.id === 'string' && Array.isArray(s.blocks))
    .map(s => ({ id: s.id, ...(typeof s.rev === 'number' ? { rev: s.rev } : {}), ...(typeof s.title === 'string' ? { title: s.title } : {}), ...(typeof s.by === 'string' ? { by: s.by } : {}), blocks: s.blocks.filter(b => typeof b === 'string') })) : [];
  const toPatch = (): Patch => {
    if (inside) macros.set(inside.stageUid, innerMacro());
    const w = inside ? worldParts(inside.outer.model, inside.outer.connectionOrder, inside.outer.labels) : worldParts();
    const stages = new Set(w.blocks.filter(b => b.type === 'source.stage').map(b => b.id));
    const ms = [...macros.values()].filter(m => stages.has(m.block) && (m.blocks.length || m.labels?.length));
    const used = new Set([...w.blocks, ...ms.flatMap(m => m.blocks)].map(b => b.params?.track).filter((t): t is string => typeof t === 'string'));
    const r = Object.fromEntries([...refs].filter(([k]) => used.has(k)));
    const src = liveSources(new Set(w.blocks.map(b => b.id).filter((id): id is string => !!id)));
    return { format: 'blokdust.patch', version: 2, seed, ...(tempo !== undefined ? { tempo } : {}),
      blocks: w.blocks,
      ...(Object.keys(r).length ? { refs: r } : {}), ...(w.order.length ? { connectionOrder: w.order } : {}),
      ...(w.labels.length ? { labels: w.labels.map(l => ({ ...l })) } : {}),
      ...(ms.length ? { macros: ms } : {}),
      ...(src.length ? { sources: src } : {}),
      view: inside ? inside.outer.view : currentView() };
  };
  /** Engine commands that build what is inside Stage block `id` (patch id `uid`), remembering its inner blocks' ids. */
  function stageCommands(id: number, uid: string): Command[] {
    const m = macros.get(uid), blocks = (m?.blocks ?? []).filter(b => BLOCKS_BY_ID.has(b.type));
    if (!blocks.length) return [];
    try {
      const loaded = loadPatch({ blocks, connectionOrder: m!.connectionOrder });
      innerIds.set(uid, { ids: Object.fromEntries(loaded.ids), nextId: loaded.nextId });
      const keyOf = new Map([...loaded.ids].map(([k, v]) => [v, k]));  // the plugin keeps the inner blocks' patch ids
      return loaded.commands.map(c => ({ ...c, stage: id, ...(c.type === CommandType.AddBlock && keyOf.has(c.id) ? { key: keyOf.get(c.id) } : {}) }));
    } catch (e) { console.warn('BlokDust: a Stage block could not be filled', e); return []; }
  }
  /** Build Stage block `id`'s inner world from its macro, then give its samplers their audio (and the Microphone its input). */
  function buildStage(id: number, uid: string): void {
    sendRaw(stageCommands(id, uid));
    void fillStageSamples(id, uid);
    syncMacros();
  }
  /** Audio for the samplers inside Stage block `id`: what was loaded already, else from their references (a sound, a
   * remembered file, a SampleGen's recipe). Runs from outside; looking in shows the same audio (enterStage). */
  async function fillStageSamples(id: number, uid: string): Promise<void> {
    const m = macros.get(uid), ids = innerIds.get(uid)?.ids;
    if (juce || !engine || !m || !ids) return;
    const build = (stageBuilds.get(uid) ?? 0) + 1;
    stageBuilds.set(uid, build);
    const audio = innerSamples.get(uid) ?? new Map<string, AudioBuffer>();
    innerSamples.set(uid, audio);
    if (m.blocks.some(b => needsInput(b.type))) listen();
    await Promise.all(m.blocks.map(async blk => {
      const iid = blk.id === undefined ? undefined : ids[blk.id];
      if (iid === undefined || blk.id === undefined) return;
      const buf = audio.get(blk.id) ?? await innerBuffer(blk).catch(e => { console.warn('BlokDust: a sampler inside a Stage has no audio', e); return null; });
      if (!buf || stageBuilds.get(uid) !== build) return;  // the Stage was built again meanwhile
      audio.set(blk.id, buf);
      engine?.sendSample(iid, buf, id);
    }));
  }
  /** A sampler's audio from what the patch says of it, without it being on show. */
  async function innerBuffer(blk: PatchBlock): Promise<AudioBuffer | null> {
    const p = (blk.params ??= {});
    if (blk.type === 'source.sample-gen') return generateBuffer(p);
    if (!SAMPLERS.has(blk.type)) return null;
    const t = p.track ?? BLOCKS_BY_ID.get(blk.type)?.params.find(q => q.key === 'track')?.default;
    let bytes: ArrayBuffer | null = null;
    if (isDeadDefault(t)) {
      const d = DEFAULT_SOUNDS[blk.type];
      if (!d) return null;
      const ref = { ...d };
      bytes = await fetchFreesound(ref, blk.type === 'fx.convolver' ? 2.5 : undefined);
      const key = refKey(ref);
      refs.set(key, ref);
      Object.assign(p, { track: key, trackName: ref.name.toUpperCase().slice(0, 30), user: ref.username, permalink: ref.url });
    } else if (typeof t === 'string') {
      const ref = refs.get(t);
      if (t.startsWith('freesound:') && ref?.provider === 'freesound') bytes = await fetchFreesound(ref, blk.type === 'fx.convolver' ? 2.5 : undefined);
      else if (t.startsWith('file:') && ref?.provider === 'file' && ref.hash) bytes = await (await openRemembered(ref.hash, false))?.arrayBuffer() ?? null;
    }
    return bytes ? new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes) : null;
  }
  /** Audio to block `id` in the world on show. */
  const sendSample = (id: number, buffer: AudioBuffer) => engine?.sendSample(id, buffer, inside?.stageId ?? 0);
  const ZOOM_MIN = 0.15, ZOOM_MAX = 4;  // v1 ZoomButtons' range, out to 0.15 (owner, 2026-11-17, CHG-0035)
  const round3 = (v: number) => Math.round(v * 1000) / 1000;
  // The view settles (owner, 2026-11-12): the plugin's processor keeps it with the DAW project (bd_view); the website's
  // autosave keeps it (not an unsaved change). Checked twice a second, sent once it stops changing.
  // The autosave is only rewritten while it holds this patch (restored from it, or edited since): opening a link must
  // not replace the user's own unsaved work.
  let viewSent = '', viewSeen = '';
  setInterval(() => {
    try {
      if (embedId || !probe.started) return;
      const v = JSON.stringify(currentView());
      if (v !== viewSeen) { viewSeen = v; return; }  // still moving
      if (v === viewSent) return;
      viewSent = v;
      if (juce) juce.emitEvent('bd_view', JSON.parse(v));
      else if (autosaveIsThis) saveLocal(toPatch());
    } catch { /* main() still starting */ }
  }, 500);
  /** The view a patch is saved with (owner, 2026-11-12): zoom and the stage offset, in grid units. */
  const currentView = () => ({ x: round3(stage.drag.x), y: round3(stage.drag.y), zoom: round3(stage.zoom) });
  /** Show a patch's saved view (opening it, or the plugin's patch arriving). */
  function applyView(v: Patch['view']): void {
    if (!v || !Number.isFinite(v.zoom) || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return;
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom)), drag = { x: v.x, y: v.y };
    stage.setView(zoom, drag);
    scene.setView(zoom, drag);
    const dragger = (scene as unknown as { MainSceneDragger?: { Destination: { x: number; y: number } } }).MainSceneDragger;
    if (dragger) { dragger.Destination.x = drag.x; dragger.Destination.y = drag.y; }
    scene.pinchEnd();  // the zoom buttons step on from the nearest of v1's levels
    uiSync = true;
  }
  /** A patch never opens with every block out of sight (owner, 2026-11-19: a saved view far from its blocks played
   * with an empty stage): then the view frames them, as opening a Stage does (frameBlocks). */
  function keepBlocksInView(): void {
    const m = stage.metrics, bs = [...model.values()];
    if (!bs.length || !m.width || !m.height) return;
    const seen = bs.some(b => { const [x, y] = gridToPx(m, b.x, b.y); return x > 0 && x < m.width && y > 0 && y < m.height; });
    if (!seen) applyView(frameBlocks(bs, undefined, { width: m.width, height: m.height, unit: m.unit, area: { x: 0, y: 0, w: m.width, h: m.height } }));
  }
  const hostSystem: Record<string, unknown> = {};
  juce?.addEventListener<Record<string, unknown>>('bd_supportSystem', value => { Object.assign(hostSystem, value); });
  const supportClient = !embedId ? new SupportClient({ patch: toPatch, plugin: !!juce,
    system: () => ({ sampleRate: App.Audio.sampleRate, ...hostSystem }) }) : null;
  // FEEDBACK's REPORT A PATCH (CHG-0041): the gallery patch on the stage that isn't yours; the gallery's moderation.
  const feedbackPanel = supportClient ? new FeedbackPanel(supportClient, () => stage.redraw(), {
    target: () => (credit?.published ? { id: credit.id, title: credit.title, by: credit.by } : null),
    signedIn: () => !!accountPage()?.Account,
    signIn: () => (scene.SettingsPanel as any).openAccount?.(),
    report: async (id, reason) => { await gallery.report(id, reason); },
  }) : null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** The autosave holds the patch on screen (it was restored from it, or edited since). */
  let autosaveIsThis = !params.has('c') && !params.has('v1') && !params.has('demo') && !embedId;
  const changed = () => {
    if (juce) { syncMacros(); return; }  // in the plugin the DAW project keeps the patch (the processor has it)
    if (embedId) return;  // the embed player never autosaves
    clearTimeout(saveTimer);
    autosaveIsThis = true;
    saveTimer = setTimeout(() => { saveLocal(toPatch()); if (session.id && !session.dirty) { session.dirty = true; saveSession(session); } checkOwnDirty(); }, 300);
  };

  /** SAVE's two ways (SHARING-0011): made once each, so a page holding one keeps it. */
  type LinkWay = NonNullable<import('../v1ui/patches.ts').PatchesHost['links']>;
  const linkWays: { plugin?: LinkWay; web?: LinkWay } = {};
  const scene = new V1Scene({
    openStage: id => enterStage(id),
    loadStagePatch: id => loadStagePatch(id),
    resetCounter: id => send([{ type: CommandType.Reset, id }]),
    feedback: feedbackPanel ?? undefined,
    createBlock: (v1Type, gx, gy) => {
      if (v1Type === LABEL_MENU_ID) { newLabel(gx, gy); return null; }
      // A Stage made while several blocks are selected takes them inside (CHG-0021).
      if (v1Type === 'Stage' && selection.size > 1) { const id = wrapInStage([...selection], gx, gy, [...selectedLabels]); if (id !== null) { startDrag(id, 0, 0, true); return id; } }  // not a block: it follows the pointer by itself
      const def = DEF_BY_V1.get(v1Type);
      if (!def) return null;
      // A new Emitter, Pulse or Stereo Delay starts in tempo sync (owner, CHG-0004; the delay's 1/8 at 120 BPM is v1's
      // 0.25 s); saved patches without it keep v1 timing.
      const id = addBlock(def.id, gx, gy, def.id === 'power.emitter' || def.id === 'power.pulse' || def.id === 'fx.stereo-delay' ? { sync: true } : {});
      pushUndo({ kind: 'add', uids: uidsOf([id]) });
      count('block_added', def.id);
      usage.blocksMax = Math.max(usage.blocksMax, model.size);
      startDrag(id, 0, 0, true);
      return id;
    },
    // A drop on the trash (v1 TrashCan.MouseUp → DeleteSelectedBlock) is deleted by pointerup, with its group, as one step.
    deleteBlock: id => { if (!drag) deleteBlocks([id]); },
    // Settings › About (SPEC-SHARING-USAGE-ANALYTICS R7): this browser's choice; in the plugin, the install's (the
    // processor keeps it and sends it with bd_analytics).
    usageStats: juce
      ? { get: () => pluginStats, set: on => { pluginStats = on; juce.emitEvent('bd_analytics', { on }); } }
      : { get: () => analyticsAllowed(), set: on => { setAnalyticsAllowed(on); } },
    setParam: (id, key, value) => {
      const b = model.get(id), def = b && BLOCKS_BY_ID.get(b.type);
      const p = def?.params.findIndex(q => q.key === key) ?? -1;
      if (!b || p < 0) return;
      b.params[key] = value;
      send([{ type: CommandType.SetParam, id, param: p, value }]);
      changed();
    },
    setTheme: n => {
      theme = THEMES[n] ?? THEMES[0]; stage.setTheme(theme); uiSync = true; stage.redraw();
      if (!embedId) try { localStorage.setItem(THEME_KEY, String(theme.index)); } catch { /* private mode */ }
    },
    setZoom: z => { stage.setView(z, stage.drag); },
    setDrag: d => { stage.setView(stage.zoom, d); },
    // Tone.Volume dB → gain is 2^(dB/6); the value v1 writes is the one it later reads back (20·log10 form).
    loadSample: id => void pickSample(id),
    searchSamples: (q, max) => searchFreesound(q, max),
    loadFreesound: (id, sound, display) => {
      const ref: FreesoundRef = { provider: 'freesound', ...sound };
      // Plugin: the processor downloads and decodes it for its native engine (CHG-0004 3.6).
      if (juce) { juce.emitEvent('bd_loadUrl', { id, ref, display, maxSeconds: maxSecondsFor(id) ?? 0, ...atStage() }); return; }
      void whileLoading(id, async () => useSample(id, ref, await fetchFreesound(ref, maxSecondsFor(id)), true, display))
        .catch(err => { console.warn('BlokDust: Freesound sound unavailable', err); markMissing(id); });
    },
    reverseSample: (id, on) => reverseSample(id, on),
    setText: (id, key, value) => setParams(id, { [key]: value }),
    tempo: () => tempo ?? 120,
    setTempo: bpm => { tempo = Math.max(40, Math.min(240, bpm)); sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]); changed(); },
    hasLocalFiles: () => [...model.values()].some(b => !isPortable(b.params.track)),
    setMasterDb: db => sendRaw([{ type: CommandType.SetMaster, id: 0, value: db <= -99 ? 0 : 2 ** (db / 6) }]),
    setWorldPower: on => { sendRaw([{ type: CommandType.WorldPower, id: 0, value: on ? 1 : 0 }]); stage.redraw(); },  // the whole patch, every stage (owner)
    setPowerMode: mode => { juce?.emitEvent('bd_powerMode', { mode }); stage.redraw(); },
    resetScene: () => {
      setGuarded(false);  // a new patch is yours (CHG-0041)
      for (const id of [...model.keys()]) removeBlock(id);
      if (inside) leaveStage(false);
      // The old patch's particles go with it (SPEC-SIMULATION-POWER-AND-PARTICLES R1b; owner, 2026-11-18).
      sendRaw([{ type: CommandType.Reset, id: 0 }]);
      labels.length = 0; selectedLabels.clear(); endLabelEdit(false);
      macros.clear(); innerIds.clear(); innerSamples.clear(); sources = [];
      stage.setView(1, { x: 0, y: 0 });
      history.replaceState(null, '', location.pathname);  // v1 AddressBarManager.StripURL
      session = { id: null, dirty: false }; saveSession(session);
      shareLink = null; credit = null; undoStack.length = 0; redoStack.length = 0; endPlacing(true);
      setBaseline(); checkOwnDirty();
      track('patch_created', { from: 'reset' });
    },
    share: async (mode, title, gallery) => {
      const patch = toPatch();
      lastGallery = null;
      try {
        const thumb = stage.thumbnail(THUMB.width, THUMB.height, { title }).toDataURL('image/png').split(',')[1];
        const r = await saveShared(mode, App.CompositionId, { patch, title, thumb, ...(gallery !== undefined ? { gallery } : {}) });
        if (r) {
          lastGallery = r.gallery ?? null;
          App.CompositionId = r.id; App.SessionId = sessionFor(r.id);
          session = { id: r.id, dirty: false }; saveSession(session); if (!juce) saveLocal(patch);
          return r.id;
        }
      } catch (e) { console.warn('BlokDust: saving to the server failed; sharing as a link instead', e); track('save_failed', { kind: 'link' }); }
      return encodePatch(patch);  // no backend (or it failed): Phase 1's self-contained link
    },
    toggleRecording: id => void toggleRecording(id),
    downloadRecording: id => downloadRecording(id),
    generateSample: id => generateSample(id, false),
    setSound: (id, n, make) => {  // SampleGen's SOUND slider (CHG-0035): the number while it moves, the wave on release
      if (model.get(id)?.params.sound !== n) setParams(id, { sound: n });
      if (make && soundMade.get(id) !== n) { soundMade.set(id, n); generateSample(id, false); }
    },
    themes: () => THEMES,
    connectedIds: id => { const out: number[] = [], c = probe.connections; for (let i = 0; i + 1 < c.length; i += 2) { if (c[i] === id) out.push(c[i + 1]); else if (c[i + 1] === id) out.push(c[i]); } return out; },
    targetOf: id => {
      const t = model.get(id)?.params.target, colon = typeof t === 'string' ? t.lastIndexOf(':') : -1;
      if (typeof t !== 'string' || colon < 0) return null;
      const target = idOfUid(t.slice(0, colon));
      return target === undefined ? null : { id: target, param: t.slice(colon + 1) };
    },
    setTarget: (id, target) => {
      const b = model.get(id), text = target && model.get(target.id) ? `${model.get(target.id)!.uid}:${target.param}` : '';
      if (!b) return;
      b.params.target = text;
      const v = v1Blocks.get(id); if (v) v.Params.target = text;
      syncTargets();
      changed();
    },
    // ---- Patches panel (CHG-0005; SAVE / OPEN tabs, owner 2026-11-10): `.blokdust` files ----
    // OPEN lists only the user's own patches on the web (owner review 3, 2026-11-16): the built-in presets are
    // @blokdust's EXAMPLES in the gallery. The plugin has no gallery, so it keeps them under its own.
    listPatches: async () => juce  // signed in (SHARING-0011): the account's patches first, as on the website
      ? [...(appKey() ? await accountItems() : []), ...await nativePatches(), ...PRESETS.map(p => ({ name: p.name, detail: 'Preset', key: `preset:${p.file}` }))]
      : await (async () => {
        // One list (owner, 2026-11-18): the account's patches once each, then this browser's own copies that aren't
        // among them (saves to the computer, links made signed out). A copy remembers its link; older ones without it
        // are matched by name.
        const acct = await accountItems(), ids = new Set(acct.map(a => a.key.slice(5))), names = new Set(acct.map(a => a.name));
        const local = myPatches().filter(m => (m.id ? !ids.has(m.id) : !names.has(m.title)));
        return [...acct, ...local.map(m => ({ name: m.title, detail: savedOn(m.saved), key: `mine:${m.title}`, removable: true, ...(m.id ? { link: m.id } : {}) }))];
      })(),
    savePatch: title => savePatchFile(title),
    openPatch: (item, mode) => openPatchItem(item.key, mode),
    pickPatchFile: () => pickPatchFile(),
    usePickedFile: mode => { if (picked) { const p = picked; picked = null; usePatch(p.patch, p.title, mode); } },
    isDirty: () => model.size > 0 && contentOf(toPatch()) !== baseline,
    hasBlocks: () => model.size > 0,
    removePatch: async item => {
      if (item.key.startsWith('acct:')) {  // a real delete (owner, 2026-11-18): the link and the gallery entry go
        const id = item.key.slice(5);
        try { await removeShared(id); } catch { scene.message('That patch couldn’t be deleted. Try again.', { seconds: 4 }); return; }
        try { localStorage.setItem(MINE_KEY, JSON.stringify(myPatches().filter(m => m.id !== id && (m.id || m.title !== item.name)))); } catch { /* private mode */ }
        // The patch on the stage was that one: it stays on the stage, unsaved; SAVE makes a new link.
        if (App.CompositionId === id) {
          App.CompositionId = null; App.SessionId = null; shareLink = null; credit = null;
          session = { id: null, dirty: false }; saveSession(session);
          history.replaceState(null, '', location.pathname); checkOwnDirty(); stage.redraw();
        }
        scene.message('Patch deleted', { seconds: 2 });
      } else if (item.key.startsWith('mine:')) {
        try { localStorage.setItem(MINE_KEY, JSON.stringify(myPatches().filter(m => m.title !== item.key.slice(5)))); } catch { /* private mode */ }
      } else if (juce && item.key.startsWith('file:')) await nativeReply(req => juce.emitEvent('bd_patchDelete', { req, path: item.key.slice(5) }));
    },
    // Owner's wording (2026-11-10); the plugin's file really goes to the Trash, so it says so (iPad has no Trash).
    removeLine: item => {
      if (item.key.startsWith('acct:')) return 'Anyone with the link will no longer be able to open this save. If it’s published, it will also be removed from the gallery.';
      return !juce ? 'This patch will be removed from the patches list. Your local downloaded patches and generated links remain untouched.'
        : ios ? 'This patch file will be deleted. Links you generated remain untouched.'
        : 'This patch file will be moved to the Trash. Links you generated remain untouched.';
    },
    // Plugin: CREATE SHARE LINK opens the patch on the public site, which makes the link (its page runs the bot check
    // the plugin's own page can't: Turnstile only runs on the site's own address). Nothing is uploaded until then.
    // Signed in (SHARING-0011), the plugin saves to the account as the website does: its key needs no bot check.
    get links() { return juce && !appKey() ? (linkWays.plugin ??= {
      external: true,
      current: () => null,
      make: async (_mode: 'save' | 'saveAs', title: string) => {
        const link = `${PUBLIC_SITE}?c=${await encodePatch(toPatch())}&t=${encodeURIComponent(title)}`;
        // iPad: the share menu sends the link itself (the patch is in it, so it opens with no server; owner,
        // 2026-11-16, CHG-0025). A short link needs the site's bot check, which the plugin can't run.
        if (ios) {
          const at = scene.PatchesPanel.centreOf('share');  // the share menu points at the button
          juce.emitEvent('bd_share', { url: link, title, x: Math.round(at?.[0] ?? innerWidth / 2), y: Math.round(at?.[1] ?? innerHeight / 2) });
          return;
        }
        juce.emitEvent('bd_openUrl', { url: `${link}&share=1` });
      },
      warning: () => shareWarning(),
    }) : (linkWays.web ??= {
      current: () => shareLink ? { url: shareLink.url, owned: shareLink.owned, stale: contentOf(toPatch()) !== shareLink.at } : null,
      make: (mode: 'save' | 'saveAs', title: string, gallery?: boolean) => makeLink(mode, title, gallery),
      warning: () => shareWarning(),
    }); },
    // The public gallery (CHG-0024); the plugins too, from their server (CHG-0039, site.ts).
    gallery: embedId ? null : {
      browse: async (sort, q, page) => { try { return await gallery.browse(sort, q, page); } catch (e) { if ((e as { status?: number }).status === undefined) return null; throw e; } },
      open: (row, mode) => openShared(row.id, mode),
      like: row => wantLike(row.id, row.liked, row.likes),
      unpublish: async id => { await gallery.unpublish(id, editToken(id)); if (id === App.CompositionId) scene.PatchesPanel.galleryKnown(false); },
    },
    signedIn: () => !!accountPage()?.Account,
    // SAVE / SHARE › SIGN IN (CHG-0035): Settings › SIGN IN, then back to SAVE once signed in (backToSave).
    signInToSave: title => {
      try { sessionStorage.setItem(AFTER_SIGN_IN, JSON.stringify({ to: 'save', title, at: Date.now() })); } catch { /* private window: no way back */ }
      (scene.SettingsPanel as any).openAccount?.();
    },
    // Accounts (CHG-0023). Signing in claims the patches this browser made (R9). The plugins sign in with their own key
    // (SHARING-0011, CHG-0039): a code approved on the website.
    account: embedId ? null : juce ? pluginAccountHost(juce) : {
      me: stats => account.me(stats),
      signUp: async handle => { await account.signUpWithPasskey(handle); await account.claimMine().catch(() => {}); refreshOwnership(); backToSave(); },
      // Signed in: back to the stage (owner, 2026-11-15); the name in the corner says so. From SAVE: back to SAVE.
      signIn: async () => {
        await account.signInWithPasskey(); await account.claimMine().catch(() => {}); refreshOwnership();
        if (accountPage()?.ApproveCode) return;  // signing in to approve a plugin (SHARING-0011): the question stays
        (scene.SettingsPanel as any).ClosePanel(); backToSave();
      },
      google: () => account.signInWith('google'),
      apple: () => account.signInWith('apple'),
      addPasskey: () => account.addPasskey(),
      removeMethod: async m => { await account.removeMethod(m); },
      setHandle: async h => { await account.setHandle(h); backToSave(); },  // a new Google/Apple account has its name
      signOut: async everywhere => { await account.signOut(everywhere); refreshOwnership(true); scene.PatchesPanel.galleryKnown(null); },
      deleteAccount: async () => { await account.deleteAccount(); refreshOwnership(true); },
      cancelled: e => account.cancelled(e),
      // The plugins signed in to this account, and a plugin's code to approve (SHARING-0011).
      apps: {
        list: () => account.listApps(),
        remove: async id => { await account.removeApp(id); },
        info: code => account.deviceInfo(code),
        approve: async (code, yes) => { const r = await account.approveDevice(code, yes); forgetLink(); return r; },
      },
    },
    // Video export (CHG-0022): web only (R16). Hidden for now (owner, 2026-11-17, CHG-0035: it needs work of its own);
    // the code stays, behind VIDEO_EXPORT.
    video: juce || embedId || !VIDEO_EXPORT ? null : {
      make: (choice, progress, signal) => makeVideoFile(choice, progress, signal),
      // The share sheet where the browser can share files (phones, Safari…); elsewhere the file is downloaded.
      share: async file => {
        if (canShareFile(file)) await shareFile(file, videoTitle(), `${videoTitle()} \u2014 made with BlokDust ${videoLink()}`);
        else downloadFile(file);
      },
      canShareFiles: () => canShareFile(new File([''], 'video.mp4', { type: 'video/mp4' })),
      seconds: () => videoSeconds([...model.values()], tempo ?? 120, (type, key) => BLOCKS_BY_ID.get(type)?.params.find(q => q.key === key)?.default),
    },
  });
  /** The plugins' account (SHARING-0011): signed in with a key the plugin keeps (bd_account / bd_accountSave). */
  function pluginAccountHost(j: JuceBackend): import('../v1ui/patches.ts').AccountHost {
    const none = async () => {};
    return {
      me: async stats => (appKey() ? account.me(stats) : { user: null, google: false, apple: false }),
      signUp: none, signIn: none, google: () => {}, apple: () => {}, addPasskey: none, removeMethod: none, deleteAccount: none,
      setHandle: async h => { await account.setHandle(h); },
      signOut: async () => {
        await account.signOut(false).catch(() => {});  // its key goes on the server (offline: it is forgotten here anyway)
        j.emitEvent('bd_accountClear', {}); setAppKey(null); refreshOwnership(true); scene.PatchesPanel.galleryKnown(null);
      },
      cancelled: e => (e as Error).name === 'AbortError',
      plugin: {
        get canOpenBrowser() { return pluginBrowser; },
        start: () => startDevice(pluginName),
        poll: code => pollDevice(code),
        open: url => j.emitEvent('bd_openUrl', { url }),
        // Signed in: back to the stage, whose corner says who (owner, 2026-11-19); a new account names itself first.
        keep: (key, handle) => {
          setAppKey(key); j.emitEvent('bd_accountSave', { key, handle: handle ?? '' }); refreshOwnership();
          if (handle) (scene.SettingsPanel as any).ClosePanel();
        },
        // The iPad app (SHARING-0011): Apple and passkeys through the system; the server gives the key.
        get native() { return pluginNative ? nativeSignIn : undefined; },
      },
    };
  }
  /** What this plugin calls itself on the website, whether it can open a browser, and whether it signs in natively
   * (the iPad app; from bd_account). */
  let pluginName = 'BlokDust', pluginBrowser = true, pluginNative = false;
  /** The iPad app's answer from the system's sign-in sheet (bd_nativeAppleDone / bd_nativePasskeyDone). */
  let nativeAnswer: ((v: Record<string, string | boolean>) => void) | null = null;
  const askNative = (event: string, body: object) => new Promise<Record<string, string | boolean>>(resolve => { nativeAnswer = resolve; juce?.emitEvent(event, body); });
  const nativeFailed = (r: Record<string, string | boolean>) => Object.assign(new Error(String(r.error ?? 'That did not work. Try again.')), { name: r.cancelled ? 'AbortError' : 'Error' });
  const nativeSignIn = {
    apple: async () => {
      const n = await appPost<{ id: string; nonce: string }>('app/apple/nonce');
      const r = await askNative('bd_nativeApple', { nonce: n.nonce });
      if (typeof r.code !== 'string') throw nativeFailed(r);
      return appPost<{ key: string; user: { handle: string | null }; fresh?: boolean }>('app/apple', { id: n.id, code: r.code, name: pluginName });
    },
    passkey: async () => {
      const o = await appPost<{ id: string; rpId: string; options: { challenge: string } }>('app/passkey/options');
      const r = await askNative('bd_nativePasskey', { rpId: o.rpId, challenge: o.options.challenge });
      if (typeof r.id !== 'string') throw nativeFailed(r);
      const response = { id: r.id, rawId: r.rawId, type: 'public-key', clientExtensionResults: {}, authenticatorAttachment: 'platform',
        response: { clientDataJSON: r.clientDataJSON, authenticatorData: r.authenticatorData, signature: r.signature, ...(r.userHandle ? { userHandle: r.userHandle } : {}) } };
      return appPost<{ key: string; user: { handle: string | null } }>('app/passkey', { id: o.id, response, name: pluginName });
    },
  };
  /** After signing in or out: whether this device may save over the open composition (R9). */
  function refreshOwnership(out = false): void {
    if (out) accountOwnedClear();
    App.SessionId = sessionFor(App.CompositionId);
    if (shareLink) shareLink = { ...shareLink, owned: !!App.SessionId };
    checkOwnDirty();
  }
  // ---- video export (CHG-0022, SPEC-SHARING-VIDEO-EXPORT) ----
  const videoTitle = () => scene.PatchesPanel.Title.trim() || 'Untitled';
  const videoLink = () => shareLink?.url ?? PUBLIC_SITE;
  /** R8: every Freesound sound the patch uses (CC-BY asks for credit; CC0 gets it too). */
  function videoCredits(): Credit[] {
    return Object.values(toPatch().refs ?? {}).filter((r): r is FreesoundRef => (r as SampleRef).provider === 'freesound').map(r => ({ name: r.name, user: r.username, license: r.license }));
  }
  /** FROM START: what the engine is built from now, and every sample it would be given (outer world and Stages). */
  function startSamples(): PatchSample[] {
    const out: PatchSample[] = [];
    for (const [id, buffer] of samples) if (model.has(id)) out.push({ id, stage: 0, buffer });
    for (const [id, b] of model) if (b.type === 'source.stage')
      for (const [uid, buffer] of innerSamples.get(b.uid) ?? []) { const iid = innerIds.get(b.uid)?.ids[uid]; if (iid !== undefined) out.push({ id: iid, stage: id, buffer }); }
    return out;
  }
  async function makeVideoFile(choice: VideoChoice, progress: (p: VideoProgressInfo) => void, signal: AbortSignal): Promise<File> {
    if (!engine) throw new Error('Press start first.');
    // From the beginning, as the patch plays when it has just loaded (owner, 2026-11-15): the whole patch, so not
    // while looking into a Stage.
    if (inside) throw new Error('Close the Stage first: the video plays the whole patch.');
    const sampleRate = engine.node.context.sampleRate;
    const source = startSource(sampleRate, seed, engineCommands(), startSamples());
    const { makeVideo } = await import('../video/makeVideo.ts');
    const blob = await makeVideo(await engineModule(), {
      source, from: 0, to: Math.round(choice.seconds * sampleRate), shape: choice.shape, theme, labels: labels.map(l => ({ ...l })),
      card: { title: videoTitle(), link: videoLink(), credits: videoCredits() },
    }, progress, signal);
    return new File([blob], videoFileName(videoTitle()), { type: 'video/mp4' });
  }
  // ---- the stage's corners (owner review 2026-11-15) ----
  // Top left, under the header: a patch someone else made, "TITLE BY @NAME" (SPEC-SHARING-GALLERY R15); the name opens
  // the gallery on their patches. A published one has a star after it (owner review 2): pressing it likes the patch
  // (signed out: Settings › SIGN IN); FEEDBACK › REPORT A PATCH reports it (CHG-0041). Top right: who is signed in
  // (SPEC-SHARING-ACCOUNTS R14); it opens Settings › ACCOUNT. v1's mid type in the text colour, under the panels.
  let credit: { id: string; title: string; by: string; published: boolean; liked: boolean; likes: number; views: number } | null = null;
  let cornerBoxes: { by?: ButtonBox; me?: ButtonBox; like?: ButtonBox; credit?: ButtonBox; save?: ButtonBox } = {};
  let byHover = false, meHover = false, saveHover = false;
  const accountPage = () => (scene.SettingsPanel as any).accountPage as import('../v1ui/accountPage.ts').AccountPage | null | undefined;
  function drawCorners(ctx: CanvasRenderingContext2D): void {
    cornerBoxes = {};
    if (inside) return;
    const m = stage.metrics, u = m.unit, h = scene.Header as unknown as { Height: number; Rows?: number }, y = h.Height * (h.Rows ?? 1) * u + 22 * u;
    ctx.save();
    if (!App.Metrics?.TxtMid) { ctx.restore(); return; }
    // The size of Settings › About's "Current Build" line (v1's 8-unit italic), in Dosis capitals (owner review 3).
    ctx.fillStyle = theme.colors[theme.roles.txt]; ctx.font = `400 ${Math.round(u * 8)}px Dosis`; ctx.textBaseline = 'alphabetic';
    if (credit) {
      const title = `${credit.title.toUpperCase()} BY `, by = `@${credit.by.toUpperCase()}`, tw = ctx.measureText(title).width, bw = ctx.measureText(by).width, x = 20 * u;
      ctx.textAlign = 'left'; ctx.fillText(title, x, y); ctx.fillText(by, x + tw, y);
      // A link: underlined only under the mouse (owner review 3, 2026-11-16).
      if (byHover) ctx.fillRect(x + tw, y + 3 * u, bw, Math.max(1, u * 0.6));
      cornerBoxes.by = { x: x + tw - 4 * u, y: y - 16 * u, w: bw + 8 * u, h: 24 * u };
      cornerBoxes.credit = { x: x - 4 * u, y: y - 16 * u, w: tw + bw + 8 * u, h: 24 * u };
      if (credit.published) {
        // Likes (owner's pick, B): a second line, the like chevron, the count, the views. The chevron is the button;
        // liked, it takes the options colour.
        const txt = theme.colors[theme.roles.txt], on = theme.colors[theme.roles.options[2]];
        const views = `${credit.views} VIEW${credit.views === 1 ? '' : 'S'}`;
        const y2 = y + 16 * u, count = String(credit.likes), cw = ctx.measureText(count).width;
        drawUpArrow(ctx, x + 4 * u, y2 - 3 * u, 9 * u, credit.liked, txt, on);
        ctx.fillText(count, x + 12 * u, y2);
        ctx.globalAlpha = 0.6; ctx.fillText(`   ${views}`, x + 12 * u + cw, y2); ctx.globalAlpha = 1;
        cornerBoxes.like = { x: x - 6 * u, y: y2 - 14 * u, w: cw + 24 * u, h: 22 * u };
      }
    } else if (ownLink()) {
      // Your own saved patch (SPEC-SHARING-BACKEND R19): its title; changed since it was saved, "· UNSAVED", dimmed like
      // the views count. Under the mouse UNSAVED reads SAVE, underlined like the corner's other links; pressing it
      // saves (R18). While it saves: SAVING.
      const title = (shareLink!.title || 'Untitled').toUpperCase(), x = 20 * u, tw = ctx.measureText(title).width;
      ctx.textAlign = 'left'; ctx.fillText(title, x, y);
      if (ownDirty || quickSaving) {
        const sep = '  ·  ', sw = ctx.measureText(sep).width, word = quickSaving ? 'SAVING' : saveHover ? 'SAVE' : 'UNSAVED', ww = ctx.measureText(word).width;
        ctx.globalAlpha = 0.6; ctx.fillText(sep, x + tw, y);
        if (!saveHover || quickSaving) ctx.fillText(word, x + tw + sw, y);
        ctx.globalAlpha = 1;
        if (saveHover && !quickSaving) { ctx.fillText(word, x + tw + sw, y); ctx.fillRect(x + tw + sw, y + 3 * u, ww, Math.max(1, u * 0.6)); }
        // The box is UNSAVED's width (the wider word), so the pointer doesn't fall off it when the word changes.
        const bw = Math.max(ww, ctx.measureText('UNSAVED').width);
        if (!quickSaving) cornerBoxes.save = { x: x + tw + sw - 4 * u, y: y - 16 * u, w: bw + 8 * u, h: 24 * u };
      }
    }
    const me = accountPage()?.Account;
    if (me?.handle) {
      const t = `SIGNED IN AS ${me.handle.toUpperCase()}`, w = ctx.measureText(t).width, x = m.width - 20 * u;
      ctx.textAlign = 'right'; ctx.fillText(t, x, y);
      if (meHover) ctx.fillRect(x - w, y + 3 * u, w, Math.max(1, u * 0.6));  // a link: underlined under the mouse
      cornerBoxes.me = { x: x - w - 4 * u, y: y - 16 * u, w: w + 8 * u, h: 24 * u };
    }
    ctx.restore();
  }
  /** A press on the corner text (device px): true if it was used. Not while a panel is open over the stage. */
  function cornerPress(x: number, y: number): boolean {
    if (scene.PatchesPanel.Open || (scene.SettingsPanel as any).Open || scene.OptionsPanel.Scale > 0) return false;
    if (cornerBoxes.by && credit && inBox(cornerBoxes.by, x, y)) { scene.PatchesPanel.showGallery(`@${credit.by}`); return true; }
    if (cornerBoxes.like && credit && inBox(cornerBoxes.like, x, y)) { likeCredit(); return true; }
    if (cornerBoxes.me && inBox(cornerBoxes.me, x, y)) { (scene.SettingsPanel as any).openAccount?.(); return true; }
    if (cornerBoxes.save && inBox(cornerBoxes.save, x, y)) { saveHover = false; void quickSave(); return true; }
    return false;
  }
  /**
   * Likes (SPEC-SHARING-GALLERY R8), from the stage or a gallery row: the user's latest wish shows at once, on both;
   * one request per patch at a time, and when it lands another only if the wish changed meanwhile, so fast presses
   * settle on the last without flicker (bug, owner review 3: a double press flipped back and forth as the answers
   * arrived) and send at most two requests. If it fails, the server's state shows again.
   */
  const likeWish = new Map<string, boolean>(), likeSent = new Set<string>();
  function showLike(id: string, liked: boolean, likes: number): void {
    if (credit?.id === id) { credit.liked = liked; credit.likes = likes; }
    for (const it of scene.PatchesPanel.GalleryItems) if (it.id === id) { it.liked = liked; it.likes = likes; }
    stage.redraw();
  }
  function wantLike(id: string, liked: boolean, likes: number): void {
    if (!accountPage()?.Account) { scene.PatchesPanel.ClosePanel(); (scene.SettingsPanel as any).openAccount?.(); return; }
    const want = !liked;
    likeWish.set(id, want); showLike(id, want, Math.max(0, likes + (want ? 1 : -1)));
    if (likeSent.has(id)) return;
    likeSent.add(id);
    void (async () => {
      let r: { liked: boolean; likes: number } | null = null;
      try { for (;;) { const w = likeWish.get(id)!; r = await gallery.like(id, w); if (likeWish.get(id) === w) break; } }
      catch { r = null; }
      likeSent.delete(id); likeWish.delete(id);
      if (r) showLike(id, r.liked, r.likes);
      else { const p = await loadShared(id).catch(() => null); if (p) showLike(id, !!p.liked, p.likes ?? 0); }
    })();
  }
  function likeCredit(): void { if (credit) wantLike(credit.id, credit.liked, credit.likes); }
  /** Signed in after SAVE / SHARE › SIGN IN: Settings closes and SAVE opens again, ADD TO GALLERY on, the name kept. */
  function backToSave(): void {
    let want: { to?: string; title?: string; at?: number } | null = null;
    try { want = JSON.parse(sessionStorage.getItem(AFTER_SIGN_IN) ?? 'null'); sessionStorage.removeItem(AFTER_SIGN_IN); } catch { want = null; }
    // Only a sign-in finished soon after (10 minutes): one begun from SAVE and given up on is forgotten.
    if (want?.to !== 'save' || !(Date.now() - (want.at ?? 0) < 10 * 60_000)) return;
    const t0 = performance.now();
    const go = () => {  // once the account page knows who is signed in (the switch reads it)
      if (!accountPage()?.Account && performance.now() - t0 < 8000) { setTimeout(go, 150); return; }
      (scene.SettingsPanel as any).ClosePanel?.();
      const pp = scene.PatchesPanel;
      if (want?.title) pp.setTitle(want.title);
      pp.GalleryOn = true;
      pp.OpenPanel(0);
      stage.redraw();
    };
    go();
  }
  function shareWarning(): string | null {
    return [...model.values()].some(b => b.type === 'source.recorder' || !isPortable(b.params.track)) ? SAVE_WARNING : null;
  }
  let uiSync = true;
  stage.skipOverlays = new Set(['recordButton']);  // the ported RecorderPanel draws it (with hover/recording states)
  // The embed player (SHARING-0002, `/embed/<id>`) shows the stage only: no menus, panels or editing.
  stage.drawUi = ctx => {
    if (labels.length) drawLabels(ctx, stage.metrics, labels, theme.colors[theme.roles.txt], labelEdit?.id ?? null);  // embeds show them too
    if (selectedLabels.size && !embedId) {  // selected labels: dashed as selected blocks are (stage.ts)
      const m = stage.metrics;
      ctx.save();
      ctx.strokeStyle = theme.colors[theme.roles.txt]; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.setLineDash([4 * m.unit, 3 * m.unit]);
      ctx.beginPath();
      for (const l of selLabels()) { const r = labelRect(measure, m, l); ctx.rect(r.x, r.y, r.w, r.h); }
      ctx.stroke();
      ctx.restore();
    }
    if (embedId) return;
    if (inside) drawInside(ctx, insideFrame(), stage.metrics.unit, 'STAGE', { image: inside.image, blockX: inside.blockX, blockY: inside.blockY, grid: inside.grid, layers: BLOCKS_BY_ID.get('source.stage')!.geometry.layers.filter(l => l.units !== 'unit') },
      theme.colors, theme.roles.txt, `400 ${Math.round(10 * stage.metrics.unit)}px Dosis`);
    if (uiSync) { uiSync = false; scene.sync(ctx, theme, stage.zoom, stage.drag, [...v1Blocks.values()]); }
    scene.setView(stage.zoom, stage.drag);
    drawCorners(ctx);  // after the scene's sync (v1's type sizes), before its panels
    scene.draw();
    makeStageAt = null;
    if (offerMakeStage()) {
      const m = stage.metrics, h = scene.Header as unknown as { Height: number; Rows?: number };
      // Its top-right place is under the SIGNED IN AS line (that line's baseline is 22 units under the header).
      const headerBottom = h.Height * (h.Rows ?? 1) * m.unit, top = headerBottom + 32 * m.unit;
      let sel: Rect | null = stage.selectedBounds();
      for (const l of selLabels()) {
        const r = labelRect(measure, m, l);
        sel = sel ? { x0: Math.min(sel.x0, r.x), y0: Math.min(sel.y0, r.y), x1: Math.max(sel.x1, r.x + r.w), y1: Math.max(sel.y1, r.y + r.h) }
          : { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
      }
      const avoid = [cornerBoxes.me, cornerBoxes.credit, cornerBoxes.like].filter((b): b is ButtonBox => !!b);
      makeStageAt = makeStageBox(ctx, m.dpr, m.unit, m.width, m.height, headerBottom, top, sel, stage.selected.size >= model.size, avoid, MAKE_STAGE);
      drawMakeStage(ctx, makeStageAt, m.dpr, m.unit, MAKE_STAGE, theme.colors[2], theme.colors[theme.roles.txt], theme.colors[theme.roles.menu[1]], makeStageHover);
    }
  };
  // ---- MAKE STAGE (owner, 2026-11-14; UI-0012): with blocks selected, a button puts them inside a new Stage block ----
  const MAKE_STAGE = 'MAKE STAGE';
  let makeStageAt: ButtonBox | null = null, makeStageHover = false;
  // (stage.selected is the selection; tested first, as this runs from draws made before the pointer state below exists)
  const offerMakeStage = () => stage.selected.size > 0 && !inside && !placing && !drag && canGoInside(stage.selected);
  /** The selected blocks go inside a new Stage block where they were (as Cmd/Ctrl+G); it is then the one selected. */
  function makeStage(): void {
    const bs = [...selection].map(id => model.get(id)!).filter(Boolean);
    if (!bs.length) return;
    const id = wrapInStage([...selection], Math.round(bs.reduce((a, b) => a + b.x, 0) / bs.length), Math.round(bs.reduce((a, b) => a + b.y, 0) / bs.length), [...selectedLabels]);
    makeStageHover = false;
    if (id !== null) setSelection([id]);
    stage.redraw();
  }

  // ---- labels (CHG-0020, UI-0011): text on the stage with a drag dot. Press and drag moves one (onto the bin deletes
  // it); a press without a drag edits its words in place. They are not blocks: the engine never hears of them. ----
  const measure = document.createElement('canvas').getContext('2d')!;
  let labelDrag: { id: string; pointer: number; grabX: number; grabY: number; moved: boolean; fresh: boolean; downX: number; downY: number;
    /** Dragging a selected label moves the whole selection (whole cells, as blocks move); where its blocks started. */
    group?: Map<number, XY>;
    /** Where the dragged labels were at the start (undo). */
    labelFrom?: Map<string, XY> } | null = null;
  let labelEdit: { id: string; input: HTMLInputElement } | null = null;
  const labelsChanged = () => { changed(); if (juce) juce.emitEvent('bd_labels', { labels }); stage.redraw(); };
  const readLabels = (list: unknown): Label[] => (Array.isArray(list) ? list : []).flatMap((l, i) => l && typeof l === 'object' && typeof (l as Label).text === 'string'
    && Number.isFinite((l as Label).x) && Number.isFinite((l as Label).y) ? [{ id: typeof (l as Label).id === 'string' ? (l as Label).id : `l${i + 1}`, text: (l as Label).text.slice(0, 200), x: (l as Label).x, y: (l as Label).y }] : []);
  /** Add labels, giving each an id no other label has. */
  function addLabels(list: Label[]): void {
    for (const l of list) { let id = l.id; for (let k = 1; labels.some(x => x.id === id); k++) id = `l${labels.length + k}`; labels.push({ ...l, id }); }
  }
  /** A new label from the menu: it follows the pointer until that lifts, then opens for typing. */
  function newLabel(gx: number, gy: number): void {
    addLabels([{ id: `l${labels.length + 1}`, text: 'LABEL', x: gx, y: gy }]);
    const l = labels[labels.length - 1];
    pushUndo({ kind: 'add', uids: [], labels: [l.id] });
    labelDrag = { id: l.id, pointer: primaryId ?? -1, grabX: 0, grabY: 0, moved: true, fresh: true, downX: 0, downY: 0 };
    labelsChanged();
  }
  function moveLabel(e: PointerEvent): void {
    const l = labels.find(x => x.id === labelDrag!.id);
    if (!l) return;
    if (!labelDrag!.moved && Math.hypot(e.offsetX - labelDrag!.downX, e.offsetY - labelDrag!.downY) > STILL_PX) labelDrag!.moved = true;
    if (!labelDrag!.moved) return;
    const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
    if (labelDrag!.group) {
      const dx = Math.round(gx - labelDrag!.grabX - l.x), dy = Math.round(gy - labelDrag!.grabY - l.y);
      if (dx || dy) {
        for (const o of selLabels()) { o.x += dx; o.y += dy; }
        for (const id of labelDrag!.group.keys()) { const b = model.get(id); if (b) moveBlock(id, b.x + dx, b.y + dy); }
      }
      stage.redraw();
      return;
    }
    l.x = Math.round((gx - labelDrag!.grabX) * 2) / 2; l.y = Math.round((gy - labelDrag!.grabY) * 2) / 2;  // half cells: tidy, but free enough
    stage.redraw();
  }
  /** Edit a label's words where it stands: Enter or a click elsewhere keeps them (no words: the label goes); Escape
   * leaves it as it was. */
  function editLabel(id: string): void {
    endLabelEdit(true);
    const l = labels.find(x => x.id === id);
    if (!l) return;
    const m = stage.metrics, r = labelRect(measure, m, l), input = document.createElement('input');
    input.id = 'labelEdit'; input.type = 'text'; input.value = l.text; input.maxLength = 200; input.spellcheck = false;
    // iOS zooms the page into any text field under 16 px: the field is 16 px, scaled down to the label's size.
    const font = labelCssFont(m), px = Number(/([\d.]+)px/.exec(font)?.[1] ?? 16), k = Math.min(1, px / 16);
    const w = Math.max(140, (r.w + 80 * m.scaledUnit) / m.dpr), h = r.h / m.dpr;
    input.style.cssText = `position:fixed;left:${r.textX / m.dpr}px;top:${r.y / m.dpr}px;height:${h / k}px;width:${w / k}px;transform:scale(${k});transform-origin:0 0;` +
      `font:${font.replace(/[\d.]+px/, `${px / k}px`)};color:${theme.colors[theme.roles.txt]};background:transparent;border:none;outline:none;padding:0;margin:0;text-transform:uppercase;z-index:5;`;
    input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') endLabelEdit(true); else if (e.key === 'Escape') endLabelEdit(false); });
    input.addEventListener('blur', () => endLabelEdit(true));
    document.body.appendChild(input);
    labelEdit = { id, input };
    input.focus(); input.select();
    stage.redraw();
  }
  // ---- inside a Stage block (CHG-0021, UI-0009) ----
  /** Menu items not offered inside a Stage: Stage itself (one level, SCOPE-0006). Stage In is offered only there. */
  const INSIDE_HIDDEN = new Set(['Stage']), OUTSIDE_HIDDEN = new Set(['StageIn']);
  const insideFrame = () => {
    const m = stage.metrics, h = scene.Header as unknown as { Height: number; Rows?: number };
    return frameFor(m.width, m.height, m.unit, h.Height * (h.Rows ?? 1) * m.unit, { x: inside!.blockX, y: inside!.blockY });
  };
  function clearWorld(): void {
    for (const id of [...model.keys()]) { model.delete(id); v1Blocks.delete(id); stage.removeBlock(id); }
    samples.clear(); missing.clear(); labels.length = 0;
    stage.selected.clear(); selectedLabels.clear(); stage.held.clear();
  }
  /** Look into Stage block `id`: its inner world takes the page (in a window over the outer stage). The plugins too (CHG-0038). */
  function enterStage(id: number): void {
    const b = model.get(id);
    if (inside || embedId || !b || b.type !== 'source.stage') return;
    endLabelEdit(true); endPlacing(false);
    (scene.OptionsPanel as any).CancelOpen();  // a double click's first click set the panel on its way open: it stays shut
    scene.OptionsPanel.Close();
    const [bx, by] = gridToPx(stage.metrics, b.x, b.y), image = stage.snapshot();
    const outer: Outer = { model: new Map(model), v1Blocks: new Map(v1Blocks), samples: new Map(samples), missing: new Set(missing), labels: labels.slice(),
      connectionOrder, nextId, view: currentView(), undo: undoStack.slice(), redo: redoStack.slice() };
    clearWorld();
    undoStack.length = 0; redoStack.length = 0;
    inside = { stageId: id, stageUid: b.uid, outer, image, blockX: bx, blockY: by, grid: stage.metrics.scaledGridSize };
    const macro = macros.get(b.uid) ?? { block: b.uid, blocks: [] }, known = innerIds.get(b.uid);
    nextId = 1;
    for (const blk of macro.blocks) if (BLOCKS_BY_ID.has(blk.type)) {
      const fixed = known?.ids[blk.id];
      if (fixed !== undefined) nextId = fixed;
      addBlock(blk.type, blk.x ?? 0, blk.y ?? 0, structuredClone(blk.params ?? {}), blk.id, true);
    }
    nextId = Math.max(nextId, known?.nextId ?? 1, ...[...model.keys()].map(k => k + 1));
    const audio = innerSamples.get(b.uid);  // the inner world has it already: shown, not sent again
    for (const [iid, blk] of model) { const buf = audio?.get(blk.uid); if (buf) showBuffer(iid, buf); else void resolveSample(iid); }
    connectionOrder = [...(macro.connectionOrder ?? [])];
    addLabels(readLabels(macro.labels));
    viewWorld(id);
    if (juce) juce.emitEvent('bd_samplesHello', {});  // the processor reports the inner samplers' sounds
    const m = stage.metrics;  // opening it shows its blocks (owner, 2026-11-14)
    applyView(frameBlocks([...model.values()], macro.view, { width: m.width, height: m.height, unit: m.unit, area: insideFrame() }));
    setMenuHidden(INSIDE_HIDDEN);
    scene.setBlocks([...v1Blocks.values()]);
    uiSync = true;
    stage.redraw();
  }
  /** Back to the outer world. `keep`: what is inside is kept as the Stage's macro (not when the patch is being replaced). */
  function leaveStage(keep: boolean): void {
    const i = inside;
    if (!i) return;
    endLabelEdit(true); endPlacing(false);
    scene.OptionsPanel.Close();
    if (keep) {
      macros.set(i.stageUid, innerMacro());
      innerIds.set(i.stageUid, { ids: Object.fromEntries([...model].map(([id, b]) => [b.uid, id])), nextId });
      innerSamples.set(i.stageUid, new Map([...samples].flatMap(([id, buf]) => { const b = model.get(id); return b ? [[b.uid, buf] as [string, AudioBuffer]] : []; })));
    }
    clearWorld();
    inside = null;
    viewWorld(0);
    const o = i.outer;
    for (const [id, b] of o.model) { model.set(id, b); stage.upsertBlock({ id, type: b.type, x: b.x, y: b.y, starPos: b.type === 'power.void' ? starPos(id) : undefined }); }
    for (const [id, v] of o.v1Blocks) v1Blocks.set(id, v);
    for (const [id, s] of o.samples) samples.set(id, s);
    for (const id of o.missing) missing.add(id);
    labels.push(...o.labels);
    connectionOrder = o.connectionOrder; nextId = o.nextId;
    undoStack.length = 0; redoStack.length = 0;
    undoStack.push(...(o.undo as typeof undoStack)); redoStack.push(...(o.redo as typeof redoStack));
    applyView(o.view);
    setMenuHidden(OUTSIDE_HIDDEN);
    scene.setBlocks([...v1Blocks.values()]);
    uiSync = true;
    stage.redraw();
  }
  function exitStage(): void { if (!inside) return; leaveStage(true); changed(); }
  /** Can blocks `ids` go inside a Stage? All of them or none: not with a Stage among them (one level, SCOPE-0006), so
   * no block is left behind with its connections cut (owner, 2026-11-14). */
  const canGoInside = (ids: Iterable<number>, except?: number) => !inside && [...ids].every(id => id === except || model.get(id)?.type !== 'source.stage');
  /** The audio of blocks going inside a Stage, by the patch id each has in there. */
  const audioOf = (ids: number[], uidOf: (b: ModelBlock) => string) =>
    new Map(ids.flatMap(id => { const b = model.get(id), buf = samples.get(id); return b && buf ? [[uidOf(b), buf] as [string, AudioBuffer]] : []; }));
  /** Selected blocks become what is inside a new Stage block at (x, y): they leave this stage and carry on in there,
   * with their audio. Not undoable. */
  function wrapInStage(ids: number[], x: number, y: number, labelIds: string[] = []): number | null {
    const picked = ids.filter(id => model.has(id));
    if (!canGoInside(picked) || !picked.length) return null;
    const bs = picked.map(id => model.get(id)!), uids = new Set(bs.map(b => b.uid));
    const cx = Math.round(bs.reduce((a, b) => a + b.x, 0) / bs.length), cy = Math.round(bs.reduce((a, b) => a + b.y, 0) / bs.length);
    const order = connectionOrder.filter(([a, b]) => uids.has(a) && uids.has(b));
    const blocks = bs.map(b => ({ id: b.uid, type: b.type, x: b.x - cx, y: b.y - cy,
      params: Object.fromEntries(Object.entries(structuredClone(b.params)).filter(([k]) => !SESSION_PARAMS.has(k))) }));
    const audio = audioOf(picked, b => b.uid);
    const going = takeLabels(labelIds, -cx, -cy);  // selected labels go in too, where they were among the blocks
    for (const id of picked) removeBlock(id);
    undoStack.length = 0; redoStack.length = 0;
    const taken = new Set([...model.values()].map(b => b.uid));
    let uid = `stage${nextId}`; for (let k = 2; taken.has(uid); k++) uid = `stage${nextId}_${k}`;
    macros.set(uid, { block: uid, blocks, ...(order.length ? { connectionOrder: order } : {}), ...(going.length ? { labels: going } : {}) });
    innerSamples.set(uid, audio);
    setSelection([]);
    return addBlock('source.stage', x, y, {}, uid);
  }
  /** Blocks dropped onto Stage block `stageId` go inside it (owner, 2026-11-14), to the right of what is there, keeping
   * their layout and their connections. Its inner world starts again. Not undoable (as wrapping). */
  /** Labels `ids` leave this stage (for a Stage's inside), moved by (dx, dy). */
  function takeLabels(ids: string[], dx: number, dy: number): Label[] {
    const going = labels.filter(l => ids.includes(l.id));
    if (!going.length) return [];
    for (const l of going) { labels.splice(labels.indexOf(l), 1); selectedLabels.delete(l.id); }
    labelsChanged();
    return going.map(l => ({ ...l, x: l.x + dx, y: l.y + dy }));
  }
  /** Copies of labels, moved by (dx, dy); returns the copies' ids. */
  function copyLabels(list: Label[], dx: number, dy: number): string[] {
    const n = labels.length;
    addLabels(list.map(l => ({ ...l, x: l.x + dx, y: l.y + dy })));
    const ids = labels.slice(n).map(l => l.id);
    if (ids.length) labelsChanged();
    return ids;
  }
  /** Delete labels (the bin, Delete): not undoable, as a label binned alone. */
  function deleteLabels(ids: Iterable<string>): void {
    const gone = new Set(ids);
    if (!gone.size) return;
    for (let i = labels.length - 1; i >= 0; i--) if (gone.has(labels[i].id)) labels.splice(i, 1);
    for (const id of gone) selectedLabels.delete(id);
    labelsChanged();
  }
  function addToStage(stageId: number, ids: number[], labelIds: string[] = []): void {
    const s = model.get(stageId);
    const picked = ids.filter(id => id !== stageId && model.has(id));
    if (!s || s.type !== 'source.stage' || !canGoInside(picked) || !picked.length) return;
    const was = macros.get(s.uid) ?? { block: s.uid, blocks: [] };
    const bs = picked.map(id => model.get(id)!), taken = new Set(was.blocks.map(b => b.id)), rename = new Map<string, string>();
    for (const b of bs) { let u = b.uid; for (let k = 2; taken.has(u); k++) u = `${b.uid}_${k}`; taken.add(u); rename.set(b.uid, u); }
    const mean = (v: number[]) => Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    const minX = Math.min(...bs.map(b => b.x)), maxX = Math.max(...bs.map(b => b.x)), gy = mean(bs.map(b => b.y));
    const there = was.blocks.map(b => ({ x: b.x ?? 0, y: b.y ?? 0 }));
    const ox = there.length ? Math.max(...there.map(p => p.x)) + 4 - minX : -Math.round((minX + maxX) / 2);
    const oy = there.length ? mean(there.map(p => p.y)) - gy : -gy;
    const moved = bs.map(b => {
      const params = Object.fromEntries(Object.entries(structuredClone(b.params)).filter(([k]) => !SESSION_PARAMS.has(k)));
      if (typeof params.target === 'string') { const [u, k] = params.target.split(':'); if (rename.has(u)) params.target = `${rename.get(u)}:${k}`; }  // an LFO going in with its target
      return { id: rename.get(b.uid)!, type: b.type, x: b.x + ox, y: b.y + oy, params };
    });
    const order = [...(was.connectionOrder ?? []), ...connectionOrder.filter(([a, b]) => rename.has(a) && rename.has(b)).map(([a, b]) => [rename.get(a)!, rename.get(b)!] as [string, string])];
    const audio = new Map([...(innerSamples.get(s.uid) ?? []), ...audioOf(picked, b => rename.get(b.uid)!)]);
    const going = takeLabels(labelIds, ox, oy);
    for (const id of picked) removeBlock(id);
    const { uid, x, y, params } = s;
    scene.OptionsPanel.Close();
    removeBlock(stageId);
    macros.set(uid, { ...was, blocks: [...was.blocks, ...moved], ...(order.length ? { connectionOrder: order } : {}), ...(going.length ? { labels: [...(was.labels ?? []), ...going] } : {}) });
    innerIds.delete(uid);
    innerSamples.set(uid, audio);
    undoStack.length = 0; redoStack.length = 0;
    setSelection([]);
    addBlock('source.stage', x, y, params, uid);
    stage.redraw();
  }
  /** The Stage block under css (x, y) that the blocks `moving` would go into, or null. */
  function dropStageAt(x: number, y: number, moving: Set<number>): number | null {
    if (!canGoInside(moving)) return null;
    const t = stage.hitTest(x, y, id => moving.has(id));
    return t && model.get(t.id)?.type === 'source.stage' ? t.id : null;
  }
  /** The Stage panel's LOAD PATCH: a patch file's blocks become what is inside (the file's own Stage blocks are left
   * out: one level). The block is made again, so its inner world starts fresh. */
  function loadStagePatch(id: number): void {
    if (juce) { juce.emitEvent('bd_patchPick', { stage: id }); return; }  // the native picker; the reply names the Stage (bd_patchFile)
    const input = document.createElement('input');
    input.type = 'file'; input.accept = `.${PATCH_EXT},.json,application/json`;
    input.onchange = async () => {
      const f = input.files?.[0], patch = f ? parsePatchFile(await f.text()) : null, b = model.get(id);
      if (!patch || !b || b.type !== 'source.stage' || inside) return;
      useStagePatch(id, patch);
    };
    input.click();
  }
  function useStagePatch(id: number, patch: Patch): void {
    if (!juce) patch = audioInAsMicrophone(patch);  // the website's Audio In is a Microphone (CHG-0041)
    const b = model.get(id);
    if (!b) return;
    const { uid, x, y, params } = b;
    for (const [k, r] of Object.entries(patch.refs ?? {})) if (r && typeof r === 'object' && 'provider' in r && !refs.has(k)) refs.set(k, r as SampleRef);
    scene.OptionsPanel.Close();
    removeBlock(id);
    macros.set(uid, { block: uid, blocks: patch.blocks.filter(q => BLOCKS_BY_ID.has(q.type) && q.type !== 'source.stage').map(q => structuredClone(q)),
      ...(patch.connectionOrder?.length ? { connectionOrder: patch.connectionOrder } : {}), ...(patch.labels?.length ? { labels: patch.labels } : {}) });
    innerIds.delete(uid); innerSamples.delete(uid);
    addBlock('source.stage', x, y, params, uid);
    stage.redraw();
  }
  (window as unknown as { __bd_stage?: unknown }).__bd_stage = { enter: enterStage, exit: exitStage, wrap: wrapInStage, use: useStagePatch };  // tests
  function endLabelEdit(keep: boolean): void {
    const e = labelEdit;
    if (!e) return;
    labelEdit = null;
    const l = labels.find(x => x.id === e.id), text = e.input.value.trim();
    e.input.remove();
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);  // iOS scrolls the page to show the field above its keyboard
    if (l && keep) {
      if (text) l.text = text;
      else {  // no words: the label goes. Just made: its add step goes too; else this is a removal to undo.
        const top = undoStack[undoStack.length - 1];
        if (top?.kind === 'add' && !top.uids.length && top.labels?.length === 1 && top.labels[0] === l.id) undoStack.pop();
        else pushUndo({ kind: 'remove', snaps: [], labels: [{ ...l }] });
        labels.splice(labels.indexOf(l), 1); selectedLabels.delete(l.id);
      }
      labelsChanged();
    }
    stage.redraw();
  }

  function addBlock(type: string, x: number, y: number, p: Record<string, unknown>, uid?: string, quiet = false): number {
    const id = nextId++;
    // A new SampleGen starts on a sound of its own (CHG-0035): a number, so it can be found again.
    if (type === 'source.sample-gen' && !quiet && !Number(p.sound) && !(p.seed as { waveVoices?: unknown } | undefined)?.waveVoices)
      p = { ...p, sound: 1 + Math.floor(Math.random() * SOUND_MAX) };
    const def = BLOCKS_BY_ID.get(type)!;
    // A new block's patch id: `b<id>`, unless a loaded block already has it (ids are renumbered when a project loads).
    if (uid === undefined) { const taken = new Set([...model.values()].map(b => b.uid)); uid = `b${id}`; for (let k = 2; taken.has(uid); k++) uid = `b${id}_${k}`; }
    model.set(id, { uid, type, x, y, params: { ...p } });
    v1Blocks.set(id, new V1Block(id, def, x, y, p));
    stage.upsertBlock({ id, type, x, y, starPos: type === 'power.void' ? starPos(id) : undefined });
    if (needsInput(type)) listen(!quiet);  // one the user puts down opens it; a loaded one may have to ask (CHG-0041)
    // Plugin: a SampleGen whose sound was saved as a file is played by the processor; it is not generated again.
    const savedFile = !!juce && typeof p.track === 'string' && p.track.startsWith('file:');
    const known = quiet && inside && innerSamples.get(inside.stageUid)?.has(uid);  // looking into a Stage: shown from what it has
    if (type === 'source.sample-gen' && !savedFile && !known) generateSample(id, !!(p.seed as { waveVoices?: unknown } | undefined)?.waveVoices);
    if (type === 'fx.convolver') void showBuiltInImpulse(id);
    // CHG-0031: the Wavetable's panel draws its frames with the engine module (shows v1's loading square until then).
    if (type === 'source.wavetable') void engineModule().then(m => { setTableModule(m); v1Blocks.get(id)?.RefreshOptionsPanel(); }, () => {});
    if (!quiet) {
      void resolveSample(id, true);
      send([{ type: CommandType.AddBlock, id, blockType: typeIndex(type), x, y, key: uid },
        ...def.params.flatMap((q, i) => !SESSION_PARAMS.has(q.key) && (typeof p[q.key] === 'number' || typeof p[q.key] === 'boolean') ? [{ type: CommandType.SetParam, id, param: i, value: Number(p[q.key]) }] : [])]);
      if (type === 'source.stage' && !inside) buildStage(id, uid);  // what is inside it (CHG-0021)
      syncTargets();
      scene.setBlocks([...v1Blocks.values()]);
      changed();
    }
    return id;
  }
  // ---- patch files (CHG-0005, SPEC-PATCH-FORMAT-V2 R10) ----
  /** Built-in presets: `web/src/patch/presets/*.blokdust`, listed by their title. */
  const PRESETS = Object.entries(import.meta.glob('../patch/presets/*.blokdust', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
    .map(([path, text]) => ({ file: path.split('/').pop()!, text, name: patchTitle(parsePatchFile(text), path.split('/').pop()!.replace(/\.blokdust$/, '')) }))
    .sort((a, b) => a.file.localeCompare(b.file));
  /** Plugin: one reply per request, matched by `req` (`wait` ms; the save dialog waits for the user). */
  let patchReq = 0;
  const nativeReply = <T,>(send: (req: number) => void, wait = 10000): Promise<T | null> => new Promise(res => {
    const req = ++patchReq, t = setTimeout(() => { pendingReplies.delete(req); res(null); }, wait);
    pendingReplies.set(req, v => { clearTimeout(t); res(v as T); });
    send(req);
  });
  const pendingReplies = new Map<number, (v: unknown) => void>();
  // The plugin's page can't open browser windows: links (Settings › About, the code) open in the user's browser.
  if (juce) window.open = (u?: string | URL) => { juce.emitEvent('bd_openUrl', { url: String(u ?? '').replace(/^http:\/\//, 'https://') }); return null; };
  if (juce) for (const ev of ['bd_patchList', 'bd_patchSaved', 'bd_patchFile', 'bd_patchDeleted']) juce.addEventListener(ev, (e: { req?: number }) => {
    const f = e.req !== undefined ? pendingReplies.get(e.req) : undefined;
    if (f) { pendingReplies.delete(e.req!); f(e); } else if (ev === 'bd_patchFile') {
      const r = e as { text: string; name: string; file?: string; stage?: number };
      if (r.stage) { const patch = parsePatchFile(r.text), b = model.get(r.stage); if (patch && b?.type === 'source.stage' && !inside) useStagePatch(r.stage, patch); return; }  // a Stage's LOAD PATCH
      showPicked(r.text, r.file ?? `${r.name}.${PATCH_EXT}`);
    }
  });
  const savedOn = (ms: number) => `Saved ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  async function nativePatches() {
    const r = await nativeReply<{ items: { name: string; path: string; modified: number }[] }>(req => juce!.emitEvent('bd_patchList', { req }));
    return (r?.items ?? []).map(i => ({ name: i.name, detail: savedOn(i.modified), key: `file:${i.path}`, removable: true }));
  }
  /**
   * Web: the patches this browser saved (to a file or a link) are listed in OPEN above the presets (owner, 2026-11-10),
   * as the plugin lists its patches folder. One per title, newest first; kept in this browser only (localStorage, which
   * holds a few MB: patches are small, as audio is never in them, DATA-0005). The oldest go past MINE_MAX.
   */
  const MINE_KEY = 'blokdust.myPatches', MINE_MAX = 100;
  /** `id`: its link, when it was saved to one (so the account's copy of it is listed once). */
  type Mine = { title: string; saved: number; patch: Patch; id?: string };
  function myPatches(): Mine[] {
    try { const v = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  function keepMine(title: string, id?: string): void {
    if (juce || embedId) return;
    let list: Mine[] = [{ title, saved: Date.now(), patch: { ...toPatch(), meta: { title } } as Patch, ...(id ? { id } : {}) }, ...myPatches().filter(m => m.title !== title)].slice(0, MINE_MAX);
    // Full: drop the oldest until it fits (the browser's limit, not ours).
    for (;;) {
      try { localStorage.setItem(MINE_KEY, JSON.stringify(list)); return; } catch { if (list.length <= 1) return; list = list.slice(0, -1); }
    }
  }
  /**
   * SAVE TO COMPUTER: the user picks where (owner, 2026-11-10). Plugin: the native save dialog, starting in
   * ~/Music/BlokDust/Patches. Web: the browser's save dialog where there is one (Chromium: it starts in Music, then
   * remembers the last folder used for patches); elsewhere a download, as before.
   */
  async function savePatchFile(title: string): Promise<boolean> {
    const name = `${fileNameFor(title)}.${PATCH_EXT}`;
    if (juce) {
      const r = await nativeReply<{ ok: boolean }>(req => juce.emitEvent('bd_patchSave', { req, name: fileNameFor(title), title }), 30 * 60 * 1000);
      if (r?.ok) setBaseline();
      return !!r?.ok;
    }
    const text = JSON.stringify({ ...toPatch(), meta: { title } }, null, 2);
    const w = window as unknown as { showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle> };
    if (w.showSaveFilePicker) {
      let handle: FileSystemFileHandle;
      try {
        handle = await w.showSaveFilePicker({ suggestedName: name, startIn: 'music', id: 'blokdust-patches',
          types: [{ description: 'BlokDust patch', accept: { 'application/json': [`.${PATCH_EXT}`] } }] });
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return false;  // cancelled
        console.warn('BlokDust: no save dialog; downloading instead', e);
        return download(name, text, title);
      }
      try {
        const out = await handle.createWritable();
        await out.write(text); await out.close();
      } catch (e) { track('save_failed', { kind: 'file' }); throw e; }
      setBaseline(); keepMine(title);
      track('patch_saved', { kind: 'file' }, { blocks: model.size });
      return true;
    }
    return download(name, text, title);
  }
  function download(name: string, text: string, title: string): boolean {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setBaseline(); keepMine(title);
    track('patch_saved', { kind: 'file' }, { blocks: model.size });
    return true;
  }
  /** SAVE / SAVE AS to a share link (SPEC-SHARING-BACKEND): v1 SAVE over this browser's (or account's) link, else a
   * new one. The link goes in the address bar; the patch counts as saved. */
  async function makeLink(mode: 'save' | 'saveAs', title: string, gallery?: boolean): Promise<GalleryState | null> {
    const id = await scene.host.share(mode === 'save' && shareLink?.owned ? 'save' : 'saveAs', title, gallery);
    linkSaved(id, title);
    return lastGallery;
  }
  /** Saved to the link `id` (`at`: the content saved): the address bar shows it and the patch counts as saved. */
  function linkSaved(id: string, title: string, at = contentOf(toPatch())): void {
    // The plugins' page isn't on the site: the link is the site's, and there is no address bar to update.
    const url = `${juce ? PLUGIN_SITE : `${location.origin}${location.pathname}`}?c=${id}&t=${encodeURIComponent(title)}`;
    if (!juce) history.replaceState(null, '', url);  // v1 AddressBarManager.UpdateURL
    shareLink = { url, owned: isServerId(id) && !!App.SessionId, at, title };
    setGuarded(false);  // saved: it is yours now (CHG-0041)
    setBaseline(at);  // a shared patch counts as saved
    keepMine(title, id);
    credit = null;  // saved: it is yours now (a remix keeps `parent`)
    track('patch_saved', { kind: 'link' }, { blocks: model.size });
    checkOwnDirty();
  }
  /**
   * Quick save (CHG-0033, SPEC-SHARING-BACKEND R18–R20; owner, 2026-11-17): Cmd/Ctrl+S, or the corner's SAVE, saves the
   * patch over this device's own link: the same link and title, the gallery left as it is, no video, no panel; v1's
   * message bar says SAVED. A patch with no link of its own (never saved, someone else's, a preset; the plugin and
   * the standalone app, which keep no link) opens Patches › SAVE instead. It never falls back to a new self-contained
   * link (SAVE's no-backend path): if the server can't be reached it says so and the patch stays unsaved.
   */
  const ownLink = () => !juce && !embedId && !credit && !!shareLink?.owned && !!App.CompositionId && isServerId(App.CompositionId);
  /** The own link's patch has changed since it was saved (worked out when an edit settles, not every frame). */
  let ownDirty = false, quickSaving = false;
  function checkOwnDirty(): void {
    const d = ownLink() && contentOf(toPatch()) !== shareLink!.at;
    if (d !== ownDirty) { ownDirty = d; stage.redraw(); }
  }
  function openSaveTab(): void {
    if ((scene.SettingsPanel as any).Open || scene.SoundcloudPanel.Open) return;
    if (scene.PatchesPanel.Open) scene.PatchesPanel.selectTab(0); else scene.PatchesPanel.OpenPanel(0);
  }
  async function quickSave(): Promise<void> {
    if (quickSaving || scene.PatchesPanel.Saving) return;
    if (!ownLink()) { openSaveTab(); return; }
    const link = shareLink!, patch = toPatch(), at = contentOf(patch), title = link.title || 'Untitled';
    if (at === link.at) { checkOwnDirty(); scene.message('Saved'); return; }
    quickSaving = true; stage.redraw();
    try {
      const thumb = stage.thumbnail(THUMB.width, THUMB.height, { title }).toDataURL('image/png').split(',')[1];
      const r = await saveShared('save', App.CompositionId, { patch, title, thumb });
      if (!r) throw new Error('no backend');
      // Not this device's to save over any more (its right was lost, or the patch deleted): saveShared made a new link.
      lastGallery = r.gallery ?? null;
      App.CompositionId = r.id; App.SessionId = sessionFor(r.id);
      const still = contentOf(toPatch()) !== at;  // edited while it saved: those edits are still unsaved
      session = { id: r.id, dirty: still }; saveSession(session); saveLocal(toPatch());
      linkSaved(r.id, title, at);
      if (r.gallery) scene.PatchesPanel.galleryKnown(r.gallery.published);
      scene.message('Saved');
    } catch (e) {
      console.warn('BlokDust: quick save failed', e); track('save_failed', { kind: 'quick' });
      scene.message('Save failed, please try again.');  // v1 L10n Errors.SaveError
    } finally { quickSaving = false; checkOwnDirty(); stage.redraw(); }
  }
  /** Open a server patch by id as the current composition (the account's, or one from the gallery: SAVE then saves
   * over it if this device may, else makes a new link with `parent` set: a remix). Insert just adds its blocks. */
  /** Open or insert a saved patch; when it can't be had, the message bar's words for why (owner, 2026-11-18). */
  async function openShared(id: string, mode: 'open' | 'insert'): Promise<true | string> {
    const r = await loadOrWhy(id);
    if ('missing' in r) return MISSING_TEXT[r.missing];
    // Someone else's (CHG-0041): opened, or inserted into yours, it is guarded until saved as yours.
    const theirs = !r.mine && !canOverwrite(id);
    if (mode === 'open' || theirs) setGuarded(mode === 'open' ? theirs : true);
    usePatch(r.patch, r.title, mode, { id, rev: r.rev, ...(r.title ? { title: r.title } : {}), ...(r.by ? { by: r.by } : {}) });
    if (mode !== 'open') return true;
    // The plugins (CHG-0039): the processor has the patch now; the DAW project keeps it, so no link or session here.
    if (juce) { credit = r.by && !r.mine ? { id, title: r.title || 'Untitled', by: r.by, published: !!r.published, liked: !!r.liked, likes: r.likes ?? 0, views: r.views ?? 0 } : null; return true; }
    App.CompositionId = id; App.SessionId = sessionFor(id);
    session = { id, dirty: false }; saveSession(session);
    const url = `${location.origin}${location.pathname}?c=${id}${r.title ? `&t=${encodeURIComponent(r.title)}` : ''}`;
    history.replaceState(null, '', url);
    shareLink = { url, owned: !!App.SessionId, at: contentOf(toPatch()), title: r.title ?? '' };
    setBaseline();
    credit = r.by && !r.mine ? { id, title: r.title || 'Untitled', by: r.by, published: !!r.published, liked: !!r.liked, likes: r.likes ?? 0, views: r.views ?? 0 } : null;
    scene.PatchesPanel.galleryKnown(r.mine ? !!r.published : null);
    return true;
  }
  /** Signed in: the account's patches (R8), as OPEN rows. */
  async function accountItems(): Promise<{ name: string; detail: string; key: string; removable: boolean; link: string }[]> {
    if (embedId) return [];
    try { return (await account.accountPatches()).map(p => ({ name: p.title || 'Untitled', detail: savedOn(p.updated), key: `acct:${p.id}`, removable: true, link: p.id })); }
    catch { return []; }  // signed out, or no backend
  }
  async function openPatchItem(key: string, mode: 'open' | 'insert'): Promise<boolean | string> {
    if (key.startsWith('acct:')) return openShared(key.slice(5), mode);  // saved over from this device (R9)
    if (key.startsWith('preset:')) {
      const p = PRESETS.find(x => `preset:${x.file}` === key), patch = p && parsePatchFile(p.text);
      if (p && patch) usePatch(patch, p.name, mode, undefined, 'preset');
      return !!patch;
    }
    if (key.startsWith('mine:')) {
      const m = myPatches().find(x => x.title === key.slice(5)), patch = m && parsePatchFile(JSON.stringify(m.patch));
      if (m && patch) usePatch(patch, m.title, mode);
      return !!patch;
    }
    if (juce && key.startsWith('file:')) {
      const r = await nativeReply<{ text: string; name: string }>(req => juce.emitEvent('bd_patchRead', { req, path: key.slice(5) }));
      const patch = r && parsePatchFile(r.text);
      if (r && patch) usePatch(patch, patchTitle(patch, r.name), mode);
      return !!patch;
    }
    return false;
  }
  /** FROM YOUR COMPUTER: one picker; the panel then asks Open or Insert (owner, 2026-11-10). */
  function pickPatchFile(): void {
    if (juce) { juce.emitEvent('bd_patchPick', {}); return; }  // the reply arrives as bd_patchFile (no req)
    const input = document.createElement('input');
    input.type = 'file'; input.accept = `.${PATCH_EXT},.json,application/json`;
    input.onchange = async () => { const f = input.files?.[0]; if (f) showPicked(await f.text(), f.name); };
    input.click();
  }
  /** A picked or dropped file, held until the user chooses Open or Insert. */
  let picked: { patch: Patch; title: string } | null = null;
  function showPicked(text: string, fileName: string): void {
    const patch = parsePatchFile(text), title = patch ? patchTitle(patch, fileName.replace(/\.(blokdust|json)$/i, '')) : '';
    picked = patch ? { patch, title } : null;
    scene.PatchesPanel.showFile(patch ? { title, fileName } : { title: '', fileName, error: `${fileName} couldn't be read as a BlokDust patch.` });
    stage.redraw();
  }
  (window as unknown as { __bd_pickedFile: unknown }).__bd_pickedFile = showPicked;  // tests: a file without a picker
  /** The view's centre, as a grid cell. */
  const viewCentre = () => { const [x, y] = stage.cssToGrid(app.canvas.clientWidth / 2, app.canvas.clientHeight / 2); return { x, y }; };
  function usePatch(p: Patch, title: string, mode: 'open' | 'insert', from?: Omit<PatchSource, 'blocks'>, source: 'file' | 'preset' | 'link' = from ? 'link' : 'file'): void {
    if (mode === 'open' && source !== 'link') setGuarded(false);  // a file or a preset: not someone else's (CHG-0041)
    applyPatch(p, mode, from);
    track('patch_opened', { source });
    if (mode === 'open') scene.PatchesPanel.setTitle(title);
  }
  /**
   * Open replaces the scene. Insert adds the patch's blocks, keeping their layout, and hands them to the pointer to place
   * (owner, 2026-11-10): see startPlacing. With a mouse they start under it; on a touch screen in the middle of the view.
   */
  function applyPatch(p: Patch, mode: 'open' | 'insert', from?: Omit<PatchSource, 'blocks'>): void {
    if (!juce) p = audioInAsMicrophone(p);  // the website's Audio In is a Microphone (CHG-0041)
    if (inside) exitStage();
    const touch = lastPointerType !== 'mouse', at = !touch && lastPointer ? lastPointer : viewCentre();
    const part = mode === 'open'
      ? { blocks: p.blocks.filter(b => BLOCKS_BY_ID.has(b.type)), refs: { ...(p.refs ?? {}) } }
      : insertBlocks({ ...p, blocks: p.blocks.filter(b => BLOCKS_BY_ID.has(b.type)) }, new Set([...model.values()].map(b => b.uid)), at);
    endPlacing(false);
    if (juce) {  // the processor owns the patch and the samples: it merges and the editor reloads (bd_patch)
      if (mode === 'open') { scene.ResetScene(); pluginAfterLoad = { open: true }; }
      else pluginAfterLoad = { place: new Set(part.blocks.map(b => b.id).filter((id): id is string => !!id)), touch, at };
      juce.emitEvent('bd_patchApply', { mode, patch: JSON.stringify({ ...part, ...(mode === 'open' && p.tempo !== undefined ? { tempo: p.tempo } : {}),
        ...(mode === 'open' && p.connectionOrder ? { connectionOrder: p.connectionOrder } : {}),
        ...(mode === 'open' && p.view ? { view: p.view } : {}),
        ...(mode === 'open' ? (p.labels?.length ? { labels: p.labels } : {}) : ('labels' in part && part.labels.length ? { labels: part.labels } : {})),
        ...(mode === 'open' ? (p.macros?.length ? { macros: p.macros } : {}) : ('macros' in part && part.macros.length ? { macros: part.macros } : {})) }) });
      return;
    }
    if (mode === 'open') { scene.ResetScene(); if (typeof p.tempo === 'number') { tempo = p.tempo; sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]); } }
    for (const [k, r] of Object.entries(part.refs)) if (r && typeof r === 'object' && 'provider' in r && !refs.has(k)) refs.set(k, r as SampleRef);
    for (const m of readMacros(mode === 'open' ? p.macros : 'macros' in part ? part.macros : [])) macros.set(m.block, m);  // before their Stage blocks are added
    const ids = part.blocks.map(b => addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id));
    // Lineage (SPEC-PATCH-FORMAT-V2 R11): opening keeps the patch's sources; inserting adds the inserted patch (when it is a saved one) and
    // carries its own sources, under the blocks' new ids.
    if (mode === 'open') sources = readSources(p.sources);
    else {
      const kept = p.blocks.filter(b => BLOCKS_BY_ID.has(b.type)), now = new Map(kept.map((b, i) => [b.id, part.blocks[i]?.id]));
      const moved = (bs: string[]) => bs.map(b => now.get(b)).filter((b): b is string => !!b);
      for (const s of readSources(p.sources)) { const bs = moved(s.blocks); if (bs.length) sources.push({ ...s, blocks: bs }); }
      if (from) sources.push({ ...from, blocks: part.blocks.map(b => b.id).filter((b): b is string => !!b) });
    }
    addLabels(readLabels(mode === 'open' ? p.labels : 'labels' in part ? part.labels : []));
    if (mode === 'open') { connectionOrder = [...(p.connectionOrder ?? [])]; send(relinks(p, uidToId())); applyView(p.view); keepBlocksInView(); }
    if (mode === 'open') setBaseline(); else startPlacing(ids, touch, at);
    stage.redraw();
  }
  /** Plugin: what to do once the processor sends the merged patch back. */
  let pluginAfterLoad: { open: true } | { place: Set<string>; touch: boolean; at: { x: number; y: number } } | null = null;

  // ---- unsaved changes (owner, 2026-11-10): the patch as last saved, shared or opened ----
  /** What Open would lose: blocks, their params and the tempo (not the view); not a Toggle's on/off, which a
   * running scene flips by itself (CHG-0013). */
  const withoutLogic = (blocks: Patch['blocks']) => blocks.map(b => (b.type === 'power.toggle' && b.params && 'logic' in b.params
    ? { ...b, params: Object.fromEntries(Object.entries(b.params).filter(([k]) => k !== 'logic')) } : b));
  const contentOf = (p: Patch) => JSON.stringify([withoutLogic(p.blocks), p.tempo ?? null, ...(p.labels?.length || p.macros?.length ? [p.labels ?? []] : []),
    ...(p.macros?.length ? [p.macros.map(m => ({ ...m, blocks: withoutLogic(m.blocks), view: undefined }))] : [])]);
  const BASELINE_KEY = 'blokdust.savedPatch';
  let baseline = '';
  function setBaseline(content = contentOf(toPatch())): void {
    baseline = content;
    if (!juce && !embedId) try { localStorage.setItem(BASELINE_KEY, baseline); } catch { /* private mode */ }
  }
  /** The share link made here (or the one this browser can update, from the start-up link). */
  let shareLink: { url: string; owned: boolean; at: string; title: string } | null = null;
  /** What the last save said about the gallery (SPEC-SHARING-GALLERY R1). */
  let lastGallery: GalleryState | null = null;

  // ---- Insert: the new blocks follow the pointer until a click (or, on a touch screen, a drag) puts them down ----
  let placing: { ids: number[]; at: { x: number; y: number }; touch: boolean; grabbed?: boolean } | null = null;
  /** Undo and redo (owner, 2026-11-10/11, and 2026-11-12 CHG-0010): adding blocks (from the menu, Insert, Cmd/Ctrl+D,
   * Alt-drag copies), moving and deleting them, each one step however many blocks it took. Steps name blocks by
   * their patch id, which a block keeps when undo or redo brings it back; a removed block is kept whole (settings,
   * place, its sound). A new action clears what could be redone. Param changes are not steps. */
  type XY = { x: number; y: number };
  type Snap = { b: ModelBlock; buf?: AudioBuffer };
  // Labels (owner, 2026-11-14) are in the same steps, by label id: made (with the blocks made), removed (kept whole) and
  // moved. Their words are not steps (as params are not).
  type LabelMove = { id: string; from: XY; to: XY };
  type UndoStep = { kind: 'add'; uids: string[]; snaps?: Snap[]; labels?: string[]; labelSnaps?: Label[] } | { kind: 'remove'; snaps: Snap[]; labels?: Label[] }
    | { kind: 'move'; moves: { uid: string; from: XY; to: XY }[]; labelMoves?: LabelMove[] };
  const undoStack: UndoStep[] = [], redoStack: UndoStep[] = [];
  const pushUndo = (u: UndoStep) => { if (u.kind === 'add' && countActivity) activity.blockAdded(u.uids.length); undoStack.push(u); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; };
  const idOfUid = (uid: string) => { for (const [id, b] of model) if (b.uid === uid) return id; return undefined; };
  const uidsOf = (ids: Iterable<number>) => [...ids].flatMap(id => { const b = model.get(id); return b ? [b.uid] : []; });
  const snapOf = (uid: string): Snap | null => { const id = idOfUid(uid), b = id === undefined ? undefined : model.get(id); return b ? { b: structuredClone(b), buf: samples.get(id!) } : null; };
  function restore(s: Snap): void {
    const id = addBlock(s.b.type, s.b.x, s.b.y, structuredClone(s.b.params), idOfUid(s.b.uid) === undefined ? s.b.uid : undefined);
    if (s.buf && s.b.type !== 'source.sample-gen') useBuffer(id, s.buf, 'keep');
  }
  let lastPointer: { x: number; y: number } | null = null;
  let lastPointerType = 'mouse';
  function startPlacing(ids: number[], touch: boolean, at: { x: number; y: number }): void {
    if (!ids.length) return;
    placing = { ids, at: { x: Math.round(at.x), y: Math.round(at.y) }, touch };
    stage.placing = new Set(ids);
    for (const id of ids) stage.toFront(id);
    pushUndo({ kind: 'add', uids: uidsOf(ids) });
    stage.redraw();
  }
  /** Move the placed blocks with the pointer, a whole grid cell at a time (as a dragged block moves). */
  function placeAt(gx: number, gy: number): void {
    if (!placing) return;
    const x = Math.round(gx), y = Math.round(gy), dx = x - placing.at.x, dy = y - placing.at.y;
    if (!dx && !dy) return;
    for (const id of placing.ids) { const b = model.get(id); if (b) moveBlock(id, b.x + dx, b.y + dy); }
    placing.at = { x, y };
  }
  function endPlacing(cancel: boolean): void {
    if (!placing) return;
    if (cancel) {
      const uids = new Set(placing.ids.map(id => model.get(id)?.uid));
      for (const id of placing.ids) removeBlock(id);
      const top = undoStack.at(-1); if (top?.kind === 'add' && top.uids.every(u => uids.has(u))) undoStack.pop();
    }
    placing = null;
    stage.placing = new Set();
    stage.redraw();
  }
  (window as unknown as { __bd_placing: () => unknown }).__bd_placing = () => placing && { ids: [...placing.ids], touch: placing.touch };

  // ---- samples: the user's own files, decoded here, attached in the engine; never uploaded (DATA-0005) ----
  const samples = new Map<number, AudioBuffer>();
  const missing = new Set<number>();
  /** v1 App.AnimationsLayer.AddToList / RemoveFromList: the spinning loading bubble beside a block while its audio loads. */
  async function whileLoading<T>(id: number, work: () => Promise<T>): Promise<T> {
    const v = v1Blocks.get(id);
    if (v) { scene.AnimationsLayer.AddToList(v); v.RefreshOptionsPanel('animate'); stage.redraw(); }
    try { return await work(); } finally {
      if (v) { scene.AnimationsLayer.RemoveFromList(v); if (scene.OptionsPanel.SelectedBlock === v) v.RefreshOptionsPanel(); stage.redraw(); }
    }
  }
  const SAMPLERS = new Set(['source.sample', 'source.granular', 'fx.convolver']);
  /**
   * Reverse a sampler (owner review 2026-11-07, bugs 2 + 3): the waveform flips at once (v1 SwitchBuffer) and the
   * start/end and loop points are mirrored, so the same stretch of audio stays selected and plays backwards (v1 kept the
   * numbers, which selected different audio). The engine reads the region in reversed time and restarts sounding voices.
   */
  function reverseSample(id: number, on: boolean): void {
    const b = model.get(id), v = v1Blocks.get(id), dur = samples.get(id)?.duration ?? v?.PrimaryBuffer?.duration;
    if (!b || !!b.params.reverse === on) return;
    const num = (k: string, d: number) => (typeof b.params[k] === 'number' ? b.params[k] as number : d);
    const mirrored = dur ? { startPosition: dur - num('endPosition', dur), endPosition: dur - num('startPosition', 0),
      loopStart: dur - num('loopEnd', dur), loopEnd: dur - num('loopStart', dur * 0.5) } : {};
    setParams(id, { ...mirrored, reverse: on });
    if (v) { v.WaveForm = [...v.WaveForm].reverse(); v.RefreshOptionsPanel(); }
    stage.redraw();
  }
  /** "Your file" (sample panel), drag-and-drop, or relinking a missing file: never uploaded (DATA-0005). */
  async function pickSample(id: number): Promise<void> {
    if (juce) { juce.emitEvent('bd_pickFile', { id, ...atStage() }); return; }  // plugin: a native chooser keeps the file's path
    const t = model.get(id)?.params.track, ref = typeof t === 'string' ? refs.get(t) : undefined;
    // A missing remembered file: this click is the user gesture the browser needs to allow reading it again.
    if (missing.has(id) && ref?.provider === 'file' && ref.hash) {
      const f = await openRemembered(ref.hash, true);
      if (f) { await useFile(id, f, null, false); return; }
    }
    const picked = await pickAudioFile();
    if (picked) await useFile(id, picked.file, picked.handle, !missing.has(id));
  }
  async function useFile(id: number, file: File, handle: FileSystemFileHandle | null, fresh: boolean): Promise<void> {
    const fp = await fingerprint(file);
    const ref: FileRef = { provider: 'file', name: file.name, bytes: fp.bytes, durationSec: 0, hash: fp.hash };
    if (handle) await rememberHandle(fp.hash, handle);
    await whileLoading(id, async () => useSample(id, ref, await file.arrayBuffer(), fresh));
  }
  /** A sampler whose reference can't be loaded here (someone else's file, or a sound that's gone): the options panel says
   * so, and the reference stays in the patch until the user picks another sample. */
  function markMissing(id: number): void {
    const b = model.get(id), v = v1Blocks.get(id), t = b?.params.track;
    if (!b || !v || typeof t !== 'string') return;
    missing.add(id);
    const ref = refs.get(t);
    const name = ref?.provider === 'freesound' ? ref.name : ref?.name ?? t.replace(/^file:/, '');
    Object.assign(v.Params, { trackName: `MISSING · ${name.toUpperCase().slice(0, 24)}`, user: ref?.provider === 'freesound' ? 'Freesound' : 'Local file' });
    v.RefreshOptionsPanel();
  }
  /** The Convolver only uses its impulse response's first kMaxImpulseSeconds (engine config.hpp): download just that. */
  const maxSecondsFor = (id: number) => (model.get(id)?.type === 'fx.convolver' ? 2.5 : undefined);
  /** Load a block's saved reference (patch open, share link): Freesound from its preview, a file from its remembered handle. */
  async function resolveSample(id: number, isNew = false): Promise<void> {
    if (juce) { if (isNew) juce.emitEvent('bd_samplesHello', {}); return; }  // plugin: the processor restores samples
    const b = model.get(id);
    if (!b || !SAMPLERS.has(b.type) || samples.has(id)) return;
    const t = b.params.track ?? BLOCKS_BY_ID.get(b.type)?.params.find(q => q.key === 'track')?.default;
    if (isDeadDefault(t)) {
      // v2's default sound (DEFAULT_SOUNDS) for a new block, or one still on v1's default (v1 import, Phase 1 patch).
      const d = DEFAULT_SOUNDS[b.type];
      if (!d) return;
      try {
        const ref = { ...d }, bytes = await whileLoading(id, () => fetchFreesound(ref, maxSecondsFor(id)));
        // Something else was chosen meanwhile (a file, a search result): it wins.
        if (samples.has(id) || !model.has(id) || !isDeadDefault(model.get(id)!.params.track)) return;
        await useSample(id, ref, bytes, isNew);
      } catch (e) { console.warn('BlokDust: default sound unavailable', e); }
      return;
    }
    if (typeof t !== 'string') return;
    const ref = refs.get(t);
    if (t.startsWith('freesound:')) {
      if (ref?.provider !== 'freesound') { markMissing(id); return; }
      try { await whileLoading(id, async () => useSample(id, ref, await fetchFreesound(ref, maxSecondsFor(id)), false)); } catch (e) { console.warn('BlokDust: Freesound sound unavailable', e); markMissing(id); }
    } else if (t.startsWith('file:')) {
      const f = ref?.provider === 'file' && ref.hash ? await openRemembered(ref.hash, false) : null;
      if (f && ref?.provider === 'file') await whileLoading(id, async () => useSample(id, ref, await f.arrayBuffer(), false));
      else markMissing(id);
    }
  }
  /** Update params in the model, the v1 block and the engine (numbers and switches only reach the engine). */
  function setParams(id: number, values: Record<string, unknown>): void {
    const b = model.get(id), v = v1Blocks.get(id), def = b && BLOCKS_BY_ID.get(b.type);
    if (!b || !def) return;
    Object.assign(b.params, values);
    if (v) Object.assign(v.Params, values);
    send(Object.entries(values).flatMap(([k, val]) => {
      const i = def.params.findIndex(q => q.key === k);
      return i >= 0 && (typeof val === 'number' || typeof val === 'boolean') ? [{ type: CommandType.SetParam, id, param: i, value: Number(val) }] : [];
    }));
    changed();
  }
  /** A sampler's new audio (v1 SamplerBase.SetBuffers / Recorder.SetBuffers / SampleGen.PopulateBuffer). */
  function useBuffer(id: number, buffer: AudioBuffer, region: 'keep' | 'reset' | 'half', waveDetail = 5): void {
    // Plugin: the processor plays it, from a file it saves (a reopened project needs no editor); its report shows it.
    if (juce) { juce.emitEvent('bd_sampleData', { id, sampleRate: buffer.sampleRate, data: Array.from(buffer.getChannelData(0)), ...atStage() }); return; }
    samples.set(id, buffer);
    const v = v1Blocks.get(id), dur = buffer.duration;
    if (region === 'reset') setParams(id, { startPosition: 0, endPosition: dur, loopStart: 0, loopEnd: dur, reverse: false });
    if (region === 'half') setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur });
    if (v) { v.PrimaryBuffer = buffer; v.WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, waveDetail, 95); v.RefreshOptionsPanel(); }
    sendSample(id, buffer);
    stage.redraw();
  }
  // ---- v1 Recorder (RecorderPanel button): record the master output into the block ----
  async function toggleRecording(id: number): Promise<void> {
    const v = v1Blocks.get(id);
    // Plugin: the processor records its own output and loads the take into the block (as a file the project keeps).
    // v1 Recorder.StartRecording / StopRecording: a one-second line in the message bar each way.
    const say = (on: boolean) => scene.message(on ? 'Started Recording' : 'Stopped Recording', { seconds: 1 });
    if (v && juce) { v.IsRecording = !v.IsRecording; juce.emitEvent('bd_record', { id, on: v.IsRecording, ...atStage() }); say(v.IsRecording); stage.redraw(); return; }
    if (!v || !engine) return;
    if (!v.IsRecording) { v.IsRecording = true; engine.startRecording(); say(true); stage.redraw(); return; }
    v.IsRecording = false; say(false);
    const r = await engine.stopRecording();
    stage.redraw();
    if (!r.left.length) return;
    const buf = new AudioBuffer({ numberOfChannels: 2, length: r.left.length, sampleRate: r.sampleRate });
    buf.copyToChannel(r.left as Float32Array<ArrayBuffer>, 0); buf.copyToChannel(r.right as Float32Array<ArrayBuffer>, 1);
    setParams(id, { reverse: false });
    useBuffer(id, buf, 'half', 2);  // v1 Recorder.UpdateWaveform: detail 2, loop from half way
  }
  function downloadRecording(id: number): void {
    if (juce) { juce.emitEvent('bd_reveal', { id, ...atStage() }); return; }  // plugin: the take is already a file; show it
    const buf = samples.get(id);
    if (!buf) return;  // v1: "This block doesn't have a recording to download yet."
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([encodeWav(buf)], { type: 'audio/wav' }));
    a.download = 'BlokdustRecording.wav';  // v1 Recorder.Filename
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  // ---- v1 SampleGen: v1's own generator (ported verbatim) renders a random arpeggio; its recipe is saved ----
  // SOUND (CHG-0035): a SampleGen with a sound number makes its wave from that number (v1's generator on a seeded
  // random); one without (v1 patches, and v2 ones from before) plays its saved recipe as v1 did.
  /** The sound each SampleGen's wave was last made from (a release on the same number makes nothing new). */
  const soundMade = new Map<number, number>();
  function generateSample(id: number, fromSeed: boolean): void {
    const v = v1Blocks.get(id);
    if (!v) return;
    v.WaveForm = []; v.RefreshOptionsPanel();
    const sound = Number(v.Params.sound) || 0;
    if (sound) soundMade.set(id, sound);
    const ctx = Object.assign(Object.create(SAMPLE_GEN), {
      Params: v.Params, _LoadFromShare: fromSeed && !sound, _SeedLoad: true, _WaveVoices: [] as unknown[],
      Sources: [{ noteToFrequency: (note: string) => noteToFrequency(note) }],
      PopulateBuffer(this: { _BufferData: Float32Array<ArrayBuffer> }, sr: number) {
        const data = this._BufferData;
        const buf = new AudioBuffer({ numberOfChannels: 1, length: data.length, sampleRate: sr });
        buf.copyToChannel(data, 0);
        const b = model.get(id);
        if (b) { b.params.seed = v.Params.seed; changed(); }
        useBuffer(id, buf, fromSeed ? 'keep' : 'reset');
      },
    });
    setTimeout(() => withSound(sound, () => ctx.DataToBuffer()), 16);  // v1 runs it on a timeout too
  }
  /** v1 SampleGen for a block that is not on show (inside a Stage): its saved recipe, or a new one kept in `params`. */
  function generateBuffer(params: Record<string, unknown>): Promise<AudioBuffer> {
    const def = BLOCKS_BY_ID.get('source.sample-gen')!;
    const Params = { ...Object.fromEntries(def.params.map(q => [q.key, q.default])), ...params };
    return new Promise(res => {
      const sound = Number(Params.sound) || 0;
      const ctx = Object.assign(Object.create(SAMPLE_GEN), {
        Params, _LoadFromShare: !sound && !!(params.seed as { waveVoices?: unknown } | undefined)?.waveVoices, _SeedLoad: true, _WaveVoices: [] as unknown[],
        Sources: [{ noteToFrequency: (note: string) => noteToFrequency(note) }],
        PopulateBuffer(this: { _BufferData: Float32Array<ArrayBuffer> }, sr: number) {
          const buf = new AudioBuffer({ numberOfChannels: 1, length: this._BufferData.length, sampleRate: sr });
          buf.copyToChannel(this._BufferData, 0);
          params.seed = Params.seed;
          res(buf);
        },
      });
      setTimeout(() => withSound(sound, () => ctx.DataToBuffer()), 16);
    });
  }
  /** A block's audio as it was (looking into a Stage): shown in its panel, not sent (the engine has it). */
  function showBuffer(id: number, buffer: AudioBuffer): void {
    const b = model.get(id), v = v1Blocks.get(id);
    if (!b) return;
    samples.set(id, buffer);
    if (!v) return;
    const wave = new Waveform().GetWaveformFromBuffer(buffer, 200, b.type === 'source.recorder' ? 2 : 5, 95);
    v.PrimaryBuffer = buffer;
    if (b.type === 'source.granular' || b.type === 'fx.convolver') v._WaveForm = wave;
    else v.WaveForm = b.params.reverse ? wave.reverse() : wave;
  }
  // ---- fx.convolver: the built-in impulse response's waveform (v1 showed its loaded response) ----
  async function showBuiltInImpulse(id: number): Promise<void> {
    const v = v1Blocks.get(id);
    if (!v || samples.has(id)) return;
    const { left, right } = defaultImpulse(await engineModule(), 48000);
    const buf = new AudioBuffer({ numberOfChannels: 2, length: left.length, sampleRate: 48000 });
    buf.copyToChannel(left as Float32Array<ArrayBuffer>, 0); buf.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
    if (!samples.has(id)) { v._WaveForm = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95); v.RefreshOptionsPanel(); }
  }
  /**
   * Decoded audio for a sampler (Sample, Granular, Convolver) with its reference. `fresh`: a newly chosen sample (v1
   * LoadTrack / SetBuffers: region reset); otherwise a saved one being restored (its region params are kept).
   */
  async function useSample(id: number, ref: SampleRef, bytes: ArrayBuffer, fresh = true,
    display?: { trackName: string; user: string; permalink: string }): Promise<void> {
    const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes);
    const b = model.get(id), v = v1Blocks.get(id);
    if (!b) return;
    if (ref.provider === 'file') ref.durationSec = Math.round(buffer.duration * 1000) / 1000;
    if (fresh) track('sample_loaded', { source: ref.provider === 'file' ? 'file' : DEFAULT_SOUNDS[b.type]?.id === ref.id ? 'default' : 'freesound' });
    const key = refKey(ref);
    refs.set(key, ref);
    missing.delete(id);
    samples.set(id, buffer);
    const shown = display ?? (ref.provider === 'freesound'
      ? { trackName: ref.name.toUpperCase().slice(0, 30), user: ref.username, permalink: ref.url }
      : { trackName: ref.name, user: 'Local file', permalink: '' });
    // Saved display text stays when restoring; a new sample shows its own.
    const meta = fresh || b.params.track !== key ? { track: key, ...shown } : { track: key, trackName: b.params.trackName ?? shown.trackName, user: b.params.user ?? shown.user, permalink: b.params.permalink ?? shown.permalink };
    Object.assign(b.params, meta);
    if (v) Object.assign(v.Params, meta);
    changed();
    if (b.type === 'source.granular' || b.type === 'fx.convolver') {
      // Granular: the LOCATION slider draws the file and the grains play it. Convolver: the impulse response (v1 SetBuffer).
      // v1 Granular: a new sound puts the spawn point half way (a saved one keeps its own); the LOCATION slider spans
      // the file (v1 GetDuration of its first buffer), so the spawn and spread lines and dragging work.
      if (b.type === 'source.granular' && (fresh || typeof b.params.region !== 'number')) setParams(id, { region: buffer.duration * 0.5 });
      if (v) { v.PrimaryBuffer = buffer; v._WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95); v.RefreshOptionsPanel(); }
      sendSample(id, buffer);  // Granular plays it (CHG-0004 3.8); Convolver uses it as the impulse response
      stage.redraw();
      return;
    }
    // v1 Sample.SetBuffers: a new sample resets the region (start 0, end = length, loop from half way). It lives in
    // the patch and goes to the engine, so playback loops exactly what the panel shows (owner review 2026-11-07, bug 1).
    // A restored patch that never saved a region gets the same defaults.
    const dur = buffer.duration;
    if (fresh) setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur, reverse: false });
    else if (typeof b.params.endPosition !== 'number' || b.params.endPosition <= 0)
      setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur });
    if (v) {
      v.PrimaryBuffer = buffer;
      const wave = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95);  // v1 SamplerBase
      v.WaveForm = b.params.reverse ? wave.reverse() : wave;  // v1 shows the reversed buffer's waveform
      v.RefreshOptionsPanel();
    }
    sendSample(id, buffer);
    stage.redraw();
  }
  // Tests: attach a file without a picker.
  (window as unknown as { __bd_loadSample: unknown }).__bd_loadSample = (id: number, name: string, bytes: ArrayBuffer) =>
    useSample(id, { provider: 'file', name, bytes: bytes.byteLength, durationSec: 0, hash: '' }, bytes, true);
  const needsInput = (type: string) => type === 'source.microphone' || type === 'source.audio-in';
  /**
   * Someone else's patch on the website (CHG-0041, owner 2026-11-19): opened from a link or the gallery and not this
   * browser's or the account's, or an embed. Its microphone waits for TURN ON in the message bar, and its sound goes
   * through the safety limit (EngineNode.setGuard). Your own patches and the plugins: neither.
   */
  let guarded = false, inputAllowed = false, inputAsked = false;
  function setGuarded(on: boolean): void {
    if (juce) return;
    if (on && !guarded) { inputAllowed = false; inputAsked = false; }
    guarded = on;
    engine?.setGuard(on);
    if (!on && [...model.values()].some(b => needsInput(b.type))) listen();
  }
  /** Open the microphone for a Microphone or Audio In block: at once, unless the patch is someone else's (then the
   * message bar asks first). `byUser`: the user put the block there themselves. */
  function listen(byUser = false): void {
    if (!engine) return;
    if (byUser) inputAllowed = true;
    if (guarded && !inputAllowed) {
      if (inputAsked) return;
      inputAsked = true;
      scene.message('This patch uses your microphone.', { buttonText: 'Turn on', buttonEvent: () => { inputAllowed = true; void engine?.connectMicrophone(); } });
      return;
    }
    void engine.connectMicrophone();
  }

  /**
   * LFO targets (AUDIO-0003): the patch names a target as "<block id>:<param key>"; the engine is told this session's
   * ids. Sent again whenever blocks come or go (a target not there idles the LFO).
   */
  let targetsQueued = false;
  function syncTargets(): void {
    if (targetsQueued) return;
    targetsQueued = true;
    queueMicrotask(() => { targetsQueued = false; send(targetSetParams()); });
  }
  function targetSetParams(): Command[] {
    const blocks = [...model.values()].map(b => ({ id: b.uid, type: b.type, params: b.params })), ids = uidToId();
    const set = targetCommands(blocks, ids), aimed = new Set(set.map(c => c.id));
    for (const [id, b] of model) {  // an LFO whose target is gone (or was never set) aims at nothing
      const p = BLOCKS_BY_ID.get(b.type)!.params.findIndex(q => q.key === 'targetBlock');
      if (p >= 0 && !aimed.has(id)) set.push({ type: CommandType.SetParam, id, param: p, value: 0 });
    }
    return set;
  }
  function removeBlock(id: number): void {
    if (!model.has(id)) return;
    model.delete(id); v1Blocks.delete(id);
    stage.selected.delete(id); stage.held.delete(id);
    stage.removeBlock(id);
    send([{ type: CommandType.RemoveBlock, id }]);
    syncTargets();
    scene.setBlocks([...v1Blocks.values()]);
    changed();
    releaseInputIfUnused();
  }
  /** The last block that listens (Microphone, Audio In; a Stage with one inside) is gone: the microphone is let go,
   * so the browser stops showing it in use (owner, 2026-11-17, CHG-0035). Not while looking into a Stage (the outer
   * blocks are put aside then). */
  let inputCheckQueued = false;
  function releaseInputIfUnused(): void {
    if (inputCheckQueued) return;
    inputCheckQueued = true;
    queueMicrotask(() => {
      inputCheckQueued = false;
      if (!engine || inside) return;
      const listens = [...model.values()].some(b => needsInput(b.type) || (b.type === 'source.stage' && !!macros.get(b.uid)?.blocks.some(x => needsInput(x.type))));
      if (!listens) engine.disconnectMicrophone();
    });
  }
  /** Delete blocks as one undoable step. */
  function deleteBlocks(ids: number[], from?: Map<number, { x: number; y: number }>, labelIds: string[] = [], labelFrom?: Map<string, XY>): void {
    usage.blocksDeleted += ids.length;
    // Kept where they were before the drag that took them to the trash.
    const snaps = ids.flatMap(id => { const b = model.get(id); return b ? [{ b: { ...structuredClone(b), ...from?.get(id) }, buf: samples.get(id) }] : []; });
    const gone = labelSnapsOf(labelIds).map(l => ({ ...l, ...labelFrom?.get(l.id) }));
    if (!snaps.length && !gone.length) return;
    for (const id of ids) removeBlock(id);
    deleteLabels(gone.map(l => l.id));
    pushUndo({ kind: 'remove', snaps, ...(gone.length ? { labels: gone } : {}) });
  }
  /** A drag that ended: one move step for the blocks it moved. */
  function recordMove(ids: number[], from: Map<number, XY>, labelFrom?: Map<string, XY>): void {
    const moves = ids.flatMap(id => { const b = model.get(id), f = from.get(id); return b && f && (b.x !== f.x || b.y !== f.y) ? [{ uid: b.uid, from: f, to: { x: b.x, y: b.y } }] : []; });
    const labelMoves = labelFrom ? labelMovesSince(labelFrom) : [];
    if (moves.length || labelMoves.length) pushUndo({ kind: 'move', moves, ...(labelMoves.length ? { labelMoves } : {}) });
  }
  const removeUids = (uids: string[]) => { for (const u of uids) { const id = idOfUid(u); if (id !== undefined) removeBlock(id); } };
  const moveUids = (moves: { uid: string; from: XY; to: XY }[], to: boolean) => {
    for (const m of moves) { const id = idOfUid(m.uid), at = to ? m.to : m.from; if (id !== undefined) moveBlock(id, at.x, at.y); }
  };
  const labelSnapsOf = (ids: string[]) => ids.flatMap(id => { const l = labels.find(x => x.id === id); return l ? [{ ...l }] : []; });
  /** Labels out (undo, redo): as deleting them, without a step. */
  function takeOutLabels(ids: string[]): void {
    const gone = new Set(ids);
    if (!gone.size) return;
    for (let i = labels.length - 1; i >= 0; i--) if (gone.has(labels[i].id)) labels.splice(i, 1);
    for (const id of gone) selectedLabels.delete(id);
    if (labelEdit && gone.has(labelEdit.id)) endLabelEdit(false);
    labelsChanged();
  }
  /** Labels back (undo, redo), with the ids they had. */
  function putBackLabels(list: Label[]): void {
    if (!list.length) return;
    addLabels(list.map(l => ({ ...l })));
    labelsChanged();
  }
  function moveLabelSteps(moves: LabelMove[], to: boolean): void {
    if (!moves.length) return;
    for (const m of moves) { const l = labels.find(x => x.id === m.id); if (l) { const at = to ? m.to : m.from; l.x = at.x; l.y = at.y; } }
    labelsChanged();
  }
  /** Where labels `ids` stand now (the start of a drag). */
  const labelPlaces = (ids: Iterable<string>) => new Map([...ids].flatMap(id => { const l = labels.find(x => x.id === id); return l ? [[id, { x: l.x, y: l.y }] as [string, XY]] : []; }));
  /** Label moves since `from`, for a move step. */
  const labelMovesSince = (from: Map<string, XY>): LabelMove[] => [...from].flatMap(([id, f]) => {
    const l = labels.find(x => x.id === id); return l && (l.x !== f.x || l.y !== f.y) ? [{ id, from: f, to: { x: l.x, y: l.y } }] : [];
  });
  /** Undo the last step; false when there is none. */
  function undo(): boolean {
    const u = undoStack.pop();
    if (u) usage.undos++;
    if (!u) return false;
    if (u.kind === 'add') {
      const snaps = u.uids.flatMap(uid => { const s = snapOf(uid); return s ? [s] : []; });
      const labelSnaps = labelSnapsOf(u.labels ?? []);
      removeUids(u.uids);
      takeOutLabels(u.labels ?? []);
      redoStack.push({ kind: 'add', uids: u.uids, snaps, labels: u.labels, labelSnaps });
    } else if (u.kind === 'remove') { for (const s of u.snaps) restore(s); putBackLabels(u.labels ?? []); redoStack.push(u); }
    else { moveUids(u.moves, false); moveLabelSteps(u.labelMoves ?? [], false); redoStack.push(u); }
    setSelection([]);
    stage.redraw();
    return true;
  }
  /** Redo the last undone step; false when there is none. */
  function redo(): boolean {
    const u = redoStack.pop();
    if (!u) return false;
    if (u.kind === 'add') { for (const s of u.snaps ?? []) restore(s); putBackLabels(u.labelSnaps ?? []); undoStack.push({ kind: 'add', uids: u.uids, labels: u.labels }); }
    else if (u.kind === 'remove') {
      const snaps = u.snaps.flatMap(s => { const now = snapOf(s.b.uid); return now ? [now] : []; });
      const ids = (u.labels ?? []).map(l => l.id), labelsNow = labelSnapsOf(ids);
      removeUids(u.snaps.map(s => s.b.uid));
      takeOutLabels(ids);
      undoStack.push({ kind: 'remove', snaps, labels: labelsNow });
    } else { moveUids(u.moves, true); moveLabelSteps(u.labelMoves ?? [], true); undoStack.push(u); }
    setSelection([]);
    stage.redraw();
    return true;
  }
  function moveBlock(id: number, x: number, y: number): void {
    const b = model.get(id), sb = stage.block(id);
    if (!b || !sb) return;
    b.x = x; b.y = y;
    const v = v1Blocks.get(id); if (v) { v.Position.x = x; v.Position.y = y; }
    stage.upsertBlock({ ...sb, x, y });
    send([{ type: CommandType.MoveBlock, id, x, y }]);
    changed();
  }
  /** Show a patch. `ids` (plugin): the processor's engine ids by patch block id, which the page must use (its engine
   * keeps running when the editor reopens, and its ids are not 1..N once blocks were deleted). */
  /** A patch's macros, checked: each names a block and lists blocks. */
  const readMacros = (list: unknown): Macro[] => (Array.isArray(list) ? list : []).filter((m): m is Macro => !!m && typeof m === 'object' && typeof (m as Macro).block === 'string' && Array.isArray((m as Macro).blocks))
    .map(m => structuredClone(m));
  function showPatch(p: Patch, ids?: Record<string, number>): void {
    if (!juce) p = audioInAsMicrophone(p);  // the website's Audio In is a Microphone (CHG-0041)
    if (inside) leaveStage(false);
    for (const id of [...model.keys()]) { model.delete(id); v1Blocks.delete(id); stage.removeBlock(id); samples.delete(id); missing.delete(id); }
    undoStack.length = 0; redoStack.length = 0;
    seed = p.seed ?? 1; nextId = 1;
    tempo = typeof p.tempo === 'number' ? p.tempo : undefined;
    if (tempo !== undefined) sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
    for (const [k, r] of Object.entries(p.refs ?? {})) if (r && typeof r === 'object' && 'provider' in r) refs.set(k, r as SampleRef);
    for (const b of p.blocks) if (BLOCKS_BY_ID.has(b.type)) {
      const fixed = ids && b.id !== undefined ? ids[b.id] : undefined;
      if (fixed !== undefined) nextId = fixed;
      addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id, true);
    }
    if (ids) nextId = Math.max(nextId, ...Object.values(ids).map(i => i + 1));
    connectionOrder = Array.isArray(p.connectionOrder) ? [...p.connectionOrder] : [];
    labels.length = 0; selectedLabels.clear(); addLabels(readLabels(p.labels));
    macros.clear(); innerIds.clear(); innerSamples.clear();
    for (const m of readMacros(p.macros)) macros.set(m.block, m);
    sources = readSources(p.sources);
    if (juce) applyView(p.view);  // the plugin's patch, from the processor (on the web, startup applies it below)
    for (const id of model.keys()) void resolveSample(id);
    scene.setBlocks([...v1Blocks.values()]);
    uiSync = true;
    stage.redraw();
  }
  // A link, file or autosave shows the view it was saved at (owner, 2026-11-12); a v1 composition's own view wins.
  if (start.view.zoom === undefined && !start.view.drag && start.patch.view) start.view = { ...start.view, zoom: start.patch.view.zoom, drag: { x: start.patch.view.x, y: start.patch.view.y } };
  if (start.view.zoom !== undefined || start.view.drag) stage.setView(start.view.zoom ?? 1, start.view.drag ?? { x: 0, y: 0 });
  showPatch(start.patch);
  keepBlocksInView();  // its saved view may be far from its blocks (owner, 2026-11-19)
  // Someone else's patch from a link, or an embed (CHG-0041): guarded. One this browser or the account made is not.
  setGuarded(!!embedId || (start.source === 'link' && !(start.id && (start.mine || canOverwrite(start.id)))));
  // Unsaved changes are counted from what was opened: a link, a v1 composition or the demo. Work restored from the last
  // visit counts from where it was last saved (or, never saved, as unsaved).
  if (start.missing) baseline = contentOf(toPatch());  // blank: nothing unsaved, and the kept baseline stays the autosave's
  else if (start.id || params.has('c') || params.has('v1') || params.has('demo') || start.patch === demo) setBaseline();
  else try { baseline = localStorage.getItem(BASELINE_KEY) ?? ''; } catch { /* private mode */ }
  {
    const title = params.get('t') ?? start.title ?? '';
    if (title) scene.PatchesPanel.setTitle(title);
    // This browser's own link (v1 App.SessionId): COPY LINK, or UPDATE LINK once the patch changes.
    if (start.id && App.SessionId && !embedId) shareLink = { url: `${location.origin}${location.pathname}?c=${start.id}${title ? `&t=${encodeURIComponent(title)}` : ''}`, owned: true, at: loadSession().dirty ? '' : contentOf(toPatch()), title };
    // Someone else's patch: "TITLE BY @NAME" in the corner; yours: the gallery switch shows whether it is published.
    if (start.by && !start.mine && !embedId && start.id) credit = { id: start.id, title: start.title || 'Untitled', by: start.by, published: !!start.published, liked: !!start.liked, likes: start.likes ?? 0, views: start.views ?? 0 };
    if (start.mine) scene.PatchesPanel.galleryKnown(!!start.published);
    checkOwnDirty();  // restored unsaved edits to this device's own link show as UNSAVED at once
    // Who is signed in (the corner, the Settings tab's name, the gallery switch).
    const page = accountPage();
    if (page && !juce && !embedId) { const prev = page.onChange; page.onChange = () => { prev(); stage.redraw(); }; void page.refresh(false); }
    // R16: count time played, blocks added, particles and laser turns; keep them when the page is hidden, and send them
    // in one request when it closes (saves carry them too).
    if (page && !juce && !embedId) {
      countActivity = true;
      account.watchActivityBeacon();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') activity.keep(); });
      addEventListener('pagehide', () => account.sendActivityOnClose(!!page.Account));
    }
    // From the plugin's CREATE SHARE LINK: the patch arrives in the address (`?c=p…&share=1`). The link is made here at
    // once, as SAVE makes it (the user asked for it in the app), and the address bar shows it, short, to copy; START
    // shows the scene (owner, 2026-11-13: the Patches panel opened instead, its title over the start screen). The flag
    // is dropped first, so a reload doesn't make another.
    if (params.has('share') && !juce && !embedId) {
      params.delete('share');
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
      requestAnimationFrame(() => void scene.host.links?.make('saveAs', title || 'Untitled')
        .catch(e => console.warn('BlokDust: making the share link failed', e)));
    }
    // Back from Google sign-in (CHG-0023): claim this browser's patches (R9) and show the account (a new one picks
    // its name). The flag is dropped so a reload doesn't do it again.
    // A plugin's code to approve (SHARING-0011): Settings › ACCOUNT asks (signed out: sign in first, then it asks).
    const link = !juce && !embedId && signInReturn !== 'new' ? pendingLink() : null;
    if (link !== null && (linkArrival !== null || signInReturn)) requestAnimationFrame(() => {
      (scene.SettingsPanel as any).openAccount?.();
      (scene.SettingsPanel as any).accountPage?.showApprove(link);
    });
    if (signInReturn && !juce && !embedId) {
      params.delete('account');
      history.replaceState(null, '', `${location.pathname}${params.size ? `?${params.toString()}` : ''}`);
      void account.claimMine().then(() => refreshOwnership()).catch(() => {});
      // A new account picks its name in Settings › ACCOUNT; a known one goes straight to the stage (owner, 2026-11-15),
      // or back to SAVE if that is where the sign-in began (CHG-0035).
      const linked = account.linkMessage(signInReturn);
      if (linked) requestAnimationFrame(() => {  // R7a, R7b: back on SIGN-IN METHODS, which says what happened
        (scene.SettingsPanel as any).openAccount?.();
        (scene.SettingsPanel as any).accountPage?.showMethods(linked);
      });
      else if (signInReturn === 'new') requestAnimationFrame(() => (scene.SettingsPanel as any).openAccount?.());
      else if (pendingLink() !== null) { /* approving a plugin's code: below */ }
      // No new account today from this network (R1b): Settings › SIGN IN says why.
      else if (signInReturn === 'limit') requestAnimationFrame(() => {
        (scene.SettingsPanel as any).openAccount?.();
        (scene.SettingsPanel as any).accountPage?.refused(account.ACCOUNT_LIMIT_MESSAGE);
      });
      else backToSave();
    }
  }
  app.renderer.on('resize', () => { stage.resize(); uiSync = true; });
  app.ticker.add(() => {
    if (scene.update(performance.now())) stage.redraw();
    stage.update();
  });

  // ---- plugin samples: shown from the processor's reports (the UI never holds the audio there) ----
  interface PluginSampleInfo { id: number; stage?: number; loading: boolean; missing: boolean; duration?: number; sampleRate?: number; preview?: number[];
    params?: Record<string, unknown>; ref?: SampleRef; track?: string }
  function applyPluginSample(s: PluginSampleInfo): void {
    if ((s.stage ?? 0) !== (inside?.stageId ?? 0)) return;  // a sampler of a world not on show (CHG-0038)
    const b = model.get(s.id), v = v1Blocks.get(s.id);
    if (!b || !v) return;
    if (s.loading) { scene.AnimationsLayer.AddToList(v); v.WaveForm = []; v._WaveForm = []; }  // v1: the loading square until it arrives
    else scene.AnimationsLayer.RemoveFromList(v);
    if (s.ref && s.track) refs.set(s.track, s.ref);
    if (s.params) { Object.assign(b.params, s.params); Object.assign(v.Params, s.params); }
    if (s.missing) { samples.delete(s.id); markMissing(s.id); stage.redraw(); return; }
    if (s.preview && s.duration) {
      // A stand-in buffer: v1's Waveform reads getChannelData/numberOfChannels; panels read duration.
      const data = Float32Array.from(s.preview), dur = s.duration;
      const buf = { duration: dur, length: data.length, numberOfChannels: 1, sampleRate: data.length / dur, getChannelData: () => data } as unknown as AudioBuffer;
      samples.set(s.id, buf); missing.delete(s.id);
      const wave = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95);
      v.PrimaryBuffer = buf;  // GetDuration (Granular's LOCATION slider spans the file)
      if (b.type === 'source.granular' || b.type === 'fx.convolver') v._WaveForm = wave;
      else v.WaveForm = b.params.reverse ? wave.reverse() : wave;
    }
    v.RefreshOptionsPanel(s.loading ? 'animate' : undefined);
    stage.redraw();
  }

  // ---- engine ----
  /** The engine starts from the model (blocks may have been added/moved before audio started). Engine ids = model ids:
   * add blocks with explicit ids, then their params. */
  function engineCommands(): Command[] {
    const commands: Command[] = tempo !== undefined ? [{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }] : [];
    for (const [id, b] of model) {
      const def = BLOCKS_BY_ID.get(b.type)!;
      commands.push({ type: CommandType.AddBlock, id, blockType: typeIndex(b.type), x: b.x, y: b.y });
      def.params.forEach((q, i) => { const v = b.params[q.key]; if (!SESSION_PARAMS.has(q.key) && (typeof v === 'number' || typeof v === 'boolean')) commands.push({ type: CommandType.SetParam, id, param: i, value: Number(v) }); });
    }
    // Looking into a Stage, the engine is running already; this builds the patch from scratch (offline renders), so the
    // outer world it is.
    return [...commands, ...targetSetParams(), ...relinks({ connectionOrder }, uidToId()),
      ...[...model].flatMap(([id, b]) => b.type === 'source.stage' ? stageCommands(id, b.uid) : [])];
  }
  const probe = { started: false, snapshots: 0, rms: 0, particles: 0, connections: [] as number[], gateOns: 0, hits: 0, beams: 0, powered: [] as number[] };
  (window as unknown as { __bd_probe: unknown }).__bd_probe = {
    hideLinks,  // tests: the iPad extension's no-links view (CHG-0025)
    /** Tests: the stage's block drawing and the manifests (block-edges-clean). */
    blockDrawing: { drawBlocks, BLOCKS_BY_ID },
    /** The microphone is asked for or open (tests, CHG-0035). */
    get microphoneOpen() { return !!engine?.microphoneOpen; },
    /** Someone else's patch (CHG-0041): the page's flag, and whether the safety limit is on the output (tests). */
    get guarded() { return { page: guarded, limit: !!engine?.guarded }; },
    get state() { return { ...probe, blocks: stage.allBlocks(), patch: toPatch() }; },
    /** The Stage being looked into and its window, in css px (tests); null on the outer stage. */
    get inside() { if (!inside) return null; const f = insideFrame(), d = stage.metrics.dpr; return { stage: inside.stageId, x: f.x / d, y: f.y / d, w: f.w / d, h: f.h / d, closeX: f.closeX / d, closeY: f.closeY / d }; },
    /** The engine id of the block saved as `uid` in the world on show (tests). */
    idOf(uid: string) { return idOfUid(uid); },
    /** Labels on the stage (CHG-0020) and where each is, in css px (tests). */
    get labels() { const m = stage.metrics; return labels.map(l => { const r = labelRect(measure, m, l); return { ...l, cx: (r.x + r.w / 2) / m.dpr, cy: (r.y + r.h / 2) / m.dpr }; }); },
    /** Laser beams drawn now (a beam through a Prism is several, CHG-0015). */
    get beams() { return probe.beams; },
    /** The Stage block a drag would go into now (tests). */
    get dropTarget() { return stage.dropTarget; },
    /** The MAKE STAGE button's centre in css px, or null when it is not offered (tests). */
    get makeStage() { if (!makeStageAt) return null; const d = stage.metrics.dpr, b = makeStageAt; return { x: (b.x + b.w / 2) / d, y: (b.y + b.h / 2) / d, box: { x: b.x / d, y: b.y / d, w: b.w / d, h: b.h / d } }; },
    /** The selected blocks' rings together, css px (tests). */
    get selectedBounds() { const b = stage.selectedBounds(), d = stage.metrics.dpr; return b && { x0: b.x0 / d, y0: b.y0 / d, x1: b.x1 / d, y1: b.y1 / d }; },
    /** Select blocks by engine id, as shift-clicks would (tests). */
    select(ids: number[]) { setSelection(ids); stage.redraw(); },
    /** css px of a point on block `id` that the stage's own hit test maps to it (black-box tests click there). */
    blockPoint(id: number): [number, number] | null {
      const b = stage.block(id); if (!b) return null;
      const m = stage.metrics, cx = (m.originX + b.x * m.scaledGridSize) / m.dpr, cy = (m.originY + b.y * m.scaledGridSize) / m.dpr, g = m.scaledGridSize / m.dpr;
      for (let r = 0; r <= 2.5; r += 0.25) for (let a = 0; a < 8; a++) {
        const x = cx + Math.cos(a * Math.PI / 4) * r * g, y = cy + Math.sin(a * Math.PI / 4) * r * g;
        if (stage.hitTest(x, y)?.id === id) return [x, y];
      }
      return null;
    },
    /** The stage grid point under css (x, y). */
    cssToGrid(x: number, y: number) { return stage.cssToGrid(x, y); },
    /** css px of a grid point (for black-box tests driving the real pointer). */
    toCss(gx: number, gy: number) { const m = stage.metrics; return [(m.originX + gx * m.scaledGridSize) / m.dpr, (m.originY + gy * m.scaledGridSize) / m.dpr]; },
    /** The v1 UI scene (state captures and tests) and v1's App globals (units, sizes, composition ids). */
    scene, v1App: App,
    /** Offline render of the patch as loaded here (model + attached samples) with the WASM engine on the main thread:
     * same patch + same samples → same hash, in any browser session (CHG-0003 acceptance: share → identical render). */
    async renderHash(seconds = 4, sampleRate = 48000) {
      const e = WasmEngine.fromModule(await engineModule(), sampleRate, seed);
      try {
        for (const c of engineCommands()) e.push(c);
        const frames = Math.round(seconds * sampleRate), l = new Float32Array(frames), r = new Float32Array(frames);
        for (let at = 0; at < frames; at += 128) {
          const out = e.process(Math.min(128, frames - at));
          l.set(out.left, at); r.set(out.right, at);
          // Blocks exist after the first quantum (commands apply at its first tick); samples attach then, as in the
          // live worklet where they arrive after start. Fixed point → same hash everywhere.
          if (at === 0) for (const [id, buf] of samples) if (model.has(id))
            e.attachSample(id, buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : undefined, buf.sampleRate);
          if (at === 0) for (const [id, b] of model) if (b.type === 'source.stage')  // and inside its Stage blocks
            for (const [uid, buf] of innerSamples.get(b.uid) ?? []) {
              const iid = innerIds.get(b.uid)?.ids[uid];
              if (iid !== undefined) e.attachSample(iid, buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : undefined, buf.sampleRate, id);
            }
        }
        let peak = 0; for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
        return { hash: hex(hashStereo(hashAudio(l), hashAudio(r))), peak };
      } finally { e.dispose(); }
    },
    /** The stage's corners (tests): a patch's credit and who is signed in, with their centres in css px. */
    get corners() {
      const d = stage.metrics.dpr, c = (b?: ButtonBox) => (b ? [(b.x + b.w / 2) / d, (b.y + b.h / 2) / d] : null);
      // creditAt: the title's start, clear of the @NAME link and the star.
      const titleAt = cornerBoxes.credit ? [(cornerBoxes.credit.x + 12 * stage.metrics.unit) / d, (cornerBoxes.credit.y + cornerBoxes.credit.h / 2) / d] : null;
      return { credit, me: accountPage()?.Account?.handle ?? null, byAt: c(cornerBoxes.by), meAt: c(cornerBoxes.me), meBox: cornerBoxes.me && { x: cornerBoxes.me.x / d, y: cornerBoxes.me.y / d, w: cornerBoxes.me.w / d, h: cornerBoxes.me.h / d }, likeAt: c(cornerBoxes.like), creditAt: titleAt,
        // Quick save (CHG-0033): the own patch's line and where its UNSAVED / SAVE word is.
        own: ownLink() ? { title: shareLink!.title, dirty: ownDirty, saving: quickSaving, hover: saveHover } : null, saveAt: c(cornerBoxes.save) };
    },
    /** Sample state per block (tests): loaded, or missing with its reference. */
    /** The account's running totals not yet sent (SPEC-SHARING-ACCOUNTS R16; tests). */
    get activity() { return activity.pending(); },
    get samples() { return [...model].filter(([, b]) => BLOCKS_BY_ID.get(b.type)?.params.some(q => q.key === 'track')).map(([id, b]) => ({ id, uid: b.uid, type: b.type, track: b.params.track, loaded: samples.has(id), frames: samples.get(id)?.length ?? 0 })); },
  };
  const overlay = document.getElementById('start')!;
  /** A Toggle the engine switched (a particle or laser hit): the patch keeps its state, as v1's Toggle did (its
   * Params.logic), so a save, a share link or the autosave reopens with the Toggles as they were (owner, 2026-11-13). */
  function logicFlipped(id: number, on: boolean): void {
    const b = model.get(id), v = v1Blocks.get(id);
    if (b?.type !== 'power.toggle' || !!b.params.logic === on) return;
    b.params.logic = on;
    if (v) { v.Params.logic = on; if (scene.OptionsPanel.Scale > 0 && scene.OptionsPanel.SelectedBlock === v) v.RefreshOptionsPanel(); }
    // Not an edit: the autosave (when it holds this patch) catches up within a second, without marking it unsaved or
    // putting off the save of a real edit (a running scene may flip Toggles faster than the edit debounce).
    if (embedId || juce || !autosaveIsThis || logicSave) return;
    logicSave = setTimeout(() => { logicSave = undefined; saveLocal(toPatch()); }, 1000);
  }
  let logicSave: ReturnType<typeof setTimeout> | undefined;
  const onSnapshot = (s: Snapshot) => {
    probe.snapshots++; lastSnapshot = performance.now(); probe.rms = s.rms; probe.particles = s.particles.length / 3; probe.beams = s.beams.length / 4;
    // v1 Settings › dB Meter (Tone.Meter on the master output, smoothed 0.8): level in dB from the snapshot RMS.
    scene.setLevelDb(20 * Math.log10(Math.max(s.rms, 1e-5)));
    for (const e of s.events) { if (e.type === 4) probe.gateOns++; if (e.type === 1) probe.hits++; if (e.type === 8 && e.value !== undefined) logicFlipped(e.block, e.value !== 0); }
    if (s.connections) {
      stage.setConnections(s.connections); probe.connections = Array.from(s.connections);
      const order: [string, string][] = [];
      let known = true;  // a snapshot from before the blocks are shown (the plugin's first) says nothing about order
      for (let i = 0; i + 1 < s.connections.length; i += 2) {
        const a = model.get(s.connections[i])?.uid, b = model.get(s.connections[i + 1])?.uid;
        if (a && b) order.push([a, b]); else known = false;
      }
      if (known) {
      const was = JSON.stringify(connectionOrder);
      connectionOrder = order;
      // Plugin: the processor keeps the host's copy of the patch (getStateInformation).
      if (juce && JSON.stringify(order) !== was) juce.emitEvent('bd_connectionOrder', { order });
      }
    }
    stage.setPowered(s.powered); probe.powered = Array.from(s.powered);
    if (countActivity) activity.frame(performance.now(), { blocks: model, powered: new Set(s.powered), worldOn: scene.worldPower, tempo: tempo ?? 120, visible: document.visibilityState === 'visible', emitted: s.emitted ?? 0 });
    stage.setBeams(s.beams);
    stage.setParticles(s.particles);
    scene.setPlayheads(s.playheads ?? new Float32Array(0));
    setMonitors(s.monitors ?? new Float32Array(0));
    stage.setOpenGates(openGateIds(s.monitors ?? new Float32Array(0)));
  };
  if (juce) {
    overlay.remove();
    sendRaw = cmds => juce.emitEvent('bd_commands', { commands: cmds });
    juce.addEventListener('bd_patch', (e: { patch: string; ids?: Record<string, number>; innerIds?: Record<string, Record<string, number>>; standalone?: boolean; ios?: boolean; powerMode?: number; hostPlaying?: boolean }) => {
      standalone = !!e.standalone;
      ios = !!e.ios;
      // DAW plugins: the power switch's HOST cell (a standalone app has no transport; CHG-0025).
      scene.hostPower = !standalone;
      scene.setHostState(e.powerMode ?? 1, !!e.hostPlaying);
      if (ios && !standalone && !App.NoLinks) hideLinks();  // an iPad extension can't open Safari (CHG-0025)
      if (ios) PATCH_COPY.shareLinePlugin = 'Send a link to this patch from the share menu: Messages, WhatsApp, Mail and more.';
      const p = JSON.parse(e.patch) as Patch & { automation?: { slot: number; block: string; param: string; cc?: number }[] };
      showPatch(p, e.ids);
      // The engine ids of the blocks inside each Stage (CHG-0038): a reopened editor edits the blocks the processor has.
      for (const [uid, ids] of Object.entries(e.innerIds ?? {})) innerIds.set(uid, { ids, nextId: Math.max(0, ...Object.values(ids)) + 1 });
      sentMacros = JSON.stringify(toPatch().macros ?? []);
      const after = pluginAfterLoad; pluginAfterLoad = null;
      if (after && 'open' in after) setBaseline();
      else if (after) startPlacing([...model].filter(([, b]) => after.place.has(b.uid)).map(([id]) => id), after.touch, after.at);
      automation.clear();
      ccBySlot.clear();
      for (const a of p.automation ?? []) {
        for (const [id, b] of model) if (b.uid === a.block) automation.set(`${id}:${a.param}`, a.slot);
        if (typeof a.cc === 'number') ccBySlot.set(a.slot, a.cc);
      }
      probe.started = true;
      juce.emitEvent('bd_ready', { blocks: stage.allBlocks().length, supportSystem: hostSystem });
    });
    // Plugin samples (CHG-0004 3.6): the processor loads them natively and reports what to show.
    // Dust moves (host automation, MIDI CC; owner, Ableton, 2026-11-12): the block takes the value, and its options
    // panel, if open, shows it at once. The engine has it already (the processor set it).
    juce.addEventListener('bd_paramValues', (e: { values: { id: number; param: string; value: number }[] }) => {
      const open = scene.OptionsPanel.Scale > 0 ? scene.OptionsPanel.SelectedBlock : null;
      let refresh = false;
      const mdl = inside ? inside.outer.model : model, v1s = inside ? inside.outer.v1Blocks : v1Blocks;  // Dust moves outer blocks
      for (const u of e.values ?? []) {
        const m = mdl.get(u.id), b = v1s.get(u.id);
        if (!m || !b) continue;
        m.params[u.param] = u.value; b.Params[u.param] = u.value;
        if (open === b) refresh = true;
      }
      // Not while the user is dragging one of its sliders or handles (v1 marks them Selected until mouse up).
      const dragging = ((scene.OptionsPanel as any).Options ?? []).some((o: any) => (o.Type === 'slider' && o.Selected) || o.Handles?.some((h: any) => h.Selected));
      if (refresh && !dragging) (open as V1Block).RefreshOptionsPanel();
    });
    juce.addEventListener('bd_hostState', (h: { mode: number; playing: boolean }) => { scene.setHostState(h.mode, h.playing); stage.redraw(); });
    juce.addEventListener('bd_ccLearned', (e: { slot: number; cc: number }) => { ccBySlot.set(e.slot, e.cc); });
    juce.addEventListener('bd_analytics', (e: { on: boolean }) => { pluginStats = !!e.on; });
    for (const ev of ['bd_nativeAppleDone', 'bd_nativePasskeyDone']) juce.addEventListener(ev, (v: Record<string, string | boolean>) => { const f = nativeAnswer; nativeAnswer = null; f?.(v); });
    // Signed in (SHARING-0011): the key the plugin keeps; what it calls itself; whether it can open a browser.
    juce.addEventListener('bd_account', (e: { key?: string; name?: string; browser?: boolean; native?: boolean }) => {
      setAppKey(e.key ?? null);
      if (e.name) pluginName = e.name;
      pluginBrowser = e.browser !== false;
      pluginNative = !!e.native;
      if (appKey()) void account.accountPatches().then(() => refreshOwnership()).catch(() => {});
      void (scene.SettingsPanel as any).accountPage?.refresh(false);
    });
    juce.addEventListener('bd_sampleInfo', (s: PluginSampleInfo) => applyPluginSample(s));
    // A file dropped on the plugin editor (CHG-0004 3.7): which sampler is under it, or a new Sample there.
    juce.addEventListener('bd_dropAt', (d: { x: number; y: number; token: number }) => {
      const r = app.canvas.getBoundingClientRect(), x = d.x - r.left, y = d.y - r.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) { const [gx, gy] = stage.cssToGrid(x, y); id = addBlock('source.sample', Math.round(gx), Math.round(gy), {}); }
      juce.emitEvent('bd_dropTarget', { token: d.token, id, ...atStage() });
    });
    // Frame and snapshot rates, every 5 s, for the plugin's log (an iPad has no devtools; CHG-0025).
    let frames = 0, snaps = 0, since = performance.now();
    const count = (now: number) => {
      ++frames;
      if (now - since >= 5000) {
        const s = (now - since) / 1000;
        juce.emitEvent('bd_stats', { fps: Math.round(frames / s), snapshots: Math.round(snaps / s), w: innerWidth, h: innerHeight, dpr: devicePixelRatio });
        frames = 0; snaps = 0; since = now;
      }
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    juce.addEventListener('bd_snapshot', (e: { view?: number; particles: number[]; connections: number[]; powered: number[]; beams: number[]; playheads?: number[]; monitors?: number[] }) =>
      (e.view ?? 0) !== (inside?.stageId ?? 0) ? undefined : (++snaps, onSnapshot({ type: 'snapshot', frame: 0, rms: 0, events: [], particles: new Float32Array(e.particles),
        connections: new Uint32Array(e.connections), powered: new Uint32Array(e.powered), beams: new Float32Array(e.beams ?? []), playheads: new Float32Array(e.playheads ?? []), monitors: new Float32Array(e.monitors ?? []) })));
    juce.emitEvent('bd_hello', {});
    juce.emitEvent('bd_samplesHello', {});
    sendRaw([{ type: CommandType.WorldPower, id: 0, value: 1 }]);  // a reopened editor shows the switch on: so is the world
  }
  // The start button is v1's Splash, drawn by the scene (owner, 2026-11-11); #start is a clear layer over it that takes
  // the click (an AudioContext must start in one) and holds input back until the intro has shown the stage, as v1 did.
  // Automated browsers skip the intro (their screenshots expect the stage) unless the URL asks for it (`splash=1`).
  const splash = !juce && !embedId && !signInReturn && linkArrival === null && (!navigator.webdriver || params.get('splash') === '1');
  if (splash) { scene.showSplash(); stage.redraw(); requestAnimationFrame(() => requestAnimationFrame(() => { overlay.style.background = 'transparent'; })); }
  else if (!embedId) overlay.style.background = 'transparent';
  // START begins on the press (v1 Splash.MouseDown), not the release: the intro starts at once and the engine is built
  // from what was prepared at load. A mouse press may start audio; a touch may not until it lifts, so the release and
  // the click resume the context too (a press that never ends in a click leaves the start layer for the next tap).
  // After START, a press on the intro skips it (owner, PR #1 review 2026-11-12); the START press itself never does.
  let begun = false, startCtx: AudioContext | null = null;
  const resume = () => { void startCtx?.resume().catch(() => {}); };
  overlay.addEventListener('pointerdown', () => {
    if (!begun) { void begin(); return; }
    resume();
    if (splash) { scene.skipSplash(); stage.redraw(); }
  });
  overlay.addEventListener('pointerup', resume);
  overlay.addEventListener('click', () => { if (!begun) void begin(); else resume(); });
  // Back from Google sign-in (owner, 2026-11-15): no start screen and no intro. The stage takes input at once and the
  // first press or key starts the sound (browsers start audio only in a user gesture); that press still does its job.
  if ((signInReturn || linkArrival !== null) && !juce && !embedId) {
    overlay.remove();
    const first = () => { for (const t of ['pointerdown', 'keydown'] as const) window.removeEventListener(t, first, true); if (!begun) void begin(); };
    for (const t of ['pointerdown', 'keydown'] as const) window.addEventListener(t, first, true);
  }
  async function begin(): Promise<void> {
    begun = true;
    let shown = !splash, ready = false;
    // A first visit (the demo, no link) is asked whether to take v1's tour once the stage shows (CHG-0035). Automated
    // browsers are not, unless the URL asks (`tour=1`).
    const tour = !juce && !embedId && start.source === 'demo' && (!navigator.webdriver || params.get('tour') === '1');
    const reveal = () => {
      if (!(shown && ready && overlay.isConnected)) return;
      overlay.remove();
      if (tour) { scene.launchTour(); stage.redraw(); }
      if (missingNote) scene.message(missingNote, { seconds: 6 });
    };
    if (splash) { scene.startSplash(() => { shown = true; reveal(); }); stage.redraw(); }
    if (!audio) setAudioSession('playback');  // before the context exists, or iOS's silent switch mutes it
    const ctx = startCtx = audio?.ctx ?? new AudioContext({ latencyHint: 'interactive' });
    const running = new Promise<void>(res => {
      const check = () => { if (ctx.state === 'running') { ctx.removeEventListener('statechange', check); res(); } };
      ctx.addEventListener('statechange', check); check();
    });
    void ctx.resume().catch(() => {});  // in the press: a mouse press is allowed to start audio
    App.Audio.sampleRate = ctx.sampleRate;
    let module: Awaited<ReturnType<typeof EngineNode.prepare>>;
    try { module = await (audio?.module ?? EngineNode.prepare(ctx)); }
    catch (e) { track('audio_failed', { reason: (e as Error)?.name || 'error' }); flushAnalytics(); throw e; }
    engine = EngineNode.build(ctx, module, { seed, commands: engineCommands() });
    engine.onSnapshot(onSnapshot);
    for (const [id, buf] of samples) if (model.has(id)) engine.sendSample(id, buf);
    engine.setGuard(guarded);  // someone else's patch: the safety limit (CHG-0041)
    if ([...model.values()].some(b => needsInput(b.type))) listen();
    for (const [id, b] of model) if (b.type === 'source.stage') void fillStageSamples(id, b.uid);  // its inner world was built with the engine
    await running;
    keepAwake(ctx);
    probe.started = true;
    ready = true; reveal();
    for (const run of afterStart.splice(0)) requestAnimationFrame(run);
    track('audio_started', undefined, { seconds: Math.round(performance.now() / 100) / 10 });
    measureFps();
  }
  /** perf (SPEC-SHARING-USAGE-ANALYTICS): the frame rate over 10 s of running, as a bucket. */
  function measureFps(): void {
    let frames = 0;
    const t0 = performance.now(), tick = () => {
      frames++;
      const t = performance.now() - t0;
      if (t < 10_000) { requestAnimationFrame(tick); return; }
      if (document.visibilityState !== 'visible') return;  // a hidden tab says nothing about speed
      const fps = frames / (t / 1000);
      track('perf', { fps: fps < 20 ? '<20' : fps < 40 ? '20-40' : fps < 55 ? '40-55' : '55+' });
    };
    requestAnimationFrame(tick);
  }
  /** iOS interrupts the AudioContext when another app plays (a video, a podcast) and leaves it so when the page comes
   * back: the engine runs in it, so sound, connections and particles all stood still (owner, 2026-11-14). Coming back to
   * the page and every press resume it; a press also kicks a context that says it runs but has rendered nothing for a
   * while (suspend, then resume), which iOS sometimes leaves behind. Never the plugin (JUCE runs the engine). */
  let lastSnapshot = 0;
  function keepAwake(ctx: AudioContext): void {
    let kicking = false;
    const wake = (press: boolean) => {
      if (document.hidden || ctx.state === 'closed' || kicking) return;
      if (ctx.state !== 'running') { void ctx.resume().catch(() => {}); return; }
      if (!press || performance.now() - lastSnapshot < 1000) return;
      kicking = true;
      void ctx.suspend().then(() => ctx.resume()).catch(() => {}).finally(() => { kicking = false; });
    };
    document.addEventListener('visibilitychange', () => wake(false));
    window.addEventListener('pageshow', () => wake(false));
    window.addEventListener('focus', () => wake(false));
    ctx.addEventListener('statechange', () => wake(false));
    for (const t of ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const) window.addEventListener(t, () => wake(true), { capture: true });
  }

  // ---- input: v1 MainScene order (UI first, then blocks, then stage drag) ----
  const dpr = () => stage.metrics.dpr;
  let drag: { id: number; grabX: number; grabY: number; moved: boolean; fresh?: boolean } | null = null;
  /** Where every block was when the drag began: Undo puts blocks dragged to the trash back there. */
  let dragFrom = new Map<number, { x: number; y: number }>();
  let labelDragFrom = new Map<string, XY>();  // where the selected labels were when a block drag began
  let pointerIsDown = false;
  /** The press that ended (or is) a placement: its release goes nowhere else. */
  let swallowUp = false;
  let stageClick: { id: number; t: number } | null = null;
  const v1At = (cssX: number, cssY: number) => { const hit = stage.hitTest(cssX, cssY); return hit ? v1Blocks.get(hit.id) ?? null : null; };
  /** `fresh`: the block was just made (menu, Alt-copy): its add step covers where it is put, so no move step. */
  function startDrag(id: number, grabX: number, grabY: number, fresh = false): void {
    drag = { id, grabX, grabY, moved: false, fresh };
    dragFrom = new Map([...model].map(([i, b]) => [i, { x: b.x, y: b.y }]));
    labelDragFrom = labelPlaces(selectedLabels);
    stage.pressed = id; stage.toFront(id);
    send([{ type: CommandType.Press, id, value: 1 }]);  // v1 Block.MouseDown: a held source powers itself
  }
  if (embedId) {
    // Player: pressing a block powers it while held (v1 Source.MouseDown); nothing moves or opens.
    let pressed: number | null = null;
    app.canvas.addEventListener('pointerdown', e => {
      app.canvas.setPointerCapture(e.pointerId);
      const hit = stage.hitTest(e.offsetX, e.offsetY);
      if (hit) { pressed = hit.id; send([{ type: CommandType.Press, id: hit.id, value: 1 }]); }
    });
    app.canvas.addEventListener('pointerup', () => { if (pressed !== null) send([{ type: CommandType.Press, id: pressed, value: 0 }]); pressed = null; });
    app.canvas.addEventListener('pointercancel', () => { if (pressed !== null) send([{ type: CommandType.Press, id: pressed, value: 0 }]); pressed = null; });
  }
  // ---- multi-select (CHG-0005 task 9, owner): Shift+click adds or removes a block; Shift+drag on the stage (or, on a
  // touch screen, holding a finger still on the stage for a moment, then dragging) draws a box that selects the blocks
  // in it. Dragging a selected block moves them all; Alt+drag copies them all; dropping them on the trash, or
  // Delete/Backspace, deletes them; Cmd/Ctrl+D duplicates them, Cmd/Ctrl+A selects everything, Esc or a tap on the stage
  // clears it. v1 had one selected block (its options panel); that is unchanged. ----
  const selection = stage.selected;
  let box: { x0: number; y0: number; x1: number; y1: number; add: boolean } | null = null;
  let downAt: { x: number; y: number } | null = null;
  let longPress: ReturnType<typeof setTimeout> | null = null;
  const LONG_PRESS_MS = 450, STILL_PX = 8;
  function setSelection(ids: Iterable<number>, labelIds: Iterable<string> = []): void {
    selection.clear(); selectedLabels.clear();
    for (const id of ids) if (model.has(id)) selection.add(id);
    for (const id of labelIds) if (labels.some(l => l.id === id)) selectedLabels.add(id);
    stage.redraw();
  }
  /** Blocks and labels selected. */
  const selectionSize = () => selection.size + selLabels().length;
  const grouped = () => !!drag && selection.has(drag.id) && selectionSize() > 1;
  function showBox(): void {
    stage.selectBox = box && { x0: box.x0 * dpr(), y0: box.y0 * dpr(), x1: box.x1 * dpr(), y1: box.y1 * dpr() };
    stage.redraw();
  }
  function finishBox(): void {
    if (!box) return;
    const [ax, ay] = stage.cssToGrid(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1));
    const [bx, by] = stage.cssToGrid(Math.max(box.x0, box.x1), Math.max(box.y0, box.y1));
    const inside = [...model.entries()].filter(([, b]) => b.x >= ax && b.x <= bx && b.y >= ay && b.y <= by).map(([id]) => id);
    const insideLabels = labels.filter(l => l.x >= ax && l.x <= bx && l.y >= ay && l.y <= by).map(l => l.id);  // by the dot
    setSelection(box.add ? [...selection, ...inside] : inside, box.add ? [...selectedLabels, ...insideLabels] : insideLabels);
    box = null; showBox();
  }
  /** Copies of the selected blocks (same params and audio), offset by (dx, dy); returns the copies' ids by original. */
  function copyBlocks(ids: number[], dx: number, dy: number): Map<number, number> {
    const made = new Map<number, number>();
    for (const id of ids) {
      const b = model.get(id); if (!b) continue;
      const copy = addBlock(b.type, b.x + dx, b.y + dy, structuredClone(b.params));
      if (b.type === 'source.stage' && macros.has(b.uid)) {  // a copy of a Stage has a copy of what is inside
        const uid = model.get(copy)!.uid;
        macros.set(uid, { ...structuredClone(macros.get(b.uid)!), block: uid });
        if (innerSamples.has(b.uid)) innerSamples.set(uid, new Map(innerSamples.get(b.uid)));
        buildStage(copy, uid);
      }
      const buf = samples.get(id);
      if (buf && b.type !== 'source.sample-gen') useBuffer(copy, buf, 'keep');
      made.set(id, copy);
    }
    return made;
  }
  (window as unknown as { __bd_selection?: unknown }).__bd_selection = () => [...selection];
  (window as unknown as { __bd_label_selection?: unknown }).__bd_label_selection = () => [...selectedLabels];

  // ---- multi-touch (CHG-0005 task 8, owner): the first finger is v1's one pointer (menus, panels, selecting, dragging
  // the stage). Each further finger takes what it lands on: a block (dragged by that finger, powered while held, as
  // v1's pressed block), or a slider of the open options panel. A second finger while the first drags the stage
  // turns it into a pinch: zoom about the fingers' midpoint, which stays put, and pan with it. ----
  type Extra = { kind: 'block'; id: number; grabX: number; grabY: number; from: XY } | { kind: 'slider'; index: number } | { kind: 'pinch' } | { kind: 'wavepinch' } | { kind: 'idle' };
  let primaryId: number | null = null;
  /** What the first finger is doing; 'gone': it was in a pinch that ended, so it does nothing until it lifts. */
  let primaryRole: 'ui' | 'block' | 'stage' | 'placing' | 'gone' | 'box' | 'select' | null = null;
  const extras = new Map<number, Extra>();
  const touchAt = new Map<number, { x: number; y: number }>();  // css px of every finger down
  let pinch: { a: number; b: number; z0: number; d0: number; w: { x: number; y: number } } | null = null;
  function pinchState() {
    const a = touchAt.get(pinch!.a)!, b = touchAt.get(pinch!.b)!;
    return { mid: { x: (a.x + b.x) / 2 * dpr(), y: (a.y + b.y) / 2 * dpr() }, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  function startPinch(a: number, b: number): void {
    scene.endStageDrag();
    pinch = { a, b, z0: stage.zoom, d0: 1, w: { x: 0, y: 0 } };
    const { mid, dist } = pinchState(), m = stage.metrics;
    pinch.d0 = Math.max(dist, 1);
    // The stage point under the midpoint, in v1 units: (screen − centre) / (zoom · unit) − drag.
    pinch.w = { x: (mid.x - m.width / 2) / (stage.zoom * m.unit) - stage.drag.x, y: (mid.y - m.height / 2) / (stage.zoom * m.unit) - stage.drag.y };
  }
  function movePinch(): void {
    if (!pinch) return;
    const { mid, dist } = pinchState(), m = stage.metrics;
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch.z0 * dist / pinch.d0));
    const drag = { x: (mid.x - m.width / 2) / (zoom * m.unit) - pinch.w.x, y: (mid.y - m.height / 2) / (zoom * m.unit) - pinch.w.y };
    scene.pinchView(zoom, drag);
    stage.setView(zoom, drag);
  }
  function endPinch(): void {
    if (!pinch) return;
    for (const id of [pinch.a, pinch.b]) { if (id === primaryId) primaryRole = 'gone'; else if (extras.has(id)) extras.set(id, { kind: 'idle' }); }
    pinch = null;
    scene.pinchEnd();
  }
  // Two fingers on a waveform in the options panel (owner, 2026-11-15; waveZoom.ts): they zoom and slide that
  // waveform, not the stage. The first finger's press may have moved a handle or the slider: that is put back.
  let wavePinch: (WavePinch & { a: number; b: number }) | null = null;
  let waveTouch: { row: number; undo: () => void } | null = null;
  function moveWave(): void {
    if (!wavePinch) return;
    const a = touchAt.get(wavePinch.a), b = touchAt.get(wavePinch.b);
    if (a && b) moveWavePinch(scene.OptionsPanel, wavePinch, (a.x + b.x) / 2 * dpr(), Math.hypot(a.x - b.x, a.y - b.y));
  }
  function endWavePinch(): void {
    if (!wavePinch) return;
    for (const id of [wavePinch.a, wavePinch.b]) { if (id === primaryId) primaryRole = 'gone'; else if (extras.has(id)) extras.set(id, { kind: 'idle' }); }
    wavePinch = null;
  }
  function extraDown(e: PointerEvent): void {
    const x = e.offsetX, y = e.offsetY;
    if (pinch || wavePinch || placing || padNotes().length) { extras.set(e.pointerId, { kind: 'idle' }); return; }  // not while the pads are played
    const first = primaryId !== null ? touchAt.get(primaryId) : undefined;
    if (primaryRole === 'ui' && waveTouch && first) {
      const { row, undo } = waveTouch;
      waveTouch = null;
      undo();
      primaryRole = 'gone';
      extras.set(e.pointerId, { kind: 'wavepinch' });
      wavePinch = { a: primaryId!, b: e.pointerId, ...startWavePinch(scene.OptionsPanel, row, (first.x + x) / 2 * dpr(), Math.hypot(first.x - x, first.y - y)) };
      stage.redraw();
      return;
    }
    if (primaryRole === 'stage' && primaryId !== null && touchAt.has(primaryId)) {
      extras.set(e.pointerId, { kind: 'pinch' });
      startPinch(primaryId, e.pointerId);
      return;
    }
    const slider = scene.sliderIndexAt(x * dpr(), y * dpr());
    if (slider >= 0) { extras.set(e.pointerId, { kind: 'slider', index: slider }); scene.setSlider(slider, x * dpr()); stage.redraw(); return; }
    const hit = stage.hitTest(x, y);
    const taken = (id: number) => drag?.id === id || [...extras.values()].some(t => t.kind === 'block' && t.id === id);
    if (hit && !taken(hit.id) && !scene.uiAt(x * dpr(), y * dpr())) {
      const [gx, gy] = stage.cssToGrid(x, y);
      extras.set(e.pointerId, { kind: 'block', id: hit.id, grabX: gx - hit.x, grabY: gy - hit.y, from: { x: hit.x, y: hit.y } });
      stage.held.add(hit.id); stage.toFront(hit.id);
      send([{ type: CommandType.Press, id: hit.id, value: 1 }]);
      stage.redraw();
      return;
    }
    extras.set(e.pointerId, { kind: 'idle' });
  }
  function extraMove(e: PointerEvent, t: Extra): void {
    if (t.kind === 'pinch') { movePinch(); stage.redraw(); return; }
    if (t.kind === 'wavepinch') { moveWave(); stage.redraw(); return; }
    if (t.kind === 'slider') { scene.setSlider(t.index, e.offsetX * dpr()); stage.redraw(); return; }
    if (t.kind === 'block') {
      const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY), b = model.get(t.id);
      const x = Math.round(gx - t.grabX), y = Math.round(gy - t.grabY);
      if (b && (x !== b.x || y !== b.y)) { moveBlock(t.id, x, y); stage.redraw(); }
    }
  }
  function extraUp(id: number): void {
    const t = extras.get(id);
    extras.delete(id);
    if (!t) return;
    if (t.kind === 'pinch') endPinch();
    if (t.kind === 'wavepinch') endWavePinch();
    if (t.kind === 'block') {
      stage.held.delete(t.id);
      if (model.has(t.id)) { send([{ type: CommandType.Press, id: t.id, value: 0 }]); recordMove([t.id], new Map([[t.id, t.from]])); }
    }
    stage.redraw();
  }
  /** Tests: what each finger is doing. */
  (window as unknown as { __bd_touch?: unknown }).__bd_touch = () => ({ primaryId, primaryRole, extras: [...extras.entries()], pinch: !!pinch });

  // The Touchpad's pads (CHG-0019, UI-0010): any pointer that lands on a pad plays it and belongs to the pads until it
  // lifts; it never becomes v1's pointer or an extra finger. Notes go to that Touchpad block; a slide is a bend.
  const TOUCHPAD_TYPE = typeIndex('input.touchpad');
  const padHost: PadHost = {
    note: (block, note, on) => send([{ type: on ? CommandType.NoteOn : CommandType.NoteOff, id: block, blockType: TOUCHPAD_TYPE, param: note, value: on ? 1 : 0, x: 0 }]),
    bend: (block, note, semitones) => send([{ type: CommandType.NoteExpression, id: block, blockType: TOUCHPAD_TYPE, param: note, x: 0, y: 0, value: semitones }]),
  };
  (window as unknown as { __bd_pads?: unknown }).__bd_pads = padNotes;
  if (!embedId) app.canvas.addEventListener('pointerdown', e => {
    // Only the main button works the stage (owner, 2026-11-19): a right-click's press began a pan that never ended
    // (the menu it opened took the release), so moving to the menu dragged the stage away. Right-clicks have their own
    // handler (contextmenu).
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    app.canvas.setPointerCapture(e.pointerId);
    if (primaryId === null && cornerPress(e.offsetX * dpr(), e.offsetY * dpr())) { primaryId = e.pointerId; primaryRole = 'gone'; return; }
    if (makeStageAt && primaryId === null && inBox(makeStageAt, e.offsetX * dpr(), e.offsetY * dpr())) { makeStage(); primaryId = e.pointerId; primaryRole = 'gone'; return; }
    if (!placing && padDown(scene.OptionsPanel, e.pointerId, e.offsetX * dpr(), e.offsetY * dpr(), padHost)) { stage.redraw(); return; }
    // Inside a Stage (UI-0009): the × or a press outside its window (not on the header, a panel or the bottom
    // controls) goes back out.
    if (inside && !placing) {
      const f = insideFrame(), x = e.offsetX * dpr(), y = e.offsetY * dpr(), m = stage.metrics;
      if (onClose(f, x, y) || (!inWindow(f, x, y) && !scene.uiAt(x, y) && y < m.height - 75 * m.unit && y > f.y - 24 * m.unit)) {
        exitStage(); primaryId = e.pointerId; primaryRole = 'gone'; return;  // this press does nothing more
      }
    }
    // A label (CHG-0020): where no panel or block is in the way, a press on one takes the pointer until it lifts.
    if (!placing && !labelDrag && labels.length && !scene.uiAt(e.offsetX * dpr(), e.offsetY * dpr()) && !stage.hitTest(e.offsetX, e.offsetY)) {
      const l = labelAt(measure, stage.metrics, labels, e.offsetX * dpr(), e.offsetY * dpr());
      if (l) {
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        scene.OptionsPanel.Close();
        // Shift: add the label to the selection (and drag it with the rest at once) or take it out (owner, 2026-11-14).
        if (e.shiftKey && selectedLabels.has(l.id)) {
          selectedLabels.delete(l.id); primaryId = e.pointerId; primaryRole = 'select'; pointerIsDown = true; downAt = { x: e.offsetX, y: e.offsetY };
          stage.redraw();
          return;
        }
        if (e.shiftKey) selectedLabels.add(l.id);
        else if (!selectedLabels.has(l.id) && selectionSize()) setSelection([]);  // another label: the selection is let go
        const group = selectedLabels.has(l.id) && selectionSize() > 1 ? new Map([...selection].flatMap(id => { const b = model.get(id); return b ? [[id, { x: b.x, y: b.y }] as [number, XY]] : []; })) : undefined;
        labelDrag = { id: l.id, pointer: e.pointerId, grabX: gx - l.x, grabY: gy - l.y, moved: !!e.shiftKey, fresh: false, downX: e.offsetX, downY: e.offsetY, group,
          labelFrom: labelPlaces(group ? selectedLabels : [l.id]) };
        if (group) for (const id of group.keys()) stage.held.add(id);
        stage.redraw();
        return;
      }
    }
    if (e.pointerType === 'touch') touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (primaryId !== null && e.pointerId !== primaryId) { if (e.pointerType === 'touch') extraDown(e); return; }
    primaryId = e.pointerId; primaryRole = null;
    lastPointerType = e.pointerType; lastPointer = (([x, y]) => ({ x, y }))(stage.cssToGrid(e.offsetX, e.offsetY));
    App.PointerInputManager.TouchAssumed = e.pointerType === 'touch';  // v1: which tour (keys or touch) to give
    if (placing) {
      // Placing inserted blocks: a click puts them down; a finger drags them (from wherever it lands) and lifting it
      // puts them down. Nothing else takes this press.
      if (!placing.touch && e.pointerType === 'mouse') { endPlacing(false); swallowUp = true; return; }
      placing.touch = true;
      const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
      placing.at = { x: Math.round(gx), y: Math.round(gy) }; placing.grabbed = true;
      pointerIsDown = true; swallowUp = true; primaryRole = 'placing';
      return;
    }
    pointerIsDown = true;
    downAt = { x: e.offsetX, y: e.offsetY };
    if (e.shiftKey && !scene.uiAt(e.offsetX * dpr(), e.offsetY * dpr())) {
      // Shift: add or remove a block (a block just added can be dragged straight away, with the others), or draw a box.
      const hit = stage.hitTest(e.offsetX, e.offsetY);
      scene.OptionsPanel.Close();
      if (hit && selection.has(hit.id)) { selection.delete(hit.id); primaryRole = 'select'; }
      else if (hit) {
        selection.add(hit.id);
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        startDrag(hit.id, gx - hit.x, gy - hit.y);
        for (const id of selection) if (id !== hit.id) stage.held.add(id);
        primaryRole = 'block';
      } else { box = { x0: e.offsetX, y0: e.offsetY, x1: e.offsetX, y1: e.offsetY, add: true }; showBox(); primaryRole = 'box'; }
      stage.redraw();
      return;
    }
    waveTouch = null;
    if (e.pointerType === 'touch') {  // on a waveform: what to put back if a second finger makes this a pinch
      const row = waveRowAt(scene.OptionsPanel, e.offsetX * dpr(), e.offsetY * dpr()), undo = row >= 0 ? snapshotWave(scene.OptionsPanel, row) : null;
      if (undo) waveTouch = { row, undo };
    }
    const tookUi = scene.pointerDown(e.offsetX * dpr(), e.offsetY * dpr(), () => v1At(e.offsetX, e.offsetY));
    if (!tookUi && !drag) {
      const hit = stage.hitTest(e.offsetX, e.offsetY);
      if (hit) {
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        startDrag(hit.id, gx - hit.x, gy - hit.y);
      }
    }
    primaryRole = tookUi ? 'ui' : drag ? 'block' : 'stage';
    if (drag && !selection.has(drag.id) && selection.size) setSelection([]);  // another block: back to v1's one
    if (grouped()) for (const id of selection) if (id !== drag!.id) stage.held.add(id);
    // A finger held still on the stage starts a box instead of moving the stage.
    if (primaryRole === 'stage' && e.pointerType === 'touch') {
      const id = e.pointerId, at = downAt;
      longPress = setTimeout(() => {
        longPress = null;
        if (primaryId !== id || primaryRole !== 'stage' || pinch) return;
        scene.endStageDrag();
        box = { x0: at.x, y0: at.y, x1: at.x, y1: at.y, add: false }; primaryRole = 'box'; showBox();
      }, LONG_PRESS_MS);
    }
    stage.redraw();
  });
  if (!embedId) app.canvas.addEventListener('pointermove', e => {
    const overMake = !!makeStageAt && e.pointerType === 'mouse' && inBox(makeStageAt, e.offsetX * dpr(), e.offsetY * dpr());
    if (overMake !== makeStageHover) { makeStageHover = overMake; stage.redraw(); }
    const overBy = !!cornerBoxes.by && e.pointerType === 'mouse' && inBox(cornerBoxes.by, e.offsetX * dpr(), e.offsetY * dpr()) && !scene.PatchesPanel.Open;
    const overMe = !!cornerBoxes.me && e.pointerType === 'mouse' && inBox(cornerBoxes.me, e.offsetX * dpr(), e.offsetY * dpr()) && !scene.PatchesPanel.Open;
    const overSave = !!cornerBoxes.save && e.pointerType === 'mouse' && inBox(cornerBoxes.save, e.offsetX * dpr(), e.offsetY * dpr()) && !scene.PatchesPanel.Open;
    if (overBy !== byHover || overMe !== meHover || overSave !== saveHover) {
      byHover = overBy; meHover = overMe; saveHover = overSave; app.canvas.style.cursor = overBy || overMe || overSave ? 'pointer' : ''; stage.redraw();
    }
    if (padMove(scene.OptionsPanel, e.pointerId, e.offsetX * dpr(), e.offsetY * dpr(), padHost)) { stage.redraw(); return; }
    if (labelDrag && (labelDrag.fresh || e.pointerId === labelDrag.pointer)) {
      moveLabel(e);
      if (!labelDrag.fresh) {  // an existing label: the bin opens under it, as under a dragged block
        if (labelDrag.moved) { scene.IsDraggingABlock = true; scene.pointerMove(e.offsetX * dpr(), e.offsetY * dpr(), true, () => null, true); }
        return;
      }
    }
    if (touchAt.has(e.pointerId)) touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    const extra = extras.get(e.pointerId);
    if (extra) { extraMove(e, extra); return; }
    if (primaryId !== null && e.pointerId !== primaryId) return;
    if (pinch && (pinch.a === e.pointerId || pinch.b === e.pointerId)) { movePinch(); stage.redraw(); return; }
    if (wavePinch && (wavePinch.a === e.pointerId || wavePinch.b === e.pointerId)) { moveWave(); stage.redraw(); return; }
    if (primaryRole === 'gone') return;
    lastPointerType = e.pointerType; lastPointer = (([x, y]) => ({ x, y }))(stage.cssToGrid(e.offsetX, e.offsetY));
    if (placing) {
      if (!placing.touch || (pointerIsDown && placing.grabbed)) placeAt(lastPointer.x, lastPointer.y);
      stage.redraw();
      return;
    }
    if (longPress && downAt && Math.hypot(e.offsetX - downAt.x, e.offsetY - downAt.y) > STILL_PX) { clearTimeout(longPress); longPress = null; }
    if (primaryRole === 'box' && box) { box.x1 = e.offsetX; box.y1 = e.offsetY; showBox(); return; }
    if (primaryRole === 'select') return;
    let blockMoved = false;
    if (drag && e.altKey && !drag.moved && grouped()) {
      // Alt + drag on a selection copies all of it (v1's Alt-copy, for the group): the copies are dragged and selected.
      const ids = [...selection], made = copyBlocks(ids, 0, 0), first = made.get(drag.id), madeLabels = copyLabels(selLabels(), 0, 0);
      pushUndo({ kind: 'add', uids: uidsOf(made.values()), labels: madeLabels });
      send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
      const v = v1Blocks.get(drag.id); if (v) v.IsPressed = false;
      stage.held.clear();
      if (first !== undefined) {
        const grab = { x: drag.grabX, y: drag.grabY };
        setSelection(made.values(), madeLabels);
        startDrag(first, grab.x, grab.y, true);
        drag!.moved = true;  // copied once per drag
        for (const id of selection) if (id !== first) stage.held.add(id);
        const cv = v1Blocks.get(first);
        if (cv) { scene.select(cv); cv.IsPressed = true; scene.IsDraggingABlock = true; }
      }
    }
    if (drag && e.altKey && !drag.moved && !grouped()) {
      // v1 Block.MouseMove: Alt (Option) + drag copies the block (same params) at the pointer and drags the copy;
      // the original is released where it was.
      const b = model.get(drag.id), v = v1Blocks.get(drag.id);
      if (b) {
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
        if (v) v.IsPressed = false;
        const copy = addBlock(b.type, Math.round(gx), Math.round(gy), structuredClone(b.params));
        const buf = samples.get(drag.id);
        if (buf && b.type !== 'source.sample-gen') useBuffer(copy, buf, 'keep');
        pushUndo({ kind: 'add', uids: uidsOf([copy]) });
        startDrag(copy, 0, 0, true);
        drag.moved = true;
        const cv = v1Blocks.get(copy);
        if (cv) { scene.select(cv); cv.IsPressed = true; scene.IsDraggingABlock = true; }
      }
    }
    if (drag) {
      const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
      const x = Math.round(gx - drag.grabX), y = Math.round(gy - drag.grabY), b = model.get(drag.id);
      if (b && (x !== b.x || y !== b.y)) {
        const dx = x - b.x, dy = y - b.y;
        if (grouped()) {
          for (const id of selection) { const o = model.get(id); if (o) moveBlock(id, o.x + dx, o.y + dy); }
          for (const l of selLabels()) { l.x += dx; l.y += dy; }
        } else moveBlock(drag.id, x, y);
        drag.moved = blockMoved = true;
      }
      // Over a Stage block: let go and they go inside it (ringed while they would).
      stage.dropTarget = drag.moved ? dropStageAt(e.offsetX, e.offsetY, new Set(grouped() ? selection : [drag.id])) : null;
    }  // stage panning: v1's MainSceneDragger inside the scene (setDrag)
    scene.pointerMove(e.offsetX * dpr(), e.offsetY * dpr(), pointerIsDown, () => v1At(e.offsetX, e.offsetY), blockMoved);
    stage.redraw();
  });
  const pointerEnd = (e: PointerEvent) => {
    touchAt.delete(e.pointerId);
    if (extras.has(e.pointerId)) { extraUp(e.pointerId); return true; }
    if (primaryId !== null && e.pointerId !== primaryId) return true;
    if (pinch && (pinch.a === e.pointerId || pinch.b === e.pointerId)) endPinch();
    if (wavePinch && (wavePinch.a === e.pointerId || wavePinch.b === e.pointerId)) endWavePinch();
    primaryId = null; waveTouch = null;
    if (primaryRole === 'gone') { primaryRole = null; pointerIsDown = false; scene.pointerUp(-1, -1, true); stage.redraw(); return true; }
    primaryRole = null;
    return false;
  };
  if (!embedId) app.canvas.addEventListener('pointercancel', e => {
    if (padUp(scene.OptionsPanel, e.pointerId, padHost)) { stage.redraw(); return; }
    if (labelDrag && e.pointerId === labelDrag.pointer && !labelDrag.fresh) { labelDrag = null; scene.IsDraggingABlock = false; stage.redraw(); return; }
    if (longPress) { clearTimeout(longPress); longPress = null; }
    if (pointerEnd(e)) return;
    pointerIsDown = false; swallowUp = false; downAt = null;
    if (box) { box = null; showBox(); }
    stage.held.clear();
    scene.pointerUp(-1, -1, true);
    if (drag) send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
    drag = null; stage.pressed = null; stage.dropTarget = null;
    stage.redraw();
  });
  if (!embedId) app.canvas.addEventListener('pointerup', e => {
    if (padUp(scene.OptionsPanel, e.pointerId, padHost)) { stage.redraw(); return; }
    if (labelDrag && (labelDrag.fresh || e.pointerId === labelDrag.pointer)) {
      const d = labelDrag;
      labelDrag = null;
      // Dropped from the menu: type its words. A finger: now, inside the touch (iOS opens the keyboard only for a focus
      // made while handling it); a mouse: after v1's own mouse-up.
      if (d.fresh) { if (e.pointerType === 'touch') editLabel(d.id); else setTimeout(() => editLabel(d.id), 0); }
      else {
        const binned = d.moved && scene.pointerUp(e.offsetX * dpr(), e.offsetY * dpr(), true) === 'delete';
        scene.IsDraggingABlock = false;
        stage.held.clear();
        if (d.group) {  // the selection, led by this label: binned all together, or one move step
          if (binned) { deleteBlocks([...d.group.keys()], d.group, [...selectedLabels], d.labelFrom); setSelection([]); }
          else if (d.moved) { recordMove([...d.group.keys()], d.group, d.labelFrom); labelsChanged(); }
        } else if (binned) deleteBlocks([], undefined, [d.id], d.labelFrom);
        else if (d.moved) { recordMove([], new Map(), d.labelFrom); labelsChanged(); }
        // A click (no move) edits the words, and a selection holding it is let go (as a click on a selected block).
        if (!d.moved) { if (d.group || selectedLabels.has(d.id)) setSelection([]); editLabel(d.id); }
        stage.redraw();
        return;
      }
    }
    const role = primaryRole, wasGroup = grouped(), still = !!downAt && Math.hypot(e.offsetX - downAt.x, e.offsetY - downAt.y) <= STILL_PX;
    if (longPress) { clearTimeout(longPress); longPress = null; }
    if (pointerEnd(e)) return;
    pointerIsDown = false; downAt = null;
    if (swallowUp) { swallowUp = false; if (placing?.touch) endPlacing(false); stage.redraw(); return; }
    if (role === 'box') { finishBox(); return; }
    if (role === 'select') { stage.redraw(); return; }
    const moved = drag?.moved ?? false;
    const result = scene.pointerUp(e.offsetX * dpr(), e.offsetY * dpr(), moved);
    stage.held.clear();
    const into = drag && moved && result !== 'delete' ? stage.dropTarget : null;
    stage.dropTarget = null;
    if (result === 'delete' && drag) deleteBlocks(wasGroup ? [...selection] : [drag.id], dragFrom, wasGroup ? [...selectedLabels] : [], labelDragFrom);
    else if (drag) {
      send([{ type: CommandType.Press, id: drag.id, value: 0 }]);  // v1 MouseUp → RemovePower
      if (into !== null) { addToStage(into, wasGroup ? [...selection] : [drag.id], wasGroup ? [...selectedLabels] : []); drag = null; stage.pressed = null; stage.redraw(); return; }
      if (moved && !drag.fresh) recordMove(wasGroup ? [...selection] : [drag.id], dragFrom, wasGroup ? labelDragFrom : undefined);
      if (moved && wasGroup && selectedLabels.size) labelsChanged();
    }
    // A double click on a Stage block looks inside it (the panel's OPEN STAGE does the same; CHG-0021).
    if (drag && !moved && !e.shiftKey && model.get(drag.id)?.type === 'source.stage') {
      const now = performance.now(), id = drag.id;
      if (stageClick && stageClick.id === id && now - stageClick.t < 450) { stageClick = null; setTimeout(() => enterStage(id), 0); }
      else stageClick = { id, t: now };
    }
    // A click on a selected block (no move) is v1's click: its options panel, and the group is let go.
    if (drag && !moved && wasGroup && !e.shiftKey) setSelection([]);
    if (role === 'stage' && still) setSelection([]);  // a tap on the stage clears the selection
    drag = null; stage.pressed = null;
    stage.redraw();
  });
  // Trackpad pinch (owner, 2026-11-11): zoom about the pointer, as a pinch on a touch screen does. Chrome and Firefox
  // send it as wheel events with ctrlKey (so does Ctrl + a mouse wheel); Safari on macOS as gesture events. A plain
  // mouse wheel zooms the same way (owner, 2026-11-12, CHG-0010; v1 had turned its stepped wheel zoom off), except over
  // the UI (an open panel, the header, the options panel), where it stays v1's (which does nothing).
  let gesture: { z0: number; w: { x: number; y: number } } | null = null;
  let waveGesture: WavePinch | null = null;  // Safari's trackpad pinch on a waveform
  let zoomSettle: ReturnType<typeof setTimeout> | undefined;
  /** The stage point under device px (x, y), in v1 units (see startPinch). */
  const stageAt = (x: number, y: number) => { const m = stage.metrics; return { x: (x - m.width / 2) / (stage.zoom * m.unit) - stage.drag.x, y: (y - m.height / 2) / (stage.zoom * m.unit) - stage.drag.y }; };
  function zoomAbout(x: number, y: number, zoomTo: number, w: { x: number; y: number }): void {
    const m = stage.metrics, zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomTo));
    const drag = { x: (x - m.width / 2) / (zoom * m.unit) - w.x, y: (y - m.height / 2) / (zoom * m.unit) - w.y };
    scene.pinchView(zoom, drag);
    stage.setView(zoom, drag);
    clearTimeout(zoomSettle); zoomSettle = setTimeout(() => scene.pinchEnd(), 250);
  }
  if (!embedId) app.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const x = e.offsetX * dpr(), y = e.offsetY * dpr();
    // Over a waveform in the options panel: zoom or slide it (waveZoom.ts), never the stage under it.
    const row = waveRowAt(scene.OptionsPanel, x, y);
    if (row >= 0) {
      if (!pointerIsDown && !waveGesture && !wavePinch) {
        const k = e.deltaMode === 1 ? 16 : 1;
        wheelWave(scene.OptionsPanel, row, x, { deltaX: e.deltaX * k, deltaY: e.deltaY * k, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey }, dpr());
        stage.redraw();
      }
      return;
    }
    if (e.ctrlKey && scene.optionsPanelAt(x, y)) return;  // a trackpad pinch elsewhere on the panel does nothing
    if (!e.ctrlKey && scene.uiAt(x, y)) { scene.wheel(e); return; }
    if (gesture || pinch || pointerIsDown) return;
    const dy = Math.max(-25, Math.min(25, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
    // A mouse wheel zooms at half a trackpad pinch's rate (owner, 2026-11-12: a notch is ×1.13, not ×1.28).
    zoomAbout(x, y, stage.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.005)), stageAt(x, y));
  }, { passive: false });
  const stageEl = document.getElementById('stage')!;
  type GestureEv = Event & { scale: number; clientX: number; clientY: number };
  const gestureAt = (e: GestureEv) => { const r = app.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr(), y: (e.clientY - r.top) * dpr() }; };
  if (!embedId) {
    // iOS sends these for a two-finger touch too: there the touch pinch has it (fingers are down), so they're ignored.
    stageEl.addEventListener('gesturestart', e => { if (touchAt.size || pointerIsDown || padNotes().length) return;  // fingers on the Touchpad's pads play, never zoom
    const g = e as GestureEv, at = gestureAt(g), row = waveRowAt(scene.OptionsPanel, at.x, at.y);
    if (row >= 0) { waveGesture = startWavePinch(scene.OptionsPanel, row, at.x, 1); return; }  // a waveform zooms instead
    if (scene.optionsPanelAt(at.x, at.y)) return;
    gesture = { z0: stage.zoom, w: stageAt(at.x, at.y) }; });
    stageEl.addEventListener('gesturechange', e => {
      const g = e as GestureEv, at = gestureAt(g);
      if (waveGesture) { moveWavePinch(scene.OptionsPanel, waveGesture, at.x, g.scale); stage.redraw(); return; }
      if (!gesture) return;
      zoomAbout(at.x, at.y, gesture.z0 * g.scale, gesture.w); });
    stageEl.addEventListener('gestureend', () => { gesture = null; waveGesture = null; });
  }
  if (embedId) setupEmbedChrome(embedId, start.title ?? '');

  // ---- drop an audio file: onto a sampler → it loads there; onto the stage → a new Sample block holds it (v1 had this
  // planned, MainScene "FILE DRAGGING", commented out). The file is read locally, never uploaded (DATA-0005). ----
  const isAudioFile = (f: File) => f.type.startsWith('audio/') || /\.(wav|mp3|ogg|oga|flac|aiff?|m4a|aac|opus|webm)$/i.test(f.name);
  if (!embedId) {
    window.addEventListener('dragover', e => {
      if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
    });
    window.addEventListener('drop', e => {
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      e.preventDefault();
      if (/\.(blokdust|json)$/i.test(file.name)) {  // a patch file: the Patches panel asks Open or Insert (owner, 2026-11-10)
        const r = app.canvas.getBoundingClientRect(), [gx, gy] = stage.cssToGrid(e.clientX - r.left, e.clientY - r.top);
        lastPointer = { x: gx, y: gy }; lastPointerType = 'mouse';
        void file.text().then(text => showPicked(text, file.name));
        return;
      }
      if (!isAudioFile(file)) return;
      // Chromium: a File System Access handle (asked for during the event) lets the file reload next visit.
      const item = [...(e.dataTransfer?.items ?? [])].find(i => i.kind === 'file') as (DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }) | undefined;
      const handle = item?.getAsFileSystemHandle?.().catch(() => null) ?? Promise.resolve(null);
      const r = app.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) { const [gx, gy] = stage.cssToGrid(x, y); id = addBlock('source.sample', Math.round(gx), Math.round(gy), {}); }
      const target = id;
      void handle.then(h => useFile(target, file, h?.kind === 'file' ? h as FileSystemFileHandle : null, true));
    });
  }

  // No browser menu on a right-click (owner, 2026-11-17): it took the pointer's release, leaving a held block stuck
  // down. Links keep theirs (open in a new tab, copy the address), and text fields theirs (paste).
  document.addEventListener('contextmenu', e => {
    if (e.target instanceof Element && e.target.closest('a[href], input, textarea, [contenteditable=""], [contenteditable="true"]')) return;
    e.preventDefault();
  });

  // ---- Dust 1–8 (plugin only, PLUGIN-0003): right-click an options-panel slider to map a host parameter to it ----
  app.canvas.addEventListener('contextmenu', e => {
    if (!juce || inside) return;  // Dust 1–8 move the outer world's blocks (CHG-0038)
    const hit = scene.sliderAt(e.offsetX * dpr(), e.offsetY * dpr());
    if (!hit) return;
    e.preventDefault();
    document.getElementById('dust-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'dust-menu';
    const c = theme.colors;
    // v1's panel layer (OptionsPanel, Header): palette 2 at 90%, and at 16% reaching 5 units below it. No blur: no
    // gradients anywhere in BlokDust.
    const alpha = (a: number) => c[2].replace(/,\s*[\d.]+\)$/, `,${a})`), u5 = 5 * stage.metrics.unit / stage.metrics.dpr;
    menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:10;background:${alpha(0.9)};color:${c[theme.roles.txt]};` +
      `font:400 13px Dosis, sans-serif;letter-spacing:.05em;padding:6px 0;min-width:150px;box-shadow:0 ${u5}px 0 ${alpha(0.16)}`;
    const key = `${hit.block.Id}:${hit.setting}`, current = automation.get(key) ?? 0;
    const title = document.createElement('div');
    title.textContent = `${hit.block.BlockName} › ${hit.name}`.toUpperCase();
    title.style.cssText = 'padding:4px 14px 8px;opacity:.6';
    menu.appendChild(title);
    for (let slot = 0; slot <= 8; slot++) {
      const item = document.createElement('div');
      item.textContent = slot ? `${slot === current ? '● ' : ''}DUST ${slot}` : 'CLEAR';
      item.style.cssText = `padding:5px 14px;cursor:pointer;${slot === 0 && !current ? 'opacity:.4' : ''}`;
      item.onmouseenter = () => { item.style.background = c[theme.roles.menu[slot % 4]]; };
      item.onmouseleave = () => { item.style.background = ''; };
      item.onclick = () => {
        for (const [k, v] of automation) if (v === slot && slot) automation.delete(k);
        if (slot) automation.set(key, slot); else automation.delete(key);
        juce.emitEvent('bd_automation', { slot, id: hit.block.Id, param: hit.setting });
        menu.remove();
      };
      menu.appendChild(item);
    }
    // MIDI learn (CHG-0004 3.9): the next CC the plugin receives drives this slot.
    if (current) {
      const learn = document.createElement('div');
      const cc = ccBySlot.get(current);
      learn.textContent = cc === undefined ? 'LEARN MIDI CC' : `CC ${cc} · LEARN AGAIN`;
      learn.dataset.learn = String(current);
      learn.style.cssText = 'padding:8px 14px 5px;cursor:pointer;border-top:1px solid rgb(255 255 255/.12);margin-top:4px';
      learn.onmouseenter = () => { learn.style.background = c[theme.roles.menu[0]]; };
      learn.onmouseleave = () => { learn.style.background = ''; };
      learn.onclick = () => { juce.emitEvent('bd_learnCC', { slot: current }); learn.textContent = 'MOVE A KNOB…'; setTimeout(() => menu.remove(), 900); };
      menu.appendChild(learn);
    }
    document.body.appendChild(menu);
    setTimeout(() => window.addEventListener('pointerdown', ev => { if (!menu.contains(ev.target as Node)) menu.remove(); }, { once: true }), 0);
  });

  // ---- notes: computer keyboard → input.computer-keyboard blocks, Web MIDI → input.midi-controller blocks ----
  const keyboardType = typeIndex('input.computer-keyboard'), midiType = typeIndex('input.midi-controller');
  // To the outer world, which passes them into every Stage: a Keyboard inside one plays from outside it (owner, 2026-11-14).
  const note = (blockType: number, n: number, down: boolean, velocity = 1) =>
    sendRaw([{ type: down ? CommandType.NoteOn : CommandType.NoteOff, id: 0, blockType, param: n, value: velocity }]);
  // Web MIDI → each MIDI Input block through its own MPE/MIDI parser (PLUGIN-0004): its device choice here, its
  // channel filter and expression mapping in the engine.
  const parsers = new Map<string, MpeParser>();  // by "<stage>:<block id>" (0: the outer world)
  let midiDevices: MidiDevice[] = [];
  attachNoteInputs({
    key: (n, down) => { if (down && !usage.keys) { usage.keys = true; track('keyboard_played'); } note(keyboardType, n, down); },
    // Plugin: with a Computer Keyboard in the patch its keys are BlokDust's while the editor has the keys (the DAW's
    // shortcuts would fire too); without one they go on to the DAW (Logic's Musical Typing → MIDI Input).
    captureKeys: () => !!juce && [...model.values()].some(b => b.type === 'input.computer-keyboard'),
    captureAll: () => standalone,
    // Plugin: the editor says when its window loses the keys (clicking into the DAW); the web view may not blur (Ableton).
    onReleaseAll: release => { juce?.addEventListener('bd_keysLost', () => release()); },
    midi: (status, d1, d2, device) => {
      // Every MIDI Input: those on show, and those inside the outer world's Stage blocks (they play from outside too).
      const inputs: { key: string; id: number; params: Record<string, unknown>; stage: number }[] = [];
      for (const [id, b] of model) if (b.type === 'input.midi-controller') inputs.push({ key: `${inside?.stageId ?? 0}:${id}`, id, params: b.params, stage: inside?.stageId ?? 0 });
      if (inside) for (const [id, b] of inside.outer.model) if (b.type === 'input.midi-controller') inputs.push({ key: `0:${id}`, id, params: b.params, stage: 0 });
      for (const [sid, st] of inside ? inside.outer.model : model) {
        if (st.type !== 'source.stage' || sid === inside?.stageId) continue;
        const ids = innerIds.get(st.uid)?.ids ?? {};
        for (const b of macros.get(st.uid)?.blocks ?? []) {
          const id = b.id === undefined ? undefined : ids[b.id];
          if (b.type === 'input.midi-controller' && id !== undefined) inputs.push({ key: `${sid}:${id}`, id, params: b.params ?? {}, stage: sid });
        }
      }
      const cmds: Command[] = [];
      for (const { key, id, params: q, stage: sid } of inputs) {
        const want = typeof q.device === 'string' ? q.device : '';
        if (want && want !== device.name) continue;
        let p = parsers.get(key);
        if (!p) { p = new MpeParser(id, midiType); parsers.set(key, p); }
        if (!usage.midi) { usage.midi = true; track('midi_connected', { mpe: q.mpe ? 'yes' : 'no' }); }
        p.setSettings({ mpe: !!q.mpe, memberBendRange: typeof q.bendRange === 'number' ? q.bendRange : 48 });
        const out: Command[] = [];
        p.message(status, d1, d2, -1, out);
        cmds.push(...(sid ? out.map(c => ({ ...c, stage: sid })) : out));
      }
      const live = new Set(inputs.map(i => i.key));
      for (const key of parsers.keys()) if (!live.has(key)) parsers.delete(key);
      if (cmds.length) sendRaw(cmds);
    },
    devices: list => { midiDevices = list; scene.setMidiDevices?.(list); },
  });
  (window as unknown as { __bd_midiDevices: () => MidiDevice[] }).__bd_midiDevices = () => midiDevices;
  // v1 keyboard shortcut: delete the selected block. Esc drops an Insert being placed; Cmd/Ctrl+Z takes the last
  // Insert out again (owner, 2026-11-10: one step).
  window.addEventListener('keydown', e => {
    const tag = (e.target as HTMLElement)?.tagName;
    // Cmd/Ctrl+S (SPEC-SHARING-BACKEND R18): quick save, also while typing; never the browser's "Save page". In a DAW
    // it is the DAW's Save (which keeps the plugin's patch in the project); the standalone app opens Patches › SAVE.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's' && !embedId) {
      if (juce && !standalone) return;
      e.preventDefault();
      if (!e.repeat) void quickSave();
      return;
    }
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      if (e.key === 'Escape' && placing) { e.preventDefault(); endPlacing(true); return; }
      if (e.key === 'Escape' && inside && !scene.PatchesPanel.Open && !scene.SettingsPanel.Open) { e.preventDefault(); exitStage(); return; }
      // Cmd/Ctrl+G: the selected blocks go inside a new Stage block where they were (CHG-0021).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && selection.size > 0 && !inside && !juce) {
        e.preventDefault();
        makeStage();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && (placing || undoStack.length)) {
        e.preventDefault();
        if (placing) endPlacing(true);
        else undo();
        return;
      }
      // Redo: Cmd/Ctrl+Shift+Z, or Ctrl+Y (Windows).
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || (!e.shiftKey && e.key.toLowerCase() === 'y')) && !placing && redoStack.length) {
        e.preventDefault();
        redo();
        return;
      }
    }
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !scene.PatchesPanel.Open && !scene.SettingsPanel.Open && !scene.SoundcloudPanel.Open) {
      const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
      // Space: the power switch (web; in a DAW, Space is the transport's).
      if (e.code === 'Space' && !mod && !e.repeat && !juce) { e.preventDefault(); scene.setWorldPower(!scene.worldPower); return; }
      if (e.key === 'Escape' && selectionSize()) { e.preventDefault(); setSelection([]); return; }
      if (mod && !e.shiftKey && k === 'a') { e.preventDefault(); setSelection(model.keys(), labels.map(l => l.id)); scene.OptionsPanel.Close(); return; }
      if (mod && !e.shiftKey && k === 'd' && selectionSize()) {
        e.preventDefault();
        const made = copyBlocks([...selection], 2, 2), madeLabels = copyLabels(selLabels(), 2, 2);
        pushUndo({ kind: 'add', uids: uidsOf(made.values()), labels: madeLabels });
        setSelection(made.values(), madeLabels);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionSize()) {
        e.preventDefault();
        deleteBlocks([...selection], undefined, [...selectedLabels]);
        scene.select(null); scene.OptionsPanel.Close(); stage.redraw();
        return;
      }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && scene.SelectedBlock && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      deleteBlocks([scene.SelectedBlock.Id]); scene.select(null); scene.OptionsPanel.Close();
    }
  });
}

/** Embed player chrome (SHARING-0002): a play overlay and a link to the full app. Plain DOM over the stage. */
function setupEmbedChrome(id: string, title: string): void {
  const base = document.querySelector<HTMLMetaElement>('meta[name="blokdust-base"]')?.content ?? new URL('.', document.baseURI).href.replace(/\/$/, '');
  const overlay = document.getElementById('start');
  if (overlay) overlay.style.background = 'rgb(26 31 33 / 0.6)';
  if (overlay) overlay.innerHTML = `<span style="display:grid;place-items:center;gap:10px"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="27" fill="none" stroke="currentColor" stroke-width="2"/><path d="M22 17 L40 28 L22 39 Z" fill="currentColor"/></svg><span style="font:300 18px Dosis, system-ui, sans-serif;letter-spacing:.12em">${title ? title.toUpperCase().replace(/[<&>]/g, '') : 'PLAY'}</span></span>`;
  const link = document.createElement('a');
  link.href = `${base}/?c=${id}${title ? `&t=${encodeURI(title)}` : ''}`;
  link.target = '_blank'; link.rel = 'noopener';
  link.textContent = 'OPEN IN BLOKDUST ↗';
  link.id = 'open-in-blokdust';
  link.addEventListener('click', () => { track('embed_opened_full'); flushAnalytics(true); });
  link.style.cssText = 'position:fixed;right:10px;bottom:8px;z-index:4;color:#fff4d6;opacity:.75;font:400 11px Dosis, system-ui, sans-serif;letter-spacing:.1em;text-decoration:none';
  document.body.appendChild(link);
}

void main();

/** A five-pointed star centred on (x, y), `r` to its points: outlined, or filled once liked (owner review 2). */
