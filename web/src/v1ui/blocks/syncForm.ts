// Tempo sync rows (CHG-0004 3.5, SIMULATION-0003) in v1's option styles: a Tempo Sync switch after
// the first row, then musical steps ("1/8T", "1 BAR") in place of the free-running rows they hide.
import type { FormParameter, FormSwitch } from '../optionsTypes.ts';
import type { V1Block } from './v1Block.ts';

export interface BeatStep {
  beats: number;
  label: string;
}
/** Musical lengths for the synced sliders (beats = quarter notes), with triplets. */
export const BEAT_STEPS: BeatStep[] = [
  { beats: 0.0625, label: '1/64' },
  { beats: 0.125, label: '1/32' },
  { beats: 1 / 6, label: '1/16T' },
  { beats: 0.25, label: '1/16' },
  { beats: 1 / 3, label: '1/8T' },
  { beats: 0.5, label: '1/8' },
  { beats: 2 / 3, label: '1/4T' },
  { beats: 1, label: '1/4' },
  { beats: 4 / 3, label: '1/2T' },
  { beats: 2, label: '1/2' },
  { beats: 4, label: '1 BAR' },
  { beats: 8, label: '2 BARS' },
  { beats: 16, label: '4 BARS' },
];
/** A synced laser's time per turn, laid out as v1's Rotate slider: fastest ↺ at the left,
 * slowest in the middle, fastest ↻ at the right. */
const TURN_STEPS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64].map((beats) => ({
  beats,
  label: beats < 4 ? `1/${4 / beats}` : beats === 4 ? '1 BAR' : `${beats / 4} BARS`,
}));
export const SIGNED_TURNS: BeatStep[] = [
  ...TURN_STEPS.map((step) => ({ beats: -step.beats, label: `↺ ${step.label}` })),
  ...[...TURN_STEPS].reverse().map((step) => ({ beats: step.beats, label: `↻ ${step.label}` })),
];
/** A synced Stereo Delay's time, with triplets and the dotted lengths delays are often set to. */
export const DELAY_STEPS: BeatStep[] = [
  { beats: 0.125, label: '1/32' },
  { beats: 1 / 6, label: '1/16T' },
  { beats: 0.25, label: '1/16' },
  { beats: 1 / 3, label: '1/8T' },
  { beats: 0.375, label: '1/16D' },
  { beats: 0.5, label: '1/8' },
  { beats: 2 / 3, label: '1/4T' },
  { beats: 0.75, label: '1/8D' },
  { beats: 1, label: '1/4' },
  { beats: 4 / 3, label: '1/2T' },
  { beats: 1.5, label: '1/4D' },
  { beats: 2, label: '1/2' },
];
/** A synced Pulse's Delay (CHG-0029): off, then the musical lengths up to a bar. */
export const PULSE_DELAY_STEPS: BeatStep[] = [
  { beats: 0, label: 'OFF' },
  ...BEAT_STEPS.filter((step) => step.beats <= 4),
];
/** Blocks with a Tempo Sync switch. */
export const SYNCED = new Set(['power.emitter', 'power.pulse', 'power.laser', 'fx.stereo-delay']);

/** The step `index` (a slider's value) of `steps`, clamped. */
export const stepAt = (steps: BeatStep[], index: number): BeatStep =>
  steps[Math.max(0, Math.min(steps.length - 1, Math.round(index)))];
const nearest = (steps: { beats: number }[], beats: number) => {
  let best = 0;
  steps.forEach((step, i) => {
    if (Math.abs(step.beats - beats) < Math.abs(steps[best].beats - beats)) best = i;
  });
  return best;
};
const stepSlider = (
  name: string,
  setting: string,
  steps: BeatStep[],
  at: number,
  centered = false,
): FormParameter => ({
  type: 'slider',
  name,
  setting,
  props: {
    value: at,
    min: 0,
    max: steps.length - 1,
    quantised: true,
    centered,
    convertDisplay: (value: number) => stepAt(steps, value).label,
  },
});
const percentSlider = (name: string, setting: string, value: number): FormParameter => ({
  type: 'slider',
  name,
  setting,
  props: {
    value,
    min: 0,
    max: 1,
    quantised: false,
    centered: false,
    convertDisplay: (shown: number) => `${Math.round(shown * 100)}%`,
  },
});

