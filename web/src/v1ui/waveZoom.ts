// Waveform zoom (owner, 2026-11-15; not in v1): the waveform rows of the options panel (Sample, Recorder: waveregion;
// Granular: waveslider; Convolver: waveimage) zoom in on a stretch of the sound and pan along it, so a tiny loop of a
// long sample can be picked. A mouse wheel or trackpad pinch over the waveform zooms it about the pointer, a sideways
// trackpad swipe (or Shift + wheel) pans it, two fingers pinch and slide it, and a drag on the waveform away from the
// handles pans it. The stage under the panel does not move.
//
// How: the panel is v1's, verbatim (ported/UI/OptionsPanel.ts). The zoom is a view window [f0, f1] (fractions of the
// whole sound) per block. Populate gets the form with each wave row's min/max narrowed to the window and its waveform
// recomputed for the window, so v1's own value ↔ pixel maths (handles, slider, spread lines) work unchanged. Drawing
// is clipped to the waveform; handles outside the window are not drawn and can't be grabbed. Unzoomed, nothing changes.
import { App } from './shim.ts';

type View = { f0: number; f1: number; rev: boolean; src: unknown };
const views = new Map<number, View>();  // block id → its window (this session; not saved in the patch)
const WAVE = /^wave(region|slider|image)$/;
const POINTS = 200;  // v1 GetWaveformFromBuffer(buffer, 200, …)

/** What the waveform is drawn from: the decoded sound, else (the Convolver's built-in response) the drawn array. */
const sourceOf = (b: any) => (b.PrimaryBuffer?.getChannelData ? b.PrimaryBuffer : (b.WaveForm?.length ? b.WaveForm : b._WaveForm));
/** Samplers draw a reversed sound reversed (WaveForm, the waveregion row); the window flips with it. */
const reversed = (b: any) => !!b.Params?.reverse && 'startPosition' in (b.Params ?? {});

/** The block's window, or null when it shows the whole sound (a new sound shows all of it again). */
export function viewOf(b: any): View | null {
  const v = b ? views.get(b.Id) : undefined;
  if (!v) return null;
  if (v.src !== sourceOf(b)) { views.delete(b.Id); return null; }
  const rev = reversed(b);
  if (v.rev !== rev) Object.assign(v, { f0: 1 - v.f1, f1: 1 - v.f0, rev });
  return v;
}
/** The open panel's window (playheads use it). */
export function panelView(panel: any): { f0: number; f1: number } | null {
  return panel.Scale === 1 ? viewOf(panel.SelectedBlock) : null;
}

/** The narrowest window: 400 samples of the sound (or a tenth of a drawn array). */
function minSpan(b: any): number {
  const s = sourceOf(b);
  const n = s?.getChannelData ? s.length : 0;
  return n > 0 ? Math.min(1, 400 / n) : 0.1;
}

/** The loudest |value| overlapping each of POINTS equal parts of [a0, a1] (fractions of `chs`, one or two channels).
 * Exact edges at any zoom: a part narrower than one value takes the value under it, so the row is always full and
 * stays on the handles' scale. v1's GetWaveformFromBuffer rounds its parts up to whole values, which cut a short
 * window's waveform short and snapped it to whole values (owner's recording, 2026-11-20: the plugins' page has only
 * the processor's preview, so their windows are short). Long parts are read with a stride, as v1 does. */
function peaks(chs: ArrayLike<number>[], a0: number, a1: number): number[] {
  const n = chs[0]?.length ?? 0, out: number[] = [];
  if (!n) return out;
  for (let i = 0; i < POINTS; i++) {
    const lo = Math.min(n - 1, Math.floor((a0 + (a1 - a0) * i / POINTS) * n));
    const hi = Math.max(lo, Math.min(n - 1, Math.ceil((a0 + (a1 - a0) * (i + 1) / POINTS) * n) - 1));
    const step = Math.max(1, Math.floor((hi - lo + 1) / 64));
    let m = 0;
    for (const ch of chs) for (let k = lo; k <= hi; k += step) m = Math.max(m, Math.abs(ch[k]));
    out.push(m);
  }
  return out;
}
const channels = (src: any): ArrayLike<number>[] =>
  src?.getChannelData ? Array.from({ length: Math.min(2, src.numberOfChannels) }, (_, c) => src.getChannelData(c)) : [src ?? []];

