// The rows the new blocks' options forms are built from (v1's slider, switches and a carousel), and
// the settings whose slider value is not the param itself.
import { addSelector } from '../selectorOption.ts';
import type { FormParameter, FormSwitch } from '../optionsTypes.ts';

export interface SliderOptions {
  quantised?: boolean;
  centered?: boolean;
  log?: boolean;
  display?: (value: number) => string;
}
export const slider = (
  name: string,
  setting: string,
  value: number,
  min: number,
  max: number,
  options: SliderOptions = {},
): FormParameter => ({
  type: 'slider',
  name,
  setting,
  props: {
    value,
    min,
    max,
    quantised: !!options.quantised,
    centered: !!options.centered,
    ...(options.log ? { logarithmic: true } : {}),
    ...(options.display ? { convertDisplay: options.display } : {}),
  },
});
const clampIndex = (value: number, length: number) =>
  Math.max(0, Math.min(length - 1, Math.round(value)));
/** A carousel row (selectorOption.ts): arrows either side of the choice, wrapping round. */
export const choice = (
  name: string,
  setting: string,
  value: number,
  labels: string[],
): FormParameter => {
  addSelector(setting);
  return slider(name, setting, clampIndex(value, labels.length), 0, labels.length - 1, {
    quantised: true,
    display: (shown) => labels[clampIndex(shown, labels.length)],
  });
};
export const switches = (
  ...list: { name: string; setting: string; value: boolean }[]
): FormParameter => ({
  type: 'switches',
  name: '',
  setting: '',
  props: { value: 0, min: 0, max: 1, quantised: true },
  switches: list.map((entry): FormSwitch => ({ ...entry, lit: true, mode: 'offOn' })),
});
export const dB = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
export const ms = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
export const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Scales shared by Random Note and the Touchpad (engine kScales), and the twelve keys. */
export const SCALES = ['MAJOR', 'MINOR', 'DORIAN', 'LYDIAN', 'MIXOLYDIAN', 'PENTATONIC'];
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** The Wavetable's built-in tables, in the engine's order (TableBank::names, CHG-0031). */
export const WAVETABLES = [
  'BELL',
  'CHIME',
  'GLASS',
  'GONG',
  'VOICE',
  'SWEEP',
  'SYNC',
  'FOLD',
  'PULSE',
];

export interface BeatLabel {
  beats: number;
  label: string;
}
/** A synced Arpeggiator's speeds (beats per note), with triplets. */
export const ARP_STEPS: BeatLabel[] = [
  { beats: 4, label: '1 BAR' },
  { beats: 2, label: '1/2' },
  { beats: 1, label: '1/4' },
  { beats: 2 / 3, label: '1/4T' },
  { beats: 0.5, label: '1/8' },
  { beats: 1 / 3, label: '1/8T' },
  { beats: 0.25, label: '1/16' },
  { beats: 1 / 6, label: '1/16T' },
  { beats: 0.125, label: '1/32' },
  { beats: 0.0625, label: '1/64' },
];
/** A synced LFO's cycle lengths (beats per cycle). */
export const LFO_STEPS: BeatLabel[] = [
  { beats: 64, label: '16 BARS' },
  { beats: 32, label: '8 BARS' },
  { beats: 16, label: '4 BARS' },
  { beats: 8, label: '2 BARS' },
  { beats: 4, label: '1 BAR' },
  { beats: 2, label: '1/2' },
  { beats: 1, label: '1/4' },
  { beats: 0.5, label: '1/8' },
  { beats: 0.25, label: '1/16' },
];
export const stepOf = (steps: BeatLabel[], value: number): BeatLabel =>
  steps[clampIndex(value, steps.length)];
export const nearestOf = (steps: { beats: number }[], beats: number) => {
  let best = 0;
  steps.forEach((step, i) => {
    if (Math.abs(step.beats - beats) < Math.abs(steps[best].beats - beats)) best = i;
  });
  return best;
};

/** An angle in (−180, 180]. */
export const wrapAngle = (angle: number) => {
  let wrapped = angle % 360;
  if (wrapped > 180) wrapped -= 360;
  if (wrapped <= -180) wrapped += 360;
  return wrapped;
};

/** Switches whose change shows or hides other rows: the panel is laid out again. `loop`: v1
 * Sample.SetParam('loop') refreshed the panel, so the waveform shows or hides the loop markers. */
export const settingRefreshes = (key: string): boolean => key === 'perHit' || key === 'loop';
/** Converted settings whose rows must be laid out again once set. */
const CONVERT_REFRESH = new Set(['inKey']);

/** Slider settings that are not the param itself: the slider's value → the param's (and back). */
export const CONVERT: Partial<
  Record<string, { param: string; to: (value: number) => number; from?: (value: number) => number }>
> = {
  attackMs: { param: 'attack', to: (value) => value / 1000, from: (value) => value * 1000 },
  releaseMs: { param: 'release', to: (value) => value / 1000, from: (value) => value * 1000 },
  // v1 Keyboard's Glide slider shows glide × 100
  glidePct: { param: 'glide', to: (value) => value / 100, from: (value) => value * 100 },
  // the Level meters' line is the threshold
  compMeter: { param: 'threshold', to: (value) => value, from: (value) => value },
  soundMeter: { param: 'threshold', to: (value) => value, from: (value) => value },
  // v1's Angle sliders show angle + 90 (0 = up)
  angle90: { param: 'angle', to: (value) => value - 90, from: (value) => wrapAngle(value + 90) },
  lfoDivisionIndex: { param: 'division', to: (value) => stepOf(LFO_STEPS, value).beats },
  whenQuieter: { param: 'invert', to: (value) => (value >= 0.5 ? 1 : 0) },
  inKey: { param: 'chromatic', to: (value) => (value ? 0 : 1) }, // the Touchpad's In Key switch
  arpDivisionIndex: { param: 'division', to: (value) => stepOf(ARP_STEPS, value).beats },
};
/** v1 SetParam for the settings above: the param and value to send, or null for an ordinary param. */
export function convertSetting(
  key: string,
  value: number,
): { param: string; value: number; refresh: boolean } | null {
  const converted = CONVERT[key];
  return converted
    ? {
        param: converted.param,
        value: converted.to(Number(value)),
        refresh: CONVERT_REFRESH.has(key),
      }
    : null;
}
