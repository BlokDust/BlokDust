// The slice of BlokDust v1's framework and global `App` that its UI classes use (CHG-0002 1.8–1.10). The UI code
// itself is ported verbatim into ./ported (pnpm bd v1 port-ui); this file supplies what it expects: etch's
// DisplayObject, minerva Point/Size, Utils helpers, tween.js and the App fields, kept in step with the v2 stage by
// scene.ts. Values here mirror v1 (Config, palettes, metrics) so the ported draw calls produce v1's pixels.
import l10n from './ported/data/l10n.json';
import menu from './ported/data/menu.json';
import config from './ported/data/config.json';
import { MAX_ASPECT } from '../stage/metrics.ts';

// v1 lib/extensions (MIT): the helpers the ported UI calls, defined non-enumerable so they never leak into for…in.
const def = (o: object, k: string, v: unknown) => { if (!(k in o)) Object.defineProperty(o, k, { value: v, writable: true, configurable: true }); };
def(String, 'format', function (this: unknown, s: string, ...a: unknown[]) { a.forEach((v, i) => { s = s.replace(new RegExp(`\\{${i}\\}`, 'gm'), String(v)); }); return s; });
def(Array.prototype, 'remove', function (this: unknown[], item: unknown) { const i = this.indexOf(item); if (i > -1) this.splice(i, 1); });
def(Array.prototype, 'contains', function (this: unknown[], v: unknown) { return this.indexOf(v) !== -1; });
def(Array.prototype, 'last', function (this: unknown[]) { return this[this.length - 1]; });
const M = Math as any;
def(M, 'TAU', 2 * Math.PI);
def(M, 'clamp', (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi));
def(M, 'constrain', (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi));
def(M, 'lerp', (a: number, b: number, t: number) => a + (b - a) * t);
def(M, 'map', (v: number, a1: number, b1: number, a2: number, b2: number) => a2 + (b2 - a2) * ((v - a1) / (b1 - a1)));
def(M, 'normalise', (v: number, lo: number, hi: number) => (v - lo) / (hi - lo));
def(M, 'roundToDecimalPlace', (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d);
def(M, 'sq', (n: number) => n * n);
def(M, 'distanceBetween', (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
def(M, 'degreesToRadians', (d: number) => M.TAU * (d / 360));
def(M, 'radiansToDegrees', (r: number) => (360 * r) / M.TAU);

export class Point {
  constructor(public x = 0, public y = 0) {}
  static isEqual(a: Point, b: Point) { return a.x === b.x && a.y === b.y; }
  Clone() { return new Point(this.x, this.y); }
}
export class Size { constructor(public width = 0, public height = 0) {} }
export type IDisplayContext = any;
export const IDisplayContext: any = null;  // v1 imports it as a value (namespace alias)

export const Dimensions = {
  fitRect(w1: number, h1: number, w2: number, h2: number) {
    const r1 = h1 / w1, r2 = h2 / w2;
    let w = 0, h = 0, s;
    if (r1 < r2) { s = w2 / w1; w = w1 * s; h = h1 * s; }
    if (r2 < r1) { s = h2 / h1; w = w1 * s; h = h1 * s; }
    return new Size(Math.floor(w), Math.floor(h));
  },
  hitRect(x: number, y: number, w: number, h: number, mx: number, my: number) { return mx > x && mx < x + w && my > y && my < y + h; },
};

export const Utils = {
  Device: { getPixelRatio: () => window.devicePixelRatio || 1, isTouch: () => false },
  Measurements: { Dimensions },
  Events: { Debounce: (fn: (...a: any[]) => void, ms: number) => { let t: any; return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; } },
  Urls: { getQuerystringParameterFromString: (_k: string, _s: string) => '' },
};

/** etch.drawing.DisplayObject: Init/Setup/Resize lifecycle, Ctx from the scene it draws to. */
export class DisplayObject {
  DrawTo: any; DrawFrom: any;
  IsInitialised = false; IsPaused = false; IsVisible = true; LastVisualTick = 0; FrameCount = -1;
  DisplayList = { items: [] as any[], Add(o: any) { this.items.push(o); }, get Count() { return this.items.length; }, GetValueAt(i: number) { return this.items[i]; } };
  Init(drawTo: any, drawFrom?: any) { this.DrawTo = drawTo; if (drawFrom) this.DrawFrom = drawFrom; this.IsInitialised = true; this.Setup(); this.Resize(); }
  get Ctx(): CanvasRenderingContext2D { return this.DrawTo.Ctx; }
  Setup() {} Update() {} Draw() {} Resize() {} Dispose() {}
  IsFirstFrame() { return this.FrameCount === 0; }
  Play() { this.IsPaused = false; } Pause() { this.IsPaused = true; }
  Show() { this.IsVisible = true; } Hide() { this.IsVisible = false; }
}

// ---- tween.js (sole/tween.js r14 API subset v1 uses), driven by the scene's clock ----
type Ease = (k: number) => number;
const Easing = {
  Linear: { None: (k: number) => k },
  Exponential: { InOut: (k: number) => (k === 0 ? 0 : k === 1 ? 1 : (k *= 2) < 1 ? 0.5 * 1024 ** (k - 1) : 0.5 * (-(2 ** (-10 * (k - 1))) + 2)) },
  Quintic: { InOut: (k: number) => ((k *= 2) < 1 ? 0.5 * k * k * k * k * k : 0.5 * ((k -= 2) * k * k * k * k + 2)) },
  Quadratic: { InOut: (k: number) => ((k *= 2) < 1 ? 0.5 * k * k : -0.5 * (--k * (k - 2) - 1)) },
  Cubic: { InOut: (k: number) => ((k *= 2) < 1 ? 0.5 * k * k * k : 0.5 * ((k -= 2) * k * k + 2)) },
};
const tweens = new Set<Tween>();
class Tween {
  private from: Record<string, number>; private to_: Record<string, number> = {}; private dur = 1000; private delay_ = 0;
  private ease: Ease = Easing.Linear.None; private start_ = 0; private onUpdate_?: (this: any, k: number) => void; private onComplete_?: () => void;
  constructor(private obj: Record<string, number>) { this.from = { ...obj }; }
  to(props: Record<string, number>, ms: number) { this.to_ = props; this.dur = ms; return this; }
  easing(e: Ease) { this.ease = e; return this; }
  delay(ms: number) { this.delay_ = ms; return this; }
  onUpdate(f: (this: any, k: number) => void) { this.onUpdate_ = f; return this; }
  onComplete(f: () => void) { this.onComplete_ = f; return this; }
  start(_t?: number) { this.start_ = TWEEN.now() + this.delay_; this.from = { ...this.obj }; tweens.add(this); return this; }
  stop() { tweens.delete(this); return this; }
  update(t: number) {
    if (t < this.start_) return true;
    const k = this.dur > 0 ? Math.min(1, (t - this.start_) / this.dur) : 1, e = this.ease(k);
    for (const key of Object.keys(this.to_)) this.obj[key] = this.from[key] + (this.to_[key] - this.from[key]) * e;
    this.onUpdate_?.call(this.obj, e);
    if (k >= 1) { this.onComplete_?.(); return false; }
    return true;
  }
}
export const TWEEN = {
  Tween, Easing, clock: 0,
  now() { return TWEEN.clock; },
  update(t: number) { TWEEN.clock = t; for (const tw of [...tweens]) if (!tw.update(t)) tweens.delete(tw); return tweens.size > 0; },
  remove(t: Tween) { tweens.delete(t); }, removeAll() { tweens.clear(); },
  /** The running tweens (tween.js `getAll`): the scene stops the splash's to skip its intro. */
  getAll(): Tween[] { return [...tweens]; },
  get active() { return tweens.size > 0; },
};
(window as any).TWEEN = TWEEN;

// ---- nullstone.Event (v1's event type; Splash raises AnimationFinished with it) ----
class NullstoneEvent<T> {
  private handlers: { f: (s: unknown, e: T) => void; ctx: unknown }[] = [];
  on(f: (s: unknown, e: T) => void, ctx?: unknown) { this.handlers.push({ f, ctx }); }
  off(f: (s: unknown, e: T) => void) { this.handlers = this.handlers.filter(h => h.f !== f); }
  raise(sender: unknown, e: T) { for (const h of [...this.handlers]) h.f.call(h.ctx, sender, e); }
}
(window as any).nullstone = { Event: NullstoneEvent };

/** v1's global App, as far as the UI reads it. scene.ts keeps the live fields (sizes, palette, theme) current. */
export const App: any = {
  L10n: l10n, L: l10n,
  Config: config,  // v1 config.json, ported verbatim
  BlockCreator: { MenuJson: menu },
  Palette: [] as string[],
  Unit: 1, GridSize: 15, ScaledUnit: 1, ScaledGridSize: 15, Width: 0, Height: 0, ZoomLevel: 1,
  /** Widest view shape that sizes the UI from its width (stage/metrics.ts; Metrics.ts, rewritten by bd v1 port-ui). */
  MaxAspect: MAX_ASPECT,
  DragOffset: new Point(), ScaledDragOffset: new Point(),
  /** Running inside the plugin's WebView (labels and options differ: CHG-0004). */
  IsPlugin: false,
  /** Settings on a phone (owner, 2026-11-18): the close cross sits where the header's settings icon is (its centre);
   * the page is centred and reaches 20 units short of the cross (v1 puts the cross 20 units past the page's right);
   * the tabs share the width from the left edge to there; each row is taller (v1: 4/7 of the width, 48-unit rows).
   * Desktop keeps v1's. */
  get SettingsPhone(): boolean { return this.Metrics?.Device === 0; },
  SettingsCrossX(w: number): number {
    const dd = this.MainScene?.Header?.DropDownHeight;
    return typeof dd === 'number' && dd > 0 ? w - dd * 0.5 * this.Unit + 30 * this.Unit : w - 40 * this.Unit;
  },
  SettingsMenuWidth(w: number): number { return this.SettingsPhone ? 2 * (this.SettingsCrossX(w) - 20 * this.Unit - w * 0.5) : (w / 7) * 4; },
  SettingsTabsWidth(w: number): number { return this.SettingsCrossX(w) - 20 * this.Unit; },
  get SettingsRow(): number { return this.SettingsPhone ? 62 : 48; },
  /** Links can't open here (a plugin inside another iPad app): scene.ts hideLinks. */
  NoLinks: false,
  Blocks: [] as any[], SubCanvas: [] as HTMLCanvasElement[], CompositionId: null as string | null, SessionId: null as string | null,
  FillColor(ctx: CanvasRenderingContext2D, c: string) { ctx.fillStyle = c; },
  StrokeColor(ctx: CanvasRenderingContext2D, c: string) { ctx.strokeStyle = c; },
  FillRGBA(ctx: CanvasRenderingContext2D, r: number, g: number, b: number, a: number) { ctx.fillStyle = `rgba(${r},${g},${b},${a})`; },
  ColorManager: { ColorString: (c: string) => c },
  ThemeManager: { Txt: 16, MenuOrder: [17, 18, 19, 20, 21], OptionsOrder: [22, 23, 24, 25, 26], CurrentThemeNo: 0, CurrentTheme: { Name: '' }, Themes: [], LoadTheme: (_n: number) => {} },
  Audio: {
    // v1 reads its master volume back through Tone (20·log10 of 2^(dB/6)): −10 dB set at start-up reads −10.0343, which
    // is what v1's Settings panel captured when it was built. Setting it goes to the engine (scene.ts wires onMaster).
    Master: { volume: { _v: 20 * Math.log10(2 ** (-10 / 6)), onMaster: (_db: number) => {}, get value() { return this._v; }, set value(db: number) { this._v = db; this.onMaster(db); } } },
    sampleRate: 48000,  // v1 App.Audio.sampleRate (SampleGen renders at it); the app sets the context's rate
    Level: -100, Peak: -100, Monitor() {}, MonitorReset() { App.Audio.Peak = -100; },
    NoteIndex: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  },
  FocusManager: { IsActive: true },
  /** v1's input events: the Splash subscribes in Setup; v2 calls the splash itself (scene.ts), so these never fire. */
  PointerInputManager: { MouseDown: new NullstoneEvent(), TouchEnd: new NullstoneEvent(), TouchMove: new NullstoneEvent(),
    /** v1: the last press was a touch (the tour gives its touch steps); set by the app's pointer handler. */
    TouchAssumed: typeof matchMedia === 'function' && matchMedia('(hover: none)').matches },
  IsLoadingComposition: false,
  // v1 AddressBarManager.UpdateURL: show a saved composition's link in the address bar. Phase 1 patch tokens (`?c=p…`,
  // no backend) are too long to be useful there, so those stay out of it.
  AddressBarManager: { UpdateURL: (u: string) => { if (!/[?&]c=p/.test(u)) try { history.pushState({ html: 'Reset' }, 'BlokDust', u); } catch { /* other origin */ } } },
  CommandManager: { ExecuteCommand: (_c: string, _a?: unknown) => {} },
  Canvas: { Ctx: null as CanvasRenderingContext2D | null, Style: { cursor: 'default' } },
};

/**
 * Plugin-only block labels (CHG-0004 3.3, owner 2026-11-07): in a DAW, v1's Microphone is the track's (or side-chain)
 * audio and the MIDI Controller is the DAW's MIDI. Same block types underneath, so patches move between web and plugin
 * unchanged; the website keeps v1's names.
 */
export const PLUGIN_LABELS: Readonly<Record<string, { name: string; description: string }>> = {
  Microphone: { name: 'Audio Input', description: "The audio coming into BlokDust from your DAW track (or its side-chain). Connect effects to it." },
  MIDIController: { name: 'MIDI Input', description: "Trigger sources with your DAW's MIDI: notes, plus per-note bend, pressure and slide with MPE." },
};
/** Relabel menus, tooltips and l10n for the plugin (call once at start-up, before blocks are created). */
export function applyHostLabels(isPlugin: boolean): void {
  App.IsPlugin = isPlugin;
  if (!isPlugin) return;
  for (const cat of (App.BlockCreator.MenuJson as any).categories ?? []) for (const item of cat.items ?? []) {
    const l = PLUGIN_LABELS[item.id];
    if (l) { item.name = l.name; item.description = l.description; }
  }
  for (const cat of Object.values(App.L10n.Blocks as Record<string, any>)) for (const [k, v] of Object.entries(cat?.Blocks ?? {}) as [string, any][]) {
    const l = PLUGIN_LABELS[k];
    if (l) { v.name = l.name; v.description = l.description; }
  }
}
