// bd perf — performance baselines (CHG-0001 task 0.12) → docs/engineering/perf-baselines.md.
//   pnpm bd perf            engine CPU (native release + WASM in Node, 128-frame buffers) on generated scenes,
//                           plus the Pixi stage stress benchmark in headless Chromium
//   pnpm bd perf --no-web   engine only
// Timings are wall-clock and machine-dependent: this is a baseline to compare against, not a pass/fail gate.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from '../../tests/e2e/serve.ts';
import { WasmEngine } from '../../web/src/engine/wasmEngine.ts';
import { loadPatch } from '../../web/src/patch/loadPatch.ts';

const args = process.argv.slice(2);
const OUT = '.cache/perf';
const SR = 48000, SECONDS = 20, BUFFER = 128;
const budgetUs = (BUFFER / SR) * 1e6;  // 2666.7 µs per 128-frame buffer at 48 kHz

type B = { id: string; type: string; x: number; y: number; params?: Record<string, number> };
/** n voices laid out 12 cells apart (beyond the 6-cell catchment, so voices never interact). */
function scene(n: number, voice: (i: number, x: number, y: number) => B[]) {
  const blocks: B[] = [];
  const cols = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) blocks.push(...voice(i, (i % cols) * 12 - 60, Math.floor(i / cols) * 12 - 60));
  return { render: { seconds: SECONDS, sampleRate: SR }, patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks } };
}
// Always-on voice: Power → Tone (saw) → peaking Filter. Every source sounds for the whole render (worst case).
const powered = (i: number, x: number, y: number): B[] => [
  { id: `p${i}`, type: 'power.power', x: x - 2, y },
  { id: `t${i}`, type: 'source.tone', x, y, params: { waveform: 3 } },
  { id: `f${i}`, type: 'fx.filter', x: x + 2, y, params: { gain: 6 } },
];
// Particle voice: a fast self-powered emitter firing into a Tone → Filter (simulation + gating load).
const particles = (i: number, x: number, y: number): B[] => [
  { id: `e${i}`, type: 'power.emitter', x: x - 5, y, params: { angle: 0, selfPoweredMode: 1, rate: 5 } },
  { id: `t${i}`, type: 'source.tone', x, y },
  { id: `f${i}`, type: 'fx.filter', x: x + 2, y },
];
const SCENES = [
  { name: 'empty', blocks: 0, fixture: scene(0, powered) },
  ...[8, 32, 128].map(n => ({ name: `powered-voices-${n}`, blocks: n * 3, fixture: scene(n, powered) })),
  ...[8, 32, 128].map(n => ({ name: `particle-voices-${n}`, blocks: n * 3, fixture: scene(n, particles) })),
];

function nativeBinary() {
  const run = (c: string[]) => spawnSync(c[0], c.slice(1), { stdio: ['ignore', 'ignore', 'inherit'] }).status === 0;
  if (!run(['cmake', '--preset', 'release']) || !run(['cmake', '--build', '--preset', 'release', '--target', 'blokdust_render', '-j', '8'])) throw new Error('release build failed');
  return 'build/release/engine/blokdust_render';
}
const best = <T>(n: number, f: () => T, key: (t: T) => number) => { let b: T | undefined; for (let i = 0; i < n; i++) { const r = f(); if (!b || key(r) < key(b)) b = r; } return b!; };

