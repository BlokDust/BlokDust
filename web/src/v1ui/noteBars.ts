// Note bars and the range slider (UI-0016, CHG-0040): Random Note's weights and Chord's chord per note, a row of 12
// vertical bars, C to B; and Random Note's Range, one slider with two handles, by semitone. Not in v1; drawn only from
// v1 OptionSlider's pieces: the hatched track (diagonalFill), the slider colour, the 2-unit line and the 45° grab
// diamond with its palette 8 half, the divider, the name on the left. No circles, no gradients.
//  - Only black-key notes have the hatched track; white-key notes have none (owner, 2026-11-19).
//  - While a bar is held its value shows above the row's top-right corner, as the Envelope's held handle does
//    (adsrPanel.ts): "F# 35%", "D MINOR 7TH". A bar whose note just played is drawn in the text colour.
//  - The bars show the pattern after the Key slider: bar n shows stored value (n − key) mod 12.
import { App } from './shim.ts';
import { KEYS } from './newBlocks.ts';

/** Chord qualities, bottom to top (SPEC-SIMULATION-POWER-AND-PARTICLES R10f). */
export const CHORD_QUALITIES = ['NONE', 'SUS2', 'MINOR', 'MAJOR', 'SUS4', 'MINOR 7TH', '7TH', 'MAJOR 7TH'];
const CHORD_SHORT = ['–', 'SUS2', 'MIN', 'MAJ', 'SUS4', 'MIN7', '7', 'MAJ7'];
/** Defaults (owner, 2026-11-19): C Maj, C# Maj7, D m7, Eb Maj, E m, F Maj7, F# Maj7, G 7, Ab Maj7, A m7, Bb Maj, B m. */
export const CHORD_DEFAULTS = [3, 7, 5, 3, 2, 7, 7, 6, 7, 5, 3, 2];
/** Random Note's default weights: C major. */
export const WEIGHT_DEFAULTS = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
const BLACK = new Set([1, 3, 6, 8, 10]);
/** Range ends in MIDI notes (C1…B7). */
export const RANGE_MIN = 24, RANGE_MAX = 107;
export const noteName = (midi: number) => `${KEYS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

type Kind = 'weights' | 'chords';
const kindOf = (block: any): Kind | null => block?.def?.id === 'fx.random-note' ? 'weights' : block?.def?.id === 'fx.chord' ? 'chords' : null;
const prefix = (k: Kind) => (k === 'weights' ? 'w' : 'q');
const keyOf = (block: any) => ((Math.round(Number(block?.Params?.key ?? 0)) % 12) + 12) % 12;
/** Stored value k of a block (before Key). */
function stored(block: any, k: Kind, i: number): number {
  const v = block?.Params?.[`${prefix(k)}${i}`];
  return v === undefined ? (k === 'weights' ? WEIGHT_DEFAULTS[i] : CHORD_DEFAULTS[i]) : Number(v);
}
/** What bar `n` (C = 0) shows: the stored value at (n − key) mod 12. */
export function barValue(block: any, n: number): number {
  const k = kindOf(block);
  return k ? stored(block, k, (n - keyOf(block) + 12) % 12) : 0;
}
function setBar(block: any, n: number, value: number): void {
  const k = kindOf(block);
  if (!k) return;
  const i = (n - keyOf(block) + 12) % 12, key = `${prefix(k)}${i}`;
  block.Params[key] = value;
  App.MainScene.setParam(block, key, value);  // a no-op until the engine has the param (CHG-0040 task 3)
}
const barText = (k: Kind, n: number, v: number) => `${KEYS[n]}  ${k === 'weights' ? `${Math.round(v * 100)}%` : CHORD_QUALITIES[v]}`;

/** The bars' geometry inside the row, in panel px. */
function layout(panel: any, row: any, units: number) {
  const x = panel.Margin, w = panel.Range, y = row.Position.y, h = row.Size.height;
  const cell = w / 12, gap = 3 * units, top = y + h * 0.1, labels = 2 * Math.round(units * 10) + 8 * units;
  return { x, w, y, h, cell, gap, bw: cell - gap, top, bottom: y + h - labels - 4 * units, labelY: y + h - labels };
}

let held: { n: number } | null = null;

/** The row (a LIVE_ROWS draw: `this` is the row). */
export function drawNoteBars(this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any): void {
  const block = panel.SelectedBlock, k = kindOf(block);
  if (!k) return;
  const L = layout(panel, this, units), colours = panel.SliderColours, col = colours[i % colours.length];
  const txt = App.Palette[App.ThemeManager.Txt], lit = block.__bdLit as { note: number; until: number } | undefined;
  const steps = CHORD_QUALITIES.length - 1, dataType = Math.round(units * 10);
  // DIVIDER (v1 OptionSlider) //
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(L.x - units, L.y + L.h); ctx.lineTo(L.x + L.w + units, L.y + L.h); ctx.stroke(); }
  const shown: number[] = [];
  for (let n = 0; n < 12; n++) {
    const bx = L.x + L.cell * n + L.gap * 0.5, bh = L.bottom - L.top, v = barValue(block, n), f = k === 'weights' ? v : v / steps;
    shown.push(v);
    // TRACK: black keys v1's hatching, white keys empty (owner, 2026-11-19) //
    if (BLACK.has(n)) panel.diagonalFill(bx, L.top, L.bw, bh, 9);
    // BAR //
    const on = !!lit && lit.note === n && lit.until > performance.now();
    App.FillColor(ctx, on ? txt : col);
    const by = L.bottom - f * bh;
    if (f > 0) ctx.fillRect(bx, by, L.bw, L.bottom - by);
    // LINE + GRAB (v1 OptionSlider, turned upright) //
    App.FillColor(ctx, on ? txt : col);
    ctx.fillRect(bx, by - units, L.bw, 2 * units);
    const d = Math.min(L.bw * 0.3, 6 * units), cx = bx + L.bw * 0.5;
    ctx.beginPath(); ctx.moveTo(cx - d, by); ctx.lineTo(cx, by - d); ctx.lineTo(cx + d, by); ctx.lineTo(cx, by + d); ctx.closePath(); ctx.fill();
    App.FillColor(ctx, App.Palette[8]);
    ctx.beginPath(); ctx.moveTo(cx - d, by); ctx.lineTo(cx, by - d); ctx.lineTo(cx + d * 0.5, by - d * 0.5); ctx.lineTo(cx - d * 0.5, by + d * 0.5); ctx.closePath(); ctx.fill();
    // LABELS: the note, and under a Chord's bar its chord //
    App.FillColor(ctx, txt);
    ctx.textAlign = 'center';
    ctx.font = App.Metrics.TxtMid;
    ctx.globalAlpha = held && held.n !== n ? 0.5 : 1;
    ctx.fillText(KEYS[n], cx, L.labelY + dataType);
    if (k === 'chords') { ctx.font = `400 ${Math.round(units * 8)}px Dosis`; ctx.fillText(CHORD_SHORT[v], cx, L.labelY + 2 * dataType + 4 * units); }
    ctx.globalAlpha = 1;
  }
  // NAME //
  App.FillColor(ctx, txt);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, (L.top + L.bottom) * 0.5 + dataType * 0.4);
  // READOUT: the held bar, above the row's top-right corner (as the Envelope's) //
  if (held) {
    ctx.textAlign = 'right';
    ctx.fillText(barText(k, held.n, shown[held.n]), L.x + L.w + units, L.top - 12 * units);
  }
  this.Shown = { values: shown, key: keyOf(block), held: held?.n ?? -1, cells: shown.map((_, n) => L.x + L.cell * (n + 0.5)), cell: L.cell, top: L.top, bottom: L.bottom };  // tests
}

/** Random Note's Range: v1's slider track with two handles (by semitone). */
let rangeHeld: 'low' | 'high' | null = null;
export function rangeOf(block: any): [number, number] {
  const lo = Number(block?.Params?.low ?? 60), hi = Number(block?.Params?.high ?? 71);
  // Until the migration (CHG-0040 task 5) a block may still hold octaves (−3…3): read them as that octave's notes.
  return [lo < RANGE_MIN ? 60 + 12 * lo : lo, hi < RANGE_MIN ? 71 + 12 * hi : hi];
}
export function drawRange(this: any, ctx: CanvasRenderingContext2D, units: number, i: number, panel: any): void {
  const block = panel.SelectedBlock, x = panel.Margin, w = panel.Range, y = this.Position.y, h = this.Size.height, mid = y + h * 0.5;
  const [lo, hi] = rangeOf(block), at = (m: number) => x + ((m - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * w;
  const colours = panel.SliderColours, col = colours[i % colours.length], dataType = Math.round(units * 10);
  ctx.globalAlpha = 1;
  App.StrokeColor(ctx, App.Palette[1]);
  if (i !== panel.Options.length - 1) { ctx.beginPath(); ctx.moveTo(x - units, y + h); ctx.lineTo(x + w + units, y + h); ctx.stroke(); }
  panel.diagonalFill(x - units, y + units, w + 2 * units, h - 2 * units, 9);
  App.FillColor(ctx, col);
  ctx.fillRect(at(lo), y, Math.max(0, at(hi) - at(lo)), h);
  const d = h * 0.2;
  for (const m of [lo, hi]) {
    const tx = at(m);
    App.FillColor(ctx, col);
    ctx.fillRect(tx - units, y, 2 * units, h);
    ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d, mid); ctx.lineTo(tx, mid + d); ctx.closePath(); ctx.fill();
    App.FillColor(ctx, App.Palette[8]);
    ctx.beginPath(); ctx.moveTo(tx - d, mid); ctx.lineTo(tx, mid - d); ctx.lineTo(tx + d * 0.5, mid - d * 0.5); ctx.lineTo(tx - d * 0.5, mid + d * 0.5); ctx.closePath(); ctx.fill();
  }
  App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
  // VALUE TOOLTIP while held (v1 OptionSlider: right of the handle, in the slider type) //
  if (rangeHeld) {
    ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtSlider;
    ctx.fillText(`${noteName(lo)} – ${noteName(hi)}`, at(hi) + 25 * units, mid + Math.round(units * 33) * 0.35);
  }
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'right';
  ctx.fillText(this.Name.toUpperCase(), x - 15 * units, mid + dataType * 0.4);
  this.Shown = { low: lo, high: hi, lowX: at(lo), highX: at(hi), held: rangeHeld };  // tests
}

// ---- pointer: a press on a bar sets it to the pointer's height and the drag follows; one bar per press ----
function rowAt(panel: any, setting: string, my: number): any {
  const row = (panel.Options as any[] | undefined)?.find(o => o.Setting === setting);
  if (!row?.Shown) return null;
  const y = panel.Position.y + row.Position.y;
  return my >= y && my <= y + row.Size.height ? row : null;
}
function setFromY(panel: any, row: any, n: number, my: number): void {
  const block = panel.SelectedBlock, k = kindOf(block)!, s = row.Shown;
  let f = Math.max(0, Math.min(1, (panel.Position.y + s.bottom - my) / (s.bottom - s.top)));
  if (k === 'chords') f = Math.round(f * (CHORD_QUALITIES.length - 1));
  else f = Math.round(f * 100) / 100;
  if (f !== barValue(block, n)) setBar(block, n, f);
  panel._DrawReady = true;
}
let rangeGrab: { from: number } | null = null;
function setRangeFromX(panel: any, row: any, mx: number): void {
  const block = panel.SelectedBlock, x = panel.Position.x + panel.Margin;
  const m = Math.round(RANGE_MIN + Math.max(0, Math.min(1, (mx - x) / panel.Range)) * (RANGE_MAX - RANGE_MIN));
  let [lo, hi] = rangeOf(block);
  if (!rangeHeld) {  // handles met: the first move's direction picks one
    if (m === rangeGrab?.from) return;
    rangeHeld = m < lo ? 'low' : 'high';
  }
  if (rangeHeld === 'low') lo = Math.min(m, hi); else hi = Math.max(m, lo);
  const was = rangeOf(block);
  for (const [key, v, w] of [['low', lo, was[0]], ['high', hi, was[1]]] as const) if (w !== v || Number(block.Params[key]) !== v) { block.Params[key] = v; App.MainScene.setParam(block, key, v); }
  void row;
  panel._DrawReady = true;
}

/** Teach the options panel the note bars and the range slider (once, at start-up). */
export function installNoteBars(panel: any): void {
  const down = panel.MouseDown.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    const block = panel.SelectedBlock;
    if (kindOf(block) && panel.Scale === 1) {
      const bars = rowAt(panel, 'noteBars', my);
      if (bars) {
        const n = (bars.Shown.cells as number[]).findIndex(cx => Math.abs(mx - (panel.Position.x + cx)) <= bars.Shown.cell / 2);
        if (n >= 0) { held = { n }; panel.Hover = true; setFromY(panel, bars, n, my); return; }
      }
      const range = rowAt(panel, 'noteRange', my);
      if (range) {
        const s = range.Shown, px = mx - panel.Position.x;
        rangeGrab = { from: Math.round(RANGE_MIN + Math.max(0, Math.min(1, (px - panel.Margin) / panel.Range)) * (RANGE_MAX - RANGE_MIN)) };
        rangeHeld = s.low === s.high ? (px < s.lowX - 2 * App.Unit ? 'low' : px > s.highX + 2 * App.Unit ? 'high' : null)
          : Math.abs(px - s.lowX) <= Math.abs(px - s.highX) ? 'low' : 'high';
        panel.Hover = true;
        if (rangeHeld) setRangeFromX(panel, range, mx);
        panel._DrawReady = true;
        return;
      }
    }
    down(mx, my);
  };
  const move = panel.MouseMove.bind(panel);
  panel.MouseMove = (mx: number, my: number) => {
    if (held) { const row = (panel.Options as any[]).find(o => o.Setting === 'noteBars'); if (row) setFromY(panel, row, held.n, my); return; }
    if (rangeGrab) { const row = (panel.Options as any[]).find(o => o.Setting === 'noteRange'); if (row) setRangeFromX(panel, row, mx); return; }
    move(mx, my);
  };
  const up = panel.MouseUp.bind(panel);
  panel.MouseUp = (...a: unknown[]) => { held = null; rangeHeld = null; rangeGrab = null; panel._DrawReady = true; return up(...a); };
}
