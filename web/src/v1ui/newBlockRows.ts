// The live rows of the new blocks' options panels (SCOPE-0005): declared as sliders by their forms (newBlocks.ts), so v1's
// OptionsPanel lays them out, then drawn here from the engine's monitors: the level meters, the Counter's pattern, the
// Wavetable's picture; and a Prism's exits drawn on the stage while its panel is open.
import { App, Point } from './shim.ts';
import { drawNoteBars, drawRange } from './noteBars.ts';
import { tablePicture } from '../engine/wasmEngine.ts';
import { counterSteps, dB, monitorOf, prismAngles, WAVETABLES } from './newBlocks.ts';

// ---- live rows: declared as sliders (so v1's OptionsPanel lays them out), then redrawn here ----
type RowDraw = (this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any) => void;

/** v1 OptionMeter's look (Settings › dB Meter), for a block: the level as a bar on −60…0 dB. Under the bar, a
 * Compressor shows its gain reduction, growing leftward from 0 dB; a Sound Laser shows a full bar while its beam is on.
 * The row is also the Threshold slider (owner, 2026-11-14): a full-height line with v1's grab diamond, dragged like
 * any slider (its value is the threshold, CONVERT). */
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
  if (block?.def?.id === 'fx.compressor') {
    // GAIN REDUCTION (24 dB across the row) //
    const gr = Math.max(0, Math.min(1, -m[1] / 24)) * w;
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x + w - gr, y + h * 0.65, gr, h * 0.16);
  } else if (m[1] > 0) {
    // SOUND LASER: its beam is on (the Laser's colour, a bar under the level) //
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x - units, y + h * 0.65, w + units, h * 0.16);
  }
  // THRESHOLD: v1 OptionSlider's line and grab triangles, in the text colour //
  const tx = x + Math.max(0, Math.min(w, this.Position.x)), d = h * 0.2;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.fillRect(tx - units, y, 2 * units, h);
  ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d, mid); ctx.lineTo(tx, mid + d); ctx.closePath(); ctx.fill();
  App.FillColor(ctx, App.Palette[8]);
  ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d * 0.5, mid - d * 0.5); ctx.lineTo(tx - d * 0.5, mid + d * 0.5); ctx.closePath(); ctx.fill();
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  if (this.Selected) {  // VALUE TOOLTIP (v1) //
    ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtSlider;
    ctx.fillText(dB(this.Value), tx + 25 * units, mid + Math.round(units * 33) * 0.35);
  }
  // NAME //
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  this.Shown = { level: m[0], reduction: m[1], on: m[1] > 0, thresholdX: tx - x, width: w };  // tests
};

/** The Counter's pattern: a diamond per step (v1's slider grab shape), filled where it fires; the step the next
 * hit lands on is underlined (v1's selection bar). */
const drawCounterPattern: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, p = block?.Params ?? {}, m = monitorOf(block?.Id) ?? [0, 0];
  const pattern = counterSteps(p), n = pattern.length;
  const cell = w / 16, r = Math.min(cell * 0.36, h * 0.3), x0 = x + (w - cell * n) * 0.5, next = Math.round(m[0]) % n;
  const colours = panel.SliderColours, dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(panel.Margin - units, y + h); ctx.lineTo(w + panel.Margin + units, y + h); ctx.stroke(); }
  ctx.lineWidth = units;
  pattern.forEach((on, k) => {
    const cx = x0 + cell * (k + 0.5);
    ctx.beginPath(); ctx.moveTo(cx - r, mid); ctx.lineTo(cx, mid - r); ctx.lineTo(cx + r, mid); ctx.lineTo(cx, mid + r); ctx.closePath();
    if (on) { App.FillColor(ctx, colours[i % colours.length]); ctx.fill(); }
    else { App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; }
    if (k === next) { App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]); ctx.fillRect(cx - r, mid + r + 3 * units, 2 * r, 2 * units); }
  });
  ctx.lineWidth = 1;
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
  this.Shown = { pattern: pattern.map(on => (on ? 'x' : '.')).join(''), next, cells: pattern.map((_, k) => x0 + cell * (k + 0.5)), cell };  // tests, clicks
};
/** A press on the Counter's pattern row toggles the step under it (owner, 2026-11-14): the steps are then set by hand
 * until Steps, Hits or Rotate moves. Returns true when it took the press. */
