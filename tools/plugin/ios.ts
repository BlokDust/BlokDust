// bd plugin ios — the iPadOS AUv3 (CHG-0025) in the iOS Simulator.
//   pnpm bd plugin ios build   web bundle (if missing) + BlokDust.app with the AUv3 inside (`plugin-ios-sim` preset,
//                              Xcode generator) + the test host app (plugin/tests/ios-host)
//   pnpm bd plugin ios test    build, boot an iPad Simulator, install both apps, and let the test host load the AUv3 out
//                              of process like AUM: golden fixtures must hash exactly like the native engine, state must
//                              round-trip, and the editor's page must report bd_ready with the patch's blocks.
//                              First the app itself (task 4): installed fresh, it must start output-only audio with no
//                              microphone entry, show the first-launch patch, save it when sent to the background, and
//                              restore it on the next launch. A patch put in the App Group's Patches folder must be
//                              seen by both the app and the extension (task 5: one folder shared by both), and a patch
//                              from another machine must find its sample there by name and render like native (task 6).
//                              BlokDust FX, the app's second extension, renders its fixture with input ≡ golden (task 9).
//   --no-build                 test the existing build
//   pnpm bd plugin ios device   (task 10) build for an iPad with automatic signing (team BLOKDUST_APPLE_TEAM_ID; Xcode
//                              creates the app IDs, the App Group and profiles: needs an Apple account in Xcode →
//                              Settings → Accounts), then install on the connected iPad (BLOKDUST_IOS_DEVICE: a name or
//                              identifier, else the first paired iPad).
// The Simulator is picked by name: BLOKDUST_IOS_SIMULATOR (local config) or the first available "iPad Pro 11-inch".
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configEnvironment, requiredSetting, setting } from '../lib/local-config.ts';

const ART = 'build/plugin-ios-sim/plugin/BlokDust_artefacts/Release';
const APP = `${ART}/Standalone/BlokDust.app`;
const APPEX = `${APP}/PlugIns/BlokDust.appex`;
const HOST_APP = 'build/plugin-ios-sim/ioshost/BlokDustIOSHost.app';
const HOST_ID = 'com.funputs.tests.blokdust-ioshost';
const COMPONENT = 'aumu,Bdst,Bldt';
const FX_COMPONENT = 'aufx,Bdfx,Bldt';  // BlokDust FX, the app's second extension (task 9)
const FX_FIXTURES = ['tests/golden/fx-audio-in.json'];  // its test sine goes in through the effect's input
const FX_APPEX = `${APP}/PlugIns/BlokDust FX.appex`;
const FIXTURES = ['tests/golden/emitter-tone.json', 'tests/golden/toggle-pulse.json'];  // as `bd plugin test`
// Task 6: a patch from another machine (its sample's path does not exist here) whose file is in the shared Samples
// folder: the extension relinks it by name and must render like the native engine with the same WAV.
const SAMPLE_FIXTURE = 'tests/golden/samples/sample-file.json';
const OUT = '.cache/ios-host';
const SMALL_VIEW = [480, 320];  // an AUM-sized plugin window (task 8): screenshot only, for review
const APP_ID = 'com.funputs.blokdust';
const APP_GROUP = 'group.com.funputs.blokdust';  // plugin/CMakeLists.txt BLOKDUST_APP_GROUP
const SHARED = /storage: app group, 1 patches/;
const FIRST_PATCH = 'web/src/patch/presets/04-rotating-sequencer.blokdust';  // the app's first launch (PluginProcessor.cpp)

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

const appLog = (udid: string, since: Date, subsystem = 'com.funputs.blokdust') => run('xcrun', ['simctl', 'spawn', udid, 'log', 'show', '--start', logTime(since),
  '--style', 'compact', '--predicate', `subsystem == "${subsystem}"`], true).stdout;

