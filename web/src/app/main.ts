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
import { THEMES, type Theme } from '../generated/palettes.gen.ts';
import { relinks, type Patch } from '../patch/loadPatch.ts';
import { decodePatch, encodePatch, loadLocal, loadSession, saveLocal, saveSession } from '../patch/share.ts';
import { editToken, isServerId, load as loadShared, save as saveShared } from '../patch/server.ts';
import { DEFAULT_SOUNDS, PUBLIC_SITE, isDeadDefault, fetchFreesound, fingerprint, isPortable, openRemembered, pickAudioFile, refKey, rememberHandle, searchFreesound, type FileRef, type FreesoundRef, type SampleRef } from '../patch/samples.ts';
import { importV1, type V1Composition } from '../patch/importV1.ts';
import { Stage } from '../stage/Stage.ts';
import demo from '../demo/demo.patch.json';
import { attachNoteInputs, type MidiDevice } from '../input/keys.ts';
import { MpeParser } from '../input/mpe.ts';
import { loadV1Fonts } from '../chrome/v1Chrome.ts';
import { SAVE_WARNING, V1Scene } from '../v1ui/scene.ts';
import { V1Block } from '../v1ui/blocks.ts';
import { setMonitors } from '../v1ui/newBlocks.ts';
import { Waveform } from '../v1ui/ported/Core/Audio/Waveform';

/** Link-preview size (Open Graph's recommended 1.91:1; server/src/pages.ts THUMB). */
const THUMB = { width: 1200, height: 630 } as const;

interface JuceBackend {
  emitEvent(id: string, payload: unknown): void;
  addEventListener<T>(id: string, fn: (payload: T) => void): unknown;
}
interface ModelBlock { uid: string; type: string; x: number; y: number; params: Record<string, unknown> }

/** Visual-only per-block star position for Void (v1 RandomStarPos), seeded by block id so it is stable. */
function starPos(id: number): { x: number; y: number } {
  let s = (id * 2654435761) >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const x = Math.round(r() * 10), y = Math.round(r() * (10 - x));
  return { x: r() < 0.5 ? -x : x, y: r() < 0.5 ? -y : y };
}
const typeIndex = (type: string) => BLOCKS.findIndex(b => b.id === type);
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
interface Start { patch: Patch; view: View; id: string | null; title?: string; missing?: boolean }
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
    if (!embedId && session.id === c && session.dirty && local) return { patch: local, view: {}, id: c };
    const r = await loadShared(c);
    if (r) return { patch: r.patch, view: {}, id: c, title: r.title };
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null, missing: true };
  }
  if (c) { const p = await decodePatch(c); if (p) return { patch: p, view: {}, id: null }; }
  const v1 = params.get('v1');
  if (v1) { try { const r = importV1(JSON.parse(v1) as V1Composition); return { patch: r.patch, view: r.view, id: null }; } catch { /* fall through */ } }
  if (params.has('demo')) return { patch: demo as Patch, view: {}, id: null };
  return { patch: loadLocal() ?? (demo as Patch), view: {}, id: loadSession().id };
}

