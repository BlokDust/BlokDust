// The web MPE parser (web/src/input/mpe.ts) on the shared recorded streams; the C++ parser runs the same files in the
// engine tests (PLUGIN-0004). Prints JSON; exit 1 on any mismatch.
import { readdirSync, readFileSync } from 'node:fs';
import { MpeParser } from '../../web/src/input/mpe.ts';

const NOTE_ON = 4,
  NOTE_OFF = 5,
  EXPR = 8,
  DIM: Record<string, number> = { bend: 0, pressure: 1, slide: 2 };
const failures: string[] = [];
const files = readdirSync('tests/mpe').filter((f) => f.endsWith('.json'));
for (const f of files) {
  const j = JSON.parse(readFileSync(`tests/mpe/${f}`, 'utf8'));
  const mpeParser = new MpeParser(7, 0);
  mpeParser.setSettings({ mpe: !!j.settings?.mpe });
  const out = j.messages.flatMap((m: number[]) => mpeParser.message(m[1], m[2], m[3], m[0]));
  if (out.length !== j.expect.length) {
    failures.push(`${f}: ${out.length} commands, want ${j.expect.length}`);
    continue;
  }
  j.expect.forEach((w: any[], i: number) => {
    const c = out[i],
      kind = w[1];
    const type = kind === 'on' ? NOTE_ON : kind === 'off' ? NOTE_OFF : EXPR;
    const ok =
      c.id === 7 &&
      c.atSample === w[0] &&
      c.param === w[2] &&
      c.x === w[3] &&
      c.type === type &&
      (kind === 'off' || Math.abs(c.value - w[4]) < 1e-12) &&
      (type !== EXPR || c.y === DIM[kind]);
    if (!ok) failures.push(`${f} #${i}: got ${JSON.stringify(c)}, want ${JSON.stringify(w)}`);
  });
}
console.log(JSON.stringify({ files: files.length, failures }));
if (failures.length) process.exit(1);
