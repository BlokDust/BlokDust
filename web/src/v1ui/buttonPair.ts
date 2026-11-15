// Two action buttons side by side on one row (owner, 2026-11-14: a Stage's OPEN STAGE and LOAD PATCH), each drawn as
// v1's OptionActionButton draws its one: the text in TxtMid in a box, centred in its half of the row.
// The form declares the row as v1's "actionbutton" for the first (so v1's OptionsPanel lays it out); installButtonPairs
// turns rows whose setting is listed in PAIRS into pairs after each Populate, and handles their clicks.
import { App, Dimensions } from './shim.ts';

/** First button's setting → the second button. */
const PAIRS: Record<string, { text: string; setting: string }> = {
  openStage: { text: 'Load Patch', setting: 'loadStagePatch' },
};

function adapt(o: any): void {
  const second = PAIRS[o.Setting];
  o.Type = 'buttonpair';
  o.Settings = [o.Setting, second.setting];
  o.Texts = [o._Text, second.text];
  o.HandleRoll = [false, false];
  o.Draw = function (this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any) {
    const y = this.Position.y, height = this.Size.height, dataType = Math.round(units * 10);
    ctx.globalAlpha = 1;
    // DIVIDERS (v1 OptionActionButton) //
    App.StrokeColor(ctx, App.Palette[1]);
    if (i !== panel.Options.length - 1) {
      ctx.beginPath(); ctx.moveTo(panel.Margin - units, y + height); ctx.lineTo(panel.Range + panel.Margin + units, y + height); ctx.stroke();
    }
    // TEXT AND BOX, one per half //
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'center';
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.lineWidth = 2;
    this.Texts.forEach((t: string, k: number) => {
      const cx = panel.Margin + panel.Range * (k ? 0.75 : 0.25), text = t.toUpperCase();
      const boxWidth = ctx.measureText(text).width * 0.5 + 15 * units;
      ctx.fillText(text, cx, y + height * 0.5 + dataType * 0.4);
      ctx.beginPath();
      ctx.moveTo(cx - boxWidth, y + height * 0.25); ctx.lineTo(cx - boxWidth, y + height * 0.75);
      ctx.lineTo(cx + boxWidth, y + height * 0.75); ctx.lineTo(cx + boxWidth, y + height * 0.25);
      ctx.closePath(); ctx.stroke();
    });
  };
}

/** Teach the options panel button-pair rows (once, at start-up). */
export function installButtonPairs(panel: any): void {
  const pairs = () => ((panel.Options ?? []) as any[]).filter(o => o.Type === 'buttonpair');
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) if (o.Type === 'actionbutton' && PAIRS[o.Setting]) adapt(o);
  };
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    for (const o of pairs()) {
      const x = panel.Position.x + panel.Margin, y = panel.Position.y + o.Position.y, half = panel.Range * 0.5;
      o.HandleRoll[0] = Dimensions.hitRect(x, y, half, o.Size.height, mx, my);
      o.HandleRoll[1] = Dimensions.hitRect(x + half, y, half, o.Size.height, mx, my);
    }
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    panel.RolloverCheck(mx, my);
    const hit = pairs().find(o => o.HandleRoll[0] || o.HandleRoll[1]);
    if (!hit) { mouseDown(mx, my); return; }
    panel.SelectedBlock.SetParam(hit.Settings[hit.HandleRoll[1] ? 1 : 0], 0);
  };
}
