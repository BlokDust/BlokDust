// The slice of v1's framework and global `App` its ported UI (./ported) uses (CHG-0002 1.8–1.10):
// etch's DisplayObject, minerva Point/Size, Utils, tween.js and App, set to v1's values.
import l10n from './ported/data/l10n.json';
import menu from './ported/data/menu.json';
import config from './ported/data/config.json';
import { MAX_ASPECT } from '../stage/metrics.ts';
import type { V1AppGlobal } from './appGlobal.ts';
import type { V1Scene } from './scene/v1Scene.ts';

/** v1 Device.mobile (not imported: the Device module imports this one). */
const MOBILE = 0;

/** Define a v1 lib/extensions helper (MIT), non-enumerable so it never shows in for…in. */
const defineHelper = (target: object, key: string, value: unknown) => {
  if (!(key in target))
    Object.defineProperty(target, key, { value, writable: true, configurable: true });
};
defineHelper(String, 'format', function (this: unknown, text: string, ...args: unknown[]) {
  args.forEach((arg, i) => {
    text = text.replace(new RegExp(`\\{${i}\\}`, 'gm'), String(arg));
  });
  return text;
});
defineHelper(Array.prototype, 'remove', function (this: unknown[], item: unknown) {
  const i = this.indexOf(item);
  if (i > -1) this.splice(i, 1);
});
defineHelper(Array.prototype, 'contains', function (this: unknown[], item: unknown) {
  return this.includes(item);
});
defineHelper(Array.prototype, 'last', function (this: unknown[]) {
  return this[this.length - 1];
});
const TAU = 2 * Math.PI;
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
defineHelper(Math, 'TAU', TAU);
defineHelper(Math, 'clamp', clamp);
defineHelper(Math, 'constrain', clamp);
defineHelper(Math, 'lerp', (a: number, b: number, amount: number) => a + (b - a) * amount);
defineHelper(
  Math,
  'map',
  (value: number, a1: number, b1: number, a2: number, b2: number) =>
    a2 + (b2 - a2) * ((value - a1) / (b1 - a1)),
);
defineHelper(
  Math,
  'normalise',
  (value: number, low: number, high: number) => (value - low) / (high - low),
);
defineHelper(
  Math,
  'roundToDecimalPlace',
  (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places,
);
defineHelper(Math, 'sq', (value: number) => value * value);
defineHelper(Math, 'distanceBetween', (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
);
defineHelper(Math, 'degreesToRadians', (degrees: number) => TAU * (degrees / 360));
defineHelper(Math, 'radiansToDegrees', (radians: number) => (360 * radians) / TAU);

export class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  static isEqual(a: Point, b: Point) {
    return a.x === b.x && a.y === b.y;
  }
  Clone() {
    return new Point(this.x, this.y);
  }
}
export class Size {
  constructor(
    public width = 0,
    public height = 0,
  ) {}
}

/** What a display object draws into: the scene (its context and size). */
export interface DisplayContext {
  Ctx: CanvasRenderingContext2D;
  Width: number;
  Height: number;
}
export type IDisplayContext = DisplayContext;
/** v1 imports it as a value too (a namespace alias). */
export const IDisplayContext: unknown = null;

export const Dimensions = {
  fitRect(width1: number, height1: number, width2: number, height2: number) {
    const ratio1 = height1 / width1,
      ratio2 = height2 / width2;
    let width = 0,
      height = 0,
      scale;
    if (ratio1 < ratio2) {
      scale = width2 / width1;
      width = width1 * scale;
      height = height1 * scale;
    }
    if (ratio2 < ratio1) {
      scale = height2 / height1;
      width = width1 * scale;
      height = height1 * scale;
    }
    return new Size(Math.floor(width), Math.floor(height));
  },
  hitRect(x: number, y: number, width: number, height: number, mx: number, my: number) {
    return mx > x && mx < x + width && my > y && my < y + height;
  },
};

export const Utils = {
  Device: { getPixelRatio: () => window.devicePixelRatio || 1, isTouch: () => false },
  Measurements: { Dimensions },
  Events: {
    Debounce: (callback: (...args: unknown[]) => void, ms: number) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return (...args: unknown[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          callback(...args);
        }, ms);
      };
    },
  },
  Urls: { getQuerystringParameterFromString: (_key: string, _text: string) => '' },
};

