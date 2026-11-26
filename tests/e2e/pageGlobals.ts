// What the browser tests read and set on the page's window. The app declares its own test hooks
// next to the code that sets them; importing those modules' types makes them visible here.
/// <reference types="../../web/node_modules/vite/client" />
import type {} from '../../web/src/app/testing/probe.ts';
import type {} from '../../web/src/app/input/selection.ts';
import type {} from '../../web/src/app/input/notes.ts';
import type {} from '../../web/src/app/input/extraFingers.ts';
import type {} from '../../web/src/app/input/touchpad.ts';
import type {} from '../../web/src/app/samples/useSample.ts';
import type {} from '../../web/src/app/editing/placing.ts';
import type {} from '../../web/src/app/patchFiles/openPatch.ts';
import type {} from '../../web/src/app/stageBlock/fillStage.ts';
import type {} from '../../web/src/patch/site.ts';
import type { Command } from '../../web/src/engine/wasmEngine.ts';
import type { AccountPage } from '../../web/src/v1ui/accountPage/accountPage.ts';
import type { PatchItem, PatchesHost } from '../../web/src/v1ui/patches/hosts.ts';
import type { PanelOption } from '../../web/src/v1ui/optionsTypes.ts';
import type { SettingsPanel } from '../../web/src/v1ui/ported/UI/SettingsPanel';

/** The value of a bd_commands message the page sends the plugin's processor. */
export interface CommandsMessage {
  commands: Command[];
}

/** The fake JUCE WebView bridge the plugin tests install as window.__JUCE__. */
export interface FakeJuce {
  backend: {
    addEventListener(id: string, listener: (value: unknown) => void): void;
    emitEvent(id: string, value?: unknown): void;
  };
}

/** A fake Web MIDI input: tests call its handler as a device would. */
export interface FakeMidiInput {
  id: string;
  name: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

/** A canvas text call the tests recorded, with where it was drawn. */
export interface DrawnText {
  t: string;
  x: number;
  y: number;
}

/** What the Support page drew, recorded while it drew (support-connect-spacing). */
export interface SupportDrawing {
  rule: number;
  intro: number;
  message: number;
  bar?: { x: number; y: number; w: number; h: number };
  separator?: { top: number; height: number };
  glyphBottom?: number;
}

/** The options a page passed to the File System Access save picker. */
export interface SavePickerOptions {
  suggestedName?: string;
  startIn?: string;
  id?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

/** A message the page sent to a test's stand-in plugin backend (window.__JUCE__). */
export interface SentMessage {
  id: string;
  v: unknown;
}

/** What a share sheet stand-in was handed: a link, or a video file's facts (tests/e2e/video.ts). */
export interface SharedOnPage extends ShareData {
  name?: string;
  type?: string;
  size?: number;
}

declare global {
  interface Window {
    /** Messages the page sent to the fake JUCE backend, in order. */
    __sent?: SentMessage[];
    /** Action buttons a test saw pressed (new-blocks stage tests). */
    __pressed?: string[];
    /** web/golden.html: render a fixture through the real engine (web/src/golden.ts). */
    renderGolden?: (fixture: unknown) => Promise<{ audioHash: string; frames: number }>;
    /** Deliver a message from the fake JUCE backend to the page. */
    __fire?: (id: string, value: unknown) => void;
    /** Text the page drew on its canvases, in order. */
    __texts?: string[];
    __texts2?: Omit<DrawnText, 'y'>[];
    __texts3?: DrawnText[];
    /** URLs the page opened (window.open). */
    __opened?: string[];
    __prevented?: boolean | null;
    __gaps?: number[];
    __moved?: number;
    __downAt?: number;
    __title?: number[];
    __ctx?: AudioContext;
    __session?: string[];
    __written?: string[];
    __opts?: SavePickerOptions;
    __picked?: number[];
    __unclipped?: string[];
    /** What a test's share sheet stand-in was handed. */
    __shared?: SharedOnPage | null;
    __seenBeforePatch?: number;
    __patched?: boolean;
    __fakeMidi?: Map<string, FakeMidiInput>;
    __supportDrawing?: SupportDrawing;
    /** The File System Access save picker (Chromium); tests replace or remove it. */
    showSaveFilePicker?: (options?: SavePickerOptions) => Promise<unknown>;
  }
}

/** What release1Settings (web/src/v1ui/scene/settings/) adds to v1's Settings panel at run time. */
export type AppSettingsPanel = SettingsPanel & {
  accountPage: AccountPage;
  /** An account control's centre in CSS px. */
  accountCentre(name: string): [number, number] | null;
  openAccount(): void;
  /** The usage statistics switch's centre in CSS px and its words; null: not shown. */
  usageStatsSwitch(): { x: number; y: number; label: string } | null;
};

/** What a live options row last drew, kept for tests (web/src/v1ui/newBlocks/liveRows.ts,
 * noteBars.ts, touchpadPanel.ts); each row kind fills its own fields. */
export interface RowShown {
  level?: number;
  reduction?: number;
  on?: boolean;
  thresholdX?: number;
  width?: number;
  pattern?: string;
  next?: number;
  values?: number[];
  key?: number;
  held?: number | number[] | string | null;
  cells?: number[];
  cell?: number;
  top?: number;
  bottom?: number;
  low?: number;
  high?: number;
  lowX?: number;
  highX?: number;
  table?: string;
  position?: number;
  drawn?: boolean;
  first?: number[];
  cols?: number;
  rows?: number;
}
/** One of v1's options rows with what a live row drew; the Touchpad's row has its pads. */
export type OptionRow = PanelOption & {
  Shown?: RowShown;
  /** An action button's words. */
  _Text?: string;
};

/** v1's selected block as tests read it (v1's IBlock is untyped): a Sample's search and credit. */
export interface SelectedBlockView {
  Id: number;
  Searching?: boolean;
  SearchString?: string;
  SearchResults: unknown[];
  Params: { user?: string; permalink?: string; trackName?: string };
}

/** The block whose options panel is open, as tests drive it (web/src/v1ui/blocks/v1Block.ts). */
export interface OptionsBlock {
  Id: number;
  /** v1's SetParam: a slider's or switch's value. */
  SetParam(key: string, value: number | boolean): void;
  OptionsForm: {
    parameters: { type: string; name: string; switches?: { name: string; value?: unknown }[] }[];
  };
  /** Redraw the open panel from the block's params. */
  RefreshOptionsPanel(): void;
  /** The note a Random Note or Chord last lit (web/src/v1ui/noteBars.ts). */
  __bdLit?: { note: number; until: number };
  /** The LFO's targets (web/src/v1ui/newBlocks/lfo.ts). */
  LfoTargets?: { label: string }[];
}

/** v1 panels' private state that tests read; the classes don't expose it. */
export interface MessageBarState {
  Open: boolean;
  _Alpha: number;
  _Value?: { string: string };
}
export interface SettingsTabState {
  Open: boolean;
  _OpenTab: number;
}
export interface PatchesPanelState {
  host: PatchesHost;
  removing: PatchItem | null;
  roll: Record<string, boolean>;
  videoOn: boolean;
  mainAction(): { kind: 'save' | 'video' | null; label: string; off: boolean };
  galleryMaxScroll(): number;
  makeVideo(): Promise<void>;
}
