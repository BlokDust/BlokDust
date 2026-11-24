// bd wasm — Emscripten toolchain + WASM engine build + WASM≡native golden test (CHG-0001 task 0.8).
//   pnpm bd wasm setup    install the pinned emsdk (engine/emsdk-version) into .cache/emsdk (needs Python ≥ 3.10)
//   pnpm bd wasm build    build build/wasm/engine/blokdust.wasm and copy it to web/public/
//   pnpm bd wasm test     render every tests/golden fixture through the WASM engine in Node (128-frame blocks, like
//                         an AudioWorklet) and require the native golden hashes exactly
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  WasmEngine,
  hashAudio,
  hashEvents,
  hashStereo,
  hex,
  FNV_OFFSET,
} from '../../web/src/engine/wasmEngine.ts';
import { loadPatch } from '../../web/src/patch/loadPatch.ts';

const EMSDK = '.cache/emsdk';
const WASM = 'build/wasm/engine/blokdust.wasm';
const version = readFileSync('engine/emsdk-version', 'utf8').trim();
const python = () =>
  ['python3.13', 'python3.12', 'python3.11', 'python3.10']
    .map((p) => spawnSync('sh', ['-c', `command -v ${p}`], { encoding: 'utf8' }).stdout.trim())
    .find(Boolean);
const sh = (cmd: string, env: Record<string, string> = {}) => {
  const r = spawnSync('bash', ['-c', cmd], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) throw new Error(`failed: ${cmd}`);
};

function setup() {
  const py = python();
  if (!py) throw new Error('emsdk needs Python >= 3.10 (e.g. `uv python install 3.12`)');
  if (!existsSync(EMSDK))
    sh(`git clone -q --depth 1 https://github.com/emscripten-core/emsdk.git ${EMSDK}`);
  sh(`cd ${EMSDK} && ./emsdk install ${version} && ./emsdk activate ${version}`, {
    EMSDK_PYTHON: py,
  });
}

function build() {
  if (!existsSync(`${EMSDK}/emsdk_env.sh`))
    throw new Error('emsdk missing: run `pnpm bd wasm setup`');
  sh(
    `source ${EMSDK}/emsdk_env.sh >/dev/null 2>&1 && cmake --preset wasm >/dev/null && cmake --build --preset wasm -j 8`,
    { EMSDK_PYTHON: python() ?? '' },
  );
  mkdirSync('web/public', { recursive: true });
  copyFileSync(WASM, 'web/public/blokdust.wasm');
  console.error(`built ${WASM} (${readFileSync(WASM).length} bytes) → web/public/blokdust.wasm`);
}

export function renderWasm(module: WebAssembly.Module, fixture: any, block = 128) {
  const loaded = loadPatch(fixture.patch ?? fixture, fixture.script ?? []);
  const sr = fixture.render?.sampleRate ?? 48000;
  const frames = Math.round((fixture.render?.seconds ?? 5) * sr);
  const engine = WasmEngine.fromModule(module, sr, loaded.seed);
  for (const c of loaded.commands) if (!engine.push(c)) throw new Error('command queue full');
  let audio = FNV_OFFSET,
    audioR = FNV_OFFSET,
    events = FNV_OFFSET,
    eventCount = 0;
  const input = fixture.input;
  for (let done = 0; done < frames; done += block) {
    const n = Math.min(block, frames - done);
    const out = input
      ? engine.processTestSine(n, done, sr, input.frequency ?? 440, input.gain ?? 0.25)
      : engine.process(n);
    audio = hashAudio(out.left, audio);
    audioR = hashAudio(out.right, audioR);
    const ev = engine.drainEvents();
    eventCount += ev.length;
    events = hashEvents(ev, events);
  }
  engine.dispose();
  return { audioHash: hex(hashStereo(audio, audioR)), eventHash: hex(events), eventCount };
}

function test() {
  if (!existsSync(WASM)) build();
  const module = new WebAssembly.Module(readFileSync(WASM));
  const results = readdirSync('tests/golden')
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const name = basename(f, '.json');
      const fixture = JSON.parse(readFileSync(join('tests/golden', f), 'utf8'));
      const exp = JSON.parse(readFileSync(join('tests/golden/expected', f), 'utf8'));
      const runs = [128, 4096].map((b) => renderWasm(module, fixture, b)); // worklet quantum and a large block
      const ok = runs.every(
        (r) =>
          r.audioHash === exp.audioHash &&
          r.eventHash === exp.eventHash &&
          r.eventCount === exp.eventCount,
      );
      return {
        name,
        ok,
        wasm: runs[0],
        native: { audioHash: exp.audioHash, eventHash: exp.eventHash, eventCount: exp.eventCount },
      };
    });
  for (const r of results.filter((r) => !r.ok))
    console.error(
      `MISMATCH ${r.name}: wasm ${JSON.stringify(r.wasm)} native ${JSON.stringify(r.native)}`,
    );
  console.log(
    JSON.stringify({
      fixtures: results.length,
      identical: results.filter((r) => r.ok).length,
      wasmBytes: readFileSync(WASM).length,
    }),
  );
  if (results.some((r) => !r.ok)) process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'setup') setup();
else if (cmd === 'build') build();
else if (cmd === 'test') test();
else {
  console.error('usage: bd wasm setup | build | test');
  process.exit(2);
}
