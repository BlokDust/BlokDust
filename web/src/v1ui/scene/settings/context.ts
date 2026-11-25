// What Release 1's parts of the Settings panel share: the panel, the app, the account tab and
// what the pointer was last over (hit-tested in HitTests, used by Draw and MouseDown).
import type { AccountPage } from '../../accountPage/accountPage.ts';
import type { SettingsPanel } from '../../ported/UI/SettingsPanel';
import type { SceneHost } from '../sceneHost.ts';
import type { AppSettingsPanel } from './settingsView.ts';

export const SETTINGS_TAB = 0;
export const FEEDBACK_TAB = 1;
export const ABOUT_TAB = 2;
export const DOWNLOAD_TAB = 3;

export interface SettingsContext {
  panel: AppSettingsPanel;
  /** The same panel as v1's class (what SceneHost.feedback draws on). */
  v1Panel: SettingsPanel;
  host: SceneHost;
  /** SIGN IN / ACCOUNT's page; null where there are no accounts. */
  account: AccountPage | null;
  /** The account's tab: the last, after DOWNLOAD on the web (4), or 3 in the plugins. */
  accountTab: number;
  /** DOWNLOAD is a web tab: the plugins have none (they sign in with a code: SHARING-0011). */
  withDownload: boolean;
  /** What the pointer is over: a footer link (-1: none), the stats switch, a download (-1). */
  hover: { link: number; stats: boolean; download: number };
}

/** The y where tab `tab`'s page starts, following the tab as it slides (off screen: hidden). */
export const tabPageTop = (panel: AppSettingsPanel, tab: number, unit: number): number =>
  panel.OffsetY + 120 * unit + (panel.MenuItems.at(tab)?.YOffset ?? -panel.DrawTo.Height);