/** etch.drawing.DisplayObject: Init/Setup/Resize lifecycle, Ctx from the scene it draws to. */
export class DisplayObject {
  DrawTo!: DisplayContext;
  DrawFrom: unknown;
  IsInitialised = false;
  IsPaused = false;
  IsVisible = true;
  LastVisualTick = 0;
  FrameCount = -1;
  DisplayList = {
    items: [] as unknown[],
    Add(item: unknown) {
      this.items.push(item);
    },
    get Count() {
      return this.items.length;
    },
    GetValueAt(i: number) {
      return this.items[i];
    },
  };
  Init(drawTo: DisplayContext, drawFrom?: unknown) {
    this.DrawTo = drawTo;
    if (drawFrom) this.DrawFrom = drawFrom;
    this.IsInitialised = true;
    this.Setup();
    this.Resize();
  }
  get Ctx(): CanvasRenderingContext2D {
    return this.DrawTo.Ctx;
  }
  Setup() {
    // v1 subclasses override it
  }
  Update() {
    // v1 subclasses override it
  }
  Draw() {
    // v1 subclasses override it
  }
  Resize() {
    // v1 subclasses override it
  }
  Dispose() {
    // v1 subclasses override it
  }
  IsFirstFrame() {
    return this.FrameCount === 0;
  }
  Play() {
    this.IsPaused = false;
  }
  Pause() {
    this.IsPaused = true;
  }
  Show() {
    this.IsVisible = true;
  }
  Hide() {
    this.IsVisible = false;
  }
}

// ---- tween.js (sole/tween.js r14 API subset v1 uses), driven by the scene's clock ----
type Ease = (k: number) => number;
const Easing = {
  Linear: { None: (k: number) => k },
  Exponential: {
    InOut: (k: number) =>
      k === 0
        ? 0
        : k === 1
          ? 1
          : (k *= 2) < 1
            ? 0.5 * 1024 ** (k - 1)
            : 0.5 * (-(2 ** (-10 * (k - 1))) + 2),
  },
  Quintic: {
    InOut: (k: number) =>
      (k *= 2) < 1 ? 0.5 * k * k * k * k * k : 0.5 * ((k -= 2) * k * k * k * k + 2),
  },
  Quadratic: { InOut: (k: number) => ((k *= 2) < 1 ? 0.5 * k * k : -0.5 * (--k * (k - 2) - 1)) },
  Cubic: { InOut: (k: number) => ((k *= 2) < 1 ? 0.5 * k * k * k : 0.5 * ((k -= 2) * k * k + 2)) },
};
type Tweened = Record<string, number>;
const tweens = new Set<Tween>();
class Tween {
  private from: Tweened;
  private target: Tweened = {};
  private duration = 1000;
  private delayMs = 0;
  private ease: Ease = Easing.Linear.None;
  private startTime = 0;
  private updated?: (this: Tweened, k: number) => void;
  private completed?: () => void;
  constructor(private tweened: Tweened) {
    this.from = { ...tweened };
  }
  to(props: Tweened, ms: number) {
    this.target = props;
    this.duration = ms;
    return this;
  }
  easing(ease: Ease) {
    this.ease = ease;
    return this;
  }
  delay(ms: number) {
    this.delayMs = ms;
    return this;
  }
  onUpdate(callback: (this: Tweened, k: number) => void) {
    this.updated = callback;
    return this;
  }
  onComplete(callback: () => void) {
    this.completed = callback;
    return this;
  }
  start(_time?: number) {
    this.startTime = TWEEN.now() + this.delayMs;
    this.from = { ...this.tweened };
    tweens.add(this);
    return this;
  }
  stop() {
    tweens.delete(this);
    return this;
  }
  update(time: number) {
    if (time < this.startTime) return true;
    const k = this.duration > 0 ? Math.min(1, (time - this.startTime) / this.duration) : 1,
      eased = this.ease(k);
    for (const key of Object.keys(this.target))
      this.tweened[key] = this.from[key] + (this.target[key] - this.from[key]) * eased;
    this.updated?.call(this.tweened, eased);
    if (k >= 1) {
      this.completed?.();
      return false;
    }
    return true;
  }
}
export const TWEEN = {
  Tween,
  Easing,
  clock: 0,
  now() {
    return TWEEN.clock;
  },
  update(time: number) {
    TWEEN.clock = time;
    for (const tween of [...tweens]) if (!tween.update(time)) tweens.delete(tween);
    return tweens.size > 0;
  },
  remove(tween: Tween) {
    tweens.delete(tween);
  },
  removeAll() {
    tweens.clear();
  },
  /** The running tweens (tween.js `getAll`): the scene stops the splash's to skip its intro. */
  getAll(): Tween[] {
    return [...tweens];
  },
  get active() {
    return tweens.size > 0;
  },
};