/** Waits up to `seconds` for every pattern to appear in the plugin's (or `subsystem`'s) log since `since`. */
function waitForLog(udid: string, since: Date, patterns: RegExp[], seconds: number, subsystem?: string): string {
  let log = '';
  for (let i = 0; i < seconds; ++i) {
    log = appLog(udid, since, subsystem);
    if (patterns.every(p => p.test(log))) break;
    sleep(1000);
  }
  return log;
}

/** The sample fixture as a patch from another machine, its WAV in the App Group's Samples folder; and the native hash. */
function sampleRelinkFixture(group: string): { fixture: string; expected: string } {
  const fx = JSON.parse(readFileSync(SAMPLE_FIXTURE, 'utf8'));
  for (const r of Object.values(fx.patch.refs) as { provider: string; name: string; path: string }[]) if (r.provider === 'file') {
    mkdirSync(resolve(group, 'BlokDust/Samples'), { recursive: true });
    cpSync(resolve(r.path), resolve(group, 'BlokDust/Samples', r.name));
    r.path = `/Volumes/Elsewhere/Samples/${r.name}`;  // a path that exists on no iPad
  }
  const fixture = resolve(OUT, 'sample-relink.json');
  writeFileSync(fixture, JSON.stringify(fx));
  const native = JSON.parse(must(run('node', ['tools/bd.ts', 'render', SAMPLE_FIXTURE], true), 'native render (sample)').stdout.trim().split('\n').pop()!);
  return { fixture, expected: native.audioHash };
}

/** The app on its own (CHG-0025 task 4): output-only audio, the first-launch patch, saved and restored. */
function appCheck(udid: string) {
  const plist = JSON.parse(must(run('plutil', ['-convert', 'json', '-o', '-', `${APP}/Info.plist`], true), 'read Info.plist').stdout);
  const appexPlist = JSON.parse(must(run('plutil', ['-convert', 'json', '-o', '-', `${APPEX}/Info.plist`], true), 'read appex Info.plist').stdout);
  const noMicrophone = !('NSMicrophoneUsageDescription' in plist) && !('NSMicrophoneUsageDescription' in appexPlist);
  const firstBlocks = JSON.parse(readFileSync(FIRST_PATCH, 'utf8')).blocks.length;

  const t1 = new Date(Date.now() - 1000);
  must(run('xcrun', ['simctl', 'launch', '--terminate-running-process', udid, APP_ID], true), 'launch BlokDust.app');
  const log1 = waitForLog(udid, t1, [/container: audio running/, /page: ready, \d+ blocks/], 60);
  const session = /container: audio started \((\w+), (\d+) Hz, (\d+) frames\)/.exec(log1);
  const peak = Number(/container: audio running, peak ([\d.]+)/.exec(log1)?.[1] ?? 0);
  const ready = Number(/page: ready, (-?\d+) blocks/.exec(log1)?.[1] ?? -1);
  const shot = resolve(OUT, 'app.png');
  run('xcrun', ['simctl', 'io', udid, 'screenshot', shot], true);

  // To the background (another app in front): the app saves its patch. Then a fresh launch must restore it.
  const t2 = new Date(Date.now() - 1000);
  run('xcrun', ['simctl', 'launch', udid, 'com.apple.Preferences'], true);
  const saved = /container: patch saved/.test(waitForLog(udid, t2, [/container: patch saved/], 20));
  run('xcrun', ['simctl', 'terminate', udid, 'com.apple.Preferences'], true);
  run('xcrun', ['simctl', 'terminate', udid, APP_ID], true);
  const t3 = new Date(Date.now() - 1000);
  must(run('xcrun', ['simctl', 'launch', udid, APP_ID], true), 'relaunch BlokDust.app');
  const log3 = waitForLog(udid, t3, [/container: patch restored/, /page: ready, \d+ blocks/], 60);
  const restored = /container: patch restored/.test(log3);
  const readyAgain = Number(/page: ready, (-?\d+) blocks/.exec(log3)?.[1] ?? -1);
  run('xcrun', ['simctl', 'terminate', udid, APP_ID], true);

  const sharedFolder = SHARED.test(log1);
  const ok = sharedFolder && noMicrophone && session?.[1] === 'AVAudioSessionCategoryPlayback' && peak > 0 && ready === firstBlocks && saved && restored
    && readyAgain === firstBlocks;
  return { ok, sharedFolder, noMicrophone, session: session?.[1] ?? null, sampleRate: Number(session?.[2] ?? 0), frames: Number(session?.[3] ?? 0), peak,
    ready, expectedBlocks: firstBlocks, saved, restored, readyAfterRelaunch: readyAgain, screenshot: shot };
}