type SyncKind = 'emitter' | 'pulse' | 'delay' | 'laser';
const KIND_BY_ID: Partial<Record<string, SyncKind>> = {
  'power.emitter': 'emitter',
  'power.pulse': 'pulse',
  'fx.stereo-delay': 'delay',
};
/** The free-running rows the synced ones replace. */
const FREE_ROWS: Record<SyncKind, string[]> = {
  emitter: ['rate', 'speed'],
  pulse: ['pulseLength'],
  delay: ['delayTime'],
  laser: ['rotate'],
};

function syncedRows(block: V1Block, kind: SyncKind): FormParameter[] {
  const params = block.Params;
  if (kind === 'emitter')
    return [
      stepSlider(
        'Division',
        'divisionIndex',
        BEAT_STEPS,
        nearest(BEAT_STEPS, Number(params.division ?? 1)),
      ),
      percentSlider('Swing', 'swing', Number(params.swing ?? 0)),
    ];
  if (kind === 'pulse')
    return [
      stepSlider(
        'Length',
        'lengthIndex',
        BEAT_STEPS,
        nearest(BEAT_STEPS, Number(params.pulseBeats ?? 0.25)),
      ),
      stepSlider(
        'Delay',
        'pulseDelayIndex',
        PULSE_DELAY_STEPS,
        nearest(PULSE_DELAY_STEPS, Number(params.delayBeats ?? 0)),
      ),
    ];
  if (kind === 'delay')
    return [
      stepSlider(
        'Delay',
        'delayIndex',
        DELAY_STEPS,
        nearest(DELAY_STEPS, Number(params.delayBeats ?? 0.5)),
      ),
    ];
  return [
    stepSlider(
      'Turn',
      'turnIndex',
      SIGNED_TURNS,
      nearest(SIGNED_TURNS, Number(params.turnBeats ?? 4)),
      true,
    ),
  ];
}

/** The tempo sync rows: synced, the Emitter's Division and Swing, the Pulse's Length, the Laser's
 * Turn, the Stereo Delay's Delay; not synced, v1's rows. The tempo itself is in Settings. */
export function extendSyncForm(block: V1Block): void {
  const form = block.OptionsForm;
  if (!form) return;
  const params = block.Params,
    kind = KIND_BY_ID[block.def.id] ?? 'laser',
    synced = !!params.sync;
  const switches: FormSwitch[] = [
    { name: 'Tempo Sync', setting: 'sync', value: synced, lit: true, mode: 'offOn' },
  ];
  // The Laser's Restart (R9a): each power-on starts again from its Angle; synced or not.
  if (kind === 'laser')
    switches.push({
      name: 'Restart',
      setting: 'restart',
      value: !!params.restart,
      lit: true,
      mode: 'offOn',
    });
  const sync: FormParameter = {
    type: 'switches',
    name: '',
    setting: '',
    props: { value: 0, min: 0, max: 1, quantised: true },
    switches,
  };
  const syncRows = synced ? syncedRows(block, kind) : [];
  const free = new Set(synced ? FREE_ROWS[kind] : []);
  const kept = form.parameters.filter((param) => !free.has(param.setting));
  if (kind === 'emitter') {
    // Offset (CHG-0014), a share of the interval: after Swing if synced, else after Fire Rate.
    const offset = percentSlider('Offset', 'offset', Number(params.offset ?? 0));
    if (synced) syncRows.push(offset);
    else kept.splice(kept.findIndex((param) => param.setting === 'rate') + 1, 0, offset);
  }
  if (kind === 'pulse' && !synced)
    // Delay (CHG-0029, SIMULATION-0010): each hit waits this long before it powers the sources.
    kept.splice(kept.findIndex((param) => param.setting === 'pulseLength') + 1, 0, {
      type: 'slider',
      name: 'Delay',
      setting: 'delay',
      props: {
        value: Number(params.delay ?? 0),
        min: 0,
        max: 4,
        quantised: false,
        centered: false,
        convertDisplay: (value: number) =>
          value < 0.005
            ? 'OFF'
            : value < 1
              ? `${Math.round(value * 1000)} ms`
              : `${value.toFixed(2)} s`,
      },
    });
  // Pulse and Stereo Delay: their first row is hidden when synced, so the sync rows go first.
  const at = kind === 'pulse' || kind === 'delay' ? 0 : 1;
  form.parameters = [...kept.slice(0, at), sync, ...syncRows, ...kept.slice(at)];
}
