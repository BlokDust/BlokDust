// The post-2.0 blocks (SCOPE-0005) in v1's UI. v1 knows nothing of them, so this file gives the ported UI what it
// needs: their menu items (after v1's own in each category), their menu icons (drawn from the manifest geometry, as
// v1's BlockSprites draws its own), their options forms (built from v1's option types) and the live rows some panels
// show (a level meter, …), which read the engine's monitors.
import { BLOCKS_BY_ID, type BlockDef } from '../generated/blocks.gen.ts';
import { App, Point } from './shim.ts';

/** Menu order within each v1 category (appended after v1's items). */
const MENU: Record<string, string[]> = {
  Source: [],
  Effect: ['fx.compressor'],
  Power: [],
  Interaction: [],
};
const NEW_DEFS: BlockDef[] = Object.values(MENU).flat().map(id => BLOCKS_BY_ID.get(id)).filter((d): d is BlockDef => !!d);
const BY_NAME = new Map(NEW_DEFS.map(d => [d.name.toLowerCase(), d]));

/** Add the new blocks to v1's menu JSON (once, before the header is populated). */
export function installNewBlockMenu(): void {
  for (const cat of (App.BlockCreator.MenuJson as { categories: { name: string; items: { name: string; id: string; description: string }[] }[] }).categories) {
    for (const id of MENU[cat.name] ?? []) {
      const def = BLOCKS_BY_ID.get(id);
      if (def && !cat.items.some(i => i.id === def.menuId)) cat.items.push({ name: def.name, id: def.menuId, description: def.description });
    }
  }
}

