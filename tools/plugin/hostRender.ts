// Rendering fixtures in the headless JUCE host, the native renders they must equal, and sample
// patches as a DAW project holds them.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { HOST } from './paths.ts';

/** What blokdust_host_test prints on its last line, as the tests read it. */
export interface HostRender {
  error?: string;
  audioHash?: string;
  tailHash?: string;
  peak?: number;
  windowPeak?: number;
  stateRoundTrips?: boolean;
  /** Automation lanes' names, by index. */
  params?: Record<number, string>;
  reloadedValues?: number[];
  stateAfter?: {
    blocks?: { id: string; params?: Record<string, unknown> }[];
    plugin?: { powerMode?: number };
  };
  editor?: {
    blocks?: number;
    snapshotSeq?: number;
    wasm?: boolean;
    supportSystem?: { format?: string; sampleRate?: number; bufferSize?: number };
  };
}

/** A host self-test's answer: its checks, and whether all passed. */
export interface SelfTest {
  ok?: boolean;
  checks?: unknown;
}

/** A golden render's hashes (tests/golden/expected, or `bd render`). */
export interface GoldenRender {
  audioHash?: string;
}

/** The JSON on a command's last line of output. */
export const lastJsonLine = (stdout: string): unknown =>
  JSON.parse(stdout.trim().split('\n').pop() ?? '');

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export const hostRender = (
  plugin: string,
  fixture: string,
  extra: string[] = [],
  env: Record<string, string> = {},
): HostRender => {
  const result = spawnSync(HOST, [plugin, fixture, ...extra], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) return { error: result.stderr.trim() };
  return lastJsonLine(result.stdout) as HostRender;
};

export const expected = (fixture: string) =>
  JSON.parse(
    readFileSync(join('tests/golden/expected', fileName(fixture)), 'utf8'),
  ) as GoldenRender;

/** The native engine's render of a fixture now (fixtures outside the golden set, e.g. samples). */
export const nativeRender = (fixture: string) =>
  lastJsonLine(
    spawnSync('node', ['tools/bd.ts', 'render', fixture], { encoding: 'utf8' }).stdout,
  ) as GoldenRender;

/** DAW state for a sample fixture: its patch with the file ref's path made absolute (a project). */
export function sampleState(
  moved = false,
  fixture = 'tests/golden/samples/sample-file.json',
): string {
  const fx = JSON.parse(readFileSync(fixture, 'utf8')) as {
    patch: { refs: Record<string, { provider?: string; path: string }> };
  };
  for (const ref of Object.values(fx.patch.refs))
    if (ref.provider === 'file') {
      ref.path = resolve(ref.path);
      if (moved) {
        // The project remembers an old folder; the file now lives beside it (DATA-0005 relink).
        const root = resolve('.cache/relink');
        rmSync(root, { recursive: true, force: true });
        mkdirSync(join(root, 'old'), { recursive: true });
        mkdirSync(join(root, 'moved'), { recursive: true });
        cpSync(ref.path, join(root, 'moved', 'chord.wav'));
        ref.path = join(root, 'old', 'chord.wav');
      }
    }
  const out = resolve(
    `.cache/plugin-${fileName(fixture).replace('.json', '')}-state${moved ? '-moved' : ''}.json`,
  );
  writeFileSync(out, JSON.stringify(fx.patch));
  return out;
}

/** SPEC-PATCH-FORMAT-V2 R3b: the demo with fields of the wrong type (they crashed the host). */
export function malformedState(): string {
  const fixture = JSON.parse(readFileSync('tests/golden/demo.json', 'utf8')) as {
    patch: { blocks: unknown[] } & Record<string, unknown>;
  };
  const patch = fixture.patch;
  patch.blocks.push(42, { id: 'far', type: 'source.sample', x: 400, y: 400, params: 'junk' });
  patch.plugin = 'junk';
  patch.seed = null;
  patch.macros = 'junk';
  patch.automation = ['junk'];
  const out = resolve('.cache/plugin-malformed-state.json');
  writeFileSync(out, JSON.stringify(patch));
  return out;
}
