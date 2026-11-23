// bd audio — "sounds like v1" (SPEC-AUDIO-V1-PARITY, CHG-0002 1.2).
//   pnpm bd audio compare [--only a,b] [--save]   render every v1 audio fixture with the v2 engine (the shipped WASM, in Node)
//                                                 and compare descriptors with the v1 reference (tests/audio/reference/v1)
//   pnpm bd audio selftest                        prove the check fails on detuned, filtered and louder copies of v1
// v1 references come from `pnpm bd v1 audio`. Exact v2 regressions are guarded separately by golden hashes (bd render).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WasmEngine } from '../../web/src/engine/wasmEngine.ts';
import { importV1 } from '../../web/src/patch/importV1.ts';
import { loadPatch } from '../../web/src/patch/loadPatch.ts';
import { compare, describe, type Thresholds } from '../lib/audio-descriptors.ts';
import { readWav, writeWav, type Audio } from '../lib/wav.ts';
import { loadAudioFixtures } from '../v1/audio.ts';

const REFS = 'tests/audio/reference/v1', OUT = 'tests/audio/output';
const WASM = 'build/wasm/engine/blokdust.wasm';
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const thresholds = JSON.parse(readFileSync('tests/audio/thresholds.json', 'utf8'));
const limitsFor = (name: string): Thresholds => ({ ...thresholds.default, ...(thresholds.fixtures?.[name]?.limits ?? {}) });
const manifest = () => {
  if (!existsSync(join(REFS, 'manifest.json'))) throw new Error('no v1 audio references: run `pnpm bd v1 audio`');
  return JSON.parse(readFileSync(join(REFS, 'manifest.json'), 'utf8')) as { results: any[] };
};

/** Render a v1 composition through the v2 engine (WASM, 128-frame blocks like the AudioWorklet). */
export function renderV2(module: WebAssembly.Module, composition: any, seconds: number, sampleRate: number, seed?: number,
  files: { wav: string; block: number }[] = []): Audio {
  const { patch } = importV1(composition);
  const loaded = loadPatch(patch, []);
  const e = WasmEngine.fromModule(module, sampleRate, seed ?? loaded.seed);
  for (const c of loaded.commands) if (!e.push(c)) throw new Error('command queue full');
  const frames = Math.round(seconds * sampleRate), L = new Float32Array(frames), R = new Float32Array(frames);
  for (let done = 0; done < frames; done += 128) {
    const n = Math.min(128, frames - done), out = e.process(n);
    L.set(out.left.subarray(0, n), done); R.set(out.right.subarray(0, n), done);
    e.drainEvents();
    // Sample files (v1 fetched them): attached after the first quantum, once the blocks exist (as the app does).
    if (done === 0) for (const f of files) {
      const a = readWav(f.wav), id = loaded.ids.get(`v1-${f.block}`);
      if (id === undefined) throw new Error(`no v1 block ${f.block}`);
      e.attachSample(id, a.channels[0], a.channels[1], a.sampleRate);
    }
  }
  e.dispose();
  return { sampleRate, channels: L.every((v, i) => v === R[i]) ? [L] : [L, R] };
}

function compareAll() {
  if (!existsSync(WASM)) throw new Error('WASM engine missing: run `pnpm bd wasm build`');
  const module = new WebAssembly.Module(readFileSync(WASM));
  const only = opt('--only')?.split(',');
  const save = args.includes('--save');
  if (save) mkdirSync(OUT, { recursive: true });
  // Every fixture must have a reference: a missing one fails loudly (a partial re-capture once dropped 33 silently).
  const refs = manifest().results;
  const missing = loadAudioFixtures(only).filter(f => !refs.some(r => r.name === f.name)).map(f => f.name);
  if (missing.length) {
    console.log(JSON.stringify({ checked: 0, failed: missing, error: `no v1 reference for: ${missing.join(', ')} (run pnpm bd v1 audio --only …)` }));
    process.exitCode = 1;
    return;
  }
  const rows = refs.filter(r => !only || only.includes(r.name)).map(r => {
    const v2 = renderV2(module, r.composition, r.seconds, r.sampleRate, undefined, r.files ?? []);
    if (save) writeWav(join(OUT, `${r.name}.v2.wav`), v2);
    const d = describe(v2);
    // Describe the stored reference now (not the manifest copy), so analysis improvements never need a v1 re-capture.
    const v1 = describe(readWav(join(REFS, `${r.name}.wav`)));
    const res = compare(d, v1, limitsFor(r.name), r.spread);
    const known = thresholds.fixtures?.[r.name]?.knownFailure;
    return { name: r.name, pass: res.pass, fails: res.fails, metrics: res.metrics, ...(known ? { knownFailure: known } : {}),
      v1: { rmsDb: v1.rmsDb, f0Hz: v1.f0Hz, centroidHz: v1.centroidHz },
      v2: { rmsDb: d.rmsDb, f0Hz: d.f0Hz, centroidHz: d.centroidHz } };
  });
  for (const r of rows) console.error(`${r.pass ? 'pass' : r.knownFailure ? 'KNOWN' : 'FAIL'} ${r.name.padEnd(16)} ${JSON.stringify(r.metrics)}${r.fails.length ? ` over: ${r.fails.join(',')}` : ''}`);
  const unexpected = rows.filter(r => !r.pass && !r.knownFailure);
  console.log(JSON.stringify({ checked: rows.length, passed: rows.filter(r => r.pass).length, knownFailures: rows.filter(r => !r.pass && r.knownFailure).map(r => r.name),
    failed: unexpected.map(r => r.name), rows }));
  if (unexpected.length) process.exitCode = 1;
}

/** The check must reject audible differences: a 20-cent detune, a 1 kHz low-pass and +2 dB, and accept the reference itself. */
function selftest() {
  const ref = manifest().results.find(r => r.name === 'tone-saw') ?? manifest().results[0];
  const a = readWav(join(REFS, `${ref.name}.wav`)), x = a.channels[0], sr = a.sampleRate;
  const mk = (f: (x: Float32Array) => Float32Array): Audio => ({ sampleRate: sr, channels: [f(x)] });
  const cases: [string, Audio, boolean][] = [
    ['identical', a, true],
    ['detuned +20 cents', mk(x => { const r = 2 ** (20 / 1200); return Float32Array.from(x, (_, i) => { const p = i * r, k = Math.floor(p), t = p - k; return k + 1 < x.length ? x[k] * (1 - t) + x[k + 1] * t : 0; }); }), false],
    ['low-passed at 1 kHz', mk(x => { const c = Math.exp((-2 * Math.PI * 1000) / sr); let y = 0; return Float32Array.from(x, v => (y = (1 - c) * v + c * y)); }), false],
    ['+2 dB', mk(x => Float32Array.from(x, v => v * 10 ** (2 / 20))), false],
  ];
  const results = cases.map(([name, audio, expectPass]) => {
    const r = compare(describe(audio), describe(a), limitsFor(ref.name));
    return { name, expectPass, pass: r.pass, ok: r.pass === expectPass, fails: r.fails };
  });
  console.log(JSON.stringify({ reference: ref.name, results, ok: results.every(r => r.ok) }));
  if (!results.every(r => r.ok)) process.exitCode = 1;
}

// Run as a CLI only when executed directly (tools may import renderV2).
const cmd = process.argv[1]?.endsWith('audio/index.ts') ? args[0] : undefined;
if (cmd === 'compare') compareAll();
else if (cmd === 'selftest') selftest();
else if (cmd !== undefined) { console.error('usage: bd audio compare [--only a,b] [--save] | selftest'); process.exitCode = 2; }
