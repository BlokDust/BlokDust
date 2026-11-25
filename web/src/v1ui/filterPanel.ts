// The Filter's options panel (CHG-0010), from v1's pieces: the EQ's graph with one handle and a
// width bar, plotting the real response (engine/effects.hpp), and a TYPE row of icon buttons.
import { App, Point } from './shim.ts';
import type { V1Block } from './blocks/v1Block.ts';
import type { PanelOption, V2OptionsPanel } from './optionsTypes.ts';
import type { OptionButton } from './ported/UI/Options/OptionButton';

/** Filter `type` values (blocks/effect/fx.filter.block.json). */
export const FILTER_TYPES = ['Peak', 'Low pass', 'High pass', 'Band pass'] as const;

/** The type icons (the owner's "option B": one gentle bend per corner), in units about the
 * button's centre (the Tone's Wave icons span ±10 × ±5 units). */
export const FILTER_ICONS = [
  'M-13,4 L-7,4 C-2,4 -3,-5 0,-5 C3,-5 2,4 7,4 L13,4',
  'M-12,-4 L-1,-4 C4,-4 5,0 9,5',
  'M-9,5 C-5,0 -4,-4 1,-4 L12,-4',
  'M-11,5 C-6,5 -4,-5 0,-5 C4,-5 6,5 11,5',
];

const GAIN = { min: -35, max: 35 }; // the Gain slider's range in v1's Filter
/** v1 EQ's mid bands: a short bar is narrow (Q 14), a long one wide (Q 0.5). */
const WIDTH = { min: 14, max: 0.5 };
/** v1's Parametric always has four handles: 1 is the Filter's; 0, 2 and 3 are parked here. */
const PARKED = 1e6;

type Biquad = [number, number, number];
/** A biquad's squared magnitude at `omega` (radians per sample). */
function magnitude(coefficients: Biquad, omega: number): number {
  const real =
      coefficients[0] + coefficients[1] * Math.cos(omega) + coefficients[2] * Math.cos(2 * omega),
    imaginary = -coefficients[1] * Math.sin(omega) - coefficients[2] * Math.sin(2 * omega);
  return real * real + imaginary * imaginary;
}

/** The response of a Filter in dB at `hz` (48 kHz; the curve is a picture, not the DSP). */
export function filterResponseDb(
  type: number,
  freq: number,
  gainDb: number,
  width: number,
  hz: number,
  sampleRate = 48000,
): number {
  const cutoff = Math.min(Math.max(freq / (sampleRate / 2), 1e-6), 0.999999),
    w0 = Math.PI * cutoff,
    cosine = Math.cos(w0);
  let numerator: Biquad,
    denominator: Biquad,
    level = 1;
  if (type === 1 || type === 2) {
    // Low / High pass: Q is the resonance in dB (Web Audio)
    const alpha = Math.sin(w0) / (2 * Math.pow(10, gainDb / 20)),
      beta = type === 1 ? (1 - cosine) / 2 : (1 + cosine) / 2,
      sign = type === 1 ? 2 : -2;
    numerator = [beta, sign * beta, beta];
    denominator = [1 + alpha, -2 * cosine, 1 - alpha];
  } else {
    const alpha = Math.sin(w0) / (2 * Math.max(width, 1e-3));
    if (type === 3) {
      numerator = [alpha, 0, -alpha];
      denominator = [1 + alpha, -2 * cosine, 1 - alpha];
      level = Math.pow(10, gainDb / 20);
    } else {
      const amplitude = Math.pow(10, gainDb / 40);
      numerator = [1 + alpha * amplitude, -2 * cosine, 1 - alpha * amplitude];
      denominator = [1 + alpha / amplitude, -2 * cosine, 1 - alpha / amplitude];
    }
  }
  const omega = (2 * Math.PI * hz) / sampleRate;
  const power = (magnitude(numerator, omega) * level * level) / magnitude(denominator, omega);
  return 10 * Math.log10(Math.max(power, 1e-12));
}