function counterPress(panel: any, mx: number, my: number): boolean {
  const block = panel.SelectedBlock;
  if (block?.def?.id !== 'power.counter' || panel.Scale !== 1) return false;
  const row = (panel.Options as any[]).find(o => o.Setting === 'counterPattern');
  if (!row?.Shown?.cells) return false;
  const y = panel.Position.y + row.Position.y;
  if (my < y || my > y + row.Size.height) return false;
  const k = (row.Shown.cells as number[]).findIndex(cx => Math.abs(mx - (panel.Position.x + cx)) <= row.Shown.cell / 2);
  if (k < 0) return false;
  const steps = counterSteps(block.Params);
  steps[k] = !steps[k];
  const mask = steps.reduce((m, on, i) => m | (on ? 1 << i : 0), 0);
  block.Params.pattern = mask;
  App.MainScene.setParam(block, 'pattern', mask);
  panel._DrawReady = true;
  return true;
}

// ---- the Wavetable's picture (CHG-0031, SPEC-AUDIO-WAVETABLE R7) ----
let tableModule: WebAssembly.Module | null = null;
/** The engine module the pictures are drawn with (the app hands it over once loaded). */
export function setTableModule(m: WebAssembly.Module): void { tableModule = m; }
const pictures = new Map<string, Float32Array>();
function pictureOf(table: number, position: number): Float32Array | null {
  if (!tableModule) return null;
  const key = `${table}:${Math.round(position * 512)}`;
  let p = pictures.get(key);
  if (!p) {
    if (pictures.size > 256) pictures.clear();
    p = tablePicture(tableModule, table, Math.round(position * 512) / 512, 200);
    pictures.set(key, p);
  }
  return p;
}
/** v1 OptionWave's look (the Sample's waveform: divider, fill in palette 1, name on the left), but the wave itself,
 * filled between it and the middle line: one cycle of the frame the block plays (two note cycles of a bell or gong).
 * It reads the Position slider as shown, so it moves with an LFO or Dust automation. */
const drawWavePicture: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const block = panel.SelectedBlock, dataType = Math.round(units * 10);
  const posRow = (panel.Options as any[]).find(o => o.Setting === 'position');
  const table = Math.max(0, Math.min(WAVETABLES.length - 1, Math.round(Number(block?.Params?.table ?? 0))));
  const position = Math.max(0, Math.min(1, Number(posRow?.Value ?? block?.Params?.position ?? 0)));
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(x - units, y + h); ctx.lineTo(w + x + units, y + h); ctx.stroke(); }
  const pic = pictureOf(table, position);
  App.FillColor(ctx, App.Palette[1]);
  if (pic) {
    ctx.beginPath();
    ctx.moveTo(x, mid);
    pic.forEach((v, j) => ctx.lineTo(x + (w / (pic.length - 1)) * j, mid - v * h * 0.45));
    ctx.lineTo(x + w, mid);
    ctx.closePath();
    ctx.fill();
  } else App.AnimationsLayer.DrawSprite(ctx, 'loading', x + w * 0.5, mid, 11, true);  // v1's loading square
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), x - 15 * units, mid + dataType * 0.4);
  this.Shown = { table: WAVETABLES[table], position, drawn: !!pic, first: pic ? Array.from(pic.slice(0, 8)) : [] };  // tests
};

/** Live rows that are also sliders (dragged as v1 drags any slider). */
const METER_ROWS = new Set(['compMeter', 'soundMeter']);
const LIVE_ROWS: Record<string, RowDraw> = { compMeter: drawCompressorMeter, soundMeter: drawCompressorMeter, counterPattern: drawCounterPattern, wavePicture: drawWavePicture, noteBars: drawNoteBars, noteRange: drawRange };
/** Is `setting` a live row (drawn here), or a live row that is also a slider (a meter)? (LFO targets skip the rest.) */
export const isLiveRow = (setting: string): boolean => !!LIVE_ROWS[setting];
export const isMeterRow = (setting: string): boolean => METER_ROWS.has(setting);

/** A selected Prism's exit directions, drawn on the stage while its panel is open (as a Laser shows its beam): thin
 * dashed lines from the block, following its rotation. */
