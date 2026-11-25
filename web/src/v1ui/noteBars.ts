// Note bars and the range slider (UI-0016, CHG-0040): Random Note's weights and Chord's chords,
// 12 bars C to B, and Random Note's two-handled Range; drawn only from v1 OptionSlider's pieces.
import { App } from './shim.ts';
import type { V1Block } from './blocks/v1Block.ts';
import type { PanelOption, V2OptionsPanel } from './optionsTypes.ts';
import { KEYS } from './newBlocks/formRows.ts';
import { drawGrab } from './newBlocks/liveRows.ts';
import { monitorOf } from './newBlocks/monitors.ts';

/** A bar whose note was just picked lights this long. */
const LIT_MS = 250;

/** Chord qualities, bottom to top (SPEC-SIMULATION-POWER-AND-PARTICLES R10f). */
export const CHORD_QUALITIES = [
  'NONE',
  'SUS2',
  'MINOR',
  'MAJOR',
  'SUS4',
  'MINOR 7TH',
  '7TH',
  'MAJOR 7TH',
];
const CHORD_SHORT = ['–', 'SUS2', 'MIN', 'MAJ', 'SUS4', 'MIN7', '7', 'MAJ7'];
/** Defaults: C Maj, C# Maj7, D m7, Eb Maj, E m, F Maj7, F# Maj7, G 7, Ab Maj7, A m7, Bb Maj, B
 * m. */
export const CHORD_DEFAULTS = [3, 7, 5, 3, 2, 7, 7, 6, 7, 5, 3, 2];
/** Random Note's default weights: C major. */
export const WEIGHT_DEFAULTS = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
/** Only black-key notes have the hatched track. */
const BLACK = new Set([1, 3, 6, 8, 10]);
/** Range ends in MIDI notes (C1…B7). */
export const RANGE_MIN = 24,
  RANGE_MAX = 107;