// ---- nullstone.Event (v1's event type; Splash raises AnimationFinished with it) ----
type EventHandler<T> = (sender: unknown, value: T) => void;
export class NullstoneEvent<T> {
  private handlers: { handler: EventHandler<T>; context: unknown }[] = [];
  on(handler: EventHandler<T>, context?: unknown) {
    this.handlers.push({ handler, context });
  }
  off(handler: EventHandler<T>) {
    this.handlers = this.handlers.filter((entry) => entry.handler !== handler);
  }
  raise(sender: unknown, value: T) {
    for (const entry of [...this.handlers]) entry.handler.call(entry.context, sender, value);
  }
}

declare global {
  interface Window {
    TWEEN: typeof TWEEN;
    nullstone: { Event: typeof NullstoneEvent };
  }
}
window.TWEEN = TWEEN;
window.nullstone = { Event: NullstoneEvent };

/** v1's global App as the UI reads it; the scene keeps the live fields (sizes, palette, theme). */
type LateMembers = 'MainScene' | 'Stage' | 'Metrics' | 'AnimationsLayer' | 'BlockSprites';
/** Before the scene is made: MainScene, Metrics and the rest arrive with it. */
type V1AppAtStart = Omit<V1AppGlobal, LateMembers>;
/** −10 dB as v1 read it back through Tone (20·log10 of 2^(dB/6)), as its Settings showed. */
const START_VOLUME_DB = 20 * Math.log10(2 ** (-10 / 6));
/** A Phase 1 patch token link (`?c=p…`). */
const PATCH_TOKEN_LINK = /[?&]c=p/;
const appAtStart: V1AppAtStart = {
  L10n: l10n,
  L: l10n,
  Config: config,
  BlockCreator: { MenuJson: menu },
  Palette: [] as string[],
  Unit: 1,
  GridSize: 15,
  ScaledUnit: 1,
  ScaledGridSize: 15,
  Width: 0,
  Height: 0,
  ZoomLevel: 1,
  /** Widest view shape that sizes the UI from its width (stage/metrics.ts; ported Metrics.ts). */
  MaxAspect: MAX_ASPECT,
  DragOffset: new Point(),
  ScaledDragOffset: new Point(),
  /** Running inside the plugin's WebView (labels and options differ: CHG-0004). */
  IsPlugin: false,
  /** Settings on a phone: cross at the header's settings icon, centred page, taller rows. */
  get SettingsPhone(): boolean {
    return Number((this as Partial<V1AppGlobal>).Metrics?.Device) === MOBILE;
  },
  SettingsCrossX(width: number): number {
    const dropDown = (this as Partial<V1AppGlobal>).MainScene?.Header.DropDownHeight;
    return typeof dropDown === 'number' && dropDown > 0
      ? width - dropDown * 0.5 * this.Unit + 30 * this.Unit
      : width - 40 * this.Unit;
  },
  /** The block menu's drop-down height for its width-based `dropDown`, shrunk past MaxAspect
   * as the unit then follows the height (GarageBand). Views up to MaxAspect keep v1's. */
  MenuDrop(dropDown: number): number {
    return this.Width > 0 && this.Height > 0
      ? dropDown * Math.min(1, (this.Height * this.MaxAspect) / this.Width)
      : dropDown;
  },
  SettingsMenuWidth(width: number): number {
    return this.SettingsPhone
      ? 2 * (this.SettingsCrossX(width) - 20 * this.Unit - width * 0.5)
      : (width / 7) * 4;
  },
  SettingsTabsWidth(width: number): number {
    return this.SettingsCrossX(width) - 20 * this.Unit;
  },
  get SettingsRow(): number {
    return this.SettingsPhone ? 62 : 48;
  },
  /** Links can't open here (a plugin inside another iPad app): about.ts hideLinks. */
  NoLinks: false,
  Blocks: [],
  SubCanvas: [] as HTMLCanvasElement[],
  CompositionId: null as string | null,
  SessionId: null as string | null,
  FillColor(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
  },
  StrokeColor(ctx: CanvasRenderingContext2D, color: string) {
    ctx.strokeStyle = color;
  },
  FillRGBA(ctx: CanvasRenderingContext2D, red: number, green: number, blue: number, alpha: number) {
    ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
  },
  ColorManager: { ColorString: (color: string) => color },
  ThemeManager: {
    Txt: 16,
    MenuOrder: [17, 18, 19, 20, 21],
    OptionsOrder: [22, 23, 24, 25, 26],
    CurrentThemeNo: 0,
    CurrentTheme: { Name: '' },
    Themes: [],
    LoadTheme: (_index: number) => {},
  },
  Audio: {
    // Setting the volume goes to the engine (the scene wires onMaster).
    Master: {
      volume: {
        _v: START_VOLUME_DB,
        onMaster: (_decibels: number) => {},
        get value() {
          return this._v;
        },
        set value(decibels: number) {
          this._v = decibels;
          this.onMaster(decibels);
        },
      },
    },
    sampleRate: 48000, // SampleGen renders at it; the app sets the context's rate
    Level: -100,
    Peak: -100,
    Monitor() {
      // v2 meters the engine's output instead (scene setLevelDb)
    },
    MonitorReset() {
      App.Audio.Peak = -100;
    },
    NoteIndex: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  },
  FocusManager: { IsActive: true },
  /** v1's input events: the Splash subscribes; v2 calls the splash itself, so these never fire. */
  PointerInputManager: {
    MouseDown: new NullstoneEvent(),
    TouchEnd: new NullstoneEvent(),
    TouchMove: new NullstoneEvent(),
    /** The last press was a touch (the tour gives its touch steps); set by the pointer handler. */
    TouchAssumed: typeof matchMedia === 'function' && matchMedia('(hover: none)').matches,
  },
  IsLoadingComposition: false,
  // A saved composition's link in the address bar; Phase 1 patch tokens are too long for it.
  AddressBarManager: {
    UpdateURL: (url: string) => {
      if (!PATCH_TOKEN_LINK.test(url))
        try {
          history.pushState({ html: 'Reset' }, 'BlokDust', url);
        } catch {
          // another origin: the address bar stays as it is
        }
    },
  },
  CommandManager: { ExecuteCommand: (_command: string, _args?: unknown) => {} },
  Canvas: { Ctx: null as CanvasRenderingContext2D | null, Style: { cursor: 'default' } },
};
export const App = appAtStart as V1AppGlobal;
/** The scene, or undefined before it is made (blocks can be loaded first). */
export const sceneIfMade = (): V1Scene | undefined => (App as Partial<V1AppGlobal>).MainScene;