function native(bin: string, file: string) {
  return best(3, () => {
    const r = spawnSync(bin, [file, '--block', String(BUFFER)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    return JSON.parse(r.stdout) as { processSeconds: number; events: Record<string, number> };
  }, r => r.processSeconds);
}
function wasm(module: WebAssembly.Module, fixture: any) {
  return best(3, () => {
    const loaded = loadPatch(fixture.patch, []);
    const e = WasmEngine.fromModule(module, SR, loaded.seed);
    for (const c of loaded.commands) e.push(c);
    const frames = SECONDS * SR;
    const t0 = performance.now();
    for (let done = 0; done < frames; done += BUFFER) { e.process(Math.min(BUFFER, frames - done)); e.drainEvents(); }
    const s = (performance.now() - t0) / 1000;
    e.dispose();
    return s;
  }, s => s);
}
const stats = (s: number) => ({ usPerBuffer: +((s / (SECONDS * SR / BUFFER)) * 1e6).toFixed(1), cpuPercent: +((s / SECONDS) * 100).toFixed(2), realtimeX: Math.round(SECONDS / s) });

mkdirSync(OUT, { recursive: true });
const bin = nativeBinary();
spawnSync(process.execPath, ['tools/bd.ts', 'wasm', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
const module = new WebAssembly.Module(readFileSync('build/wasm/engine/blokdust.wasm'));
const engineRows = SCENES.map(s => {
  const file = join(OUT, `${s.name}.json`);
  writeFileSync(file, JSON.stringify(s.fixture));
  const n = native(bin, file), w = wasm(module, s.fixture);
  const row = { scene: s.name, blocks: s.blocks, hits: n.events.hit ?? 0, native: stats(n.processSeconds), wasm: stats(w) };
  console.error(JSON.stringify(row));
  return row;
});

let webRows: any[] = [];
if (!args.includes('--no-web')) {
  spawnSync('pnpm', ['-s', '-C', 'web', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
  const { url, server } = await serveDist();
  // Real GPU where available (ANGLE/Metal on macOS); the GL renderer string is recorded so runs stay comparable.
  const browser = await chromium.launch({ args: platform() === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
  try {
    for (const [blocks, nParticles, moves] of [[100, 2000, 0], [100, 2000, 5], [300, 4096, 0], [300, 4096, 5]]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
      await page.goto(`${url}/visual.html`);
      await page.waitForFunction(() => document.title.includes('(ready)'));
      const r = await page.evaluate(([b, p, m]) => (window as any).benchmark('canvas', 240, b, p, m), [blocks, nParticles, moves]);
      await page.close();
      console.error(JSON.stringify(r));
      webRows.push(r);
    }
  } finally { await browser.close(); server.close(); }
}

const cpu = cpus()[0]?.model ?? 'unknown';
const machine = `${cpu}, ${cpus().length} cores, ${Math.round(totalmem() / 2 ** 30)} GB, ${platform()} ${release()}, Node ${process.version}`;
const md = `# Performance baselines (CHG-0001 0.12)

Generated by \`pnpm bd perf\` on ${machine}. Wall-clock, best of 3, single thread. A baseline to compare future
changes against, not a gate: rerun on the same machine before and after a change.

## Engine CPU

${SECONDS} s renders at ${SR} Hz in ${BUFFER}-frame buffers (an AudioWorklet quantum; budget ${budgetUs.toFixed(0)} µs per buffer).
Native = \`release\` preset; WASM = the same \`blokdust.wasm\` the web app ships, run in Node (V8, like Chromium's AudioWorklet).
Voices are 12 cells apart so they never interact. *Powered*: Power → Tone (saw) → Filter, all sounding throughout.
*Particle*: a self-powered emitter (rate 5) firing into Tone → Filter. Phase 0 DSP only (tone, peaking filter, master
compressor); Phase 1 effects (reverb, delay, granular…) will add to these numbers.

| Scene | Blocks | Particle hits | Native µs/buffer | Native CPU | WASM µs/buffer | WASM CPU | WASM / native |
|---|---|---|---|---|---|---|---|
${engineRows.map(r => `| ${r.scene} | ${r.blocks} | ${r.hits} | ${r.native.usPerBuffer} | ${r.native.cpuPercent}% | ${r.wasm.usPerBuffer} | ${r.wasm.cpuPercent}% | ${(r.wasm.usPerBuffer / Math.max(r.native.usPerBuffer, 0.001)).toFixed(2)}× |`).join('\n')}
${webRows.length ? `
## Stage rendering (Pixi stress)

\`benchmark()\` in web/src/visual.ts with the shipped \`canvas\` renderer (UI-0005): N blocks (0 or 5 moved per frame; each move
re-renders the static layer), plus N particles updated every frame, 240 frames at 1280×800 @2x, headless Chromium on
**${webRows[0]?.glRenderer}**. Frame time is CPU + GPU work up to \`gl.finish()\`, without vsync; 120 fps needs ≤ 8.3 ms. Chromium rasterises and
composites the on-page Canvas2D static layer asynchronously, so its share is only partly included; confirm in a real
browser with DevTools before relying on headroom.
"Moved" rows are the drag worst case (each move redraws the static Canvas2D layer); idle frames redraw nothing static.

| Blocks | Particles | Blocks moved / frame | Mean frame | Median frame | p95 frame | fps (median) |
|---|---|---|---|---|---|---|
${webRows.map(r => `| ${r.blocks} | ${r.particles} | ${r.moves} | ${r.meanMs} ms | ${r.medianMs} ms | ${r.p95Ms} ms | ${Math.round(1000 / Math.max(r.medianMs, 0.01))} |`).join('\n')}
` : ''}`;
mkdirSync('.cache/perf', { recursive: true });
writeFileSync('.cache/perf/baselines.md', md);
console.log(JSON.stringify({ machine, engine: engineRows, web: webRows }));
