// bd plugin ios — the iPadOS AUv3 (CHG-0025) in the iOS Simulator.
//   pnpm bd plugin ios build   web bundle (if missing) + BlokDust.app with the AUv3 inside (`plugin-ios-sim` preset,
//                              Xcode generator) + the test host app (plugin/tests/ios-host)
//   pnpm bd plugin ios test    build, boot an iPad Simulator, install both apps, and let the test host load the AUv3 out
//                              of process like AUM: golden fixtures must hash exactly like the native engine, state must
//                              round-trip, and the editor's page must report bd_ready with the patch's blocks.
//   --no-build                 test the existing build
// The Simulator is picked by name: BLOKDUST_IOS_SIMULATOR (local config) or the first available "iPad Pro 11-inch".
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setting } from '../lib/local-config.ts';

const ART = 'build/plugin-ios-sim/plugin/BlokDust_artefacts/Release';
const APP = `${ART}/Standalone/BlokDust.app`;
const APPEX = `${APP}/PlugIns/BlokDust.appex`;
const HOST_APP = 'build/plugin-ios-sim/ioshost/BlokDustIOSHost.app';
const HOST_ID = 'com.blokdust.tests.ioshost';
const COMPONENT = 'aumu,Bdst,Bldt';
const FIXTURES = ['tests/golden/emitter-tone.json', 'tests/golden/toggle-pulse.json'];  // as `bd plugin test`
const OUT = '.cache/ios-host';

const run = (cmd: string, args: string[], quiet = false) =>
  spawnSync(cmd, args, { encoding: 'utf8', stdio: quiet ? 'pipe' : ['ignore', 'inherit', 'inherit'], maxBuffer: 64 << 20 });
const must = (r: ReturnType<typeof run>, what: string) => { if (r.status !== 0) throw new Error(`${what} failed${r.stderr ? `: ${r.stderr.slice(-2000)}` : ''}`); return r; };
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function iosBuild(): void {
  if (process.platform !== 'darwin') throw new Error('the iPadOS build needs macOS with Xcode');
  if (!existsSync('web/dist/index.html')) must(run('pnpm', ['web:build']), 'web build');
  must(run('cmake', ['--preset', 'plugin-ios-sim']), 'configure (plugin-ios-sim)');
  // stderr kept quiet: Xcode prints every compile line; failures still show their errors.
  const b = run('cmake', ['--build', '--preset', 'plugin-ios-sim', '--target', 'BlokDust_Standalone', '--', '-quiet'], true);
  if (b.status !== 0) {
    const errors = `${b.stdout}\n${b.stderr}`.split('\n').filter(l => /error:|BUILD FAILED/.test(l));
    throw new Error(`iPadOS build failed:\n${[...new Set(errors)].slice(0, 30).join('\n')}`);
  }
  if (!existsSync(APPEX)) throw new Error(`no AUv3 inside the app: ${APPEX}`);
  // The test host: a plain UIKit app, compiled directly (no Xcode project), signed ad hoc for the Simulator.
  rmSync(HOST_APP, { recursive: true, force: true });
  mkdirSync(HOST_APP, { recursive: true });
  must(run('xcrun', ['-sdk', 'iphonesimulator', 'clang++', '-std=c++20', '-fobjc-arc', '-O2', '-target', 'arm64-apple-ios16.0-simulator',
    '-Iengine/include', 'plugin/tests/ios-host/main.mm', '-framework', 'UIKit', '-framework', 'AVFoundation', '-framework', 'AudioToolbox',
    '-framework', 'CoreAudioKit', '-o', `${HOST_APP}/BlokDustIOSHost`], true), 'test host compile');
  cpSync('plugin/tests/ios-host/Info.plist', `${HOST_APP}/Info.plist`);
  must(run('codesign', ['--force', '--sign', '-', HOST_APP], true), 'test host signing');
  console.error(`built ${APP} (AUv3 inside) and ${HOST_APP}`);
}

