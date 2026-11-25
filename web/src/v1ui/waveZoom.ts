// Waveform zoom (not in v1): wave rows zoom on a stretch of the sound and pan (wheel, pinch, swipe,
// drag); v1's panel is unchanged, as Populate gets each wave row narrowed to the block's window.
import { App } from './shim.ts';
import type { V1Block } from './blocks/v1Block.ts';
import type { OptionHandle } from './ported/UI/Options/OptionHandle';
import type { OptionsForm, PanelOption, V2OptionsPanel } from './optionsTypes.ts';

/** What a waveform is drawn from: the decoded sound, else (a built-in response) the drawn array. */
type WaveSource = AudioBuffer | number[];
const isBuffer = (source: WaveSource): source is AudioBuffer => !Array.isArray(source);

/** A block's view window [f0, f1] (fractions of the whole sound). */
interface View {
  f0: number;
  f1: number;
  rev: boolean;
  src: WaveSource;
}
const views = new Map<number, View>(); // block id → its window (this session; not saved)
const WAVE = /^wave(region|slider|image)$/;
const POINTS = 200; // v1 GetWaveformFromBuffer(buffer, 200, …)

const sourceOf = (block: V1Block): WaveSource =>
  block.PrimaryBuffer ?? (block.WaveForm.length ? block.WaveForm : block._WaveForm);
/** Samplers draw a reversed sound reversed (the waveregion row); the window flips with it. */
const reversed = (block: V1Block) => !!block.Params.reverse && 'startPosition' in block.Params;

/** The block's window, or null for the whole sound (a new sound shows all of it again). */
export function viewOf(block: V1Block | null): View | null {
  const view = block ? views.get(block.Id) : undefined;
  if (!block || !view) return null;
  if (view.src !== sourceOf(block)) {
    views.delete(block.Id);
    return null;
  }
  const rev = reversed(block);
  if (view.rev !== rev) Object.assign(view, { f0: 1 - view.f1, f1: 1 - view.f0, rev });
  return view;
}
/** The open panel's window (playheads use it). */
export function panelView(panel: V2OptionsPanel): { f0: number; f1: number } | null {
  return panel.Scale === 1 ? viewOf(panel.SelectedBlock) : null;
}

/** The narrowest window: 400 samples of the sound (or a tenth of a drawn array). */
function minSpan(block: V1Block | null): number {
  const source = block ? sourceOf(block) : [];
  const length = isBuffer(source) ? source.length : 0;
  return length > 0 ? Math.min(1, 400 / length) : 0.1;
}

/** The loudest |value| in each of POINTS equal parts of [a0, a1] of `chs`: exact edges at any zoom
 * (v1 rounded parts up, cutting short windows); long parts are read with a stride. */
function peaks(chs: ArrayLike<number>[], a0: number, a1: number): number[] {
  const length = chs.at(0)?.length ?? 0,
    out: number[] = [];
  if (!length) return out;
  for (let i = 0; i < POINTS; i++) {
    const low = Math.min(length - 1, Math.floor((a0 + ((a1 - a0) * i) / POINTS) * length));
    const high = Math.max(
      low,
      Math.min(length - 1, Math.ceil((a0 + ((a1 - a0) * (i + 1)) / POINTS) * length) - 1),
    );
    const step = Math.max(1, Math.floor((high - low + 1) / 64));
    let loudest = 0;
    for (const channel of chs)
      for (let k = low; k <= high; k += step) loudest = Math.max(loudest, Math.abs(channel[k]));
    out.push(loudest);
  }
  return out;
}
const channels = (buffer: AudioBuffer): ArrayLike<number>[] =>
  Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, channel) =>
    buffer.getChannelData(channel),
  );

const gain = new WeakMap<object, number>();
/** v1's soft normalise (95 %) of the whole sound: a zoomed quiet stretch stays quiet. */
function normalOf(buffer: AudioBuffer): number {
  let level = gain.get(buffer);
  if (level === undefined) {
    const peak = Math.max(0, ...peaks(channels(buffer), 0, 1));
    level = peak > 0.01 ? (1 / peak - 1) * 0.95 + 1 : 1;
    gain.set(buffer, level);
  }
  return level;
}
/** The window's waveform: the peaks of that stretch (the drawn array is already normalised, and
 * reversed: back to the sound's order first). */
