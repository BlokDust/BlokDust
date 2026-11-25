// Options v2 adds to v1 blocks' forms, built from v1's own option types: the MIDI Input's MPE,
// Channel and Device (CHG-0004, PLUGIN-0004), and the Microphone's Gain.
import { App, sceneIfMade } from '../shim.ts';
import type { FormParameter } from '../optionsTypes.ts';
import type { V1Block } from './v1Block.ts';

const offOn = (name: string, setting: string, value: boolean) => ({
  name,
  setting,
  value,
  lit: true,
  mode: 'offOn',
});

/** MIDI Input beyond v1: an MPE switch beside Mono/Poly; Channel (OMNI, 1–16) and, on the web,
 * Device as sliders with a text readout; with MPE on, Pressure and Slide switches. */
export function extendMidiForm(block: V1Block): void {
  const params: FormParameter[] = block.OptionsForm?.parameters ?? [];
  const switchRow = params.find((param) => param.type === 'switches');
  switchRow?.switches?.push(offOn('MPE', 'mpe', !!block.Params.mpe));
  // With MPE on, Channel is hidden: MPE uses every channel of its zone (CHG-0010).
  if (!block.Params.mpe)
    params.push({
      type: 'slider',
      name: 'Channel',
      setting: 'channel',
      props: {
        value: Number(block.Params.channel ?? 0),
        min: 0,
        max: 16,
        quantised: true,
        centered: false,
        convertDisplay: (value: number) =>
          Math.round(value) === 0 ? 'OMNI' : String(Math.round(value)),
      },
    });
  if (!App.IsPlugin) {
    // a selector (selectorOption.ts): arrows either side of the name
    const devices = sceneIfMade()?.midiDevices ?? [];
    const at = devices.findIndex((input) => input.name === block.Params.device);
    params.push({
      type: 'slider',
      name: 'Device',
      setting: 'deviceIndex',
      props: {
        value: at + 1,
        min: 0,
        max: Math.max(1, devices.length),
        quantised: true,
        centered: false,
        convertDisplay: (value: number) => {
          const i = Math.round(value);
          return i === 0
            ? 'ALL'
            : (devices[i - 1]?.name ?? (String(block.Params.device ?? '') || '—')).toUpperCase();
        },
      },
    });
  }
  // No Bend row: pitch bend is ±48 semitones, MPE's standard (the `bendRange` default).
  if (block.Params.mpe)
    params.push({
      type: 'switches',
      name: '',
      setting: '',
      props: { value: 0, min: 0, max: 1, quantised: true },
      switches: [
        offOn('Pressure', 'pressureTo', Number(block.Params.pressureTo ?? 1) >= 0.5),
        offOn('Slide', 'slideTo', Number(block.Params.slideTo ?? 1) >= 0.5),
      ],
    });
}

/** −40 dB is off. */
export const GAIN_DB_MIN = -40;
/** Audio Input / Microphone: one Gain row in dB (off, up to +6 dB). The param is a ratio, 1 = unity:
 * the plugins' Audio Input is a true bypass. */
export function gainForm(block: V1Block): void {
  const gain = Number(block.Params.gain ?? 1);
  block.OptionsForm = {
    name: App.IsPlugin && block.def.id === 'source.audio-in' ? 'Audio Input' : block.BlockName,
    parameters: [
      {
        type: 'slider',
        name: 'Gain',
        setting: 'gainDb',
        props: {
          value: gain > 0 ? Math.max(GAIN_DB_MIN, 20 * Math.log10(gain)) : GAIN_DB_MIN,
          min: GAIN_DB_MIN,
          max: 6,
          quantised: false,
          centered: false,
          convertDisplay: (value: number) =>
            value <= GAIN_DB_MIN ? 'OFF' : `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`,
        },
      },
    ],
  };
}