/** An available iPad Simulator's UDID. */
function simulator(): { udid: string; name: string } {
  const want = setting('BLOKDUST_IOS_SIMULATOR', 'iPad Pro 11-inch');
  const list = JSON.parse(must(run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], true), 'simctl list').stdout);
  const all = Object.entries(list.devices as Record<string, { udid: string; name: string }[]>)
    .filter(([rt]) => rt.includes('iOS')).flatMap(([, ds]) => ds).filter(d => d.name.startsWith('iPad'));
  const d = all.find(x => x.name.startsWith(want)) ?? all[0];
  if (!d) throw new Error('no iPad Simulator available (Xcode → Settings → Components: install an iOS runtime)');
  return d;
}

const logTime = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

export function iosTest(noBuild: boolean): void {
  if (!noBuild) iosBuild();
  for (const p of [APPEX, HOST_APP]) if (!existsSync(p)) throw new Error(`missing ${p}: run pnpm bd plugin ios build`);
  const sim = simulator();
  run('xcrun', ['simctl', 'boot', sim.udid], true);  // already booted is fine
  must(run('xcrun', ['simctl', 'bootstatus', sim.udid, '-b'], true), 'Simulator boot');
  must(run('xcrun', ['simctl', 'install', sim.udid, APP], true), 'install BlokDust.app');
  must(run('xcrun', ['simctl', 'install', sim.udid, HOST_APP], true), 'install test host');

  mkdirSync(OUT, { recursive: true });
  const out = resolve(OUT, 'result.json');
  rmSync(out, { force: true });
  const job = resolve(OUT, 'job.json');
  writeFileSync(job, JSON.stringify({ component: COMPONENT, fixtures: FIXTURES.map(f => resolve(f)), out, editorSeconds: 15 }));
  const started = new Date(Date.now() - 1000);
  must(run('xcrun', ['simctl', 'launch', '--terminate-running-process', sim.udid, HOST_ID, '--job', job], true), 'launch test host');
  for (let i = 0; i < 120 && !existsSync(out); ++i) sleep(1000);
  if (!existsSync(out)) throw new Error(`the test host wrote no result in 120 s (log: xcrun simctl spawn ${sim.udid} log show --last 5m --predicate 'subsystem BEGINSWITH "com.blokdust"')`);
  const result = JSON.parse(readFileSync(out, 'utf8'));
  const shot = resolve(OUT, 'editor.png');
  run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', shot], true);
  run('xcrun', ['simctl', 'terminate', sim.udid, HOST_ID], true);

  // The page's round-trip, from the extension's own log line (environment variables never reach an extension).
  const log = run('xcrun', ['simctl', 'spawn', sim.udid, 'log', 'show', '--start', logTime(started), '--style', 'compact',
    '--predicate', 'subsystem == "com.blokdust.plugin"'], true).stdout;
  const ready = [...log.matchAll(/page: ready, (-?\d+) blocks/g)].map(m => Number(m[1]));
  const wrapper = /processor created \((AUv3)/.exec(log)?.[1] ?? null;

  const renders = (result.renders as { fixture: string; audioHash?: string; error?: string; stateRoundTrips?: boolean }[]).map((r, i) => {
    const expected = JSON.parse(readFileSync(FIXTURES[i].replace('tests/golden/', 'tests/golden/expected/'), 'utf8')).audioHash;
    return { fixture: FIXTURES[i], audioHash: r.audioHash ?? null, expected, identical: r.audioHash === expected, stateRoundTrips: !!r.stateRoundTrips, error: r.error };
  });
  const lastBlocks = JSON.parse(readFileSync(FIXTURES[FIXTURES.length - 1], 'utf8')).patch.blocks.length;
  const editor = { view: !!result.view, ready: ready.at(-1) ?? null, expectedBlocks: lastBlocks, screenshot: shot };
  const ok = !result.error && wrapper === 'AUv3' && renders.length === FIXTURES.length && renders.every(r => r.identical && r.stateRoundTrips)
    && editor.view && editor.ready === lastBlocks;
  console.log(JSON.stringify({ ok, simulator: sim.name, component: COMPONENT, name: result.name, wrapper, params: result.params?.length ?? 0,
    error: result.error, renders, editor }));
  if (!ok) process.exit(1);
}
