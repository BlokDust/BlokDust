// The new blocks' live rows (SCOPE-0005): declared as sliders so v1's OptionsPanel lays them out,
// then drawn from the engine's monitors; and a Prism's exits on the stage while its panel is open.
import { App, Point } from '../shim.ts';
import { drawNoteBars, drawRange } from '../noteBars.ts';
import { tablePicture } from '../../engine/wasmEngine.ts';
import type { PanelOption, RowDraw, V2OptionsPanel } from '../optionsTypes.ts';
import { WAVETABLES, dB } from './formRows.ts';
import { monitorOf } from './monitors.ts';
import { counterSteps, prismAngles } from './patterns.ts';

/** v1 OptionSlider's divider under every row but the last. */
function drawDivider(
  ctx: CanvasRenderingContext2D,
  row: PanelOption,
  units: number,
  index: number,
  panel: V2OptionsPanel,
): void {
  const y = row.Position.y + row.Size.height;
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (index === panel.Options.length - 1) return;
  ctx.beginPath();
  ctx.moveTo(panel.Margin - units, y);
  ctx.lineTo(panel.Range + panel.Margin + units, y);
  ctx.stroke();
}
/** v1 OptionSlider's grab diamond with its palette 8 half, at (x, mid), `size` from its centre. */
export function drawGrab(
  ctx: CanvasRenderingContext2D,
  x: number,
  mid: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x - size, mid);
  ctx.lineTo(x, mid - size);
  ctx.lineTo(x + size, mid);
  ctx.lineTo(x, mid + size);
  ctx.closePath();
  ctx.fill();
  App.FillColor(ctx, App.Palette[8]);
  ctx.beginPath();
  ctx.moveTo(x - size, mid);
  ctx.lineTo(x, mid - size);
  ctx.lineTo(x + size * 0.5, mid - size * 0.5);
  ctx.lineTo(x - size * 0.5, mid + size * 0.5);
  ctx.closePath();
  ctx.fill();
}
/** The row's name, right-aligned left of the row as v1's sliders put it. */
function drawName(
  ctx: CanvasRenderingContext2D,
  row: PanelOption,
  units: number,
  panel: V2OptionsPanel,
): void {
  const mid = row.Position.y + row.Size.height * 0.5,
    dataType = Math.round(units * 10);
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(row.Name.toUpperCase(), panel.Margin - 15 * units, mid + dataType * 0.4);
}

/** v1 OptionMeter's look, for a block: the level as a bar on −60…0 dB; under it a Compressor's gain
 * reduction (leftward from 0 dB), or a Sound Laser's beam. The row is also the Threshold slider. */
const drawLevelMeter: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    h = this.Size.height,
    mid = y + h * 0.5;
  const block = panel.SelectedBlock,
    [level, second] = monitorOf(block?.Id) ?? [-100, 0];
  const at = (decibels: number) => Math.max(0, Math.min(1, (decibels + 60) / 60)) * range;
  const colours = panel.SliderColours;
  drawDivider(ctx, this, units, i, panel);
  panel.diagonalFill(x - units, y + units, range + 2 * units, h - 2 * units, 9);
  // LEVEL //
  App.FillColor(ctx, colours[i % colours.length]);
  ctx.fillRect(x - units, y + h * 0.19, units + at(level), h * 0.4);
  if (block?.def.id === 'fx.compressor') {
    // GAIN REDUCTION (24 dB across the row) //
    const reduction = Math.max(0, Math.min(1, -second / 24)) * range;
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x + range - reduction, y + h * 0.65, reduction, h * 0.16);
  } else if (second > 0) {
    // SOUND LASER: its beam is on (a bar under the level) //
    App.FillColor(ctx, colours[(i + 1) % colours.length]);
    ctx.fillRect(x - units, y + h * 0.65, range + units, h * 0.16);
  }
  // THRESHOLD: v1 OptionSlider's line and grab, in the text colour //
  const thresholdX = x + Math.max(0, Math.min(range, this.Position.x));
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.fillRect(thresholdX - units, y, 2 * units, h);
  drawGrab(ctx, thresholdX, mid, h * 0.2);
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  if (this.Selected) {
    // VALUE TOOLTIP (v1) //
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtSlider;
    ctx.fillText(dB(this.Value), thresholdX + 25 * units, mid + Math.round(units * 33) * 0.35);
  }
  drawName(ctx, this, units, panel);
  this.Shown = {
    level,
    reduction: second,
    on: second > 0,
    thresholdX: thresholdX - x,
    width: range,
  };
};

