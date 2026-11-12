// bd ci — run the CI jobs locally (.github/workflows/ci.yml is manual-only to save Actions minutes).
//   pnpm bd ci                 all local jobs: checks, visual, web, engine (dev/release/asan), golden
//   pnpm bd ci --only engine   one job (checks | visual | web | engine | golden | audio | wasm | plugin)
//   pnpm bd ci --linux         also build + test the engine on Linux in Docker (if the daemon is running)
//   pnpm bd ci --windows       also run the Windows engine + plugin checks in the local VM (tools/win-vm)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setting } from '../lib/local-config.ts';

interface Step { job: string; name: string; cmd: string; when?: () => boolean; skipReason?: string }
const has = (bin: string) => spawnSync('sh', ['-c', `command -v ${bin}`]).status === 0;
const dockerUp = () => has('docker') && spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;

const steps: Step[] = [
  { job: 'checks', name: 'privacy check', cmd: 'node tools/bd.ts privacy check && node tools/bd.ts privacy selftest' },
  { job: 'checks', name: 'docs indexes + codegen current', cmd: 'node tools/bd.ts index --check && node tools/bd.ts codegen --check' },
  { job: 'visual', name: 'block manifests vs v1 pixels', cmd: 'node tools/bd.ts v1 verify' },
  { job: 'web', name: 'web typecheck', cmd: 'pnpm -C web typecheck' },
  { job: 'server', name: 'Worker typecheck', cmd: 'pnpm -C server typecheck' },
  { job: 'web', name: 'MPE parser (web) ≡ shared MIDI streams (PLUGIN-0004)', cmd: 'node tests/mpe/run.ts' },
  { job: 'web', name: 'wasm + web build', cmd: 'node tools/bd.ts wasm build && pnpm -C web build', when: () => existsSync('.cache/emsdk/emsdk_env.sh'), skipReason: 'emsdk not installed (pnpm bd wasm setup)' },
  { job: 'web', name: 'web smoke test', cmd: 'node tests/e2e/library-smoke.ts', when: () => existsSync('web/dist/library.html'), skipReason: 'no web build' },
  { job: 'web', name: 'stage black-box test', cmd: 'node tests/e2e/stage-e2e.ts', when: () => existsSync('web/dist/index.html'), skipReason: 'no web build' },
  { job: 'web', name: 'build a patch and hear it (CHG-0002 acceptance)', cmd: 'node tests/e2e/build-and-hear.ts', when: () => existsSync('web/dist/index.html'), skipReason: 'no web build' },
  { job: 'web', name: 'UI regression tests (bugs found in review)', cmd: 'node tests/e2e/ui-regressions.ts', when: () => existsSync('web/dist/index.html'), skipReason: 'no web build' },
  { job: 'server', name: 'feedback panel + isolated support backend (CHG-0009)', cmd: 'node tests/e2e/support.ts', when: () => existsSync('web/dist/index.html'), skipReason: 'no web build' },
  { job: 'server', name: 'feedback under a base path (CHG-0009)', cmd: 'node tests/e2e/support.ts --based', when: () => existsSync('web/dist/index.html'), skipReason: 'no web build' },
  { job: 'server', name: 'sharing backend + embeds (CHG-0003 acceptance)', cmd: 'node tests/e2e/sharing.ts', when: () => existsSync('web/dist/index.html') && existsSync('server/node_modules/.bin/wrangler'), skipReason: 'no web build or server deps' },
  { job: 'server', name: 'sharing under /blokdust, as deployed (CHG-0005 task 10)', cmd: 'node tests/e2e/sharing.ts --base', when: () => existsSync('web/dist/index.html') && existsSync('server/node_modules/.bin/wrangler'), skipReason: 'no web build or server deps' },
  { job: 'web', name: 'v1 UI states ≡ v1 (bd ui diff)', cmd: 'node tools/bd.ts ui diff', when: () => existsSync('web/dist/index.html') && existsSync('.cache/v1/dist/index.html'), skipReason: 'no web build or v1 not fetched' },
  { job: 'web', name: 'v2 stage ≡ v1 pixels (visual diff)', cmd: 'node tools/bd.ts visual diff --full', when: () => existsSync('web/dist/visual.html'), skipReason: 'no web build' },
  { job: 'web', name: 'AudioWorklet ≡ native (browser)', cmd: 'node tests/e2e/worklet-golden.ts', when: () => existsSync('web/dist/golden.html'), skipReason: 'no web build' },
  ...['dev', 'release', 'asan'].map(p => ({ job: 'engine', name: `engine ${p}`,
    cmd: `cmake --preset ${p} >/dev/null && cmake --build --preset ${p} -j 8 && ctest --preset ${p}` })),
  { job: 'golden', name: 'golden renders (release)', cmd: 'node tools/bd.ts render --check --configs release,dev', when: () => existsSync('tools/render/index.ts') },
  { job: 'audio', name: 'sounds-like-v1 harness self-test (SPEC-AUDIO-V1-PARITY R4)', cmd: 'node tools/bd.ts audio selftest' },
  { job: 'audio', name: 'v2 engine sounds like v1 (bd audio compare)', cmd: 'node tools/bd.ts wasm build && node tools/bd.ts audio compare', when: () => existsSync('.cache/emsdk/emsdk_env.sh'), skipReason: 'emsdk not installed (pnpm bd wasm setup)' },
  { job: 'wasm', name: 'engine WASM ≡ native (Node)', cmd: 'node tools/bd.ts wasm test', when: () => existsSync('.cache/emsdk/emsdk_env.sh'), skipReason: 'emsdk not installed (pnpm bd wasm setup)' },
  { job: 'plugin', name: 'plugin build + pluginval + host render ≡ native', cmd: 'node tools/bd.ts plugin test', when: () => process.platform === 'darwin', skipReason: 'plugin job runs on macOS only for now' },
];

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
if (args.includes('--windows')) {
  const vmUp = () => !!setting('BLOKDUST_VM_DIR') && existsSync(`${setting('BLOKDUST_VM_DIR')}/win11.qcow2`);
  steps.push({ job: 'windows', name: 'engine on Windows (MSVC x64) ≡ macOS golden', cmd: 'node tools/bd.ts win engine', when: vmUp, skipReason: 'no externally configured Windows VM' });
  steps.push({ job: 'windows', name: 'plugin on Windows: VST3, pluginval, REAPER', cmd: 'node tools/bd.ts win plugin', when: vmUp, skipReason: 'no externally configured Windows VM' });
}
if (args.includes('--linux')) steps.push({ job: 'linux', name: 'engine on Linux (Docker, gcc)', when: dockerUp, skipReason: 'Docker daemon not running',
  cmd: 'docker run --rm -v "$PWD":/src -w /src gcc:14 bash -c "apt-get update -qq && apt-get install -y -qq cmake >/dev/null && cmake -S . -B /tmp/b -DCMAKE_BUILD_TYPE=Release && cmake --build /tmp/b -j 8 && ctest --test-dir /tmp/b --output-on-failure"' });

const results: { job: string; name: string; status: 'pass' | 'fail' | 'skip'; seconds?: number; reason?: string }[] = [];
for (const s of steps) {
  if (only && !only.includes(s.job)) continue;
  if (s.when && !s.when()) { results.push({ job: s.job, name: s.name, status: 'skip', reason: s.skipReason ?? 'not applicable' }); continue; }
  console.error(`\n▶ [${s.job}] ${s.name}`);
  const t0 = Date.now();
  const r = spawnSync('sh', ['-c', s.cmd], { stdio: ['ignore', 'inherit', 'inherit'] });
  results.push({ job: s.job, name: s.name, status: r.status === 0 ? 'pass' : 'fail', seconds: Math.round((Date.now() - t0) / 100) / 10 });
}
console.error('\n' + results.map(r => `${r.status === 'pass' ? '✓' : r.status === 'skip' ? '–' : '✗'} [${r.job}] ${r.name}${r.seconds != null ? ` (${r.seconds}s)` : ''}${r.reason ? ` — ${r.reason}` : ''}`).join('\n'));
console.log(JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, skipped: results.filter(r => r.status === 'skip').length }));
if (results.some(r => r.status === 'fail')) process.exit(1);