/** v1 BlockSprites.DrawSprite for a new block (unscaled: menu icons and items dragged from the menu). */
export function drawNewSprite(ctx: CanvasRenderingContext2D, pos: Point, name: string): boolean {
  const def = BY_NAME.get(name);
  if (!def) return false;
  const grd = App.GridSize, [ox, oy] = def.geometry.menuOffset ?? [0, 0];
  for (const l of def.geometry.layers) {
    if (l.units === 'unit') continue;
    ctx.beginPath();
    l.points.forEach(([x, y], i) => { const px = pos.x + (ox + x) * grd, py = pos.y + (oy + y) * grd; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.closePath();
    App.FillColor(ctx, App.Palette[l.palette]);
    ctx.fill();
  }
  return true;
}

// ---- live readouts (Engine::monitors), by block id ----
const monitors = new Map<number, number[]>();
export function setMonitors(packed: Float32Array): void {
  monitors.clear();
  for (let i = 0; i + 4 < packed.length; i += 5) monitors.set(packed[i], [packed[i + 1], packed[i + 2], packed[i + 3], packed[i + 4]]);
}
export const monitorOf = (id: number): number[] | undefined => monitors.get(id);

// ---- options forms ----
interface FormBlock { Id: number; BlockName: string; Params: Record<string, any>; OptionsForm: any; def: BlockDef }
interface SliderOpts { quantised?: boolean; centered?: boolean; log?: boolean; display?: (v: number) => string }
const slider = (name: string, setting: string, value: number, min: number, max: number, o: SliderOpts = {}) => ({ type: 'slider', name, setting,
  props: { value, min, max, quantised: !!o.quantised, centered: !!o.centered, ...(o.log ? { logarithmic: true } : {}), ...(o.display ? { convertDisplay: o.display } : {}) } });
const dB = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);

/** Slider settings that are not the param itself: the slider's value → the param's. */
const CONVERT: Record<string, { param: string; to: (v: number) => number }> = {
  attackMs: { param: 'attack', to: v => v / 1000 },
  releaseMs: { param: 'release', to: v => v / 1000 },
};
/** v1 SetParam for the settings above. Returns the param and value to send, or null when `key` is an ordinary param. */
export function convertSetting(key: string, value: number): { param: string; value: number } | null {
  const c = CONVERT[key];
  return c ? { param: c.param, value: c.to(Number(value)) } : null;
}

const FORMS: Record<string, (b: FormBlock) => any[]> = {
  // CHG-0014: a level meter with the threshold on it (v1's dB meter), then Web Audio's compressor settings.
  'fx.compressor': b => [
    slider('Level', 'compMeter', 0, 0, 1),
    slider('Threshold', 'threshold', Number(b.Params.threshold), -60, 0, { display: dB }),
    slider('Ratio', 'ratio', Number(b.Params.ratio), 1, 20, { display: v => `${v.toFixed(1)} : 1` }),
    slider('Knee', 'knee', Number(b.Params.knee), 0, 40, { display: dB }),
    slider('Attack', 'attackMs', Math.max(1, Number(b.Params.attack) * 1000), 1, 1000, { log: true, display: ms }),
    slider('Release', 'releaseMs', Math.max(10, Number(b.Params.release) * 1000), 10, 1000, { log: true, display: ms }),
    slider('Makeup', 'makeup', Number(b.Params.makeup), -24, 24, { centered: true, display: dB }),
  ],
};
/** The options form of a new block (v1 UpdateOptionsForm), or false when `b` is not one. */
export function newBlockForm(b: FormBlock): boolean {
  const f = FORMS[b.def.id];
  if (!f) return false;
  b.OptionsForm = { name: b.BlockName, parameters: f(b) };
  return true;
}

// ---- live rows: declared as sliders (so v1's OptionsPanel lays them out), then redrawn here ----
type RowDraw = (this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any) => void;

/** v1 OptionMeter's look (Settings › dB Meter), for a block: the input level as a bar on −60…0 dB, the threshold as
 * v1's peak marker, and under the bar the gain reduction, growing leftward from 0 dB. */
const drawCompressorMeter: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, m = monitorOf(block?.Id) ?? [-100, 0];
  const at = (db: number) => Math.max(0, Math.min(1, (db + 60) / 60)) * w;
  const colours = panel.SliderColours, dataType = Math.round(units * 10);
  // DIVIDER (v1 OptionSlider) //
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(panel.Margin - units, y + h); ctx.lineTo(w + panel.Margin + units, y + h); ctx.stroke(); }
  panel.diagonalFill(x - units, y + units, w + 2 * units, h - 2 * units, 9);
  // LEVEL //
  App.FillColor(ctx, colours[i % colours.length]);
  ctx.fillRect(x - units, y + h * 0.19, units + at(m[0]), h * 0.4);
  // GAIN REDUCTION (24 dB across the row) //
  const gr = Math.max(0, Math.min(1, -m[1] / 24)) * w;
  App.FillColor(ctx, colours[(i + 1) % colours.length]);
  ctx.fillRect(x + w - gr, y + h * 0.65, gr, h * 0.16);
  // THRESHOLD (v1 OptionMeter's peak marker) //
  const tx = x + at(Number(block?.Params.threshold ?? -24)), d = 2 * units;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.fillRect(tx - 0.5 * units, y + h * 0.19, units, h * 0.62);
  ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d, mid); ctx.lineTo(tx, mid + d); ctx.closePath(); ctx.fill();
  // NAME //
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  this.Shown = { level: m[0], reduction: m[1], thresholdX: tx - x, width: w };  // tests
};

const LIVE_ROWS: Record<string, RowDraw> = { compMeter: drawCompressorMeter };

/** Teach the options panel the live rows (once, at start-up). */
export function installLiveRows(panel: any): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) {
      const draw = o.Type === 'slider' ? LIVE_ROWS[o.Setting] : undefined;
      if (draw) { o.Type = 'live'; o.Live = true; o.Draw = draw; }
    }
  };
}
/** Is a live row showing? (The scene then redraws the panel every frame.) */
export const hasLiveRows = (panel: any): boolean => panel.Scale > 0 && ((panel.Options ?? []) as any[]).some(o => o.Live);
