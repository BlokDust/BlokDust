// v2's view of v1's Settings panel (ported/UI/SettingsPanel.ts): the members Release 1 reads,
// which v1 keeps private or untyped, and the test hooks it adds.
import type { AccountPage } from '../../accountPage/accountPage.ts';
import type { DisplayContext } from '../../shim.ts';
import type { MenuCategory } from '../../ported/UI/MenuCategory';
import type { Option } from '../../ported/UI/Options/Option';
import type { SettingsPanel } from '../../ported/UI/SettingsPanel';
import type { RELEASE } from '../about.ts';

export interface PanelPoint {
  x: number;
  y: number;
}

/** One of About's people in v1's Attribution strings. */
export interface AttributedPerson {
  blurb: string;
  url: string;
  twitter?: string;
}

/** v1's Attribution (l10n.json): About's words, people and build line. */
export interface Attribution {
  title: string;
  about: string;
  build: string;
  thanks: string;
  twyman: AttributedPerson;
  phillips: AttributedPerson;
  silverton: AttributedPerson;
}

/** A row of the Settings tab; Draw takes the row's y when v1 would put it elsewhere. */
export type SettingsRow = Option & {
  Draw(
    ctx: CanvasRenderingContext2D,
    units: number,
    index: number,
    panel: unknown,
    yOverride?: number,
  ): void;
};

export interface AppSettingsPanel {
  readonly Ctx: CanvasRenderingContext2D;
  DrawTo: DisplayContext;
  Open: boolean;
  OffsetY: number;
  MenuItems: MenuCategory[];
  Options: SettingsRow[];
  Range: number;
  Margin: number;
  _OpenTab: number;
  _RollOvers: boolean[];
  _OptionsRoll: boolean[];
  _Attribution: Attribution;
  Populate(json?: { categories: { name: string }[] }): void;
  PopulateOptions(): void;
  OpenPanel(): void;
  ClosePanel(): void;
  HitTests(point: PanelPoint): void;
  MouseDown(point: PanelPoint): void;
  MouseMove(point: PanelPoint): void;
  Draw(): void;
  linValue(minPos: number, maxPos: number, minVal: number, maxVal: number, at: number): number;
  linPosition(minPos: number, maxPos: number, minVal: number, maxVal: number, at: number): number;

  /** The SIGN IN / ACCOUNT tab's page (null: no accounts here). */
  accountPage: AccountPage | null;
  /** Open Settings on SIGN IN / ACCOUNT (back from Google, the signed-in mark on the stage). */
  openAccount?: () => void;
  /** Tests: an account control's centre in CSS px. */
  accountCentre?: (name: string) => [number, number] | null;
  /** Tests: show the page as it will be once a release is published. */
  setRelease?: (release: typeof RELEASE) => void;
  /** Tests: the DOWNLOAD page's buttons in CSS px, and what they offer. */
  downloadButtons?: () => { key: string; x: number; y: number; url: string | null }[];
  /** Tests: the usage stats switch's centre in CSS px, and its words (null: not shown). */
  usageStatsSwitch?: () => { x: number; y: number; label: string } | null;
  /** Tests: each footer link's centre in CSS px. */
  footerLinks?: () => { label: string; x: number; y: number }[];
  /** Tests: ABOUT's guide button in CSS px, its line's baseline and link (null: not shown). */
  guideButton?: () => {
    x: number;
    y: number;
    w: number;
    h: number;
    lineY: number;
    url: string;
  } | null;
  /** Tests: ABOUT's people on a phone (CSS px). */
  peoplePhone?: () => { icon: number[]; text: number[]; url: string }[] | null;
  /** Tests: the TOUR button's centre in CSS px (null: no row). */
  tourButton?: () => { x: number; y: number } | null;
}

/** The Settings panel as Release 1 drives it: v1's class with its private members in view. */
export const appSettings = (panel: SettingsPanel): AppSettingsPanel =>
  panel as unknown as AppSettingsPanel;