async function main() {
  const params = new URLSearchParams(location.search);
  const juce = (window as unknown as { __JUCE__?: { backend: JuceBackend } }).__JUCE__?.backend;
  applyHostLabels(!!juce);
  const embedId = embedIdFromPage();
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
  // v1 App.CompositionId / App.SessionId: the open composition and (if this browser made it) the right to overwrite it.
  App.CompositionId = start.id; App.SessionId = editToken(start.id);
  let session = { id: start.id, dirty: false };
  // v1's Share panel reads the title from `&t=` (GetTitleFromUrl): put a saved title there when the link had none.
  if (start.title && !params.has('t') && !embedId) history.replaceState(null, '', `${location.pathname}?c=${start.id}&t=${encodeURI(start.title)}`);
  let theme: Theme = THEMES[Math.min(Number(params.get('theme') ?? start.view.theme ?? 0), THEMES.length - 1)];

  const app = new Application();
  // Transparent: the static stage is an on-page Canvas2D layer behind Pixi (Stage 'canvas' renderer, UI-0005).
  await app.init({ resizeTo: window, resolution: devicePixelRatio, autoDensity: true, antialias: true, background: 0x000000, backgroundAlpha: 0 });
  document.getElementById('stage')!.appendChild(app.canvas);
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
  let engine: EngineNode | null = null;
  let send = (cmds: Command[]) => engine?.send(cmds);
  /** Sample references by `track` key (DATA-0005): the patch keeps the ones its blocks use. */
  const refs = new Map<string, SampleRef>();
  /** R4a (owner, 2026-11-12): the order the connected pairs connected in, as patch ids, oldest first. A source's
   * effects run in that order (v1). It starts from the opened patch and then follows the engine (each snapshot that
   * carries connections lists them oldest first); patches save it, and loading replays it (Relink). */
  let connectionOrder: [string, string][] = [];
  const uidToId = () => new Map([...model].map(([id, b]) => [b.uid, id]));
  const toPatch = (): Patch => {
    const used = new Set([...model.values()].map(b => b.params.track).filter((t): t is string => typeof t === 'string'));
    const r = Object.fromEntries([...refs].filter(([k]) => used.has(k)));
    const uids = uidToId(), order = connectionOrder.filter(([a, b]) => uids.has(a) && uids.has(b));
    return { format: 'blokdust.patch', version: 2, seed, ...(tempo !== undefined ? { tempo } : {}),
      blocks: [...model.values()].map(b => ({ id: b.uid, type: b.type, x: b.x, y: b.y, params: b.params })),
      ...(Object.keys(r).length ? { refs: r } : {}), ...(order.length ? { connectionOrder: order } : {}),
      view: currentView() };
  };
  const ZOOM_MIN = 0.25, ZOOM_MAX = 4;  // v1 ZoomButtons' range
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
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** The autosave holds the patch on screen (it was restored from it, or edited since). */
  let autosaveIsThis = !params.has('c') && !params.has('v1') && !params.has('demo') && !embedId;
  const changed = () => {
    if (embedId || juce) return;  // the embed player never autosaves; in the plugin the DAW project keeps the patch
    clearTimeout(saveTimer);
    autosaveIsThis = true;
    saveTimer = setTimeout(() => { saveLocal(toPatch()); if (session.id && !session.dirty) { session.dirty = true; saveSession(session); } }, 300);
  };

  const scene = new V1Scene({
    createBlock: (v1Type, gx, gy) => {
      const def = DEF_BY_V1.get(v1Type);
      if (!def) return null;
      // A new Emitter, Pulse or Stereo Delay starts in tempo sync (owner, CHG-0004; the delay's 1/8 at 120 BPM is v1's
      // 0.25 s); saved patches without it keep v1 timing.
      const id = addBlock(def.id, gx, gy, def.id === 'power.emitter' || def.id === 'power.pulse' || def.id === 'fx.stereo-delay' ? { sync: true } : {});
      pushUndo({ kind: 'add', uids: uidsOf([id]) });
      startDrag(id, 0, 0, true);
      return id;
    },
    // A drop on the trash (v1 TrashCan.MouseUp → DeleteSelectedBlock) is deleted by pointerup, with its group, as one step.
    deleteBlock: id => { if (!drag) deleteBlocks([id]); },
    setParam: (id, key, value) => {
      const b = model.get(id), def = b && BLOCKS_BY_ID.get(b.type);
      const p = def?.params.findIndex(q => q.key === key) ?? -1;
      if (!b || p < 0) return;
      b.params[key] = value;
      send([{ type: CommandType.SetParam, id, param: p, value }]);
      changed();
    },
    setTheme: n => { theme = THEMES[n] ?? THEMES[0]; stage.setTheme(theme); uiSync = true; stage.redraw(); },
    setZoom: z => { stage.setView(z, stage.drag); },
    setDrag: d => { stage.setView(stage.zoom, d); },
    // Tone.Volume dB → gain is 2^(dB/6); the value v1 writes is the one it later reads back (20·log10 form).
    loadSample: id => void pickSample(id),
    searchSamples: (q, max) => searchFreesound(q, max),
    loadFreesound: (id, sound, display) => {
      const ref: FreesoundRef = { provider: 'freesound', ...sound };
      // Plugin: the processor downloads and decodes it for its native engine (CHG-0004 3.6).
      if (juce) { juce.emitEvent('bd_loadUrl', { id, ref, display, maxSeconds: maxSecondsFor(id) ?? 0 }); return; }
      void whileLoading(id, async () => useSample(id, ref, await fetchFreesound(ref, maxSecondsFor(id)), true, display))
        .catch(err => { console.warn('BlokDust: Freesound sound unavailable', err); markMissing(id); });
    },
    reverseSample: (id, on) => reverseSample(id, on),
    setText: (id, key, value) => setParams(id, { [key]: value }),
    tempo: () => tempo ?? 120,
    setTempo: bpm => { tempo = Math.max(40, Math.min(240, bpm)); send([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]); changed(); },
    hasLocalFiles: () => [...model.values()].some(b => !isPortable(b.params.track)),
    setMasterDb: db => send([{ type: CommandType.SetMaster, id: 0, value: db <= -99 ? 0 : 2 ** (db / 6) }]),
    setWorldPower: on => { send([{ type: CommandType.WorldPower, id: 0, value: on ? 1 : 0 }]); stage.redraw(); },
    resetScene: () => {
      for (const id of [...model.keys()]) removeBlock(id);
      stage.setView(1, { x: 0, y: 0 });
      history.replaceState(null, '', location.pathname);  // v1 AddressBarManager.StripURL
      session = { id: null, dirty: false }; saveSession(session);
      shareLink = null; undoStack.length = 0; redoStack.length = 0; endPlacing(true);
      setBaseline();
    },
    share: async (mode, title) => {
      const patch = toPatch();
      try {
        const thumb = stage.thumbnail(THUMB.width, THUMB.height).toDataURL('image/png').split(',')[1];
        const r = await saveShared(mode, App.CompositionId, { patch, title, thumb });
        if (r) {
          App.CompositionId = r.id; App.SessionId = editToken(r.id);
          session = { id: r.id, dirty: false }; saveSession(session); saveLocal(patch);
          return r.id;
        }
      } catch (e) { console.warn('BlokDust: saving to the server failed; sharing as a link instead', e); }
      return encodePatch(patch);  // no backend (or it failed): Phase 1's self-contained link
    },
    toggleRecording: id => void toggleRecording(id),
    downloadRecording: id => downloadRecording(id),
    generateSample: id => generateSample(id, false),
    themes: () => THEMES,
    // ---- Patches panel (CHG-0005; SAVE / OPEN tabs, owner 2026-11-10): `.blokdust` files and built-in presets ----
    listPatches: async () => [...(juce ? await nativePatches() : myPatches().map(m => ({ name: m.title, detail: savedOn(m.saved), key: `mine:${m.title}`, removable: true }))),
      ...PRESETS.map(p => ({ name: p.name, detail: 'Preset', key: `preset:${p.file}` }))],
    savePatch: title => savePatchFile(title),
    openPatch: (item, mode) => void openPatchItem(item.key, mode),
    pickPatchFile: () => pickPatchFile(),
    usePickedFile: mode => { if (picked) { const p = picked; picked = null; usePatch(p.patch, p.title, mode); } },
    isDirty: () => model.size > 0 && contentOf(toPatch()) !== baseline,
    hasBlocks: () => model.size > 0,
    removePatch: async item => {
      if (item.key.startsWith('mine:')) {
        try { localStorage.setItem(MINE_KEY, JSON.stringify(myPatches().filter(m => m.title !== item.key.slice(5)))); } catch { /* private mode */ }
      } else if (juce && item.key.startsWith('file:')) await nativeReply(req => juce.emitEvent('bd_patchDelete', { req, path: item.key.slice(5) }));
    },
    // Owner's wording (2026-11-10); the plugin's file really goes to the Trash, so it says so.
    removeLine: juce ? 'This patch file will be moved to the Trash. Links you generated remain untouched.'
      : 'This patch will be removed from the patches list. Your local downloaded patches and generated links remain untouched.',
    // Plugin: CREATE SHARE LINK opens the patch on the public site, which makes the link (its page runs the bot check
    // the plugin's own page can't: Turnstile only runs on the site's own address). Nothing is uploaded until then.
    links: juce ? {
      external: true,
      current: () => null,
      make: async (_mode, title) => {
        const url = `${PUBLIC_SITE}?c=${await encodePatch(toPatch())}&t=${encodeURIComponent(title)}&share=1`;
        juce.emitEvent('bd_openUrl', { url });
      },
      warning: () => shareWarning(),
    } : {
      current: () => shareLink ? { url: shareLink.url, owned: shareLink.owned, stale: contentOf(toPatch()) !== shareLink.at } : null,
      make: async (mode, title) => {
        const id = await scene.host.share(mode === 'save' && shareLink?.owned ? 'save' : 'saveAs', title);
        const url = `${location.origin}${location.pathname}?c=${id}&t=${encodeURIComponent(title)}`;
        history.replaceState(null, '', url);  // v1 AddressBarManager.UpdateURL
        shareLink = { url, owned: isServerId(id) && !!App.SessionId, at: contentOf(toPatch()) };
        setBaseline();  // a shared patch counts as saved
        keepMine(title);
      },
      warning: () => shareWarning(),
    },
  });
  function shareWarning(): string | null {
    return [...model.values()].some(b => b.type === 'source.recorder' || !isPortable(b.params.track)) ? SAVE_WARNING : null;
  }
  let uiSync = true;
  stage.skipOverlays = new Set(['recordButton']);  // the ported RecorderPanel draws it (with hover/recording states)
  // The embed player (SHARING-0002, `/embed/<id>`) shows the stage only: no menus, panels or editing.
  if (!embedId) stage.drawUi = ctx => {
    if (uiSync) { uiSync = false; scene.sync(ctx, theme, stage.zoom, stage.drag, [...v1Blocks.values()]); }
    scene.setView(stage.zoom, stage.drag);
    scene.draw();
  };

  function addBlock(type: string, x: number, y: number, p: Record<string, unknown>, uid?: string, quiet = false): number {
    const id = nextId++;
    const def = BLOCKS_BY_ID.get(type)!;
    // A new block's patch id: `b<id>`, unless a loaded block already has it (ids are renumbered when a project loads).
    if (uid === undefined) { const taken = new Set([...model.values()].map(b => b.uid)); uid = `b${id}`; for (let k = 2; taken.has(uid); k++) uid = `b${id}_${k}`; }
    model.set(id, { uid, type, x, y, params: { ...p } });
    v1Blocks.set(id, new V1Block(id, def, x, y, p));
    stage.upsertBlock({ id, type, x, y, starPos: type === 'power.void' ? starPos(id) : undefined });
    if (needsInput(type)) void engine?.connectMicrophone();
    // Plugin: a SampleGen whose sound was saved as a file is played by the processor; it is not generated again.
    const savedFile = !!juce && typeof p.track === 'string' && p.track.startsWith('file:');
    if (type === 'source.sample-gen' && !savedFile) generateSample(id, !!(p.seed as { waveVoices?: unknown } | undefined)?.waveVoices);
    if (type === 'fx.convolver') void showBuiltInImpulse(id);
    if (!quiet) {
      void resolveSample(id, true);
      send([{ type: CommandType.AddBlock, id, blockType: typeIndex(type), x, y, key: uid },
        ...def.params.flatMap((q, i) => typeof p[q.key] === 'number' || typeof p[q.key] === 'boolean' ? [{ type: CommandType.SetParam, id, param: i, value: Number(p[q.key]) }] : [])]);
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
    if (f) { pendingReplies.delete(e.req!); f(e); } else if (ev === 'bd_patchFile') { const r = e as { text: string; name: string; file?: string }; showPicked(r.text, r.file ?? `${r.name}.${PATCH_EXT}`); }
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
  type Mine = { title: string; saved: number; patch: Patch };
  function myPatches(): Mine[] {
    try { const v = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  function keepMine(title: string): void {
    if (juce || embedId) return;
    let list = [{ title, saved: Date.now(), patch: { ...toPatch(), meta: { title } } as Patch }, ...myPatches().filter(m => m.title !== title)].slice(0, MINE_MAX);
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
      const out = await handle.createWritable();
      await out.write(text); await out.close();
      setBaseline(); keepMine(title);
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
    return true;
  }
  async function openPatchItem(key: string, mode: 'open' | 'insert'): Promise<void> {
    if (key.startsWith('preset:')) {
      const p = PRESETS.find(x => `preset:${x.file}` === key), patch = p && parsePatchFile(p.text);
      if (p && patch) usePatch(patch, p.name, mode);
      return;
    }
    if (key.startsWith('mine:')) {
      const m = myPatches().find(x => x.title === key.slice(5)), patch = m && parsePatchFile(JSON.stringify(m.patch));
      if (m && patch) usePatch(patch, m.title, mode);
      return;
    }
    if (juce && key.startsWith('file:')) {
      const r = await nativeReply<{ text: string; name: string }>(req => juce.emitEvent('bd_patchRead', { req, path: key.slice(5) }));
      const patch = r && parsePatchFile(r.text);
      if (r && patch) usePatch(patch, patchTitle(patch, r.name), mode);
    }
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
  function usePatch(p: Patch, title: string, mode: 'open' | 'insert'): void {
    applyPatch(p, mode);
    if (mode === 'open') scene.PatchesPanel.setTitle(title);
  }
  /**
   * Open replaces the scene. Insert adds the patch's blocks, keeping their layout, and hands them to the pointer to place
   * (owner, 2026-11-10): see startPlacing. With a mouse they start under it; on a touch screen in the middle of the view.
   */
  function applyPatch(p: Patch, mode: 'open' | 'insert'): void {
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
        ...(mode === 'open' && p.view ? { view: p.view } : {}) }) });
      return;
    }
    if (mode === 'open') { scene.ResetScene(); if (typeof p.tempo === 'number') { tempo = p.tempo; send([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]); } }
    for (const [k, r] of Object.entries(part.refs)) if (r && typeof r === 'object' && 'provider' in r && !refs.has(k)) refs.set(k, r as SampleRef);
    const ids = part.blocks.map(b => addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id));
    if (mode === 'open') { connectionOrder = [...(p.connectionOrder ?? [])]; send(relinks(p, uidToId())); applyView(p.view); }
    if (mode === 'open') setBaseline(); else startPlacing(ids, touch, at);
    stage.redraw();
  }
  /** Plugin: what to do once the processor sends the merged patch back. */
  let pluginAfterLoad: { open: true } | { place: Set<string>; touch: boolean; at: { x: number; y: number } } | null = null;

  // ---- unsaved changes (owner, 2026-11-10): the patch as last saved, shared or opened ----
  /** What Open would lose: blocks, their params and the tempo (not the view). */
  const contentOf = (p: Patch) => JSON.stringify([p.blocks, p.tempo ?? null]);
  const BASELINE_KEY = 'blokdust.savedPatch';
  let baseline = '';
  function setBaseline(): void {
    baseline = contentOf(toPatch());
    if (!juce && !embedId) try { localStorage.setItem(BASELINE_KEY, baseline); } catch { /* private mode */ }
  }
  /** The share link made here (or the one this browser can update, from the start-up link). */
  let shareLink: { url: string; owned: boolean; at: string } | null = null;

  // ---- Insert: the new blocks follow the pointer until a click (or, on a touch screen, a drag) puts them down ----
  let placing: { ids: number[]; at: { x: number; y: number }; touch: boolean; grabbed?: boolean } | null = null;
  /** Undo and redo (owner, 2026-11-10/11, and 2026-11-12 CHG-0010): adding blocks (from the menu, Insert, Cmd/Ctrl+D,
   * Alt-drag copies), moving and deleting them, each one step however many blocks it took. Steps name blocks by
   * their patch id, which a block keeps when undo or redo brings it back; a removed block is kept whole (settings,
   * place, its sound). A new action clears what could be redone. Param changes are not steps. */
  type XY = { x: number; y: number };
  type Snap = { b: ModelBlock; buf?: AudioBuffer };
  type UndoStep = { kind: 'add'; uids: string[]; snaps?: Snap[] } | { kind: 'remove'; snaps: Snap[] } | { kind: 'move'; moves: { uid: string; from: XY; to: XY }[] };
  const undoStack: UndoStep[] = [], redoStack: UndoStep[] = [];
  const pushUndo = (u: UndoStep) => { undoStack.push(u); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; };
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
    if (juce) { juce.emitEvent('bd_pickFile', { id }); return; }  // plugin: a native chooser keeps the file's path
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
    if (juce) { juce.emitEvent('bd_sampleData', { id, sampleRate: buffer.sampleRate, data: Array.from(buffer.getChannelData(0)) }); return; }
    samples.set(id, buffer);
    const v = v1Blocks.get(id), dur = buffer.duration;
    if (region === 'reset') setParams(id, { startPosition: 0, endPosition: dur, loopStart: 0, loopEnd: dur, reverse: false });
    if (region === 'half') setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur });
    if (v) { v.PrimaryBuffer = buffer; v.WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, waveDetail, 95); v.RefreshOptionsPanel(); }
    engine?.sendSample(id, buffer);
    stage.redraw();
  }
  // ---- v1 Recorder (RecorderPanel button): record the master output into the block ----
  async function toggleRecording(id: number): Promise<void> {
    const v = v1Blocks.get(id);
    // Plugin: the processor records its own output and loads the take into the block (as a file the project keeps).
    if (v && juce) { v.IsRecording = !v.IsRecording; juce.emitEvent('bd_record', { id, on: v.IsRecording }); stage.redraw(); return; }
    if (!v || !engine) return;
    if (!v.IsRecording) { v.IsRecording = true; engine.startRecording(); stage.redraw(); return; }
    v.IsRecording = false;
    const r = await engine.stopRecording();
    stage.redraw();
    if (!r.left.length) return;
    const buf = new AudioBuffer({ numberOfChannels: 2, length: r.left.length, sampleRate: r.sampleRate });
    buf.copyToChannel(r.left as Float32Array<ArrayBuffer>, 0); buf.copyToChannel(r.right as Float32Array<ArrayBuffer>, 1);
    setParams(id, { reverse: false });
    useBuffer(id, buf, 'half', 2);  // v1 Recorder.UpdateWaveform: detail 2, loop from half way
  }
  function downloadRecording(id: number): void {
    if (juce) { juce.emitEvent('bd_reveal', { id }); return; }  // plugin: the take is already a file; show it
    const buf = samples.get(id);
    if (!buf) return;  // v1: "This block doesn't have a recording to download yet."
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([encodeWav(buf)], { type: 'audio/wav' }));
    a.download = 'BlokdustRecording.wav';  // v1 Recorder.Filename
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  // ---- v1 SampleGen: v1's own generator (ported verbatim) renders a random arpeggio; its recipe is saved ----
  function generateSample(id: number, fromSeed: boolean): void {
    const v = v1Blocks.get(id);
    if (!v) return;
    v.WaveForm = []; v.RefreshOptionsPanel();
    const ctx = Object.assign(Object.create(SAMPLE_GEN), {
      Params: v.Params, _LoadFromShare: fromSeed, _SeedLoad: true, _WaveVoices: [] as unknown[],
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
    setTimeout(() => ctx.DataToBuffer(), 16);  // v1 runs it on a timeout too
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
      engine?.sendSample(id, buffer);  // Granular plays it (CHG-0004 3.8); Convolver uses it as the impulse response
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
    engine?.sendSample(id, buffer);
    stage.redraw();
  }
  // Tests: attach a file without a picker.
  (window as unknown as { __bd_loadSample: unknown }).__bd_loadSample = (id: number, name: string, bytes: ArrayBuffer) =>
    useSample(id, { provider: 'file', name, bytes: bytes.byteLength, durationSec: 0, hash: '' }, bytes, true);
  const needsInput = (type: string) => type === 'source.microphone' || type === 'source.audio-in';

  function removeBlock(id: number): void {
    if (!model.has(id)) return;
    model.delete(id); v1Blocks.delete(id);
    stage.selected.delete(id); stage.held.delete(id);
    stage.removeBlock(id);
    send([{ type: CommandType.RemoveBlock, id }]);
    scene.setBlocks([...v1Blocks.values()]);
    changed();
  }
  /** Delete blocks as one undoable step. */
  function deleteBlocks(ids: number[], from?: Map<number, { x: number; y: number }>): void {
    // Kept where they were before the drag that took them to the trash.
    const snaps = ids.flatMap(id => { const b = model.get(id); return b ? [{ b: { ...structuredClone(b), ...from?.get(id) }, buf: samples.get(id) }] : []; });
    if (!snaps.length) return;
    for (const id of ids) removeBlock(id);
    pushUndo({ kind: 'remove', snaps });
  }
  /** A drag that ended: one move step for the blocks it moved. */
  function recordMove(ids: number[], from: Map<number, XY>): void {
    const moves = ids.flatMap(id => { const b = model.get(id), f = from.get(id); return b && f && (b.x !== f.x || b.y !== f.y) ? [{ uid: b.uid, from: f, to: { x: b.x, y: b.y } }] : []; });
    if (moves.length) pushUndo({ kind: 'move', moves });
  }
  const removeUids = (uids: string[]) => { for (const u of uids) { const id = idOfUid(u); if (id !== undefined) removeBlock(id); } };
  const moveUids = (moves: { uid: string; from: XY; to: XY }[], to: boolean) => {
    for (const m of moves) { const id = idOfUid(m.uid), at = to ? m.to : m.from; if (id !== undefined) moveBlock(id, at.x, at.y); }
  };
  /** Undo the last step; false when there is none. */
  function undo(): boolean {
    const u = undoStack.pop();
    if (!u) return false;
    if (u.kind === 'add') {
      const snaps = u.uids.flatMap(uid => { const s = snapOf(uid); return s ? [s] : []; });
      removeUids(u.uids);
      redoStack.push({ kind: 'add', uids: u.uids, snaps });
    } else if (u.kind === 'remove') { for (const s of u.snaps) restore(s); redoStack.push(u); }
    else { moveUids(u.moves, false); redoStack.push(u); }
    setSelection([]);
    stage.redraw();
    return true;
  }
  /** Redo the last undone step; false when there is none. */
  function redo(): boolean {
    const u = redoStack.pop();
    if (!u) return false;
    if (u.kind === 'add') { for (const s of u.snaps ?? []) restore(s); undoStack.push({ kind: 'add', uids: u.uids }); }
    else if (u.kind === 'remove') {
      const snaps = u.snaps.flatMap(s => { const now = snapOf(s.b.uid); return now ? [now] : []; });
      removeUids(u.snaps.map(s => s.b.uid));
      undoStack.push({ kind: 'remove', snaps });
    } else { moveUids(u.moves, true); undoStack.push(u); }
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
  function showPatch(p: Patch, ids?: Record<string, number>): void {
    for (const id of [...model.keys()]) { model.delete(id); v1Blocks.delete(id); stage.removeBlock(id); samples.delete(id); missing.delete(id); }
    undoStack.length = 0; redoStack.length = 0;
    seed = p.seed ?? 1; nextId = 1;
    tempo = typeof p.tempo === 'number' ? p.tempo : undefined;
    if (tempo !== undefined) send([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
    for (const [k, r] of Object.entries(p.refs ?? {})) if (r && typeof r === 'object' && 'provider' in r) refs.set(k, r as SampleRef);
    for (const b of p.blocks) if (BLOCKS_BY_ID.has(b.type)) {
      const fixed = ids && b.id !== undefined ? ids[b.id] : undefined;
      if (fixed !== undefined) nextId = fixed;
      addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id, true);
    }
    if (ids) nextId = Math.max(nextId, ...Object.values(ids).map(i => i + 1));
    connectionOrder = Array.isArray(p.connectionOrder) ? [...p.connectionOrder] : [];
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
  // Unsaved changes are counted from what was opened: a link, a v1 composition or the demo. Work restored from the last
  // visit counts from where it was last saved (or, never saved, as unsaved).
  if (start.id || params.has('c') || params.has('v1') || params.has('demo') || start.patch === demo) setBaseline();
  else try { baseline = localStorage.getItem(BASELINE_KEY) ?? ''; } catch { /* private mode */ }
  {
    const title = params.get('t') ?? start.title ?? '';
    if (title) scene.PatchesPanel.setTitle(title);
    // This browser's own link (v1 App.SessionId): COPY LINK, or UPDATE LINK once the patch changes.
    if (start.id && App.SessionId && !embedId) shareLink = { url: `${location.origin}${location.pathname}?c=${start.id}${title ? `&t=${encodeURIComponent(title)}` : ''}`, owned: true, at: loadSession().dirty ? '' : contentOf(toPatch()) };
    // From the plugin's CREATE SHARE LINK: the patch arrives in the address (`?c=p…&share=1`) and Patches opens on SAVE,
    // one click from its link. The flag is dropped so a reload doesn't open it again.
    if (params.has('share') && !juce && !embedId) {
      params.delete('share');
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
      requestAnimationFrame(() => scene.PatchesPanel.OpenPanel(0));
    }
  }
  app.renderer.on('resize', () => { stage.resize(); uiSync = true; });
  app.ticker.add(() => {
    if (scene.update(performance.now())) stage.redraw();
    stage.update();
  });

  // ---- plugin samples: shown from the processor's reports (the UI never holds the audio there) ----
  interface PluginSampleInfo { id: number; loading: boolean; missing: boolean; duration?: number; sampleRate?: number; preview?: number[];
    params?: Record<string, unknown>; ref?: SampleRef; track?: string }
  function applyPluginSample(s: PluginSampleInfo): void {
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
      def.params.forEach((q, i) => { const v = b.params[q.key]; if (typeof v === 'number' || typeof v === 'boolean') commands.push({ type: CommandType.SetParam, id, param: i, value: Number(v) }); });
    }
    return [...commands, ...relinks({ connectionOrder }, uidToId())];
  }
  const probe = { started: false, snapshots: 0, rms: 0, particles: 0, connections: [] as number[], gateOns: 0, hits: 0, beams: 0 };
  (window as unknown as { __bd_probe: unknown }).__bd_probe = {
    get state() { return { ...probe, blocks: stage.allBlocks(), patch: toPatch() }; },
    /** Laser beams drawn now (a beam through a Prism is several, CHG-0015). */
    get beams() { return probe.beams; },
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
        }
        let peak = 0; for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
        return { hash: hex(hashStereo(hashAudio(l), hashAudio(r))), peak };
      } finally { e.dispose(); }
    },
    /** Sample state per block (tests): loaded, or missing with its reference. */
    get samples() { return [...model].filter(([, b]) => BLOCKS_BY_ID.get(b.type)?.params.some(q => q.key === 'track')).map(([id, b]) => ({ id, uid: b.uid, type: b.type, track: b.params.track, loaded: samples.has(id), frames: samples.get(id)?.length ?? 0 })); },
  };
  const overlay = document.getElementById('start')!;
  const onSnapshot = (s: Snapshot) => {
    probe.snapshots++; probe.rms = s.rms; probe.particles = s.particles.length / 3; probe.beams = s.beams.length / 4;
    // v1 Settings › dB Meter (Tone.Meter on the master output, smoothed 0.8): level in dB from the snapshot RMS.
    scene.setLevelDb(20 * Math.log10(Math.max(s.rms, 1e-5)));
    for (const e of s.events) { if (e.type === 4) probe.gateOns++; if (e.type === 1) probe.hits++; }
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
    stage.setPowered(s.powered);
    stage.setBeams(s.beams);
    stage.setParticles(s.particles);
    scene.setPlayheads(s.playheads ?? new Float32Array(0));
    setMonitors(s.monitors ?? new Float32Array(0));
  };
  if (juce) {
    overlay.remove();
    send = cmds => juce.emitEvent('bd_commands', { commands: cmds });
    juce.addEventListener('bd_patch', (e: { patch: string; ids?: Record<string, number> }) => {
      const p = JSON.parse(e.patch) as Patch & { automation?: { slot: number; block: string; param: string; cc?: number }[] };
      showPatch(p, e.ids);
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
      juce.emitEvent('bd_ready', { blocks: stage.allBlocks().length });
    });
    // Plugin samples (CHG-0004 3.6): the processor loads them natively and reports what to show.
    // Dust moves (host automation, MIDI CC; owner, Ableton, 2026-11-12): the block takes the value, and its options
    // panel, if open, shows it at once. The engine has it already (the processor set it).
    juce.addEventListener('bd_paramValues', (e: { values: { id: number; param: string; value: number }[] }) => {
      const open = scene.OptionsPanel.Scale > 0 ? scene.OptionsPanel.SelectedBlock : null;
      let refresh = false;
      for (const u of e.values ?? []) {
        const m = model.get(u.id), b = v1Blocks.get(u.id);
        if (!m || !b) continue;
        m.params[u.param] = u.value; b.Params[u.param] = u.value;
        if (open === b) refresh = true;
      }
      // Not while the user is dragging one of its sliders or handles (v1 marks them Selected until mouse up).
      const dragging = ((scene.OptionsPanel as any).Options ?? []).some((o: any) => (o.Type === 'slider' && o.Selected) || o.Handles?.some((h: any) => h.Selected));
      if (refresh && !dragging) (open as V1Block).RefreshOptionsPanel();
    });
    juce.addEventListener('bd_ccLearned', (e: { slot: number; cc: number }) => { ccBySlot.set(e.slot, e.cc); });
    juce.addEventListener('bd_sampleInfo', (s: PluginSampleInfo) => applyPluginSample(s));
    // A file dropped on the plugin editor (CHG-0004 3.7): which sampler is under it, or a new Sample there.
    juce.addEventListener('bd_dropAt', (d: { x: number; y: number; token: number }) => {
      const r = app.canvas.getBoundingClientRect(), x = d.x - r.left, y = d.y - r.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) { const [gx, gy] = stage.cssToGrid(x, y); id = addBlock('source.sample', Math.round(gx), Math.round(gy), {}); }
      juce.emitEvent('bd_dropTarget', { token: d.token, id });
    });
    juce.addEventListener('bd_snapshot', (e: { particles: number[]; connections: number[]; powered: number[]; beams: number[]; playheads?: number[]; monitors?: number[] }) =>
      onSnapshot({ type: 'snapshot', frame: 0, rms: 0, events: [], particles: new Float32Array(e.particles),
        connections: new Uint32Array(e.connections), powered: new Uint32Array(e.powered), beams: new Float32Array(e.beams ?? []), playheads: new Float32Array(e.playheads ?? []), monitors: new Float32Array(e.monitors ?? []) }));
    juce.emitEvent('bd_hello', {});
    juce.emitEvent('bd_samplesHello', {});
    send([{ type: CommandType.WorldPower, id: 0, value: 1 }]);  // a reopened editor shows the switch on: so is the world
  }
  // The start button is v1's Splash, drawn by the scene (owner, 2026-11-11); #start is a clear layer over it that takes
  // the click (an AudioContext must start in one) and holds input back until the intro has shown the stage, as v1 did.
  // Automated browsers skip the intro (their screenshots expect the stage) unless the URL asks for it (`splash=1`).
  const splash = !juce && !embedId && (!navigator.webdriver || params.get('splash') === '1');
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
  async function begin(): Promise<void> {
    begun = true;
    let shown = !splash, ready = false;
    const reveal = () => { if (shown && ready) overlay.remove(); };
    if (splash) { scene.startSplash(() => { shown = true; reveal(); }); stage.redraw(); }
    if (!audio) setAudioSession('playback');  // before the context exists, or iOS's silent switch mutes it
    const ctx = startCtx = audio?.ctx ?? new AudioContext({ latencyHint: 'interactive' });
    const running = new Promise<void>(res => {
      const check = () => { if (ctx.state === 'running') { ctx.removeEventListener('statechange', check); res(); } };
      ctx.addEventListener('statechange', check); check();
    });
    void ctx.resume().catch(() => {});  // in the press: a mouse press is allowed to start audio
    App.Audio.sampleRate = ctx.sampleRate;
    engine = EngineNode.build(ctx, await (audio?.module ?? EngineNode.prepare(ctx)), { seed, commands: engineCommands() });
    engine.onSnapshot(onSnapshot);
    for (const [id, buf] of samples) if (model.has(id)) engine.sendSample(id, buf);
    if ([...model.values()].some(b => needsInput(b.type))) void engine.connectMicrophone();
    await running;
    probe.started = true;
    ready = true; reveal();
  }

  // ---- input: v1 MainScene order (UI first, then blocks, then stage drag) ----
  const dpr = () => stage.metrics.dpr;
  let drag: { id: number; grabX: number; grabY: number; moved: boolean; fresh?: boolean } | null = null;
  /** Where every block was when the drag began: Undo puts blocks dragged to the trash back there. */
  let dragFrom = new Map<number, { x: number; y: number }>();
  let pointerIsDown = false;
  /** The press that ended (or is) a placement: its release goes nowhere else. */
  let swallowUp = false;
  const v1At = (cssX: number, cssY: number) => { const hit = stage.hitTest(cssX, cssY); return hit ? v1Blocks.get(hit.id) ?? null : null; };
  /** `fresh`: the block was just made (menu, Alt-copy): its add step covers where it is put, so no move step. */
  function startDrag(id: number, grabX: number, grabY: number, fresh = false): void {
    drag = { id, grabX, grabY, moved: false, fresh };
    dragFrom = new Map([...model].map(([i, b]) => [i, { x: b.x, y: b.y }]));
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
  function setSelection(ids: Iterable<number>): void { selection.clear(); for (const id of ids) if (model.has(id)) selection.add(id); stage.redraw(); }
  const grouped = () => !!drag && selection.has(drag.id) && selection.size > 1;
  function showBox(): void {
    stage.selectBox = box && { x0: box.x0 * dpr(), y0: box.y0 * dpr(), x1: box.x1 * dpr(), y1: box.y1 * dpr() };
    stage.redraw();
  }
  function finishBox(): void {
    if (!box) return;
    const [ax, ay] = stage.cssToGrid(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1));
    const [bx, by] = stage.cssToGrid(Math.max(box.x0, box.x1), Math.max(box.y0, box.y1));
    const inside = [...model.entries()].filter(([, b]) => b.x >= ax && b.x <= bx && b.y >= ay && b.y <= by).map(([id]) => id);
    setSelection(box.add ? [...selection, ...inside] : inside);
    box = null; showBox();
  }
  /** Copies of the selected blocks (same params and audio), offset by (dx, dy); returns the copies' ids by original. */
  function copyBlocks(ids: number[], dx: number, dy: number): Map<number, number> {
    const made = new Map<number, number>();
    for (const id of ids) {
      const b = model.get(id); if (!b) continue;
      const copy = addBlock(b.type, b.x + dx, b.y + dy, structuredClone(b.params));
      const buf = samples.get(id);
      if (buf && b.type !== 'source.sample-gen') useBuffer(copy, buf, 'keep');
      made.set(id, copy);
    }
    return made;
  }
  (window as unknown as { __bd_selection?: unknown }).__bd_selection = () => [...selection];

  // ---- multi-touch (CHG-0005 task 8, owner): the first finger is v1's one pointer (menus, panels, selecting, dragging
  // the stage). Each further finger takes what it lands on: a block (dragged by that finger, powered while held, as
  // v1's pressed block), or a slider of the open options panel. A second finger while the first drags the stage
  // turns it into a pinch: zoom about the fingers' midpoint, which stays put, and pan with it. ----
  type Extra = { kind: 'block'; id: number; grabX: number; grabY: number; from: XY } | { kind: 'slider'; index: number } | { kind: 'pinch' } | { kind: 'idle' };
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
  function extraDown(e: PointerEvent): void {
    const x = e.offsetX, y = e.offsetY;
    if (pinch || placing) { extras.set(e.pointerId, { kind: 'idle' }); return; }
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
    if (t.kind === 'block') {
      stage.held.delete(t.id);
      if (model.has(t.id)) { send([{ type: CommandType.Press, id: t.id, value: 0 }]); recordMove([t.id], new Map([[t.id, t.from]])); }
    }
    stage.redraw();
  }
  /** Tests: what each finger is doing. */
  (window as unknown as { __bd_touch?: unknown }).__bd_touch = () => ({ primaryId, primaryRole, extras: [...extras.entries()], pinch: !!pinch });

  if (!embedId) app.canvas.addEventListener('pointerdown', e => {
    app.canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (primaryId !== null && e.pointerId !== primaryId) { if (e.pointerType === 'touch') extraDown(e); return; }
    primaryId = e.pointerId; primaryRole = null;
    lastPointerType = e.pointerType; lastPointer = (([x, y]) => ({ x, y }))(stage.cssToGrid(e.offsetX, e.offsetY));
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
    if (touchAt.has(e.pointerId)) touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    const extra = extras.get(e.pointerId);
    if (extra) { extraMove(e, extra); return; }
    if (primaryId !== null && e.pointerId !== primaryId) return;
    if (pinch && (pinch.a === e.pointerId || pinch.b === e.pointerId)) { movePinch(); stage.redraw(); return; }
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
      const ids = [...selection], made = copyBlocks(ids, 0, 0), first = made.get(drag.id);
      pushUndo({ kind: 'add', uids: uidsOf(made.values()) });
      send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
      const v = v1Blocks.get(drag.id); if (v) v.IsPressed = false;
      stage.held.clear();
      if (first !== undefined) {
        const grab = { x: drag.grabX, y: drag.grabY };
        setSelection(made.values());
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
        if (grouped()) for (const id of selection) { const o = model.get(id); if (o) moveBlock(id, o.x + dx, o.y + dy); }
        else moveBlock(drag.id, x, y);
        drag.moved = blockMoved = true;
      }
    }  // stage panning: v1's MainSceneDragger inside the scene (setDrag)
    scene.pointerMove(e.offsetX * dpr(), e.offsetY * dpr(), pointerIsDown, () => v1At(e.offsetX, e.offsetY), blockMoved);
    stage.redraw();
  });
  const pointerEnd = (e: PointerEvent) => {
    touchAt.delete(e.pointerId);
    if (extras.has(e.pointerId)) { extraUp(e.pointerId); return true; }
    if (primaryId !== null && e.pointerId !== primaryId) return true;
    if (pinch && (pinch.a === e.pointerId || pinch.b === e.pointerId)) endPinch();
    primaryId = null;
    if (primaryRole === 'gone') { primaryRole = null; pointerIsDown = false; scene.pointerUp(-1, -1, true); stage.redraw(); return true; }
    primaryRole = null;
    return false;
  };
  if (!embedId) app.canvas.addEventListener('pointercancel', e => {
    if (longPress) { clearTimeout(longPress); longPress = null; }
    if (pointerEnd(e)) return;
    pointerIsDown = false; swallowUp = false; downAt = null;
    if (box) { box = null; showBox(); }
    stage.held.clear();
    scene.pointerUp(-1, -1, true);
    if (drag) send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
    drag = null; stage.pressed = null;
    stage.redraw();
  });
  if (!embedId) app.canvas.addEventListener('pointerup', e => {
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
    if (result === 'delete' && drag) deleteBlocks(wasGroup ? [...selection] : [drag.id], dragFrom);
    else if (drag) {
      send([{ type: CommandType.Press, id: drag.id, value: 0 }]);  // v1 MouseUp → RemovePower
      if (moved && !drag.fresh) recordMove(wasGroup ? [...selection] : [drag.id], dragFrom);
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
    stageEl.addEventListener('gesturestart', e => { if (touchAt.size || pointerIsDown) return; const g = e as GestureEv, at = gestureAt(g); gesture = { z0: stage.zoom, w: stageAt(at.x, at.y) }; });
    stageEl.addEventListener('gesturechange', e => { if (!gesture) return; const g = e as GestureEv, at = gestureAt(g); zoomAbout(at.x, at.y, gesture.z0 * g.scale, gesture.w); });
    stageEl.addEventListener('gestureend', () => { gesture = null; });
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

  // ---- Dust 1–8 (plugin only, PLUGIN-0003): right-click an options-panel slider to map a host parameter to it ----
  app.canvas.addEventListener('contextmenu', e => {
    if (!juce) return;
    const hit = scene.sliderAt(e.offsetX * dpr(), e.offsetY * dpr());
    if (!hit) return;
    e.preventDefault();
    document.getElementById('dust-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'dust-menu';
    const c = theme.colors;
    menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:10;background:${c[2]};color:${c[theme.roles.txt]};` +
      `font:400 13px Dosis, sans-serif;letter-spacing:.05em;padding:6px 0;min-width:150px;box-shadow:0 4px 16px rgb(0 0 0/.4)`;
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
  const note = (blockType: number, n: number, down: boolean, velocity = 1) =>
    send([{ type: down ? CommandType.NoteOn : CommandType.NoteOff, id: 0, blockType, param: n, value: velocity }]);
  // Web MIDI → each MIDI Input block through its own MPE/MIDI parser (PLUGIN-0004): its device choice here, its
  // channel filter and expression mapping in the engine.
  const parsers = new Map<number, MpeParser>();
  let midiDevices: MidiDevice[] = [];
  attachNoteInputs({
    key: (n, down) => note(keyboardType, n, down),
    // Plugin: with a Computer Keyboard in the patch its keys are BlokDust's while the editor has the keys (the DAW's
    // shortcuts would fire too); without one they go on to the DAW (Logic's Musical Typing → MIDI Input).
    captureKeys: () => !!juce && [...model.values()].some(b => b.type === 'input.computer-keyboard'),
    // Plugin: the editor says when its window loses the keys (clicking into the DAW); the web view may not blur (Ableton).
    onReleaseAll: release => { juce?.addEventListener('bd_keysLost', () => release()); },
    midi: (status, d1, d2, device) => {
      const cmds: Command[] = [];
      for (const [id, b] of model) {
        if (b.type !== 'input.midi-controller') continue;
        const want = typeof b.params.device === 'string' ? b.params.device : '';
        if (want && want !== device.name) continue;
        let p = parsers.get(id);
        if (!p) { p = new MpeParser(id, midiType); parsers.set(id, p); }
        p.setSettings({ mpe: !!b.params.mpe, memberBendRange: typeof b.params.bendRange === 'number' ? b.params.bendRange : 48 });
        p.message(status, d1, d2, -1, cmds);
      }
      for (const id of parsers.keys()) if (!model.has(id)) parsers.delete(id);
      if (cmds.length) send(cmds);
    },
    devices: list => { midiDevices = list; scene.setMidiDevices?.(list); },
  });
  (window as unknown as { __bd_midiDevices: () => MidiDevice[] }).__bd_midiDevices = () => midiDevices;
  // v1 keyboard shortcut: delete the selected block. Esc drops an Insert being placed; Cmd/Ctrl+Z takes the last
  // Insert out again (owner, 2026-11-10: one step).
  window.addEventListener('keydown', e => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      if (e.key === 'Escape' && placing) { e.preventDefault(); endPlacing(true); return; }
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
      if (e.key === 'Escape' && selection.size) { e.preventDefault(); setSelection([]); return; }
      if (mod && !e.shiftKey && k === 'a') { e.preventDefault(); setSelection(model.keys()); scene.OptionsPanel.Close(); return; }
      if (mod && !e.shiftKey && k === 'd' && selection.size) {
        e.preventDefault();
        const made = copyBlocks([...selection], 2, 2);
        pushUndo({ kind: 'add', uids: uidsOf(made.values()) });
        setSelection(made.values());
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.size) {
        e.preventDefault();
        deleteBlocks([...selection]);
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
  link.style.cssText = 'position:fixed;right:10px;bottom:8px;z-index:4;color:#fff4d6;opacity:.75;font:400 11px Dosis, system-ui, sans-serif;letter-spacing:.1em;text-decoration:none';
  document.body.appendChild(link);
}

void main();