const gain = new WeakMap<object, number>();
/** v1's soft normalise (95 %) of the whole sound, so a zoomed quiet stretch stays as quiet as it looks unzoomed. */
function normalOf(buf: any): number {
  let g = gain.get(buf);
  if (g === undefined) {
    const peak = Math.max(0, ...peaks(channels(buf), 0, 1));
    g = peak > 0.01 ? (1 / peak - 1) * 0.95 + 1 : 1;
    gain.set(buf, g);
  }
  return g;
}
/** The window's waveform: the peaks of that stretch of the sound (or of the drawn array, already normalised). */
function windowWave(src: any, f0: number, f1: number, rev: boolean): number[] {
  const [a0, a1] = rev ? [1 - f1, 1 - f0] : [f0, f1];
  // The drawn array is already reversed: back to the sound's order first.
  const chs = src?.getChannelData ? channels(src) : [rev ? [...(src ?? [])].reverse() : (src ?? [])];
  const g = src?.getChannelData ? normalOf(src) : 1;
  const w = peaks(chs, a0, a1).map(x => Math.min(1, x * g));
  return rev ? w.reverse() : w;
}

/** The form with each wave row narrowed to the window (a copy: the block's form stays whole). */
function windowedForm(json: any, b: any, v: View): any {
  const src = sourceOf(b);
  return {
    ...json,
    parameters: json.parameters.map((p: any) => {
      if (!WAVE.test(p.type) || !p.props?.wavearray?.length) return p;
      const props = { ...p.props, wavearray: windowWave(src, v.f0, v.f1, p.type === 'waveregion' && v.rev) };
      if (typeof p.props.min === 'number' && typeof p.props.max === 'number') {
        const span = p.props.max - p.props.min;
        props.min = p.props.min + v.f0 * span; props.max = p.props.min + v.f1 * span;
      }
      return { ...p, props };
    }),
  };
}

