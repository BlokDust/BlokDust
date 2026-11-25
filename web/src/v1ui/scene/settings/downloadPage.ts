// Settings › DOWNLOAD (web only, tab 3): v1 draws nothing for it, so its page is drawn here,
// following its tab's YOffset.
import { pageWidth } from '../../accountPage/metrics.ts';
import { App, Dimensions } from '../../shim.ts';
import { DOWNLOAD, IPAD_APP_STORE_URL, RELEASE, type Release } from '../about.ts';
import { DOWNLOAD_TAB, type SettingsContext, tabPageTop } from './context.ts';
import type { AppSettingsPanel } from './settingsView.ts';
import { wordWrap } from './wordWrap.ts';

interface DownloadButton {
  key: 'macos' | 'windows' | 'ipad';
  label: string;
  release: Release;
  line: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
}

/** MACOS · WINDOWS · IPAD in a row as v1 Connect's share buttons (15 units apart) across About's
 * text column; a phone stacks them. The iPad one opens the App Store page as it is. */
export function downloadButtons(panel: AppSettingsPanel): DownloadButton[] {
  const unit = App.Unit,
    y = tabPageTop(panel, DOWNLOAD_TAB, unit) + 70 * unit;
  const columnWidth = pageWidth(),
    buttonWidth = (columnWidth - 30 * unit) / 3,
    left = App.Width * 0.5 - columnWidth * 0.5;
  // A phone (owner, 2026-11-18): one a row, the page's width, its line under it.
  const at = (i: number) =>
    App.SettingsPhone
      ? {
          x: left,
          y: y + i * 110 * unit,
          w: columnWidth,
          h: 40 * unit,
          cx: left + columnWidth * 0.5,
        }
      : {
          x: left + i * (buttonWidth + 15 * unit),
          y,
          w: buttonWidth,
          h: 40 * unit,
          cx: left + i * (buttonWidth + 15 * unit) + buttonWidth * 0.5,
        };
  const ipad: Release = IPAD_APP_STORE_URL
    ? { file: '', url: IPAD_APP_STORE_URL, sha256: '', bytes: 0, store: true }
    : null;
  return [
    { key: 'macos', label: 'macOS', release: RELEASE.macos, ...at(0), line: DOWNLOAD.macos },
    {
      key: 'windows',
      label: 'Windows',
      release: RELEASE.windows,
      ...at(1),
      line: DOWNLOAD.windows,
    },
    { key: 'ipad', label: 'iPad', release: ipad, ...at(2), line: DOWNLOAD.ipad },
  ];
}

/** The installers carry ?source=download-page; the App Store page opens as it is. */
export function openDownload(release: NonNullable<Release>): void {
  window.open(release.store ? release.url : `${release.url}?source=download-page`, '_blank');
}

/** The download under the pointer (-1: none), on the DOWNLOAD tab only. */
export function downloadAt(context: SettingsContext, x: number, y: number): number {
  if (!context.withDownload || context.panel._OpenTab !== DOWNLOAD_TAB) return -1;
  return downloadButtons(context.panel).findIndex(
    (button) =>
      !!button.release && Dimensions.hitRect(button.x, button.y, button.w, button.h, x, y),
  );
}

export function drawDownloadPage(context: SettingsContext): void {
  const panel = context.panel,
    item = panel.MenuItems.at(DOWNLOAD_TAB);
  if (!item || item.YOffset <= -panel.DrawTo.Height) return;
  const ctx = panel.Ctx,
    unit = App.Unit,
    textColour = App.Palette[App.ThemeManager.Txt],
    menu = App.ThemeManager.MenuOrder;
  const top = panel.OffsetY + 120 * unit + item.YOffset;
  // INTRO, in v1 About's body type
  App.FillColor(ctx, textColour);
  ctx.textAlign = 'left';
  ctx.font = App.Metrics.TxtMid;
  let introY = top + 10 * unit;
  const columnWidth = pageWidth(),
    left = App.Width * 0.5 - columnWidth * 0.5;
  // A phone (owner, 2026-11-18): three lines, broken after "DAW," (else "plugin." stood alone).
  const intro = App.SettingsPhone
    ? [...DOWNLOAD.intro[0].split(/(?<=DAW,) /), ...DOWNLOAD.intro.slice(1)]
    : DOWNLOAD.intro;
  for (const paragraph of intro)
    introY = wordWrap(ctx, paragraph, left, introY, 16 * unit, columnWidth);
  // The buttons in v1 SharePanel's SAVE / SAVE AS colours and a third, in Connect's GUIDE type
  let below = 0;
  const buttons = downloadButtons(panel);
  for (const [i, button] of buttons.entries()) {
    const on = !!button.release;
    App.FillColor(ctx, App.Palette[on ? [menu[3], menu[1], menu[2]][i] : 1]);
    ctx.fillRect(button.x, button.y, button.w, button.h);
    if (on && context.hover.download === i) {
      ctx.beginPath();
      ctx.moveTo(button.cx, button.y + button.h + 9 * unit);
      ctx.lineTo(button.cx - 10 * unit, button.y + button.h - unit);
      ctx.lineTo(button.cx + 10 * unit, button.y + button.h - unit);
      ctx.closePath();
      ctx.fill();
    }
    App.FillColor(ctx, textColour);
    ctx.textAlign = 'center';
    ctx.font = App.Metrics.TxtUrl2;
    ctx.fillText(button.label.toUpperCase(), button.cx, button.y + 29 * unit);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtItalic2;
    const words = on ? button.line : DOWNLOAD.soon;
    const lineY = button.y + button.h + 24 * unit;
    below = Math.max(below, wordWrap(ctx, words, button.x, lineY, 14 * unit, button.w));
  }
  // VERSION: under the longest line (the columns are narrow); a phone has the build in About
  const versionY = Math.max(buttons[0].y + 40 * unit + 80 * unit, below + 16 * unit);
  ctx.font = App.Metrics.TxtItalic2;
  ctx.textAlign = 'left';
  if (RELEASE.version && !App.SettingsPhone)
    ctx.fillText(`Version ${RELEASE.version}`, left, versionY);
}