export function iosTest(noBuild: boolean): void {
  if (!noBuild) iosBuild();
  for (const p of [APPEX, FX_APPEX, HOST_APP]) if (!existsSync(p)) throw new Error(`missing ${p}: run pnpm bd plugin ios build`);
  const sim = simulator();
  run('xcrun', ['simctl', 'boot', sim.udid], true);  // already booted is fine
  must(run('xcrun', ['simctl', 'bootstatus', sim.udid, '-b'], true), 'Simulator boot');
  run('xcrun', ['simctl', 'uninstall', sim.udid, APP_ID], true);  // a first launch: no saved patch
  must(run('xcrun', ['simctl', 'install', sim.udid, APP], true), 'install BlokDust.app');
  must(run('xcrun', ['simctl', 'install', sim.udid, HOST_APP], true), 'install test host');
  mkdirSync(OUT, { recursive: true });
  // One patch in the shared folder: the app and the extension both count it (their "storage:" log line).
  const group = must(run('xcrun', ['simctl', 'get_app_container', sim.udid, APP_ID, APP_GROUP], true), 'App Group container').stdout.trim();
  rmSync(resolve(group, 'BlokDust/Patches'), { recursive: true, force: true });
  mkdirSync(resolve(group, 'BlokDust/Patches'), { recursive: true });
  cpSync(FIRST_PATCH, resolve(group, 'BlokDust/Patches/Shared Test.blokdust'));
  const sampleCase = sampleRelinkFixture(group);
  const app = appCheck(sim.udid);

  const out = resolve(OUT, 'result.json');
  rmSync(out, { force: true });
  rmSync(resolve(OUT, 'editor-small.png'), { force: true });
  const job = resolve(OUT, 'job.json');
  writeFileSync(job, JSON.stringify({ component: COMPONENT, fixtures: [...FIXTURES.map(f => resolve(f)), { path: sampleCase.fixture, settleMs: 3000 }],
    out, editorSeconds: 15, smallView: SMALL_VIEW, fx: { component: FX_COMPONENT, fixtures: FX_FIXTURES.map(f => resolve(f)) } }));
  const started = new Date(Date.now() - 1000);
  must(run('xcrun', ['simctl', 'launch', '--terminate-running-process', sim.udid, HOST_ID, '--job', job], true), 'launch test host');
  for (let i = 0; i < 120 && !existsSync(out); ++i) sleep(1000);
  if (!existsSync(out)) throw new Error(`the test host wrote no result in 120 s (log: xcrun simctl spawn ${sim.udid} log show --last 5m --predicate 'subsystem BEGINSWITH "com.funputs.blokdust"')`);
  const result = JSON.parse(readFileSync(out, 'utf8'));
  const shot = resolve(OUT, 'editor.png');
  run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', shot], true);
  const small = resolve(OUT, 'editor-small.png');
  if (/view small/.test(waitForLog(sim.udid, started, [/view small/], 10, 'com.funputs.blokdust.ioshost'))) {
    sleep(4000);  // the page relayouts
    run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', small], true);
  }
  run('xcrun', ['simctl', 'terminate', sim.udid, HOST_ID], true);

  // The page's round-trip, from the extension's own log line (environment variables never reach an extension).
  const log = run('xcrun', ['simctl', 'spawn', sim.udid, 'log', 'show', '--start', logTime(started), '--style', 'compact',
    '--predicate', 'subsystem == "com.funputs.blokdust"'], true).stdout;
  const ready = [...log.matchAll(/page: ready, (-?\d+) blocks/g)].map(m => Number(m[1]));
  const wrapper = /processor created \((AUv3)/.exec(log)?.[1] ?? null;
  const extensionSharedFolder = SHARED.test(log);

  const all = result.renders as { fixture: string; audioHash?: string; error?: string; stateRoundTrips?: boolean }[];
  const renders = all.slice(0, FIXTURES.length).map((r, i) => {
    const expected = JSON.parse(readFileSync(FIXTURES[i].replace('tests/golden/', 'tests/golden/expected/'), 'utf8')).audioHash;
    return { fixture: FIXTURES[i], audioHash: r.audioHash ?? null, expected, identical: r.audioHash === expected, stateRoundTrips: !!r.stateRoundTrips, error: r.error };
  });
  const fxRenders = ((result.fxRenders ?? []) as { audioHash?: string; error?: string; stateRoundTrips?: boolean }[]).map((r, i) => {
    const expected = JSON.parse(readFileSync(FX_FIXTURES[i].replace('tests/golden/', 'tests/golden/expected/'), 'utf8')).audioHash;
    return { fixture: FX_FIXTURES[i], audioHash: r.audioHash ?? null, expected, identical: r.audioHash === expected, stateRoundTrips: !!r.stateRoundTrips, error: r.error };
  });
  // The relinked sample: the plugin rewrites the ref's path to the file it found, so the state cannot round-trip as is.
  const s = all[FIXTURES.length];
  const sample = { fixture: SAMPLE_FIXTURE, audioHash: s?.audioHash ?? null, expected: sampleCase.expected, identical: s?.audioHash === sampleCase.expected,
    relinked: /sample: relinked from Samples/.test(log), error: s?.error };
  const lastBlocks = JSON.parse(readFileSync(SAMPLE_FIXTURE, 'utf8')).patch.blocks.length;  // the editor shows the last state set
  const editor = { sharedFolder: extensionSharedFolder, view: !!result.view, ready: ready.at(-1) ?? null, expectedBlocks: lastBlocks, screenshot: shot,
    smallScreenshot: existsSync(small) ? small : null };
  const ok = app.ok && !result.error && wrapper === 'AUv3' && renders.length === FIXTURES.length && renders.every(r => r.identical && r.stateRoundTrips) && sample.identical
    && result.fxName === 'BlokDust FX' && fxRenders.length === FX_FIXTURES.length && fxRenders.every(r => r.identical && r.stateRoundTrips) && sample.relinked
    && editor.sharedFolder && editor.view && editor.ready === lastBlocks;
  console.log(JSON.stringify({ ok, simulator: sim.name, component: COMPONENT, name: result.name, wrapper, params: result.params?.length ?? 0,
    error: result.error, app, renders, sample, fx: { name: result.fxName ?? null, renders: fxRenders }, editor }));
  if (!ok) process.exit(1);
}

const DEVICE_APP = 'build/plugin-ios/plugin/BlokDust_artefacts/Release/Standalone/BlokDust.app';

type Ipad = { identifier: string; deviceProperties: { name: string };
  hardwareProperties: { deviceType?: string; productType?: string; udid?: string }; connectionProperties: { pairingState?: string } };

/** The paired iPad: BLOKDUST_IOS_DEVICE (name or identifier), or the first one. */
function findIpad(): Ipad {
  const tmp = resolve(OUT, 'devices.json');
  mkdirSync(OUT, { recursive: true });
  must(run('xcrun', ['devicectl', 'list', 'devices', '--json-output', tmp], true), 'devicectl list');
  const devices = (JSON.parse(readFileSync(tmp, 'utf8')).result.devices as Ipad[]).filter(d => d.connectionProperties.pairingState === 'paired');
  const want = setting('BLOKDUST_IOS_DEVICE');
  const ipad = want ? devices.find(d => d.identifier === want || d.deviceProperties.name === want)
    : devices.find(d => d.hardwareProperties.deviceType === 'iPad' || /^iPad/.test(d.hardwareProperties.productType ?? ''));
  if (!ipad) throw new Error('no paired iPad: connect it (USB or the same network), trust this Mac, and enable Developer Mode on it');
  return ipad;
}

/** The plugin's log from the iPad (the App Group copy WebViewDrops.mm keeps), to stdout as JSON lines. */
export function iosLog(): void {
  const ipad = findIpad();
  const dest = resolve(OUT, 'ipad-log');
  mkdirSync(dest, { recursive: true });
  const lines: string[] = [];
  for (const name of ['blokdust.old.log', 'blokdust.log']) {
    const out = resolve(dest, name);
    rmSync(out, { force: true });
    run('xcrun', ['devicectl', 'device', 'copy', 'from', '--device', ipad.identifier, '--domain-type', 'appGroupDataContainer',
      '--domain-identifier', APP_GROUP, '--source', `BlokDust/Logs/${name}`, '--destination', out], true);
    if (existsSync(out)) lines.push(...readFileSync(out, 'utf8').split('\n').filter(Boolean));
  }
  if (!lines.length) throw new Error('no log on the iPad yet: open BlokDust (the app or the plugin in a host) first');
  console.log(JSON.stringify({ ok: true, device: ipad.deviceProperties.name, lines: lines.slice(-200) }));
}

/** Build for an iPad (signed by Xcode for the team in local config) and install it on the connected iPad. */
export function iosDevice(noBuild: boolean): void {
  if (process.platform !== 'darwin') throw new Error('the iPadOS build needs macOS with Xcode');
  // Find the iPad first: Xcode adds a device to the team's profile only when it builds for that device.
  const ipad = findIpad();
  if (!noBuild) {
    requiredSetting('BLOKDUST_APPLE_TEAM_ID');
    const env = configEnvironment();
    if (!existsSync('web/dist/index.html')) must(run('pnpm', ['web:build']), 'web build');
    must(spawnSync('cmake', ['--preset', 'plugin-ios'], { stdio: ['ignore', 'inherit', 'inherit'], env }), 'configure (plugin-ios)');
    // xcodebuild with the CMake-generated scheme and this iPad as the destination, so automatic signing registers the iPad
    // in the team's profile (a plain target build signs for whatever devices the profile already lists).
    const destination = ipad.hardwareProperties.udid ? `id=${ipad.hardwareProperties.udid}` : 'generic/platform=iOS';
    const b = spawnSync('xcodebuild', ['-project', 'build/plugin-ios/blokdust.xcodeproj', '-scheme', 'BlokDust_Standalone', '-configuration', 'Release',
      '-destination', destination, '-quiet', '-allowProvisioningUpdates', '-allowProvisioningDeviceRegistration', 'build'],
      { encoding: 'utf8', env, maxBuffer: 64 << 20 });
    if (b.status !== 0) {
      const out = `${b.stdout}\n${b.stderr}`;
      const errors = [...new Set(out.split('\n').filter(l => /error:|BUILD FAILED/.test(l)))].slice(0, 20).join('\n');
      const account = /No Accounts|No Account for Team|No profiles for|App Groups capability|requires a provisioning profile|Signing for .* requires a development team/.test(out)
        ? '\nXcode could not sign: add the Apple account of the team in Xcode → Settings → Accounts, then run this again.' : '';
      throw new Error(`iPadOS device build failed:\n${errors}${account}`);
    }
  }
  if (!existsSync(DEVICE_APP)) throw new Error(`missing ${DEVICE_APP}: run pnpm bd plugin ios device`);
  must(run('xcrun', ['devicectl', 'device', 'install', 'app', '--device', ipad.identifier, DEVICE_APP]), 'install on the iPad');
  console.log(JSON.stringify({ ok: true, installed: DEVICE_APP, device: ipad.deviceProperties.name }));
}