/** Draw a wave row inside its waveform only, with its name (outside that clip) and where the window sits. */
function clipDraw(o: any, v: View): void {
  const draw = o.Draw;
  o.Draw = function (ctx: CanvasRenderingContext2D, units: number, i: number, panel: any) {
    const y = this.Position.y, h = this.Size.height, left = panel.Margin - units, end = panel.Margin + panel.Range;
    const inView = (x: number) => x >= -0.5 && x <= panel.Range + 0.5;
    // Labels of a handle or the slider's value may run on into the panel's right margin (as in v1); nothing else does.
    const right = this.Type === 'waveregion' || (this.Type === 'waveslider' && inView(this.Position.x)) ? panel.Size.width : end + units;
    const hidden: [any, number][] = [];
    if (this.Type === 'waveregion') for (const hd of this.Handles) if (!inView(hd.Position.x)) { hidden.push([hd, hd.Position.x]); hd.Position.x = hd.Position.x < 0 ? -1e6 : 1e6; }
    const fill = panel.diagonalFill;  // the loop's hatching: only over the waveform
    panel.diagonalFill = function (x: number, yy: number, w: number, hh: number, s: number) {
      const a = Math.max(x, panel.Margin), b = Math.min(x + w, end);
      if (b > a) fill.call(this, a, yy, b - a, hh, s);
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(left, y - units, right - left, h + 2 * units); ctx.clip();
    try { draw.call(this, ctx, units, i, panel); } finally {
      ctx.restore();
      panel.diagonalFill = fill;
      for (const [hd, x] of hidden) hd.Position.x = x;
    }
    ctx.save();
    // v1 OptionWave's PARAM NAME (it fell outside the clip)
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'right';
    ctx.fillText(this.Name.toUpperCase(), panel.Margin - 15 * units, y + h * 0.5 + Math.round(units * 10) * 0.4);
    // where the window is in the whole sound: a thin bar along the bottom of the waveform
    const by = y + h - 3 * units;
    ctx.globalAlpha = 0.25; ctx.fillRect(panel.Margin, by, panel.Range, 2 * units);
    ctx.globalAlpha = 1; ctx.fillRect(panel.Margin + v.f0 * panel.Range, by, Math.max(2 * units, (v.f1 - v.f0) * panel.Range), 2 * units);
    ctx.restore();
  };
}

/** Panel x/y (device px) of wave row `i`'s waveform. */
function rowRect(panel: any, i: number) {
  const o = panel.Options[i];
  return { x: panel.Position.x + panel.Margin, y: panel.Position.y + o.Position.y, w: panel.Range, h: o.Size.height };
}
/** The wave row of the open panel under (x, y) device px (its waveform, with v1's 10-unit grab margin), or -1. */
export function waveRowAt(panel: any, x: number, y: number): number {
  if (panel.Scale !== 1 || !panel.SelectedBlock) return -1;
  const u = App.Unit;
  return (panel.Options ?? []).findIndex((o: any, i: number) => {
    if (!WAVE.test(o.Type) || !o.Waveform?.length) return false;
    const r = rowRect(panel, i);
    return x >= r.x - 10 * u && x <= r.x + r.w + 10 * u && y >= r.y && y <= r.y + r.h;
  });
}

/** Show [f0, f0 + span] of the open block's sound (clamped to it), and draw the panel again. */
function setView(panel: any, f0: number, span: number): void {
  const b = panel.SelectedBlock;
  if (!b || panel.Scale !== 1) return;
  span = Math.min(1, Math.max(minSpan(b), span));
  f0 = Math.min(1 - span, Math.max(0, f0));
  if (span >= 1 - 1e-9) views.delete(b.Id);
  else views.set(b.Id, { f0, f1: f0 + span, rev: reversed(b), src: sourceOf(b) });
  panel.Refresh();
}
const current = (panel: any) => viewOf(panel.SelectedBlock) ?? { f0: 0, f1: 1 };
/** The fraction of the whole sound at device x on row `i` (clamped to the waveform). */
function fracAt(panel: any, i: number, x: number): { at: number; t: number } {
  const r = rowRect(panel, i), v = current(panel), t = Math.min(1, Math.max(0, (x - r.x) / r.w));
  return { at: v.f0 + t * (v.f1 - v.f0), t };
}
/** Zoom row `i` about device x by `factor` (> 1: in), the sound under x staying put. */
export function zoomWaveAt(panel: any, i: number, x: number, factor: number): void {
  const v = current(panel), { at, t } = fracAt(panel, i, x), span = Math.min(1, Math.max(minSpan(panel.SelectedBlock), (v.f1 - v.f0) / factor));
  setView(panel, at - t * span, span);
}
/** Slide row `i` by `dx` device px (> 0: on through the sound, as a trackpad swipe to the left). */
export function panWave(panel: any, i: number, dx: number): void {
  const v = current(panel), span = v.f1 - v.f0;
  if (span >= 1) return;
  setView(panel, v.f0 + (dx / rowRect(panel, i).w) * span, span);
}
/** A mouse wheel or trackpad over row `i` at device x (wheel deltas in CSS px; `dpr` device px each): a sideways
 * swipe (or Shift + wheel) pans; otherwise it zooms, at the stage's rates (a trackpad pinch, ctrlKey, twice a wheel
 * notch's). */
export function wheelWave(panel: any, i: number, x: number, e: { deltaX: number; deltaY: number; ctrlKey: boolean; shiftKey: boolean }, dpr: number): void {
  const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.shiftKey && !e.ctrlKey);
  if (sideways) { panWave(panel, i, (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * dpr); return; }
  const dy = Math.max(-25, Math.min(25, e.deltaY));
  zoomWaveAt(panel, i, x, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.005)));
}

