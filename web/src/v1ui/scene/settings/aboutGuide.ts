// About's link to the BlokDust 2 guide (CHG-0047): v1's Connect guide line and GUIDE BUTTON
// (SettingsPanel tab 2), moved under the people: centred above the footer, or 40 units under them.
import { pageWidth } from '../../accountPage/metrics.ts';
import { App, Dimensions } from '../../shim.ts';
import { GUIDE } from '../about.ts';
import { peopleBottom } from './aboutPeople.ts';
import { ABOUT_TAB, type SettingsContext } from './context.ts';
import type { AppSettingsPanel, PanelPoint } from './settingsView.ts';
import { wrapLines } from './wordWrap.ts';

/** v1's guide block in units: the line's cap height, its button 10 below the line, 40 tall. */
const CAP = 12,
  LINE = 14,
  GAP = 10,
  BUTTON = 40;
/** At most this far under the people (a phone's tall page), else centred above the footer. */
const SPACE = 40;
/** Room kept above the footer: its GitHub line and, beside it, the build and usage stats lines. */
const FOOT_ROOM = 50;

interface GuideBlock {
  lines: string[];
  /** The first line's baseline; the button's box. */
  lineY: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the block sits, or null where it can't be shown: no links (an iPad host), or no room
 * between the people and the footer. */
function guideBlock(panel: AppSettingsPanel): GuideBlock | null {
  if (App.NoLinks) return null;
  const aboutOffset = panel.MenuItems.at(ABOUT_TAB)?.YOffset ?? -panel.DrawTo.Height;
  if (aboutOffset <= -panel.DrawTo.Height) return null;
  const ctx = panel.Ctx,
    unit = App.Unit,
    width = Math.min(420 * unit, pageWidth());
  ctx.font = App.Metrics.TxtItalic2;
  const lines = wrapLines(ctx, GUIDE.line, width),
    height = (CAP + (lines.length - 1) * LINE + GAP + BUTTON) * unit;
  // The people slide with the tab; the footer doesn't: centre between them as the tab rests.
  const top = peopleBottom(panel) - aboutOffset,
    room = panel.OffsetY + panel.DrawTo.Height - FOOT_ROOM * unit - top;
  if (room < height) return null;
  const lineY = top + Math.min((room - height) * 0.5, SPACE * unit) + CAP * unit + aboutOffset;
  return {
    lines,
    lineY,
    x: App.Width * 0.5 - width * 0.5,
    y: lineY + ((lines.length - 1) * LINE + GAP) * unit,
    w: width,
    h: BUTTON * unit,
  };
}

export function installAboutGuide(context: SettingsContext): void {
  const panel = context.panel;
  panel.guideButton = () => {
    const block = guideBlock(panel),
      pixelRatio = App.Metrics.PixelRatio;
    return block
      ? {
          x: block.x / pixelRatio,
          y: block.y / pixelRatio,
          w: block.w / pixelRatio,
          h: block.h / pixelRatio,
          lineY: block.lineY / pixelRatio,
          url: GUIDE.url,
        }
      : null;
  };
}

export function hitAboutGuide(context: SettingsContext, point: PanelPoint): void {
  const panel = context.panel,
    block = panel._OpenTab === ABOUT_TAB ? guideBlock(panel) : null;
  context.hover.guide =
    !!block && Dimensions.hitRect(block.x, block.y, block.w, block.h, point.x, point.y);
}

/** A press on the guide button; true when it took the press. */
export function pressAboutGuide(context: SettingsContext): boolean {
  if (!context.hover.guide) return false;
  window.open(GUIDE.url, '_blank');
  return true;
}

/** v1's guide line, button (menu colour 4) and hover pointer, as Connect drew them. */
export function drawAboutGuide(context: SettingsContext): void {
  const panel = context.panel,
    block = guideBlock(panel);
  if (!block) return;
  const ctx = panel.Ctx,
    unit = App.Unit,
    dx = App.Width * 0.5;
  App.FillColor(ctx, App.Palette[App.ThemeManager.MenuOrder[3]]);
  ctx.fillRect(block.x, block.y, block.w, block.h);
  if (context.hover.guide) {
    ctx.beginPath();
    ctx.moveTo(dx, block.y + block.h + 9 * unit);
    ctx.lineTo(dx + 10 * unit, block.y + block.h - unit);
    ctx.lineTo(dx - 10 * unit, block.y + block.h - unit);
    ctx.closePath();
    ctx.fill();
  }
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.textAlign = 'center';
  ctx.font = App.Metrics.TxtUrl2;
  ctx.fillText(GUIDE.label.toUpperCase(), dx, block.y + 29 * unit);
  ctx.font = App.Metrics.TxtItalic2;
  block.lines.forEach((line, i) => {
    ctx.fillText(line, dx, block.lineY + i * LINE * unit);
  });
}
