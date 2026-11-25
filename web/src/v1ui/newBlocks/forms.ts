// The new blocks' options forms (SCOPE-0005), built from v1's option types.
import { App, sceneIfMade } from '../shim.ts';
import type { V1Block } from '../blocks/v1Block.ts';
import type { FormParameter } from '../optionsTypes.ts';
import { touchpadForm } from '../touchpadPanel.ts';
import { noteName, rangeOf } from '../noteBars.ts';
import { lfoTargets } from './lfo.ts';
import {
  ARP_STEPS,
  KEYS,
  LFO_STEPS,
  SCALES,
  WAVETABLES,
  choice,
  dB,
  ms,
  nearestOf,
  percent,
  slider,
  stepOf,
  switches,
  wrapAngle,
} from './formRows.ts';

const keySlider = (block: V1Block) =>
  slider('Key', 'key', Number(block.Params.key ?? 0), 0, 11, {
    quantised: true,
    display: (value) => KEYS[Math.max(0, Math.min(11, Math.round(value)))],
  });
/** A row drawn by noteBars.ts, declared as a slider so v1's panel lays it out. */
const barsRow = (name: string): FormParameter => ({
  type: 'slider',
  name,
  setting: 'noteBars',
  props: { value: 0, min: 0, max: 1, height: 110 },
});
const angleSlider = (block: V1Block) =>
  slider('Angle', 'angle90', wrapAngle(Number(block.Params.angle) + 90), -180, 180, {
    quantised: true,
    centered: true,
  });
const actionButton = (setting: string, text: string): FormParameter => ({
  type: 'actionbutton',
  name: '',
  setting,
  props: { text },
});

/** The LFO's Target carousel: "Block · Param" over the blocks connected to it (CHG-0018). */
function lfoTargetRow(block: V1Block): FormParameter {
  const list = lfoTargets(block),
    now = sceneIfMade()?.host.targetOf(block.Id) ?? null;
  let at = now
    ? list.findIndex((target) => target.id === now.id && target.param === now.param)
    : -1;
  if (now && at < 0) {
    // set, but its block is out of reach: kept, idle (AUDIO-0003)
    const name = App.Blocks.find((other) => other.Id === now.id)?.BlockName ?? '?';
    list.unshift({
      id: now.id,
      param: now.param,
      label: `${name.toUpperCase()} · ${now.param.toUpperCase()} (OUT OF REACH)`,
    });
    at = 0;
  }
  block.LfoTargets = list;
  return choice('Target', 'lfoTarget', at + 1, ['NONE', ...list.map((target) => target.label)]);
}

