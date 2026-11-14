// The Filter's options panel (owner, 2026-11-12, CHG-0010; not in v1, whose Filter was a fixed peak with Frequency and
// Gain sliders). It is drawn only with v1's own pieces:
//  - the EQ's graph (v1 OptionParametric) with one handle: left/right is the frequency, up/down the gain (the Peak's
//    gain, the Low/High pass resonance, the Band pass level), and the bar under it the width (Peak, Band pass);
//  - a TYPE row of icon buttons like the Tone's WAVE row (v1 OptionButtonArray), icons in the Wave icons' style
//    (owner's pick, "option B": one gentle bend per corner).
// The graph plots the filter's real response, with the engine's formulas (Chromium's biquads, engine/effects.hpp).
// v1's Parametric always has four handles: handle 1 is the Filter's (the one with a width bar); 0, 2 and 3 are parked
// off the panel, so they are neither drawn nor hit.
import { App, Point } from './shim.ts';

/** Filter `type` values (blocks/effect/fx.filter.block.json). */
export const FILTER_TYPES = ['Peak', 'Low pass', 'High pass', 'Band pass'] as const;

/** Option B icons, in units about the button's centre (the Tone's Wave icons span ±10 × ±5 units). */
export const FILTER_ICONS = [
  'M-13,4 L-7,4 C-2,4 -3,-5 0,-5 C3,-5 2,4 7,4 L13,4',
  'M-12,-4 L-1,-4 C4,-4 5,0 9,5',
  'M-9,5 C-5,0 -4,-4 1,-4 L12,-4',
  'M-11,5 C-6,5 -4,-5 0,-5 C4,-5 6,5 11,5',
];

const GAIN = { min: -35, max: 35 };   // the Gain slider's range in v1's Filter
const WIDTH = { min: 14, max: 0.5 };  // v1 EQ's mid bands: a short bar is narrow (Q 14), a long one wide (Q 0.5)
const PARKED = 1e6;                   // x of the unused handles: off the panel

/** The response of a Filter in dB at `hz` (sample rate 48 kHz; the curve is a picture, not the DSP). */
export function filterResponseDb(type: number, freq: number, gainDb: number, q: number, hz: number, sr = 48000): number {
  const c = Math.min(Math.max(freq / (sr / 2), 1e-6), 0.999999), w0 = Math.PI * c, k = Math.cos(w0);
  let b: number[], a: number[], level = 1;
  if (type === 1 || type === 2) {  // Low / High pass: Q is the resonance in dB (Web Audio)
    const alpha = Math.sin(w0) / (2 * Math.pow(10, gainDb / 20)), beta = type === 1 ? (1 - k) / 2 : (1 + k) / 2, s = type === 1 ? 2 : -2;
    b = [beta, s * beta, beta]; a = [1 + alpha, -2 * k, 1 - alpha];
  } else {
    const alpha = Math.sin(w0) / (2 * Math.max(q, 1e-3));
    if (type === 3) { b = [alpha, 0, -alpha]; a = [1 + alpha, -2 * k, 1 - alpha]; level = Math.pow(10, gainDb / 20); }
    else { const A = Math.pow(10, gainDb / 40); b = [1 + alpha * A, -2 * k, 1 - alpha * A]; a = [1 + alpha / A, -2 * k, 1 - alpha / A]; }
  }
  const w = 2 * Math.PI * hz / sr, mag = (h: number[]) => {
    const re = h[0] + h[1] * Math.cos(w) + h[2] * Math.cos(2 * w), im = -h[1] * Math.sin(w) - h[2] * Math.sin(2 * w);
    return re * re + im * im;
  };
  return 10 * Math.log10(Math.max(mag(b) * level * level / mag(a), 1e-12));
}

/** The Filter's options form: v1's Parametric (one live node) and a Buttons row (mode "filter", drawn here). */
export function filterForm(b: { OptionsForm: any; Params: Record<string, any> }): void {
  const p = b.Params, node = {
    x_setting: 'frequency', x_value: Number(p.frequency), x_min: 20, x_max: 20000,
    y_setting: 'gain', y_value: Number(p.gain), y_min: GAIN.min, y_max: GAIN.max,
    q_setting: 'Q', q_value: Number(p.Q ?? 1), q_min: WIDTH.min, q_max: WIDTH.max,
  };
  b.OptionsForm = {
    name: b.OptionsForm?.name ?? 'Filter',
    parameters: [
      { type: 'parametric', name: 'Filter', setting: 'parametric', nodes: [node, node, node, node] },
      { type: 'buttons', name: 'Type', setting: 'type', props: { value: Number(p.type ?? 0), mode: 'filter' },
        buttons: FILTER_TYPES.map(name => ({ name })) },
    ],
  };
}

/** Teach the options panel the Filter's graph and icons (once, at start-up). */
export function installFilterPanel(panel: any): void {
  const isFilter = () => panel.SelectedBlock?.def?.id === 'fx.filter';
  const type = () => Math.round(Number(panel.SelectedBlock?.Params?.type ?? 0));
  const hasWidth = () => type() === 0 || type() === 3;
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json: any, open: boolean) => {
    populate(json, open);
    if (!isFilter()) return;
    for (const o of panel.Options as any[]) {
      if (o.Type === 'parametric') adaptGraph(o);
      if (o.Type === 'buttons') for (const btn of o.Buttons) adaptButton(btn);
    }
  };
  // The width bar is hit only where it is drawn (Peak, Band pass).
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    if (!isFilter() || hasWidth()) return;
    for (const o of panel.Options as any[]) if (o.Type === 'parametric') o.SubHandleRoll[1] = false;
  };

  function adaptGraph(g: any): void {
    for (const j of [0, 2, 3]) g.Handles[j].Position = new Point(PARKED, g.Handles[j].Position.y);
    g.PlotGraph = function (this: any) {
      const h = this.Size.height, n = this.Smoothness, live = this.Handles[1], width = this.SubHandles[1];
      for (let j = 0; j < n; j++) {
        const hz = 20 * Math.pow(1000, (j + 1) / n);
        const db = filterResponseDb(type(), live.XValue, live.YValue, width.Value, hz);
        this.LineGain[j] = Math.max(-0.35 * h, Math.min(0.35 * h, db * (0.7 * h) / (GAIN.max - GAIN.min)));
      }
    };
    const draw = g.Draw.bind(g), barDraw = g.SubHandles[1].Draw.bind(g.SubHandles[1]);
    g.Draw = (...args: any[]) => {
      g.PlotGraph();  // the type may have changed since the last drag
      g.SubHandles[1].Draw = hasWidth() ? barDraw : () => {};
      draw(...args);
    };
    g.PlotGraph();
  }

  function adaptButton(btn: any): void {
    const draw = btn.Draw.bind(btn);
    btn.Draw = (ctx: CanvasRenderingContext2D, pnl: any, units: number, x: number, h: number, i: number, mode: string) => {
      draw(ctx, pnl, units, x, h, i, mode === 'filter' ? 'none' : mode);  // v1's selection bar
      if (mode !== 'filter') return;
      const cx = x + btn.Position.x + btn.Size.width * 0.5, cy = btn.Position.y + h * 0.5;
      ctx.save();
      App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.translate(cx, cy); ctx.scale(units, units);
      ctx.lineWidth = 2 / units;  // v1 draws the Wave icons 2 px wide
      ctx.stroke(new Path2D(FILTER_ICONS[btn.Value] ?? ''));
      ctx.restore();
    };
  }
}