function windowWave(source: WaveSource, f0: number, f1: number, rev: boolean): number[] {
  const [a0, a1] = rev ? [1 - f1, 1 - f0] : [f0, f1];
  const chs = isBuffer(source) ? channels(source) : [rev ? [...source].reverse() : source];
  const level = isBuffer(source) ? normalOf(source) : 1;
  const wave = peaks(chs, a0, a1).map((peak) => Math.min(1, peak * level));
  return rev ? wave.reverse() : wave;
}

/** The form with each wave row narrowed to the window (a copy: the block's form stays whole). */
function windowedForm(json: OptionsForm, block: V1Block, view: View): OptionsForm {
  const source = sourceOf(block);
  return {
    ...json,
    parameters: json.parameters.map((parameter) => {
      const original = parameter.props;
      if (!WAVE.test(parameter.type) || !original?.wavearray?.length) return parameter;
      const reverse = parameter.type === 'waveregion' && view.rev;
      const props = { ...original, wavearray: windowWave(source, view.f0, view.f1, reverse) };
      if (typeof original.min === 'number' && typeof original.max === 'number') {
        const span = original.max - original.min;
        props.min = original.min + view.f0 * span;
        props.max = original.min + view.f1 * span;
      }
      return { ...parameter, props };
    }),
  };
}

/** Where the window is in the whole sound: a thin bar along the bottom of the waveform. */
function drawWindowBar(
  ctx: CanvasRenderingContext2D,
  row: PanelOption,
  view: View,
  units: number,
  panel: V2OptionsPanel,
): void {
  const barY = row.Position.y + row.Size.height - 3 * units;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(panel.Margin, barY, panel.Range, 2 * units);
  ctx.globalAlpha = 1;
  ctx.fillRect(
    panel.Margin + view.f0 * panel.Range,
    barY,
    Math.max(2 * units, (view.f1 - view.f0) * panel.Range),
    2 * units,
  );
}
/** Draw a wave row clipped to its waveform, plus its name (outside the clip) and window bar. */
function clipDraw(row: PanelOption, view: View): void {
  const draw = row.Draw.bind(row);
  row.Draw = (ctx, units, i, panel) => {
    const y = row.Position.y,
      height = row.Size.height,
      left = panel.Margin - units,
      end = panel.Margin + panel.Range;
    const inView = (x: number) => x >= -0.5 && x <= panel.Range + 0.5;
    // Only a handle's label or the slider's value may run into the right margin (as in v1).
    const sliderShown = row.Type === 'waveslider' && inView(row.Position.x);
    const right = row.Type === 'waveregion' || sliderShown ? panel.Size.width : end + units;
    const hidden: [OptionHandle, number][] = [];
    if (row.Type === 'waveregion')
      for (const handle of row.Handles)
        if (!inView(handle.Position.x)) {
          hidden.push([handle, handle.Position.x]);
          handle.Position.x = handle.Position.x < 0 ? -1e6 : 1e6;
        }
    const fill = panel.diagonalFill.bind(panel); // the loop's hatching: only over the waveform
    panel.diagonalFill = (x, hatchY, width, hatchHeight, spacing) => {
      const from = Math.max(x, panel.Margin),
        to = Math.min(x + width, end);
      if (to > from) fill(from, hatchY, to - from, hatchHeight, spacing);
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, y - units, right - left, height + 2 * units);
    ctx.clip();
    try {
      draw(ctx, units, i, panel);
    } finally {
      ctx.restore();
      panel.diagonalFill = fill;
      for (const [handle, x] of hidden) handle.Position.x = x;
    }
    ctx.save();
    // v1 OptionWave's PARAM NAME (it fell outside the clip)
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'right';
    const nameY = y + height * 0.5 + Math.round(units * 10) * 0.4;
    ctx.fillText(row.Name.toUpperCase(), panel.Margin - 15 * units, nameY);
    drawWindowBar(ctx, row, view, units, panel);
    ctx.restore();
  };
}

