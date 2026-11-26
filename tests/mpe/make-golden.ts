// node tests/mpe/make-golden.ts: regenerates tests/golden/mpe-midi.json, a raw MPE stream and the
// web parser's commands for it.
import { writeFileSync } from 'node:fs';
import { MpeParser } from '../../web/src/input/mpe.ts';
// A raw MPE performance at tick-aligned samples (multiples of 4800): MCM, two fingers, bends,
// pressure, slide.

/** A pitch bend of `semis` semitones in a `range`-semitone bend range, as its two data bytes. */
const bendBytes = (semis: number, range = 48) => {
  const value = Math.round(8192 + (semis / range) * 8192);
  return [value & 0x7f, value >> 7];
};
const midi: number[][] = [
  [0, 0xb0, 101, 0],
  [0, 0xb0, 100, 6],
  [0, 0xb0, 6, 15],
  [4800, 0x91, 60, 110],
  [4800, 0xd1, 40, 0],
  [9600, 0xb2, 74, 30],
  [9600, 0x92, 67, 90],
  ...Array.from({ length: 12 }, (_, i) => [14400 + i * 4800, 0xe1, ...bendBytes(i * 0.5)]),
  ...Array.from({ length: 12 }, (_, i) => [14400 + i * 4800, 0xd1, 40 + i * 7, 0]),
  ...Array.from({ length: 12 }, (_, i) => [14400 + i * 4800, 0xb2, 74, 30 + i * 8]),
  [76800, 0xe0, ...bendBytes(1, 2)],
  [96000, 0x81, 60, 0],
  [100800, 0x93, 64, 100],
  [124800, 0x82, 67, 0],
  [144000, 0x83, 64, 0],
];
const mpeParser = new MpeParser(0, 0);
mpeParser.setSettings({ mpe: true });
const DIM = ['bend', 'pressure', 'slide'];
const script = midi
  .flatMap((message) => mpeParser.message(message[1], message[2], message[3], message[0]))
  .map((command) =>
    command.type === 8
      ? {
          atSample: command.atSample,
          op: 'expression',
          note: command.param,
          channel: command.x,
          dim: DIM[command.y ?? 0],
          value: command.value,
        }
      : {
          atSample: command.atSample,
          op: command.type === 4 ? 'noteOn' : 'noteOff',
          note: command.param,
          channel: command.x,
          ...(command.type === 4 ? { velocity: command.value } : {}),
        },
  );
writeFileSync(
  'tests/golden/mpe-midi.json',
  JSON.stringify(
    {
      description:
        "A raw MPE stream (zone config, two fingers with bend/pressure/slide, master bend). `midi` is what a host sends; `script` is the web parser's output for it (tests/mpe). The plugin must render the raw stream identically (bd plugin test).",
      render: { seconds: 3.2, sampleRate: 48000 },
      patch: {
        format: 'blokdust.patch',
        version: 2,
        seed: 1,
        blocks: [
          {
            id: 'midi',
            type: 'input.midi-controller',
            x: 0,
            y: 0,
            params: { mpe: true, isPolyphonic: true, glide: 0 },
          },
          { id: 'lead', type: 'source.tone', x: 3, y: 0, params: { waveform: 3 } },
        ],
      },
      midi,
      script,
    },
    null,
    1,
  ) + '\n',
);
console.log(script.length, 'ops');