/** Where a Counter's steps were drawn (tests read it; a press toggles the step under it). */
interface CounterShown {
  pattern: string;
  next: number;
  cells: number[];
  cell: number;
}
const isCounterShown = (shown: unknown): shown is CounterShown =>
  typeof shown === 'object' && shown !== null && 'cells' in shown && 'cell' in shown;

/** The Counter's pattern: a diamond per step, filled where it fires; the step the next hit lands
 * on underlined (v1's selection bar). */
const drawCounterPattern: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    h = this.Size.height,
    mid = y + h * 0.5;
  const block = panel.SelectedBlock,
    pattern = counterSteps(block?.Params ?? {}),
    [counted] = monitorOf(block?.Id) ?? [0, 0];
  const cell = range / 16,
    size = Math.min(cell * 0.36, h * 0.3),
    left = x + (range - cell * pattern.length) * 0.5,
    next = Math.round(counted) % pattern.length;
  const colours = panel.SliderColours;
  drawDivider(ctx, this, units, i, panel);
  ctx.lineWidth = units;
  pattern.forEach((on, k) => {
    const cx = left + cell * (k + 0.5);
    ctx.beginPath();
    ctx.moveTo(cx - size, mid);
    ctx.lineTo(cx, mid - size);
    ctx.lineTo(cx + size, mid);
    ctx.lineTo(cx, mid + size);
    ctx.closePath();
    if (on) {
      App.FillColor(ctx, colours[i % colours.length]);
      ctx.fill();
    } else {
      App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (k === next) {
      App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.fillRect(cx - size, mid + size + 3 * units, 2 * size, 2 * units);
    }
  });
  ctx.lineWidth = 1;
  drawName(ctx, this, units, panel);
  const shown: CounterShown = {
    pattern: pattern.map((on) => (on ? 'x' : '.')).join(''),
    next,
    cells: pattern.map((_, k) => left + cell * (k + 0.5)),
    cell,
  };
  this.Shown = shown;
};
/** A press on the Counter's pattern toggles the step under it: the steps are then set by hand
 * until Steps, Hits or Rotate moves. True when it took the press. */
function counterPress(panel: V2OptionsPanel, mx: number, my: number): boolean {
  const block = panel.SelectedBlock;
  if (block?.def.id !== 'power.counter' || panel.Scale !== 1) return false;
  const row = panel.Options.find((option) => option.Setting === 'counterPattern');
  const shown = row?.Shown;
  if (!row || !isCounterShown(shown)) return false;
  const y = panel.Position.y + row.Position.y;
  if (my < y || my > y + row.Size.height) return false;
  const k = shown.cells.findIndex((cx) => Math.abs(mx - (panel.Position.x + cx)) <= shown.cell / 2);
  if (k < 0) return false;
  const steps = counterSteps(block.Params);
  steps[k] = !steps[k];
  const mask = steps.reduce((bits, on, i) => bits | (on ? 1 << i : 0), 0);
  block.Params.pattern = mask;
  App.MainScene.setParam(block, 'pattern', mask);
  panel._DrawReady = true;
  return true;
}

// ---- the Wavetable's picture (CHG-0031, SPEC-AUDIO-WAVETABLE R7) ----
let tableModule: WebAssembly.Module | null = null;
/** The engine module the pictures are drawn with (the app hands it over once loaded). */
export function setTableModule(module: WebAssembly.Module): void {
  tableModule = module;
}
/** Positions are rounded to 1/512 of the table. */
const POSITION_STEPS = 512;
const pictures = new Map<string, Float32Array>();
function pictureOf(table: number, position: number): Float32Array | null {
  if (!tableModule) return null;
  const key = `${table}:${Math.round(position * POSITION_STEPS)}`;
  let samples = pictures.get(key);
  if (!samples) {
    if (pictures.size > 256) pictures.clear();
    const at = Math.round(position * POSITION_STEPS) / POSITION_STEPS;
    samples = tablePicture(tableModule, table, at, 200);
    pictures.set(key, samples);
  }
  return samples;
}
/** v1 OptionWave's look, but the wave itself, filled to the middle line: one cycle of the frame the
 * block plays. It reads the Position slider as shown, so it moves with an LFO or automation. */
