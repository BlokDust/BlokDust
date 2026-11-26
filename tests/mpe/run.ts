// The web MPE parser (web/src/input/mpe.ts) on the shared recorded streams; the C++ parser runs the
// same files in the engine tests (PLUGIN-0004). Prints JSON; exit 1 on any mismatch.
import { readdirSync, readFileSync } from 'node:fs';
import { MpeParser } from '../../web/src/input/mpe.ts';

const NOTE_ON = 4,
  NOTE_OFF = 5,
  EXPR = 8,
  DIM: Record<string, number> = { bend: 0, pressure: 1, slide: 2 };
/** A recorded stream: [sample, status, data1, data2] messages and the commands they must make. */
interface MpeStream {
  settings?: { mpe?: boolean };
  messages: [number, number, number, number][];
  /** [atSample, 'on' | 'off' | dimension, note, channel, value]. */
  expect: [number, string, number, number, number][];
}
const failures: string[] = [];
const files = readdirSync('tests/mpe').filter((name) => name.endsWith('.json'));
for (const file of files) {
  const stream = JSON.parse(readFileSync(`tests/mpe/${file}`, 'utf8')) as MpeStream;
  const mpeParser = new MpeParser(7, 0);
  mpeParser.setSettings({ mpe: !!stream.settings?.mpe });
  const out = stream.messages.flatMap(([atSample, status, data1, data2]) =>
    mpeParser.message(status, data1, data2, atSample),
  );
  if (out.length !== stream.expect.length) {
    failures.push(`${file}: ${out.length} commands, want ${stream.expect.length}`);
    continue;
  }
  stream.expect.forEach((want, i) => {
    const command = out[i],
      kind = want[1];
    const type = kind === 'on' ? NOTE_ON : kind === 'off' ? NOTE_OFF : EXPR;
    const ok =
      command.id === 7 &&
      command.atSample === want[0] &&
      command.param === want[2] &&
      command.x === want[3] &&
      command.type === type &&
      (kind === 'off' || Math.abs((command.value ?? NaN) - want[4]) < 1e-12) &&
      (type !== EXPR || command.y === DIM[kind]);
    if (!ok)
      failures.push(`${file} #${i}: got ${JSON.stringify(command)}, want ${JSON.stringify(want)}`);
  });
}
console.log(JSON.stringify({ files: files.length, failures }));
if (failures.length) process.exit(1);