/** The Filter's options form: v1's Parametric (one live node) and a Buttons row (mode "filter"). */
export function filterForm(block: V1Block): void {
  const params = block.Params,
    node = {
      x_setting: 'frequency',
      x_value: Number(params.frequency),
      x_min: 20,
      x_max: 20000,
      y_setting: 'gain',
      y_value: Number(params.gain),
      y_min: GAIN.min,
      y_max: GAIN.max,
      q_setting: 'Q',
      q_value: Number(params.Q ?? 1),
      q_min: WIDTH.min,
      q_max: WIDTH.max,
    };
  block.OptionsForm = {
    name: block.OptionsForm?.name ?? 'Filter',
    parameters: [
      {
        type: 'parametric',
        name: 'Filter',
        setting: 'parametric',
        nodes: [node, node, node, node],
      },
      {
        type: 'buttons',
        name: 'Type',
        setting: 'type',
        props: { value: Number(params.type ?? 0), mode: 'filter' },
        buttons: FILTER_TYPES.map((name) => ({ name })),
      },
    ],
  };
}

/** Teach the options panel the Filter's graph and icons (once, at start-up). */
export function installFilterPanel(panel: V2OptionsPanel): void {
  const isFilter = () => panel.SelectedBlock?.def.id === 'fx.filter';
  const type = () => Math.round(Number(panel.SelectedBlock?.Params.type ?? 0));
  const hasWidth = () => type() === 0 || type() === 3;
  const populate = panel.Populate.bind(panel);
  panel.Populate = (json, open) => {
    populate(json, open);
    if (!isFilter()) return;
    for (const option of panel.Options) {
      if (option.Type === 'parametric') adaptGraph(option);
      if (option.Type === 'buttons') for (const button of option.Buttons) adaptButton(button);
    }
  };
  // The width bar is hit only where it is drawn (Peak, Band pass).
  const rollover = panel.RolloverCheck.bind(panel);
  panel.RolloverCheck = (mx: number, my: number) => {
    rollover(mx, my);
    if (!isFilter() || hasWidth()) return;
    for (const option of panel.Options)
      if (option.Type === 'parametric') option.SubHandleRoll[1] = false;
  };

  function adaptGraph(graph: PanelOption): void {
    for (const j of [0, 2, 3])
      graph.Handles[j].Position = new Point(PARKED, graph.Handles[j].Position.y);
    graph.PlotGraph = function (this: PanelOption) {
      const height = this.Size.height,
        smoothness = this.Smoothness,
        live = this.Handles[1],
        width = this.SubHandles[1];
      for (let j = 0; j < smoothness; j++) {
        const hz = 20 * Math.pow(1000, (j + 1) / smoothness);
        const decibels = filterResponseDb(type(), live.XValue, live.YValue, width.Value, hz);
        this.LineGain[j] = Math.max(
          -0.35 * height,
          Math.min(0.35 * height, (decibels * (0.7 * height)) / (GAIN.max - GAIN.min)),
        );
      }
    };
    const draw = graph.Draw.bind(graph),
      bar = graph.SubHandles[1],
      barDraw = bar.Draw.bind(bar);
    graph.Draw = (...args) => {
      graph.PlotGraph(); // the type may have changed since the last drag
      bar.Draw = hasWidth() ? barDraw : () => {};
      draw(...args);
    };
    graph.PlotGraph();
  }

  function adaptButton(button: OptionButton): void {
    const draw = button.Draw.bind(button);
    button.Draw = (
      ctx: CanvasRenderingContext2D,
      buttonPanel: V2OptionsPanel,
      units: number,
      x: number,
      height: number,
      i: number,
      mode: string,
    ) => {
      draw(ctx, buttonPanel, units, x, height, i, mode === 'filter' ? 'none' : mode); // v1's bar
      if (mode !== 'filter') return;
      const cx = x + button.Position.x + button.Size.width * 0.5,
        cy = button.Position.y + height * 0.5;
      ctx.save();
      App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.translate(cx, cy);
      ctx.scale(units, units);
      ctx.lineWidth = 2 / units; // v1 draws the Wave icons 2 px wide
      ctx.stroke(new Path2D(FILTER_ICONS[button.Value] ?? ''));
      ctx.restore();
    };
  }
}