const drawWavePicture: RowDraw = function (ctx, units, i, panel) {
  const x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    h = this.Size.height,
    mid = y + h * 0.5;
  const block = panel.SelectedBlock;
  const positionRow = panel.Options.find((option) => option.Setting === 'position');
  const table = Math.max(
    0,
    Math.min(WAVETABLES.length - 1, Math.round(Number(block?.Params.table ?? 0))),
  );
  const position = Math.max(
    0,
    Math.min(1, Number(positionRow?.Value ?? block?.Params.position ?? 0)),
  );
  drawDivider(ctx, this, units, i, panel);
  const picture = pictureOf(table, position);
  App.FillColor(ctx, App.Palette[1]);
  if (picture) {
    ctx.beginPath();
    ctx.moveTo(x, mid);
    picture.forEach((sample, j) => {
      ctx.lineTo(x + (range / (picture.length - 1)) * j, mid - sample * h * 0.45);
    });
    ctx.lineTo(x + range, mid);
    ctx.closePath();
    ctx.fill();
  } else App.AnimationsLayer.DrawSprite(ctx, 'loading', x + range * 0.5, mid, 11, true);
  drawName(ctx, this, units, panel);
  this.Shown = {
    table: WAVETABLES[table],
    position,
    drawn: !!picture,
    first: picture ? Array.from(picture.slice(0, 8)) : [],
  };
};

/** Live rows that are also sliders (dragged as v1 drags any slider). */
const METER_ROWS = new Set(['compMeter', 'soundMeter']);
const LIVE_ROWS: Partial<Record<string, RowDraw>> = {
  compMeter: drawLevelMeter,
  soundMeter: drawLevelMeter,
  counterPattern: drawCounterPattern,
  wavePicture: drawWavePicture,
  noteBars: drawNoteBars,
  noteRange: drawRange,
};
/** Is `setting` a live row, or one that is also a slider (a meter)? (LFO targets skip the rest.) */
export const isLiveRow = (setting: string): boolean => !!LIVE_ROWS[setting];
export const isMeterRow = (setting: string): boolean => METER_ROWS.has(setting);

/** A selected Prism's exit directions on the stage while its panel is open (as a Laser shows its
 * beam): thin dashed lines from the block. A Particle Emitter shows the way it fires too. */
export function drawPrismExits(ctx: CanvasRenderingContext2D, panel: V2OptionsPanel): void {
  const block = panel.SelectedBlock;
  const emitter = block?.def.id === 'power.emitter';
  if (!block || panel.Scale !== 1 || (block.def.id !== 'power.prism' && !emitter)) return;
  const params = block.Params,
    angle = emitter ? Number(params.angle) : (monitorOf(block.Id)?.[0] ?? Number(params.angle)),
    length = 6;
  const from = App.Metrics.PointOnGrid(new Point(block.Position.x, block.Position.y));
  ctx.save();
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = App.Unit;
  ctx.setLineDash([4 * App.Unit, 4 * App.Unit]);
  const ends: [number, number][] = [];
  const angles = emitter
    ? [angle]
    : prismAngles(angle, Number(params.streams), Number(params.spread));
  for (const exit of angles) {
    const radians = (exit * Math.PI) / 180,
      to = App.Metrics.PointOnGrid(
        new Point(
          block.Position.x + Math.cos(radians) * length,
          block.Position.y + Math.sin(radians) * length,
        ),
      );
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ends.push([to.x - from.x, to.y - from.y]);
  }
  ctx.restore();
  panel.PrismExits = ends;
}

