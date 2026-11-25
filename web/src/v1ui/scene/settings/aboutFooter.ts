// About's foot: the code on GitHub, in v1's footer type and underlined on hover like v1's links
// (where v1 had "Chrome Recommended"), and the usage stats switch where v1 drew the build line.
import { App, Dimensions } from '../../shim.ts';
import { USAGE_STATS, footerLinks } from '../about.ts';
import { ABOUT_TAB, type SettingsContext } from './context.ts';
import type { PanelPoint } from './settingsView.ts';

/** v1's line height for this type (About's blurbs). */
const FOOT_LINE = 14;

/** The usage stats switch (About only), bottom right in v1's build type; the build line moves up
 * one line. Measuring sets the panel's font, as v1 would. */
export function statsBox(context: SettingsContext) {
  const panel = context.panel;
  if (!context.host.usageStats || panel._OpenTab !== ABOUT_TAB) return null;
  const unit = App.Unit,
    ctx = panel.Ctx;
  ctx.font = App.Metrics.TxtItalic2;
  const width = ctx.measureText(USAGE_STATS(context.host.usageStats.get())).width,
    y = panel.OffsetY + panel.DrawTo.Height - 20 * unit;
  return { x: panel.DrawTo.Width - 20 * unit - width, y, w: width, u: unit };
}

/** The footer links in one centred row, 30 units apart. */
function footer(context: SettingsContext) {
  const panel = context.panel,
    unit = App.Unit,
    ctx = panel.Ctx;
  ctx.font = App.Metrics.TxtLarge;
  const widths = footerLinks().map((link) => ctx.measureText(link.label).width),
    gap = 30 * unit,
    y = panel.OffsetY + panel.DrawTo.Height - 20 * unit;
  let x = App.Width * 0.5 - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) * 0.5;
  const links = widths.map((width) => {
    const link = { x, w: width };
    x += width + gap;
    return link;
  });
  return { links, y, u: unit };
}

export function installAboutFooter(context: SettingsContext): void {
  const panel = context.panel;
  panel.usageStatsSwitch = () => {
    const box = statsBox(context),
      pixelRatio = App.Metrics.PixelRatio,
      usageStats = context.host.usageStats;
    return box && usageStats
      ? {
          x: (box.x + box.w / 2) / pixelRatio,
          y: (box.y - 4 * box.u) / pixelRatio,
          label: USAGE_STATS(usageStats.get()),
        }
      : null;
  };
  panel.footerLinks = () => {
    const foot = footer(context),
      pixelRatio = App.Metrics.PixelRatio;
    return foot.links.map((link, i) => ({
      label: footerLinks()[i].label,
      x: (link.x + link.w / 2) / pixelRatio,
      y: (foot.y - 5 * foot.u) / pixelRatio,
    }));
  };
}

export function hitAboutFooter(context: SettingsContext, point: PanelPoint): void {
  const foot = footer(context),
    unit = foot.u;
  context.hover.link =
    context.panel._OpenTab !== ABOUT_TAB
      ? -1
      : foot.links.findIndex((link) =>
          Dimensions.hitRect(
            link.x - 5 * unit,
            foot.y - 20 * unit,
            link.w + 10 * unit,
            30 * unit,
            point.x,
            point.y,
          ),
        );
  const box = statsBox(context);
  context.hover.stats =
    !!box &&
    Dimensions.hitRect(
      box.x - 4 * box.u,
      box.y - 14 * box.u,
      box.w + 8 * box.u,
      20 * box.u,
      point.x,
      point.y,
    );
}

/** A press on a footer link or the stats switch; true when it took the press. */
export function pressAboutFooter(context: SettingsContext): boolean {
  const usageStats = context.host.usageStats;
  if (context.hover.link >= 0) {
    window.open(footerLinks()[context.hover.link].url, '_blank');
    return true;
  }
  if (context.hover.stats && usageStats) {
    usageStats.set(!usageStats.get());
    return true;
  }
  return false;
}

/** The footer and, when shown, the stats switch with the build line above it. */
export function drawAboutFooter(context: SettingsContext, build: string): void {
  const panel = context.panel,
    ctx = panel.Ctx,
    foot = footer(context),
    textColour = App.Palette[App.ThemeManager.Txt];
  App.FillColor(ctx, textColour);
  App.StrokeColor(ctx, textColour);
  ctx.font = App.Metrics.TxtLarge;
  ctx.textAlign = 'left';
  foot.links.forEach((link, i) => {
    ctx.fillText(footerLinks()[i].label, link.x, foot.y);
    if (i === context.hover.link) underline(ctx, link.x, link.w, foot.y + 2 * foot.u);
  });
  const box = statsBox(context),
    usageStats = context.host.usageStats;
  if (box && usageStats) {
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'right';
    ctx.fillText(build, panel.DrawTo.Width - 20 * box.u, box.y - FOOT_LINE * box.u);
    ctx.textAlign = 'left';
    ctx.fillText(USAGE_STATS(usageStats.get()), box.x, box.y);
    if (context.hover.stats) underline(ctx, box.x, box.w, box.y + 2 * box.u);
  }
}

function underline(ctx: CanvasRenderingContext2D, x: number, width: number, y: number): void {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
}
