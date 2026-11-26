// SIGN IN / ACCOUNT (CHG-0023), the last tab, drawn here as DOWNLOAD is; the plugins sign in with a
// code (SHARING-0011, CHG-0039).
import { ACCOUNT_TOP } from '../../accountPage/metrics.ts';
import type { AccountPage } from '../../accountPage/accountPage.ts';
import { App } from '../../shim.ts';
import type { SettingsContext } from './context.ts';
import type { PanelPoint } from './settingsView.ts';

/** The account page's top: 35 units higher than the other pages (the stats left too much room). */
export function accountTop(context: SettingsContext): number {
  const panel = context.panel;
  const tabOffset = panel.MenuItems.at(context.accountTab)?.YOffset ?? -panel.DrawTo.Height;
  return panel.OffsetY + ACCOUNT_TOP * App.Unit + tabOffset;
}

/** DELETE ACCOUNT's question and SIGN-IN METHODS end when the page is left: it comes back on its
 * own page (closing Settings while DELETE asks is CANCEL). */
function backToMain(account: AccountPage): void {
  if (account.View === 'delete' || account.View === 'methods') {
    account.View = 'main';
    account.Message = '';
  }
}

export function installAccountTab(context: SettingsContext, account: AccountPage): void {
  const panel = context.panel;
  // The tab's name follows who is signed in: lay the tabs out again, keeping each tab's state.
  const previousChange = account.onChange;
  account.onChange = () => {
    previousChange();
    const keep = panel.MenuItems.map((item) => ({
      Selected: item.Selected,
      YOffset: item.YOffset,
    }));
    panel.Populate();
    panel.MenuItems.forEach((item, i) => {
      const kept = keep.at(i);
      if (kept) {
        item.Selected = kept.Selected;
        item.YOffset = kept.YOffset;
      }
    });
  };
  const closeSettings = panel.ClosePanel.bind(panel);
  panel.ClosePanel = () => {
    backToMain(account);
    closeSettings();
  };
  panel.openAccount = () => {
    panel._OpenTab = context.accountTab;
    panel.MenuItems.forEach((item, i) => {
      item.Selected = i === context.accountTab ? 1 : 0;
      item.YOffset = i === context.accountTab ? 0 : -panel.DrawTo.Height;
    });
    void account.refresh();
    panel.OpenPanel();
  };
}

/** The account page sees the pointer only while its tab is open. */
export function hitAccountTab(context: SettingsContext, point: PanelPoint): void {
  const account = context.account;
  if (!account) return;
  if (context.panel._OpenTab === context.accountTab) account.hit(point, accountTop(context));
  else account.hit({ x: -1e9, y: -1e9 }, accountTop(context));
}

/** Opening the tab refreshes the account and leaves DELETE or METHODS. */
export function enterAccountTab(context: SettingsContext, tabBefore: number): void {
  const account = context.account;
  if (!account || context.panel._OpenTab !== context.accountTab || tabBefore === context.accountTab)
    return;
  backToMain(account);
  void account.refresh();
}

export function pressAccountTab(context: SettingsContext, point: PanelPoint): void {
  const account = context.account;
  if (!account || context.panel._OpenTab !== context.accountTab) return;
  account.hit(point, accountTop(context));
  account.press();
}
