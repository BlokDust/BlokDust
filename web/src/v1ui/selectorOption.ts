// A selector row for block options panels (owner, 2026-11-12, CHG-0010): an arrow either side and the choice between
// them, in the style of v1's Settings colour theme row (v1 OptionColorTheme: the arrows' shape and proportions, the
// value in TxtMid, the name left of the row as v1's sliders put it). The MIDI Keyboard's Device used a slider, and a
// long device name ran off the panel at the right-hand end.
// The form declares the row as a slider (so v1's OptionsPanel lays it out); installSelectors turns rows whose setting is
// listed in SELECTORS into selectors after each Populate, and handles their arrow clicks.
import { App, Dimensions } from './shim.ts';

/** Settings shown as selectors. */
const SELECTORS = new Set(['deviceIndex']);
/** The post-2.0 blocks' carousels (newBlocks.ts) register their settings here. */
export const addSelector = (setting: string): void => { SELECTORS.add(setting); };

/** Fit `text` in `width` px, ending in "…" when cut. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (ctx.measureText(`${text.slice(0, mid)}…`).width <= width) lo = mid; else hi = mid - 1; }
  return `${text.slice(0, lo).trimEnd()}…`;
}

function adapt(o: any): void {
  o.Type = 'selector';
  o.HandleRoll = [false, false];
  o.Draw = function (this: any, ctx: CanvasRenderingContext2D, units: number, _i: number, panel: any) {
    const x = panel.Margin, width = panel.Range, y = this.Position.y, height = this.Size.height, mid = y + height * 0.5;
    const arrow = Math.min(20 * units, height * 0.3), dataType = Math.round(units * 10);
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    // PARAM NAME (v1 OptionSlider) //
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'right';
    ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
    // ARROWS (v1 OptionColorTheme) //
    ctx.beginPath();
    ctx.moveTo(x + arrow, mid - arrow); ctx.lineTo(x, mid); ctx.lineTo(x + arrow, mid + arrow);
    ctx.moveTo(x + width - arrow, mid - arrow); ctx.lineTo(x + width, mid); ctx.lineTo(x + width - arrow, mid + arrow);
    ctx.stroke();
    // THE CHOICE, centred between them //
    const text = fit(ctx, String(this.DisplayConversion ? this.DisplayConversion(this.Value) : this.Value), width - 80 * units);
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width * 0.5, mid + 6 * units);
    this.TextWidth = ctx.measureText(text).width;  // tests: it fits between the arrows
  };
}

/** Teach the options panel selector rows (once, at start-up). */
export function installSelectors(panel: any): void {
  const selectors = () => ((panel.Options ?? []) as any[]).filter(o => o.Type === 'selector');
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) if (o.Type === 'slider' && SELECTORS.has(o.Setting)) adapt(o);
  };
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    const u = App.Unit;
    for (const o of selectors()) {
      const y = panel.Position.y + o.Position.y;
      o.HandleRoll[0] = Dimensions.hitRect(panel.Position.x + panel.Margin - 10 * u, y, 40 * u, o.Size.height, mx, my);
      o.HandleRoll[1] = Dimensions.hitRect(panel.Position.x + panel.Margin + panel.Range - 30 * u, y, 40 * u, o.Size.height, mx, my);
    }
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    panel.RolloverCheck(mx, my);
    const hit = selectors().find(o => o.HandleRoll[0] || o.HandleRoll[1]);
    if (!hit) { mouseDown(mx, my); return; }
    // Step through min..max, wrapping round (v1's theme arrows wrap too).
    const span = hit.Max - hit.Min + 1, step = hit.HandleRoll[1] ? 1 : -1;
    const next = hit.Min + ((((Math.round(hit.Value) - hit.Min + step) % span) + span) % span);
    const block = panel.SelectedBlock;
    block.SetParam(hit.Setting, next);
    block.RefreshOptionsPanel();
  };
}