const FORMS: Partial<Record<string, (block: V1Block) => FormParameter[]>> = {
  // CHG-0031 (AUDIO-0004): the frame being played, which table, where in it, the Tone's Note and Fine.
  'source.wavetable': (block) => [
    slider('Wave', 'wavePicture', 0, 0, 1),
    choice('Table', 'table', Number(block.Params.table), WAVETABLES),
    slider('Position', 'position', Number(block.Params.position), 0, 1, { display: percent }),
    slider('Note', 'transpose', Number(block.Params.transpose), -48, 48, {
      quantised: true,
      centered: true,
      display: block.DisplayNote,
    }),
    slider('Fine', 'fine', Number(block.Params.fine), -1, 1, { centered: true }),
  ],
  // CHG-0014: a level meter with the threshold on it (v1's dB meter), then the compressor's settings.
  'fx.compressor': (block) => [
    slider('Level', 'compMeter', Number(block.Params.threshold), -60, 0, { display: dB }),
    slider('Ratio', 'ratio', Number(block.Params.ratio), 1, 20, {
      display: (value) => `${value.toFixed(1)} : 1`,
    }),
    slider('Knee', 'knee', Number(block.Params.knee), 0, 40, { display: dB }),
    slider('Attack', 'attackMs', Math.max(1, Number(block.Params.attack) * 1000), 1, 1000, {
      log: true,
      display: ms,
    }),
    slider('Release', 'releaseMs', Math.max(10, Number(block.Params.release) * 1000), 10, 1000, {
      log: true,
      display: ms,
    }),
    slider('Makeup', 'makeup', Number(block.Params.makeup), -24, 24, {
      centered: true,
      display: dB,
    }),
  ],
  // CHG-0021: its level, Keep Particles (R13b), and OPEN STAGE (the plugins too).
  'source.stage': (block) => {
    const gain = Number(block.Params.gain ?? 1);
    return [
      slider('Volume', 'gainDb', gain > 0 ? Math.max(-40, 20 * Math.log10(gain)) : -40, -40, 6, {
        display: (value) =>
          value <= -40 ? 'OFF' : `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`,
      }),
      switches({
        name: 'Keep Particles',
        setting: 'keepParticles',
        value: !!block.Params.keepParticles,
      }),
      actionButton('openStage', 'Open Stage'),
    ];
  },
  // CHG-0018 (AUDIO-0003): what it moves, then how.
  'fx.lfo': (block) => [
    lfoTargetRow(block),
    {
      type: 'buttons',
      name: 'Shape',
      setting: 'shape',
      props: { value: Number(block.Params.shape), mode: 'wave' },
      buttons: [{ name: 'Sine' }, { name: 'Square' }, { name: 'Triangle' }, { name: 'Saw' }],
    },
    switches({ name: 'Tempo Sync', setting: 'sync', value: !!block.Params.sync }),
    block.Params.sync
      ? slider(
          'Rate',
          'lfoDivisionIndex',
          nearestOf(LFO_STEPS, Number(block.Params.division)),
          0,
          LFO_STEPS.length - 1,
          { quantised: true, display: (value) => stepOf(LFO_STEPS, value).label },
        )
      : slider('Rate', 'rate', Number(block.Params.rate), 0.02, 20, {
          log: true,
          display: (value) => `${value < 1 ? value.toFixed(2) : value.toFixed(1)} HZ`,
        }),
    slider('Depth', 'depth', Number(block.Params.depth), 0, 1, { display: percent }),
    slider('Phase', 'phase', Number(block.Params.phase), 0, 1, {
      display: (value) => `${Math.round(value * 360)}°`,
    }),
  ],
  // CHG-0040 (UI-0016): a chord for each note, the Key that slides them, and smooth voicing.
  'fx.chord': (block) => [
    barsRow('Chords'),
    keySlider(block),
    switches({
      name: 'Smooth',
      setting: 'smooth',
      value: block.Params.smooth === undefined ? true : !!Number(block.Params.smooth),
    }),
  ],
  // Speed: musical lengths when synced, notes a second when not. Per Hit hands the stepping to
  // the hits, so Speed and Tempo Sync go.
  'fx.arpeggiator': (block) => {
    const perHit = !!block.Params.perHit;
    const speed = block.Params.sync
      ? slider(
          'Speed',
          'arpDivisionIndex',
          nearestOf(ARP_STEPS, Number(block.Params.division)),
          0,
          ARP_STEPS.length - 1,
          { quantised: true, display: (value) => stepOf(ARP_STEPS, value).label },
        )
      : slider('Speed', 'speed', Number(block.Params.speed), 1, 30, {
          display: (value) => `${value.toFixed(1)} / S`,
        });
    return [
      choice('Pattern', 'pattern', Number(block.Params.pattern), [
        'UP',
        'DOWN',
        'UP & DOWN',
        'RANDOM',
      ]),
      switches(
        { name: 'Per Hit', setting: 'perHit', value: perHit },
        ...(perHit ? [] : [{ name: 'Tempo Sync', setting: 'sync', value: !!block.Params.sync }]),
      ),
      ...(perHit ? [] : [speed]),
      slider('Octaves', 'octaves', Number(block.Params.octaves), 1, 3, { quantised: true }),
    ];
  },
  // CHG-0040 (UI-0016): a weight for each note, the Key that slides them, the range by semitone.
  'fx.random-note': (block) => [
    barsRow('Notes'),
    keySlider(block),
    {
      type: 'slider',
      name: 'Range',
      setting: 'noteRange',
      props: {
        value: 0,
        min: 0,
        max: 1,
        convertDisplay: () => rangeOf(block).map(noteName).join(' – '),
      },
    },
  ],
  // CHG-0016: what it hears against its threshold, when the beam comes on, then the Laser's rows.
  'power.sound-laser': (block) => [
    slider('Level', 'soundMeter', Number(block.Params.threshold), -60, 0, { display: dB }),
    choice('Band', 'band', Number(block.Params.band), ['ALL', 'LOWS', 'MIDS', 'HIGHS']),
    choice('Beam on', 'whenQuieter', block.Params.invert ? 1 : 0, ['WHEN LOUDER', 'WHEN QUIETER']),
    slider('Hold', 'hold', Number(block.Params.hold), 0, 2, {
      display: (value) => ms(value * 1000),
    }),
    angleSlider(block),
    slider('Range', 'range', Number(block.Params.range), 50, 1200, { quantised: true }),
  ],
  // SIMULATION-0009: Hits Cut Power: a particle cuts its power for a moment, a beam while it touches.
  'power.power': (block) => [
    switches({ name: 'Hits Cut Power', setting: 'cutByHits', value: !!block.Params.cutByHits }),
  ],
  // CHG-0015: the steps, the three numbers that make them (SIMULATION-0005), then Reset.
  'power.counter': (block) => [
    slider('Pattern', 'counterPattern', 0, 0, 1),
    slider('Steps', 'steps', Number(block.Params.steps), 1, 16, { quantised: true }),
    slider('Hits', 'hits', Math.min(Number(block.Params.hits), Number(block.Params.steps)), 0, 16, {
      quantised: true,
    }),
    slider('Rotate', 'rotate', Number(block.Params.rotate), 0, 15, { quantised: true }),
    actionButton('resetCounter', 'Reset'),
  ],
  'power.chance': (block) => [
    slider('Chance', 'chance', Number(block.Params.chance), 0, 1, { display: percent }),
  ],
  // CHG-0032: open while a power block powers it; Invert swaps that (SIMULATION-0011).
  'power.gate': (block) => [
    switches({ name: 'Invert', setting: 'invert', value: !!block.Params.invert }),
  ],
  // The Laser's Angle and Rotate, then how many streams and how wide they fan (SIMULATION-0006).
  'power.prism': (block) => [
    angleSlider(block),
    {
      type: 'slider',
      name: 'Rotate',
      setting: 'rotate',
      props: {
        value: Number(block.Params.rotate),
        min: -500,
        max: 500,
        quantised: true,
        centered: true,
      },
    },
    slider('Streams', 'streams', Number(block.Params.streams), 1, 4, { quantised: true }),
    slider('Spread', 'spread', Number(block.Params.spread), 0, 180, {
      quantised: true,
      display: (value) => `${Math.round(value)}°`,
    }),
  ],
};

/** The options form of a new block (v1 UpdateOptionsForm), or false when `block` is not one. */
export function newBlockForm(block: V1Block): boolean {
  if (block.def.id === 'input.touchpad') {
    touchpadForm(block, SCALES, choice); // CHG-0019 (touchpadPanel.ts)
    return true;
  }
  const form = FORMS[block.def.id];
  if (!form) return false;
  block.OptionsForm = { name: block.BlockName, parameters: form(block) };
  return true;
}
