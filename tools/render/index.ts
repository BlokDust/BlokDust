// bd render — offline renders + golden tests (CHG-0001 task 0.7).
//   pnpm bd render <fixture.json> [--wav out.wav] [--events out.jsonl] [--config release]
//   pnpm bd render --check  [--configs release,dev]   compare every tests/golden/*.json with expected/ (exact hashes)
//   pnpm bd render --update [--configs release]       rewrite expected/ (commit with a `golden-update: <reason>` line)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const GOLDEN = 'tests/golden';
const args = process.argv.slice(2);
const opt = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const configs = (opt('--configs') ?? opt('--config') ?? 'release').split(',');

function binary(preset: string): string {
  const bin = `build/${preset}/engine/blokdust_render`;
  const run = (cmd: string[]) =>
    spawnSync(cmd[0], cmd.slice(1), { stdio: ['ignore', 'ignore', 'inherit'] }).status === 0;
  if (!existsSync(`build/${preset}/CMakeCache.txt`) && !run(['cmake', '--preset', preset]))
    throw new Error(`configure ${preset} failed`);
  if (!run(['cmake', '--build', '--preset', preset, '--target', 'blokdust_render', '-j', '8']))
    throw new Error(`build ${preset} failed`);
  return bin;
}

export function renderFixture(bin: string, fixture: string, extra: string[] = []): any {
  const result = spawnSync(bin, [fixture, ...extra], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${fixture}: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
}

const KEYS = ['audioHash', 'eventHash', 'eventCount', 'events', 'frames', 'sampleRate'] as const;
const pick = (s: any) =>
  Object.fromEntries([
    ...KEYS.map((k) => [k, s[k]]),
    ['rms', +s.rms.toFixed(6)],
    ['peak', +s.peak.toFixed(6)],
  ]);

// Default-patch fixtures must stay identical to the patches the app and plugins ship with.
for (const [fixture, shipped] of [
  ['demo.json', 'web/src/demo/demo.patch.json'],
  ['fx-demo.json', 'web/src/demo/fx.patch.json'],
  ['plugin-start.json', 'web/src/demo/plugin-start.patch.json'],
]) {
  if (
    JSON.stringify(JSON.parse(readFileSync(join(GOLDEN, fixture), 'utf8')).patch) !==
    JSON.stringify(JSON.parse(readFileSync(shipped, 'utf8')))
  ) {
    console.error(`tests/golden/${fixture} is out of date with ${shipped}`);
    process.exit(1);
  }
}
const fixtures = readdirSync(GOLDEN)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => join(GOLDEN, f));
if (args.includes('--check') || args.includes('--update')) {
  const update = args.includes('--update');
  const results: any[] = [];
  const bins = configs.map((c) => ({ config: c, bin: binary(c) }));
  for (const fx of fixtures) {
    const name = basename(fx, '.json');
    const expectedPath = join(GOLDEN, 'expected', `${name}.json`);
    const runs = bins.map((b) => ({ config: b.config, summary: pick(renderFixture(b.bin, fx)) }));
    const base = runs[0].summary;
    const crossConfigOk = runs.every(
      (run) => run.summary.audioHash === base.audioHash && run.summary.eventHash === base.eventHash,
    );
    if (update) {
      mkdirSync(join(GOLDEN, 'expected'), { recursive: true });
      writeFileSync(expectedPath, JSON.stringify(base, null, 2) + '\n');
      results.push({
        name,
        status: crossConfigOk ? 'updated' : 'cross-config-mismatch',
        runs: crossConfigOk ? undefined : runs,
      });
      continue;
    }
    if (!existsSync(expectedPath)) {
      results.push({ name, status: 'missing-expected' });
      continue;
    }
    const exp = JSON.parse(readFileSync(expectedPath, 'utf8'));
    const mismatches = runs
      .filter(
        (run) => run.summary.audioHash !== exp.audioHash || run.summary.eventHash !== exp.eventHash,
      )
      .map((r) => ({ config: r.config, got: r.summary, expected: exp }));
    results.push({
      name,
      status: mismatches.length ? 'fail' : 'pass',
      mismatches: mismatches.length ? mismatches : undefined,
    });
  }
  for (const r of results.filter((r) => !['pass', 'updated'].includes(r.status)))
    console.error(`${r.status}: ${r.name}\n${JSON.stringify(r.mismatches ?? r.runs, null, 2)}`);
  console.log(
    JSON.stringify({
      configs,
      fixtures: results.length,
      passed: results.filter((result) => ['pass', 'updated'].includes(result.status)).length,
      failed: results
        .filter((result) => !['pass', 'updated'].includes(result.status))
        .map((r) => r.name),
    }),
  );
  if (results.some((result) => !['pass', 'updated'].includes(result.status))) process.exit(1);
} else {
  const fx = args.find((a) => a.endsWith('.json'));
  if (!fx) {
    console.error(
      'usage: bd render <fixture.json> [--wav out.wav] [--events out.jsonl] [--config release] | --check | --update',
    );
    process.exit(2);
  }
  const extra: string[] = [];
  for (const k of ['--wav', '--events']) {
    const v = opt(k);
    if (v) extra.push(k, v);
  }
  console.log(JSON.stringify(renderFixture(binary(configs[0]), fx, extra)));
}