/** Device px rect of wave row `i`'s waveform. */
function rowRect(panel: V2OptionsPanel, i: number) {
  const row = panel.Options[i];
  return {
    x: panel.Position.x + panel.Margin,
    y: panel.Position.y + row.Position.y,
    w: panel.Range,
    h: row.Size.height,
  };
}
/** The open panel's wave row under device px (x, y) (with v1's 10-unit grab margin), or -1. */
export function waveRowAt(panel: V2OptionsPanel, x: number, y: number): number {
  if (panel.Scale !== 1 || !panel.SelectedBlock) return -1;
  const unit = App.Unit;
  return panel.Options.findIndex((row, i) => {
    if (!WAVE.test(row.Type) || !row.Waveform?.length) return false;
    const rect = rowRect(panel, i);
    const inX = x >= rect.x - 10 * unit && x <= rect.x + rect.w + 10 * unit;
    return inX && y >= rect.y && y <= rect.y + rect.h;
  });
}

/** Show [f0, f0 + span] of the open block's sound (clamped to it), and draw the panel again. */
function setView(panel: V2OptionsPanel, f0: number, span: number): void {
  const block = panel.SelectedBlock;
  if (!block || panel.Scale !== 1) return;
  span = Math.min(1, Math.max(minSpan(block), span));
  f0 = Math.min(1 - span, Math.max(0, f0));
  if (span >= 1 - 1e-9) views.delete(block.Id);
  else views.set(block.Id, { f0, f1: f0 + span, rev: reversed(block), src: sourceOf(block) });
  panel.Refresh();
}
const current = (panel: V2OptionsPanel) => viewOf(panel.SelectedBlock) ?? { f0: 0, f1: 1 };
/** The fraction of the whole sound at device x on row `i` (clamped to the waveform). */
function fractionAt(panel: V2OptionsPanel, i: number, x: number): { at: number; t: number } {
  const rect = rowRect(panel, i),
    view = current(panel),
    across = Math.min(1, Math.max(0, (x - rect.x) / rect.w));
  return { at: view.f0 + across * (view.f1 - view.f0), t: across };
}
/** Zoom row `i` about device x by `factor` (> 1: in), the sound under x staying put. */
export function zoomWaveAt(panel: V2OptionsPanel, i: number, x: number, factor: number): void {
  const view = current(panel),
    { at, t } = fractionAt(panel, i, x),
    span = Math.min(1, Math.max(minSpan(panel.SelectedBlock), (view.f1 - view.f0) / factor));
  setView(panel, at - t * span, span);
}
/** Slide row `i` by `dx` device px (> 0: on through the sound, as a trackpad swipe to the left). */
export function panWave(panel: V2OptionsPanel, i: number, dx: number): void {
  const view = current(panel),
    span = view.f1 - view.f0;
  if (span >= 1) return;
  setView(panel, view.f0 + (dx / rowRect(panel, i).w) * span, span);
}
/** A wheel or trackpad on row `i` at device x (deltas in CSS px of `dpr` device px): a sideways
 * swipe or Shift + wheel pans; else it zooms at the stage's rates (a pinch twice a notch's). */
export function wheelWave(
  panel: V2OptionsPanel,
  i: number,
  x: number,
  wheel: { deltaX: number; deltaY: number; ctrlKey: boolean; shiftKey: boolean },
  dpr: number,
): void {
  const across = Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY);
  if (across || (wheel.shiftKey && !wheel.ctrlKey)) {
    panWave(panel, i, (across ? wheel.deltaX : wheel.deltaY) * dpr);
    return;
  }
  const dy = Math.max(-25, Math.min(25, wheel.deltaY));
  zoomWaveAt(panel, i, x, Math.exp(-dy * (wheel.ctrlKey ? 0.01 : 0.005)));
}

