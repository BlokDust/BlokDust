// What v2 reads and adds on v1's options panel (ported/UI/OptionsPanel.ts), its option rows and a
// block's options form. The ported classes type their blocks loosely: v2 narrows them here, once.
import type { DisplayObject, Point, Size } from './shim.ts';
import type { V1Block } from './blocks/v1Block.ts';
import type { OptionsPanel } from './ported/UI/OptionsPanel';
import type { OptionHandle } from './ported/UI/Options/OptionHandle';
import type { OptionSubHandle } from './ported/UI/Options/OptionSubHandle';
import type { OptionButton } from './ported/UI/Options/OptionButton';
import type { OptionSwitch } from './ported/UI/Options/OptionSwitch';

// ---- a block's options form (v1 Block.OptionsForm: the JSON OptionsPanel.Populate builds rows from) ----
export interface FormSwitch {
  name: string;
  setting: string;
  value: boolean;
  lit?: boolean;
  mode: string;
}
export interface FormProps {
  value?: number;
  min?: number;
  max?: number;
  quantised?: boolean;
  centered?: boolean;
  logarithmic?: boolean;
  convertDisplay?: (value: number) => string;
  mode?: string;
  height?: number;
  text?: string;
  wavearray?: number[];
  [key: string]: unknown;
}
export interface FormParameter {
  type: string;
  name: string;
  setting: string;
  props?: FormProps;
  switches?: FormSwitch[];
  buttons?: { name: string }[];
  nodes?: unknown[];
}
export interface OptionsForm {
  name: string;
  parameters: FormParameter[];
}

// ---- the panel's rows (v1 Option and its subclasses), with what v2 adds to them ----
export type RowDraw = (
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  index: number,
  panel: V2OptionsPanel,
) => void;

export interface PanelOption {
  Type: string;
  Name: string;
  Setting: string;
  Value: number;
  Min: number;
  Max: number;
  Log: boolean;
  Position: Point;
  Size: Size;
  Selected: boolean;
  HandleRoll: boolean[];
  SubHandleRoll: boolean[];
  /** Parametric, ADSR and wave region rows. */
  Handles: OptionHandle[];
  SubHandles: OptionSubHandle[];
  Buttons: OptionButton[];
  Switches: OptionSwitch[] | undefined;
  Waveform: number[] | undefined;
  /** Sample rows: the track line. */
  Track: string | undefined;
  /** Parametric rows: the response curve. */
  Smoothness: number;
  LineGain: number[];
  DisplayConversion?: (value: number) => string;
  Draw(ctx: CanvasRenderingContext2D, units: number, index: number, panel: V2OptionsPanel): void;
  PlotGraph(): void;
  // v2's additions:
  /** A live row (newBlocks/liveRows.ts): drawn from the engine every frame. */
  Live?: boolean;
  /** What the row last drew (tests; some rows hit-test from it). */
  Shown?: unknown;
  /** A slider sticking at 0: since when it has been near it (newBlocks/liveRows.ts). */
  SnapSince?: number;
  /** The value an LFO shows on it (tests). */
  Followed?: number;
  /** The selector's choice width (tests: it fits between the arrows). */
  TextWidth?: number;
  /** The ADSR readout is installed (adsrPanel.ts). */
  __bdReadout?: boolean;
}

// ---- the panel ----
export interface V2OptionsPanel extends DisplayObject {
  Position: Point;
  Size: Size;
  Margin: number;
  Range: number;
  Scale: number;
  Options: PanelOption[];
  SelectedBlock: V1Block | null;
  SliderColours: string[];
  Hover: boolean;
  Opening: boolean;
  Animating: boolean;
  Outline: Point[];
  _DrawReady: boolean;
  _SliderRoll: boolean[] | undefined;
  _NameWidth: number;
  /** A Prism's or Emitter's exits as drawn (tests). */
  PrismExits?: [number, number][];
  Populate(json: OptionsForm | null, open: boolean): void;
  RolloverCheck(mx: number, my: number): void;
  MouseDown(mx: number, my: number): void;
  MouseMove(mx: number, my: number): void;
  MouseUp(): void;
  HandleSet(n: number, h: number, xStart: number, yRange: number, mx: number, my: number): void;
  SliderSet(n: number, mx: number): void;
  OutlineTest(point: Point): boolean;
  PanelScale(panel: V2OptionsPanel, destination: number, ms: number): void;
  Open(block: V1Block): void;
  /** Calls off an open still waiting to pop up (cancellableOpen.ts). */
  CancelOpen(): void;
  Close(): void;
  Refresh(): void;
  diagonalFill(x: number, y: number, w: number, h: number, spacing: number): void;
  linPosition(
    minPos: number,
    maxPos: number,
    minVal: number,
    maxVal: number,
    value: number,
  ): number;
  linValue(
    minPos: number,
    maxPos: number,
    minVal: number,
    maxVal: number,
    position: number,
  ): number;
  logPosition(
    minPos: number,
    maxPos: number,
    minVal: number,
    maxVal: number,
    value: number,
  ): number;
}

/** v1's options panel as v2 types it: its private members and loosely typed block included. */
export const optionsPanelView = (panel: OptionsPanel): V2OptionsPanel =>
  panel as unknown as V2OptionsPanel;