export function drawPrismExits(ctx: CanvasRenderingContext2D, panel: any): void {
  const b = panel.SelectedBlock;
  const emitter = b?.def?.id === 'power.emitter';  // a Particle Emitter shows the way it fires too (owner, 2026-11-14)
  if (!b || panel.Scale !== 1 || (b.def?.id !== 'power.prism' && !emitter)) return;
  const angle = emitter ? Number(b.Params.angle) : monitorOf(b.Id)?.[0] ?? Number(b.Params.angle), len = 6;
  const from = App.Metrics.PointOnGrid(new Point(b.Position.x, b.Position.y));
  ctx.save();
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.globalAlpha = 0.6; ctx.lineWidth = App.Unit; ctx.setLineDash([4 * App.Unit, 4 * App.Unit]);
  const ends: [number, number][] = [];
  for (const a of emitter ? [angle] : prismAngles(angle, Number(b.Params.streams), Number(b.Params.spread))) {
    const rad = a * Math.PI / 180, to = App.Metrics.PointOnGrid(new Point(b.Position.x + Math.cos(rad) * len, b.Position.y + Math.sin(rad) * len));
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ends.push([to.x - from.x, to.y - from.y]);
  }
  ctx.restore();
  panel.PrismExits = ends;  // tests
}

/** Sliders that stick at 0 (owner, 2026-11-14): a drag into the middle stops at 0; staying near it for a moment lets
 * small values either side through. */
const SNAP_ZERO = new Set(['power.laser:rotate', 'power.prism:rotate']);
const SNAP_ZONE = 0.05, SNAP_HOLD_MS = 500;

/** Teach the options panel the live rows (once, at start-up). */
export function installLiveRows(panel: any): void {
  const sliderSet = panel.SliderSet.bind(panel);
  panel.SliderSet = (n: number, mx: number) => {
    sliderSet(n, mx);
    const o = panel.Options?.[n];
    // A Counter's steps set by hand give way to the Euclidean pattern once Steps, Hits or Rotate moves.
    if (o && panel.SelectedBlock?.def?.id === 'power.counter' && ['steps', 'hits', 'rotate'].includes(o.Setting) && Number(panel.SelectedBlock.Params.pattern ?? -1) >= 0) {
      panel.SelectedBlock.Params.pattern = -1;
      App.MainScene.setParam(panel.SelectedBlock, 'pattern', -1);
    }
    if (!o || !SNAP_ZERO.has(`${panel.SelectedBlock?.def?.id}:${o.Setting}`)) return;
    const now = performance.now();
    if (Math.abs(o.Value) > (o.Max - o.Min) * SNAP_ZONE) { o.SnapSince = undefined; return; }
    o.SnapSince ??= now;
    if (now - o.SnapSince < SNAP_HOLD_MS && o.Value !== 0) {
      o.Value = 0; o.Position.x = panel.linPosition(0, panel.Range, o.Min, o.Max, 0);
      panel.SelectedBlock.SetParam(o.Setting, 0);
    }
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => { if (counterPress(panel, mx, my)) panel.Hover = true; else mouseDown(mx, my); };  // the press is the panel's
  // SampleGen's SOUND (CHG-0035, owner 2026-11-17): its number always shows (v1 shows a slider's value only while
  // it is held, and the panel is built again when the wave arrives), and the wave is made when the slider is let go.
  const mouseUp = panel.MouseUp.bind(panel);
  panel.MouseUp = () => {
    const sound = (panel.Options as any[] | undefined)?.find(o => o.Setting === 'sound' && o.Selected);
    const block = panel.SelectedBlock;
    mouseUp();
    if (sound && block) App.MainScene.host.setSound(block.Id, Number(block.Params.sound) || 1, true);
  };
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    for (const o of panel.Options as any[]) {
      if (o.Type === 'slider' && o.Setting === 'sound' && panel.SelectedBlock?.def?.id === 'source.sample-gen') {
        const draw = o.Draw.bind(o);
        o.Draw = (...a: unknown[]) => { const held = o.Selected; o.Selected = true; try { draw(...a); } finally { o.Selected = held; } };
      }
      const draw = o.Type === 'slider' ? LIVE_ROWS[o.Setting] : undefined;
      if (draw) { if (!METER_ROWS.has(o.Setting)) o.Type = 'live'; o.Live = true; o.Draw = draw; }
    }
    // v1 keeps a slider's rollover by row number; rows that are no longer sliders must not inherit one.
    (panel.Options as any[]).forEach((o, i) => { if (o.Type !== 'slider' && o.Type !== 'waveslider' && panel._SliderRoll) panel._SliderRoll[i] = false; });
  };
}
/** Is a live row showing? (The scene then redraws the panel every frame.) */
export const hasLiveRows = (panel: any): boolean => panel.Scale > 0 &&
  (((panel.Options ?? []) as any[]).some(o => o.Live) || panel.SelectedBlock?.def?.id === 'power.prism' || panel.SelectedBlock?.def?.id === 'power.emitter' ||  // their guide lines turn with them
   panel.SelectedBlock?.def?.id === 'input.touchpad');     // the Touchpad's pads light as they are played