/** Plugin-only block labels (CHG-0004 3.3): the track's audio and the DAW's MIDI. Same block
 * types underneath, so patches move between web and plugin unchanged; the website keeps v1's. */
export const PLUGIN_LABELS: Readonly<
  Partial<Record<string, { name: string; description: string }>>
> = {
  Microphone: {
    name: 'Audio Input',
    description:
      'The audio coming into BlokDust from your DAW track (or its side-chain). Connect effects to it.',
  },
  MIDIController: {
    name: 'MIDI Input',
    description:
      "Trigger sources with your DAW's MIDI: notes, plus per-note bend, pressure and slide with MPE.",
  },
};
/** Relabel menus, tooltips and l10n for the plugin (at start-up, before blocks are made). */
export function applyHostLabels(isPlugin: boolean): void {
  App.IsPlugin = isPlugin;
  if (!isPlugin) return;
  for (const category of App.BlockCreator.MenuJson.categories)
    for (const item of category.items) {
      const label = PLUGIN_LABELS[item.id];
      if (label) {
        item.name = label.name;
        item.description = label.description;
      }
    }
  for (const category of Object.values(App.L10n.Blocks)) {
    const blocks: Record<string, { name: string; description: string }> = category.Blocks;
    for (const [key, block] of Object.entries(blocks)) {
      const label = PLUGIN_LABELS[key];
      if (label) {
        block.name = label.name;
        block.description = label.description;
      }
    }
  }
}
