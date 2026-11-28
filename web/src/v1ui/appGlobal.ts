// The shape of v1's global App (shim.ts): what the ported UI and v2's panels read and set.
import type { V1Block } from './blocks/v1Block.ts';
import type { V1Scene } from './scene/v1Scene.ts';
import type config from './ported/data/config.json';
import type l10n from './ported/data/l10n.json';
import type menu from './ported/data/menu.json';
import type { Metrics } from './ported/Metrics';
import type { AnimationsLayer } from './ported/UI/AnimationsLayer';
import type { NullstoneEvent, Point } from './shim.ts';

export interface V1ThemeManager {
  /** Palette index of the text colour. */
  Txt: number;
  MenuOrder: number[];
  OptionsOrder: number[];
  CurrentThemeNo: number;
  CurrentTheme: { Name: string };
  Themes: unknown[];
  LoadTheme: (index: number) => void;
}

export interface V1Audio {
  Master: { volume: { _v: number; onMaster: (decibels: number) => void; value: number } };
  /** v1 App.Audio.sampleRate: SampleGen renders at it. */
  sampleRate: number;
  ctx?: AudioContext;
  Level: number;
  Peak: number;
  Monitor: () => void;
  MonitorReset: () => void;
  NoteIndex: string[];
}

export interface V1AppGlobal {
  L10n: typeof l10n;
  L: typeof l10n;
  Config: typeof config;
  BlockCreator: { MenuJson: typeof menu };
  Palette: string[];
  Unit: number;
  GridSize: number;
  ScaledUnit: number;
  ScaledGridSize: number;
  Width: number;
  Height: number;
  ZoomLevel: number;
  MaxAspect: number;
  DragOffset: Point;
  ScaledDragOffset: Point;
  IsPlugin: boolean;
  NoLinks: boolean;
  readonly SettingsPhone: boolean;
  SettingsCrossX: (width: number) => number;
  MenuDrop: (dropDown: number) => number;
  SettingsMenuWidth: (width: number) => number;
  SettingsTabsWidth: (width: number) => number;
  readonly SettingsRow: number;
  Blocks: V1Block[];
  SubCanvas: HTMLCanvasElement[];
  CompositionId: string | null;
  SessionId: string | null;
  FillColor: (ctx: CanvasRenderingContext2D, color: string) => void;
  SliderValueText: (
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    barFrom: number,
    barTo: number,
    barY: number,
    barHeight: number,
    barColour: string,
  ) => void;
  StrokeColor: (ctx: CanvasRenderingContext2D, color: string) => void;
  FillRGBA: (
    ctx: CanvasRenderingContext2D,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ) => void;
  ColorManager: { ColorString: (color: string) => string };
  ThemeManager: V1ThemeManager;
  Audio: V1Audio;
  FocusManager: { IsActive: boolean };
  PointerInputManager: {
    MouseDown: NullstoneEvent<unknown>;
    TouchEnd: NullstoneEvent<unknown>;
    TouchMove: NullstoneEvent<unknown>;
    /** v1: the last press was a touch (the tour gives its touch steps). */
    TouchAssumed: boolean;
  };
  IsLoadingComposition: boolean;
  AddressBarManager: { UpdateURL: (url: string) => void };
  CommandManager: { ExecuteCommand: (command: string, args?: unknown) => void };
  Canvas: { Ctx: CanvasRenderingContext2D | null; Style: { cursor: string } };
  // Set when the scene is made (V1Scene's constructor).
  MainScene: V1Scene;
  Stage: { MainScene: V1Scene };
  Metrics: Metrics;
  AnimationsLayer: AnimationsLayer;
  BlockSprites: {
    DrawSprite: (displayContext: unknown, position: Point, scaled: boolean, name: string) => void;
  };
  // Read only on v1 code paths v2 never runs.
  TypingManager?: { Enable: (target: unknown) => void; Disable: () => void };
  SkipTutorial?: boolean;
  Message?: (...args: unknown[]) => void;
  CreateSubCanvas?: () => HTMLCanvasElement;
}