/** Sliders that stick at 0: a drag into the middle stops there; near it a moment, small values
 * either side get through. */
const SNAP_ZERO = new Set(['power.laser:rotate', 'power.prism:rotate']);
const SNAP_ZONE = 0.05,
  SNAP_HOLD_MS = 500;

/** A slider moved: a Counter's hand-set steps give way, and rotate sliders stick at 0. */
function afterSliderSet(panel: V2OptionsPanel, option: PanelOption | undefined): void {
  const block = panel.SelectedBlock;
  if (!option || !block) return;
  // A Counter's steps set by hand give way to the Euclidean pattern once Steps, Hits or Rotate moves.
  if (
    block.def.id === 'power.counter' &&
    ['steps', 'hits', 'rotate'].includes(option.Setting) &&
    Number(block.Params.pattern ?? -1) >= 0
  ) {
    block.Params.pattern = -1;
    App.MainScene.setParam(block, 'pattern', -1);
  }
  if (!SNAP_ZERO.has(`${block.def.id}:${option.Setting}`)) return;
  const now = performance.now();
  if (Math.abs(option.Value) > (option.Max - option.Min) * SNAP_ZONE) {
    option.SnapSince = undefined;
    return;
  }
  option.SnapSince ??= now;
  if (now - option.SnapSince < SNAP_HOLD_MS && option.Value !== 0) {
    option.Value = 0;
    option.Position.x = panel.linPosition(0, panel.Range, option.Min, option.Max, 0);
    block.SetParam(option.Setting, 0);
  }
}
/** SampleGen's SOUND (CHG-0035): its number always shows (v1 showed a slider's value only while it
 * was held), and the wave is made when the slider is let go. */
function showSoundNumber(option: PanelOption): void {
  const draw = option.Draw.bind(option);
  option.Draw = (...args) => {
    const held = option.Selected;
    option.Selected = true;
    try {
      draw(...args);
    } finally {
      option.Selected = held;
    }
  };
}

/** Teach the options panel the live rows (once, at start-up). */
export function installLiveRows(panel: V2OptionsPanel): void {
  const sliderSet = panel.SliderSet.bind(panel);
  panel.SliderSet = (n: number, mx: number) => {
    sliderSet(n, mx);
    afterSliderSet(panel, panel.Options[n] as PanelOption | undefined);
  };
  const mouseDown = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    if (counterPress(panel, mx, my)) panel.Hover = true;
    else mouseDown(mx, my);
  };
  const mouseUp = panel.MouseUp.bind(panel);
  panel.MouseUp = () => {
    const sound = panel.Options.find((option) => option.Setting === 'sound' && option.Selected);
    const block = panel.SelectedBlock;
    mouseUp();
    if (sound && block)
      App.MainScene.host.setSound(block.Id, Number(block.Params.sound) || 1, true);
  };
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    populate(json, open);
    for (const option of panel.Options) {
      const sampleGen = panel.SelectedBlock?.def.id === 'source.sample-gen';
      if (option.Type === 'slider' && option.Setting === 'sound' && sampleGen)
        showSoundNumber(option);
      const draw = option.Type === 'slider' ? LIVE_ROWS[option.Setting] : undefined;
      if (draw) {
        if (!METER_ROWS.has(option.Setting)) option.Type = 'live';
        option.Live = true;
        option.Draw = draw;
      }
    }
    // v1 keeps a slider's rollover by row number: rows no longer sliders must not inherit one.
    panel.Options.forEach((option, i) => {
      if (option.Type !== 'slider' && option.Type !== 'waveslider' && panel._SliderRoll)
        panel._SliderRoll[i] = false;
    });
  };
}
/** Is a live row showing? (The scene then redraws the panel every frame.) Prisms and Emitters'
 * guide lines turn with them; the Touchpad's pads light as they are played. */
export const hasLiveRows = (panel: V2OptionsPanel): boolean => {
  const id = panel.SelectedBlock?.def.id;
  return (
    panel.Scale > 0 &&
    (panel.Options.some((option) => option.Live) ||
      id === 'power.prism' ||
      id === 'power.emitter' ||
      id === 'input.touchpad')
  );
};
