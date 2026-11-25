// What the v1 tools read from v1's untyped globals inside page.evaluate (v1 is plain JavaScript).

export interface V1Point {
  x: number;
  y: number;
}

export interface V1Block {
  constructor: { name: string };
  Id: number;
  Position: V1Point;
  LastPosition: V1Point;
  StarPos?: V1Point;
  BlockName?: string;
  Defaults?: unknown;
  Params?: unknown;
  Outline?: V1Point[];
  CatchmentArea?: unknown;
  OptionsForm?: unknown;
  Init: (scene: V1MainScene) => void;
  UpdateOptionsForm?: () => void;
}

export interface V1RecorderPanel {
  DrawPanel: (x: number, y: number, recording: boolean, hover: boolean) => void;
}

export interface V1MainScene {
  Tutorial?: { ClosePanel?: () => void; SplashOpen?: boolean; CloseSplash: () => void };
  IsPaused: boolean;
  _RecorderPanel: V1RecorderPanel;
}

export interface V1Theme {
  Name?: string;
  name?: string;
  PaletteURL?: string;
}

/** Records the points v1's sprite code draws: grid cells or units. */
export type V1PointRecorder = (x: number, y: number) => void;

export interface V1BlockSprites {
  DrawMoveTo: V1PointRecorder;
  DrawLineTo: V1PointRecorder;
  DrawFloatMoveTo: V1PointRecorder;
  DrawFloatLineTo: V1PointRecorder;
  DrawSprite: (
    target: { Ctx: unknown },
    position: V1Point,
    scaled: boolean,
    name: string,
    starPosition?: V1Point,
  ) => void;
  _XOffset: number;
  _YOffset: number;
}

export interface V1L10nBlock {
  name: string;
  description: string;
}

export interface V1App {
  MainScene: V1MainScene;
  Blocks: V1Block[];
  Stage?: { Splash?: { IsAnimationFinished: boolean; LoadOffset: number } };
  SkipTutorial: boolean;
  CompositionLoadComplete: (json: string) => void;
  Metrics: { C: V1Point; PixelRatio: number };
  Unit: number;
  GridSize: number;
  ScaledGridSize: number;
  ScaledUnit: number;
  ZoomLevel: number;
  ScaledDragOffset: V1Point;
  Canvas: { Width: number; Height: number };
  ThemeManager: {
    CurrentThemeNo: number;
    Themes: V1Theme[];
    Loaded: boolean;
    LoadTheme: (index: number, firstLoad: boolean, instant: boolean) => void;
    Txt: unknown;
    MenuOrder: unknown;
    OptionsOrder: unknown;
    Power: unknown;
  };
  Palette: unknown[];
  ColorManager: { ColorString: (color: unknown) => string };
  FillColor: (ctx: unknown, color: unknown) => void;
  BlockSprites: V1BlockSprites;
  BlockCreator: { GetBlock: (type: string) => V1Block };
  L10n: { Blocks: Record<string, { Blocks?: Record<string, V1L10nBlock> }> };
  AnimationsLayer: { ActiveBlocks: unknown[] };
  Audio: { ctx: unknown };
}

declare global {
  interface Window {
    App?: V1App;
    etch?: { primitives: { Point: new (x: number, y: number) => V1Point } };
    /** bd v1 audio: the OfflineAudioContext handed to v1 and the stepped render's progress. */
    __bdOffline?: OfflineAudioContext;
    __bdAt?: number;
    __bdDone?: Promise<void>;
    __bdBuf?: AudioBuffer;
  }
}