export const noteName = (midi: number) =>
  `${KEYS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

type Kind = 'weights' | 'chords';
const kindOf = (block: V1Block | null | undefined): Kind | null =>
  block?.def.id === 'fx.random-note' ? 'weights' : block?.def.id === 'fx.chord' ? 'chords' : null;
const prefix = (kind: Kind) => (kind === 'weights' ? 'w' : 'q');
const keyOf = (block: V1Block) => ((Math.round(Number(block.Params.key ?? 0)) % 12) + 12) % 12;
/** Stored value `i` of a block (before Key). */
function stored(block: V1Block, kind: Kind, i: number): number {
  const value = block.Params[`${prefix(kind)}${i}`];
  return value === undefined
    ? kind === 'weights'
      ? WEIGHT_DEFAULTS[i]
      : CHORD_DEFAULTS[i]
    : Number(value);
}
/** What bar `n` (C = 0) shows: the stored value at (n − key) mod 12 (the bars follow the Key). */
export function barValue(block: V1Block | null, bar: number): number {
  const kind = kindOf(block);
  return block && kind ? stored(block, kind, (bar - keyOf(block) + 12) % 12) : 0;
}
function setBar(block: V1Block, bar: number, value: number): void {
  const kind = kindOf(block);
  if (!kind) return;
  const key = `${prefix(kind)}${(bar - keyOf(block) + 12) % 12}`;
  block.Params[key] = value;
  App.MainScene.setParam(block, key, value);
}
const barText = (kind: Kind, bar: number, value: number) =>
  `${KEYS[bar]}  ${kind === 'weights' ? `${Math.round(value * 100)}%` : CHORD_QUALITIES[value]}`;

/** The bars' geometry inside the row, in panel px. */
function layout(panel: V2OptionsPanel, row: PanelOption, units: number) {
  const x = panel.Margin,
    range = panel.Range,
    y = row.Position.y,
    height = row.Size.height;
  const cell = range / 12,
    gap = 3 * units,
    labels = 2 * Math.round(units * 10) + 8 * units;
  return {
    x,
    w: range,
    y,
    h: height,
    cell,
    gap,
    barWidth: cell - gap,
    top: y + height * 0.1,
    bottom: y + height - labels - 4 * units,
    labelY: y + height - labels,
  };
}
type BarsLayout = ReturnType<typeof layout>;

/** What the bars row last drew (tests read it; presses hit-test from it). */
interface BarsShown {
  values: number[];
  key: number;
  held: number;
  cells: number[];
  cell: number;
  top: number;
  bottom: number;
}
/** What the range row last drew. */
interface RangeShown {
  low: number;
  high: number;
  lowX: number;
  highX: number;
  held: 'low' | 'high' | null;
}
const isBarsShown = (shown: unknown): shown is BarsShown =>
  typeof shown === 'object' && shown !== null && 'cells' in shown && 'bottom' in shown;
const isRangeShown = (shown: unknown): shown is RangeShown =>
  typeof shown === 'object' && shown !== null && 'lowX' in shown;

let held: { n: number } | null = null;

/** A new pick (the engine counts them: monitor [note, count]) lights its bar for a moment. */
function lightPicks(block: V1Block): { note: number; until: number } | undefined {
  const monitor = monitorOf(block.Id);
  if (monitor && monitor[1] !== block.__bdSeen) {
    if (block.__bdSeen !== undefined)
      block.__bdLit = { note: Math.round(monitor[0]), until: performance.now() + LIT_MS };
    block.__bdSeen = monitor[1];
  }
  return block.__bdLit;
}
/** Bar `n`: v1's hatched track (black keys only), the bar, its line and grab, then its labels. */
function drawBar(
  ctx: CanvasRenderingContext2D,
  panel: V2OptionsPanel,
  bars: BarsLayout,
  bar: number,
  fraction: number,
  colour: string,
  units: number,
): void {
  const barX = bars.x + bars.cell * bar + bars.gap * 0.5,
    barHeight = bars.bottom - bars.top;
  if (BLACK.has(bar)) panel.diagonalFill(barX, bars.top, bars.barWidth, barHeight, 9);
  App.FillColor(ctx, colour);
  const barY = bars.bottom - fraction * barHeight;
  if (fraction > 0) ctx.fillRect(barX, barY, bars.barWidth, bars.bottom - barY);
  // LINE + GRAB (v1 OptionSlider, turned upright) //
  App.FillColor(ctx, colour);
  ctx.fillRect(barX, barY - units, bars.barWidth, 2 * units);
  drawGrab(ctx, barX + bars.barWidth * 0.5, barY, Math.min(bars.barWidth * 0.3, 6 * units));
}

/** The bars row (a live row: `this` is the row). While a bar is held its value shows above the
 * row's top-right corner, as the Envelope's held handle does; a just-played note's bar lights. */
export function drawNoteBars(
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  i: number,
  panel: V2OptionsPanel,
): void {
  const block = panel.SelectedBlock,
    kind = kindOf(block);
  if (!block || !kind) return;
  const bars = layout(panel, this, units),
    colours = panel.SliderColours,
    colour = colours[i % colours.length];
  const lit = lightPicks(block),
    txt = App.Palette[App.ThemeManager.Txt];
  const steps = CHORD_QUALITIES.length - 1,
    dataType = Math.round(units * 10);
  // DIVIDER (v1 OptionSlider) //
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) {
    ctx.beginPath();
    ctx.moveTo(bars.x - units, bars.y + bars.h);
    ctx.lineTo(bars.x + bars.w + units, bars.y + bars.h);
    ctx.stroke();
  }
  const shown: number[] = [];
  for (let bar = 0; bar < 12; bar++) {
    const value = barValue(block, bar);
    shown.push(value);
    const on = !!lit && lit.note === bar && lit.until > performance.now();
    drawBar(
      ctx,
      panel,
      bars,
      bar,
      kind === 'weights' ? value : value / steps,
      on ? txt : colour,
      units,
    );
    // LABELS: the note, and under a Chord's bar its chord //
    const cx = bars.x + bars.cell * bar + bars.gap * 0.5 + bars.barWidth * 0.5;
    App.FillColor(ctx, txt);
    ctx.textAlign = 'center';
    ctx.font = App.Metrics.TxtMid;
    ctx.globalAlpha = held && held.n !== bar ? 0.5 : 1;
    ctx.fillText(KEYS[bar], cx, bars.labelY + dataType);
    if (kind === 'chords') {
      ctx.font = `400 ${Math.round(units * 8)}px Dosis`;
      ctx.fillText(CHORD_SHORT[value], cx, bars.labelY + 2 * dataType + 4 * units);
    }
    ctx.globalAlpha = 1;
  }
  // NAME //
  App.FillColor(ctx, txt);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  const nameY = (bars.top + bars.bottom) * 0.5 + dataType * 0.4;
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, nameY);
  // READOUT: the held bar, above the row's top-right corner //
  if (held) {
    ctx.textAlign = 'right';
    const readoutX = bars.x + bars.w + units;
    ctx.fillText(barText(kind, held.n, shown[held.n]), readoutX, bars.top - 12 * units);
  }
  const barsShown: BarsShown = {
    values: shown,
    key: keyOf(block),
    held: held?.n ?? -1,
    cells: shown.map((_, bar) => bars.x + bars.cell * (bar + 0.5)),
    cell: bars.cell,
    top: bars.top,
    bottom: bars.bottom,
  };
  this.Shown = barsShown;
}

/** Random Note's Range: v1's slider track with two handles (by semitone). */
let rangeHeld: 'low' | 'high' | null = null;
export const rangeOf = (block: V1Block | null): [number, number] => [
  Number(block?.Params.low ?? 60),
  Number(block?.Params.high ?? 71),
];
export function drawRange(
  this: PanelOption,
  ctx: CanvasRenderingContext2D,
  units: number,
  i: number,
  panel: V2OptionsPanel,
): void {
  const block = panel.SelectedBlock,
    x = panel.Margin,
    range = panel.Range,
    y = this.Position.y,
    height = this.Size.height,
    mid = y + height * 0.5;
  const [low, high] = rangeOf(block),
    at = (midi: number) => x + ((midi - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * range;
  const colours = panel.SliderColours,
    colour = colours[i % colours.length],
    dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) {
    ctx.beginPath();
    ctx.moveTo(x - units, y + height);
    ctx.lineTo(x + range + units, y + height);
    ctx.stroke();
  }
  panel.diagonalFill(x - units, y + units, range + 2 * units, height - 2 * units, 9);
  App.FillColor(ctx, colour);
  ctx.fillRect(at(low), y, Math.max(0, at(high) - at(low)), height);
  for (const midi of [low, high]) {
    const handleX = at(midi);
    App.FillColor(ctx, colour);
    ctx.fillRect(handleX - units, y, 2 * units, height);
    drawGrab(ctx, handleX, mid, height * 0.2);
  }
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  // VALUE TOOLTIP while held (v1 OptionSlider: right of the handle, in the slider type) //
  if (rangeHeld) {
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtSlider;
    const tooltipY = mid + Math.round(units * 33) * 0.35;
    ctx.fillText(`${noteName(low)} – ${noteName(high)}`, at(high) + 25 * units, tooltipY);
  }
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), x - 15 * units, mid + dataType * 0.4);
  const rangeShown: RangeShown = {
    low,
    high,
    lowX: at(low),
    highX: at(high),
    held: rangeHeld,
  };
  this.Shown = rangeShown;
}

// ---- pointer: a press on a bar sets it to the pointer's height and the drag follows ----
/** The row with `setting` under device y `my`, once it has been drawn. */
function rowAt(panel: V2OptionsPanel, setting: string, my: number): PanelOption | null {
  const row = panel.Options.find((option) => option.Setting === setting);
  if (!row?.Shown) return null;
  const y = panel.Position.y + row.Position.y;
  return my >= y && my <= y + row.Size.height ? row : null;
}
function setFromY(panel: V2OptionsPanel, row: PanelOption, bar: number, my: number): void {
  const block = panel.SelectedBlock,
    kind = kindOf(block),
    shown = row.Shown;
  if (!block || !kind || !isBarsShown(shown)) return;
  let fraction = Math.max(
    0,
    Math.min(1, (panel.Position.y + shown.bottom - my) / (shown.bottom - shown.top)),
  );
  if (kind === 'chords') fraction = Math.round(fraction * (CHORD_QUALITIES.length - 1));
  else fraction = Math.round(fraction * 100) / 100;
  if (fraction !== barValue(block, bar)) setBar(block, bar, fraction);
  panel._DrawReady = true;
}
let rangeGrab: { from: number } | null = null;
const midiAt = (panel: V2OptionsPanel, localX: number) =>
  Math.round(
    RANGE_MIN +
      Math.max(0, Math.min(1, (localX - panel.Margin) / panel.Range)) * (RANGE_MAX - RANGE_MIN),
  );
function setRangeFromX(panel: V2OptionsPanel, mx: number): void {
  const block = panel.SelectedBlock;
  if (!block) return;
  const midi = midiAt(panel, mx - panel.Position.x);
  let [low, high] = rangeOf(block);
  if (!rangeHeld) {
    // handles met: the first move's direction picks one
    if (midi === rangeGrab?.from) return;
    rangeHeld = midi < low ? 'low' : 'high';
  }
  if (rangeHeld === 'low') low = Math.min(midi, high);
  else high = Math.max(midi, low);
  const was = rangeOf(block);
  for (const [key, value, before] of [
    ['low', low, was[0]],
    ['high', high, was[1]],
  ] as const)
    if (before !== value) {
      block.Params[key] = value;
      App.MainScene.setParam(block, key, value);
    }
  panel._DrawReady = true;
}
/** Which handle a press on the range takes: the nearer; where they meet, the side it is on (or,
 * on them, none until the first move picks one). */
function grabRange(shown: RangeShown, localX: number): 'low' | 'high' | null {
  if (shown.low !== shown.high)
    return Math.abs(localX - shown.lowX) <= Math.abs(localX - shown.highX) ? 'low' : 'high';
  if (localX < shown.lowX - 2 * App.Unit) return 'low';
  return localX > shown.highX + 2 * App.Unit ? 'high' : null;
}
/** A press on the bars or the range: true when it took it. */
function pressRows(panel: V2OptionsPanel, mx: number, my: number): boolean {
  const bars = rowAt(panel, 'noteBars', my),
    barsShown = bars?.Shown;
  if (bars && isBarsShown(barsShown)) {
    const bar = barsShown.cells.findIndex(
      (cx) => Math.abs(mx - (panel.Position.x + cx)) <= barsShown.cell / 2,
    );
    if (bar >= 0) {
      held = { n: bar };
      panel.Hover = true;
      setFromY(panel, bars, bar, my);
      return true;
    }
  }
  const range = rowAt(panel, 'noteRange', my),
    rangeShown = range?.Shown;
  if (!range || !isRangeShown(rangeShown)) return false;
  const localX = mx - panel.Position.x;
  rangeGrab = { from: midiAt(panel, localX) };
  rangeHeld = grabRange(rangeShown, localX);
  panel.Hover = true;
  if (rangeHeld) setRangeFromX(panel, mx);
  panel._DrawReady = true;
  return true;
}

/** Teach the options panel the note bars and the range slider (once, at start-up). */
export function installNoteBars(panel: V2OptionsPanel): void {
  const down = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    if (kindOf(panel.SelectedBlock) && panel.Scale === 1 && pressRows(panel, mx, my)) return;
    down(mx, my);
  };
  const move = panel.MouseMove.bind(panel);
  panel.MouseMove = (mx: number, my: number) => {
    if (held) {
      const row = panel.Options.find((option) => option.Setting === 'noteBars');
      if (row) setFromY(panel, row, held.n, my);
      return;
    }
    if (rangeGrab) {
      setRangeFromX(panel, mx);
      return;
    }
    move(mx, my);
  };
  const up = panel.MouseUp.bind(panel);
  panel.MouseUp = () => {
    held = null;
    rangeHeld = null;
    rangeGrab = null;
    panel._DrawReady = true;
    up();
  };
}