/** A two-finger (or Safari trackpad) pinch on row `i`: the sound under the midpoint follows. */
export interface WavePinch {
  row: number;
  at: number;
  span0: number;
  d0: number;
}
export function startWavePinch(
  panel: V2OptionsPanel,
  i: number,
  midX: number,
  distance: number,
): WavePinch {
  const view = current(panel);
  return {
    row: i,
    at: fractionAt(panel, i, midX).at,
    span0: view.f1 - view.f0,
    d0: Math.max(distance, 1e-3),
  };
}
/** `distance`: the fingers' distance now (d0 at the start), or Safari's gesture scale (from 1). */
export function moveWavePinch(
  panel: V2OptionsPanel,
  pinch: WavePinch,
  midX: number,
  distance: number,
): void {
  if (panel.Scale !== 1 || !panel.Options.at(pinch.row)) return;
  const rect = rowRect(panel, pinch.row),
    across = (midX - rect.x) / rect.w;
  const wanted = (pinch.span0 * pinch.d0) / Math.max(distance, 1e-3);
  const span = Math.min(1, Math.max(minSpan(panel.SelectedBlock), wanted));
  setView(panel, pinch.at - across * span, span);
}

/** Wave row `i`'s values (its handles, or the slider), to put back if a press there turns out to
 * be a pinch. */
export function snapshotWave(panel: V2OptionsPanel, i: number): (() => void) | null {
  const row = panel.Options.at(i),
    block = panel.SelectedBlock;
  if (!row || !block) return null;
  const handles = row.Type === 'waveregion' ? row.Handles : [];
  const values: [string, number][] =
    row.Type === 'waveslider'
      ? [[row.Setting, row.Value]]
      : handles.map((handle) => [handle.XSetting, handle.XValue]);
  return () => {
    panel.MouseUp();
    if (panel.SelectedBlock !== block) return;
    const now: Record<string, number> = {};
    for (const handle of handles) now[handle.XSetting] = handle.XValue;
    if (row.Type === 'waveslider') now[row.Setting] = row.Value;
    for (const [setting, value] of values)
      if (now[setting] !== value) block.SetParam(setting, value);
    panel.Refresh();
  };
}

/** Wraps the options panel (after the other installs: its Populate is the outermost). */
export function installWaveZoom(panel: V2OptionsPanel): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    const block = panel.SelectedBlock,
      view = viewOf(block);
    populate(view && block && json ? windowedForm(json, block, view) : json, open);
    if (view)
      for (const row of panel.Options)
        if (WAVE.test(row.Type) && row.Waveform?.length) clipDraw(row, view);
  };
  // Handles outside the window can't be grabbed (v1's 10-unit hit box would reach into the name).
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    if (!viewOf(panel.SelectedBlock)) return;
    for (const row of panel.Options)
      if (row.Type === 'waveregion')
        row.Handles.forEach((handle, j) => {
          if (handle.Position.x < -0.5 || handle.Position.x > panel.Range + 0.5)
            row.HandleRoll[j] = false;
        });
  };
  // Zoomed in, a drag on the waveform that grabs no handle slides it (Granular's press anywhere
  // moves its slider, as in v1).
  let drag: { row: number; x: number } | null = null;
  const down = panel.MouseDown.bind(panel),
    move = panel.MouseMove.bind(panel),
    up = panel.MouseUp.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    down(mx, my);
    drag = null;
    const i = waveRowAt(panel, mx, my),
      row = panel.Options.at(i);
    if (i < 0 || !row || !viewOf(panel.SelectedBlock) || row.Type === 'waveslider') return;
    if (row.Type === 'waveregion' && row.Handles.some((handle) => handle.Selected)) return;
    drag = { row: i, x: mx };
  };
  panel.MouseMove = (mx: number, my: number) => {
    if (drag) {
      panWave(panel, drag.row, drag.x - mx);
      drag.x = mx;
      panel.RolloverCheck(mx, my);
      return;
    }
    move(mx, my);
  };
  panel.MouseUp = () => {
    drag = null;
    up();
  };
}