/** A two-finger (or Safari trackpad) pinch on row `i`: the sound under the fingers' midpoint follows it. */
export type WavePinch = { row: number; at: number; span0: number; d0: number };
export function startWavePinch(panel: any, i: number, midX: number, dist: number): WavePinch {
  const v = current(panel);
  return { row: i, at: fracAt(panel, i, midX).at, span0: v.f1 - v.f0, d0: Math.max(dist, 1e-3) };
}
/** `dist`: the fingers' distance now (the start's was d0), or Safari's gesture scale (started with dist 1). */
export function moveWavePinch(panel: any, p: WavePinch, midX: number, dist: number): void {
  if (panel.Scale !== 1 || !panel.Options?.[p.row]) return;
  const r = rowRect(panel, p.row), t = (midX - r.x) / r.w;
  const span = Math.min(1, Math.max(minSpan(panel.SelectedBlock), p.span0 * p.d0 / Math.max(dist, 1e-3)));
  setView(panel, p.at - t * span, span);
}

/** The values of wave row `i` (its handles, or the slider), to put back if a press there turns out to be a pinch. */
export function snapshotWave(panel: any, i: number): (() => void) | null {
  const o = panel.Options?.[i], b = panel.SelectedBlock;
  if (!o || !b) return null;
  const vals: [string, number][] = o.Type === 'waveregion' ? o.Handles.map((h: any) => [h.XSetting, h.XValue])
    : o.Type === 'waveslider' ? [[o.Setting, o.Value]] : [];
  return () => {
    panel.MouseUp();
    if (panel.SelectedBlock !== b) return;
    const now: Record<string, number> = {};
    for (const h of o.Type === 'waveregion' ? o.Handles : []) now[h.XSetting] = h.XValue;
    if (o.Type === 'waveslider') now[o.Setting] = o.Value;
    for (const [k, val] of vals) if (now[k] !== val) b.SetParam(k, val);
    panel.Refresh();
  };
}

/** Wraps the options panel (after the other installs: it is the outermost Populate). */
export function installWaveZoom(panel: any): void {
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    const b = panel.SelectedBlock, v = viewOf(b);
    populate(v ? windowedForm(json, b, v) : json, open);
    if (v) for (const o of panel.Options ?? []) if (WAVE.test(o.Type) && o.Waveform?.length) clipDraw(o, v);
  };
  // Handles outside the window can't be grabbed (v1's 10-unit hit box would reach into the row's name).
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    if (!viewOf(panel.SelectedBlock)) return;
    for (const o of panel.Options ?? []) if (o.Type === 'waveregion')
      o.Handles.forEach((h: any, j: number) => { if (h.Position.x < -0.5 || h.Position.x > panel.Range + 0.5) o.HandleRoll[j] = false; });
  };
  // Zoomed in, a drag on the waveform that grabs no handle slides it (Sample, Recorder, Convolver; Granular's press
  // anywhere moves its slider, as in v1).
  let drag: { row: number; x: number } | null = null;
  const down = panel.MouseDown.bind(panel), move = panel.MouseMove.bind(panel), up = panel.MouseUp.bind(panel);
  panel.MouseDown = (mx: number, my: number) => {
    down(mx, my);
    drag = null;
    const i = waveRowAt(panel, mx, my), o = panel.Options?.[i];
    if (i < 0 || !viewOf(panel.SelectedBlock) || o.Type === 'waveslider') return;
    if (o.Type === 'waveregion' && o.Handles.some((h: any) => h.Selected)) return;
    drag = { row: i, x: mx };
  };
  panel.MouseMove = (mx: number, my: number) => {
    if (drag) { panWave(panel, drag.row, drag.x - mx); drag.x = mx; panel.RolloverCheck(mx, my); return; }
    move(mx, my);
  };
  panel.MouseUp = () => { drag = null; up(); };
}
