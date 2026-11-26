// A selector row for options panels (CHG-0010): an arrow either side of the choice, as v1's
// Settings theme row. Forms declare it as a slider; installSelectors adapts the row after Populate.
import { App, Dimensions } from './shim.ts';
import type { PanelOption, V2OptionsPanel } from './optionsTypes.ts';

/** Settings shown as selectors. */
const SELECTORS = new Set(['deviceIndex']);
/** The post-2.0 blocks' carousels (newBlocks/forms.ts) register their settings here. */
export const addSelector = (setting: string): void => {
  SELECTORS.add(setting);
};
export const isSelector = (setting: string): boolean => SELECTORS.has(setting);

/** Fit `text` in `width` px, ending in "…" when cut. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let low = 0,
    high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= width) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low).trimEnd()}…`;
}

/** The row: its name at the left (as v1's sliders), the theme row's arrows, the choice between. */
function drawSelector(
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  _index: number,
  panel: V2OptionsPanel,
): void {
  const x = panel.Margin,
    width = panel.Range,
    mid = this.Position.y + this.Size.height * 0.5;
  const arrow = Math.min(20 * units, this.Size.height * 0.3),
    dataType = Math.round(units * 10);
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  ctx.beginPath();
  ctx.moveTo(x + arrow, mid - arrow);
  ctx.lineTo(x, mid);
  ctx.lineTo(x + arrow, mid + arrow);
  ctx.moveTo(x + width - arrow, mid - arrow);
  ctx.lineTo(x + width, mid);
  ctx.lineTo(x + width - arrow, mid + arrow);
  ctx.stroke();
  const shown = this.DisplayConversion ? this.DisplayConversion(this.Value) : String(this.Value);
  const text = fit(ctx, shown, width - 80 * units);
  ctx.textAlign = 'center';
  ctx.fillText(text, x + width * 0.5, mid + 6 * units);
  this.TextWidth = ctx.measureText(text).width;
}

function adapt(option: PanelOption): void {
  option.Type = 'selector';
  option.HandleRoll = [false, false];
  option.Draw = drawSelector;
}

/** Teach the options panel selector rows (once, at start-up). */
export function installSelectors(panel: V2OptionsPanel): void {
  const selectors = () => panel.Options.filter((option) => option.Type === 'selector');
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    populate(json, open);
    for (const option of panel.Options)
      if (option.Type === 'slider' && SELECTORS.has(option.Setting)) adapt(option);
  };
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    const unit = App.Unit,
      left = panel.Position.x + panel.Margin;
    for (const option of selectors()) {
      const y = panel.Position.y + option.Position.y,
        height = option.Size.height;
      option.HandleRoll[0] = Dimensions.hitRect(left - 10 * unit, y, 40 * unit, height, mx, my);
      option.HandleRoll[1] = Dimensions.hitRect(
        left + panel.Range - 30 * unit,
        y,
        40 * unit,
        height,
        mx,
        my,
      );
    }
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    panel.RolloverCheck(mx, my);
    const hit = selectors().find((option) => option.HandleRoll[0] || option.HandleRoll[1]);
    const block = panel.SelectedBlock;
    if (!hit || !block) {
      mouseDown(mx, my);
      return;
    }
    // Step through min..max, wrapping round (v1's theme arrows wrap too).
    const span = hit.Max - hit.Min + 1,
      step = hit.HandleRoll[1] ? 1 : -1;
    const next = hit.Min + ((((Math.round(hit.Value) - hit.Min + step) % span) + span) % span);
    block.SetParam(hit.Setting, next);
    block.RefreshOptionsPanel();
  };
}
