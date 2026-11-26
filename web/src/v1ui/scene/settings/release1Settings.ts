// Release 1's changes to v1's Settings panel (CHG-0005), made around the ported code: the tabs,
// About's words and links, DOWNLOAD, ACCOUNT, Tempo and TOUR, and FEEDBACK in Connect's tab.
import { AccountPage } from '../../accountPage/accountPage.ts';
import { App } from '../../shim.ts';
import type { SettingsPanel } from '../../ported/UI/SettingsPanel';
import type { SceneHost } from '../sceneHost.ts';
import { ABOUT, PHILLIPS, setRelease } from '../about.ts';
import {
  drawAboutFooter,
  hitAboutFooter,
  installAboutFooter,
  pressAboutFooter,
  statsBox,
} from './aboutFooter.ts';
import {
  drawPeoplePhone,
  hitAboutPeople,
  installAboutPeople,
  websitesOnTwitterLines,
} from './aboutPeople.ts';
import {
  accountTop,
  enterAccountTab,
  hitAccountTab,
  installAccountTab,
  pressAccountTab,
} from './accountTab.ts';
import { ABOUT_TAB, FEEDBACK_TAB, type SettingsContext } from './context.ts';
import { downloadAt, downloadButtons, drawDownloadPage, openDownload } from './downloadPage.ts';
import {
  dragTempo,
  drawTourRow,
  hitTempoAndTour,
  installTempoAndTour,
  pressTempo,
} from './tempoAndTour.ts';
import { appSettings, type PanelPoint } from './settingsView.ts';

export function release1Settings(settingsPanel: SettingsPanel, host: SceneHost): void {
  const panel = appSettings(settingsPanel);
  App.L10n.Attribution.about = ABOUT;
  Object.assign(App.L10n.Attribution.phillips, App.NoLinks ? { blurb: PHILLIPS.blurb } : PHILLIPS);
  const withDownload = !App.IsPlugin;
  const account = host.account ? new AccountPage(host.account, () => panel.Ctx) : null;
  const context: SettingsContext = {
    panel,
    v1Panel: settingsPanel,
    host,
    account,
    accountTab: withDownload ? 4 : 3,
    withDownload,
    hover: { link: -1, stats: false, download: -1 },
  };
  panel.accountPage = account;
  const populate = panel.Populate.bind(panel);
  panel.Populate = () => {
    populate({
      categories: [
        { name: 'settings' },
        { name: 'feedback' }, // FEEDBACK (CHG-0041: was CONNECT)
        { name: 'about' },
        ...(withDownload ? [{ name: 'download' }] : []),
        ...(account ? [{ name: account.tabName }] : []),
      ],
    });
  };
  if (account) installAccountTab(context, account);
  panel.accountCentre = (name: string) => account?.centreOf(name, accountTop(context)) ?? null;
  panel.setRelease = setRelease;
  panel.downloadButtons = () => {
    const pixelRatio = App.Metrics.PixelRatio;
    return downloadButtons(panel).map((button) => ({
      key: button.key,
      x: (button.x + button.w / 2) / pixelRatio,
      y: (button.y + button.h / 2) / pixelRatio,
      url: button.release?.url ?? null,
    }));
  };
  installTempoAndTour(context);
  installAboutFooter(context);
  installAboutPeople(context);
  wrapPointer(context);
  wrapDraw(context);
}

function wrapPointer(context: SettingsContext): void {
  const panel = context.panel;
  const hitTests = panel.HitTests.bind(panel);
  panel.HitTests = (point: PanelPoint) => {
    hitTests(point);
    hitAboutPeople(context, point);
    // Connect's retired social and guide targets
    for (let i = 7; i <= 14; i++) panel._RollOvers[i] = false;
    hitAboutFooter(context, point);
    context.hover.download = downloadAt(context, point.x, point.y);
    hitAccountTab(context, point);
    hitTempoAndTour(context, point);
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (point: PanelPoint) => {
    const tabBefore = panel._OpenTab;
    mouseDown(point);
    enterAccountTab(context, tabBefore);
    if (!panel.Open) return;
    if (pressAboutFooter(context)) return;
    if (context.hover.download >= 0) {
      const release = downloadButtons(panel)[context.hover.download].release;
      if (release) openDownload(release);
      return;
    }
    pressAccountTab(context, point);
    pressTempo(context, point);
  };
  const mouseMove = panel.MouseMove.bind(panel);
  panel.MouseMove = (point: PanelPoint) => {
    mouseMove(point);
    dragTempo(context, point);
  };
}

function wrapDraw(context: SettingsContext): void {
  const panel = context.panel,
    account = context.account;
  const draw = panel.Draw.bind(panel);
  panel.Draw = () => {
    // The build line and the GitHub link are About's; v1 drew the build under every tab.
    const about = panel._OpenTab === ABOUT_TAB,
      build = panel._Attribution.build,
      moved = about && !!statsBox(context);
    if (!about || moved) panel._Attribution.build = '';
    const restorePeople = websitesOnTwitterLines(panel);
    // Connect's v1 body (guide, social links) is retired; its tab holds feedback (CHG-0036).
    const feedbackItem = panel.MenuItems.at(FEEDBACK_TAB),
      feedbackOffset = feedbackItem?.YOffset;
    if (feedbackItem) feedbackItem.YOffset = -panel.DrawTo.Height * 2;
    try {
      draw();
    } finally {
      if (feedbackItem && feedbackOffset !== undefined) feedbackItem.YOffset = feedbackOffset;
      panel._Attribution.build = build;
      restorePeople();
    }
    const accountOffset = panel.MenuItems.at(context.accountTab)?.YOffset ?? -1;
    account?.placeField(
      accountTop(context),
      panel.Open &&
        panel._OpenTab === context.accountTab &&
        accountOffset > -panel.DrawTo.Height * 0.5,
    );
    if (!panel.Open) {
      context.host.feedback?.draw(context.v1Panel);
      return;
    }
    drawSlidingPages(context);
    if (about) drawAboutFooter(context, build);
  };
}

/** DOWNLOAD, ACCOUNT and FEEDBACK slide under the tabs as SETTINGS and ABOUT do: clipped as v1
 * clips them, from 60 units below the tabs' top to the bottom (else they drew over the tabs). */
function drawSlidingPages(context: SettingsContext): void {
  const panel = context.panel,
    ctx = panel.Ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, panel.OffsetY + 60 * App.Unit, App.Width, App.Height);
  ctx.clip();
  try {
    drawTourRow(context);
    // the plugins: tab 3 is the account (SHARING-0011)
    if (context.withDownload) drawDownloadPage(context);
    drawPeoplePhone(panel);
    const accountOffset = panel.MenuItems.at(context.accountTab)?.YOffset ?? -panel.DrawTo.Height;
    if (context.account && accountOffset > -panel.DrawTo.Height)
      context.account.draw(accountTop(context));
    context.host.feedback?.draw(context.v1Panel);
  } finally {
    ctx.restore();
  }
}
