// SampleGen's numbered sounds (CHG-0035): a SOUND slider picks one of 999 waves instead of v1's
// GENERATE WAVE; each number seeds v1's generator, so a number is always the same wave.
import type { FormParameter } from '../optionsTypes.ts';
import type { V1Block } from './v1Block.ts';

export const SOUND_MAX = 999;

/** mulberry32's increment. */
const MULBERRY_STEP = 0x6d2b79f5;

/** Run v1's SampleGen generator (it draws every choice from Math.random) on `sound`'s own
 * random numbers (mulberry32), so a number always makes the same wave. 0: as v1, unseeded. */
export function withSound<T>(sound: number, run: () => T): T {
  if (!(sound > 0)) return run();
  let state = (Math.imul(sound, 0x9e3779b1) ^ 0x5bd1e995) >>> 0;
  const random = Math.random;
  Math.random = () => {
    state = (state + MULBERRY_STEP) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return run();
  } finally {
    Math.random = random;
  }
}

/** SampleGen's form: its GENERATE WAVE button becomes the SOUND slider. */
export function soundForm(block: V1Block): void {
  const params: FormParameter[] = block.OptionsForm?.parameters ?? [],
    i = params.findIndex((param) => param.setting === 'generate');
  if (i < 0) return;
  params[i] = {
    type: 'slider',
    name: 'Sound',
    setting: 'sound',
    props: {
      value: Math.max(1, Number(block.Params.sound) || 1),
      min: 1,
      max: SOUND_MAX,
      quantised: true,
      centered: false,
      convertDisplay: (value: number) => `#${Math.round(value)}`,
    },
  };
}
