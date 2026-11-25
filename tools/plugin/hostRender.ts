// Rendering fixtures in the headless JUCE host, the native renders they must equal, and sample
// patches as a DAW project holds them.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { HOST } from './paths.ts';

export const hostRender = (
  plugin: string,
  fixture: string,
  extra: string[] = [],
  env: Record<string, string> = {},
) => {
  const result = spawnSync(HOST, [plugin, fixture, ...extra], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) return { error: result.stderr.trim() } as any;
  return JSON.parse(result.stdout.trim().split('\n').pop()!);
};

export const expected = (fixture: string) =>
  JSON.parse(readFileSync(join('tests/golden/expected', fixture.split('/').pop()!), 'utf8'));

/** The native engine's render of a fixture right now (fixtures outside the golden set, e.g. with sample files). */
export const nativeRender = (fixture: string) =>
  JSON.parse(
    spawnSync('node', ['tools/bd.ts', 'render', fixture], { encoding: 'utf8' })
      .stdout.trim()
      .split('\n')
      .pop()!,
  );

/** DAW state for tests/golden/samples/sample-file.json: its patch with the file ref's path made absolute (a project). */
export function sampleState(
  moved = false,
  fixture = 'tests/golden/samples/sample-file.json',
): string {
  const fx = JSON.parse(readFileSync(fixture, 'utf8'));
  for (const r of Object.values(fx.patch.refs) as any[])
    if (r.provider === 'file') {
      r.path = resolve(r.path);
      if (moved) {
        // the project remembers an old folder; the file now lives in a sibling folder (DATA-0005 relink)
        const root = resolve('.cache/relink');
        rmSync(root, { recursive: true, force: true });
        mkdirSync(join(root, 'old'), { recursive: true });
        mkdirSync(join(root, 'moved'), { recursive: true });
        cpSync(r.path, join(root, 'moved', 'chord.wav'));
        r.path = join(root, 'old', 'chord.wav');
      }
    }
  const out = resolve(
    `.cache/plugin-${fixture.split('/').pop()!.replace('.json', '')}-state${moved ? '-moved' : ''}.json`,
  );
  writeFileSync(out, JSON.stringify(fx.patch));
  return out;
}
