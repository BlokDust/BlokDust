// The app declares its test hooks (window.__bd_probe, …) on Window where it sets them; these type
// imports bring them into the tests. Below: what tests add to the page or read beyond them.
import type {} from '../../web/src/app/testing/probe.ts';
import type {} from '../../web/src/app/input/touchpad.ts';
import type {} from '../../web/src/app/input/notes.ts';
import type {} from '../../web/src/app/input/selection.ts';
import type {} from '../../web/src/app/input/extraFingers.ts';
import type {} from '../../web/src/app/samples/useSample.ts';
import type {} from '../../web/src/app/editing/placing.ts';
import type {} from '../../web/src/app/patchFiles/openPatch.ts';
import type {} from '../../web/src/app/stageBlock/fillStage.ts';
import type {} from '../../web/src/patch/site.ts';
import type { AccountPage } from '../../web/src/v1ui/accountPage.ts';
import type { PatchItem, PatchesHost } from '../../web/src/v1ui/patches.ts';
import type { OptionsPanel } from '../../web/src/v1ui/ported/UI/OptionsPanel';
import type { SettingsPanel } from '../../web/src/v1ui/ported/UI/SettingsPanel';

/** A message the page sent to a test's stand-in plugin backend (window.__JUCE__). */
export interface SentMessage {
  id: string;
  v: unknown;
}

/** What the iPad's share sheet stand-in was handed (tests/e2e/video.ts). */
export interface SharedVideo {
  name: string;
  type: string;
  size: number;
  title?: string;
  text?: string;
}

declare global {
  interface Window {
    /** Messages to a test's stand-in plugin backend, in order. */
    __sent?: SentMessage[];
    /** Action buttons a test saw pressed (new-blocks stage tests). */
    __pressed?: string[];
    /** What a test's share sheet stand-in was handed. */
    __shared?: SharedVideo | null;
    /** web/golden.html: render a fixture through the real engine (web/src/golden.ts). */
    renderGolden?: (fixture: unknown) => Promise<{ audioHash: string; frames: number }>;
  }
}

/** What release1Settings (web/src/v1ui/scene.ts) adds to v1's Settings panel at run time. */
export type AppSettingsPanel = SettingsPanel & {
  accountPage: AccountPage;
  /** An account control's centre in CSS px. */
  accountCentre(name: string): [number, number] | null;
  openAccount(): void;
  /** The usage statistics switch's centre in CSS px and its words; null: not shown. */
  usageStatsSwitch(): { x: number; y: number; label: string } | null;
};

/** The Options panel with the Prism's exit lines drawn on it (web/src/v1ui/newBlockRows.ts). */
export type PrismOptionsPanel = OptionsPanel & { PrismExits?: [number, number][] };

/** v1's selected block as tests read it (v1's IBlock is untyped): a Sample's search and credit. */
export interface SelectedBlockView {
  Id: number;
  Searching?: boolean;
  SearchString?: string;
  SearchResults: unknown[];
  Params: { user?: string; permalink?: string; trackName?: string };
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
