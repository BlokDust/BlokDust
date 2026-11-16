// bd plugin — JUCE plugin build, pluginval, and headless host tests (CHG-0001 task 0.11).
//   pnpm bd plugin build      web bundle (if missing) + VST3/AU/Standalone via the `plugin` CMake preset
//   pnpm bd plugin validate   pluginval (strictness 5) on the VST3 (and AU when the host can see it)
//   pnpm bd plugin au         macOS: install the AU *temporarily* in ~/Library/Audio/Plug-Ins/Components, run auval and
//                             pluginval on it, render it in a JUCE host (must equal native), then uninstall it
//   pnpm bd plugin sign       macOS: Developer ID sign (hardened runtime), notarise with Apple (keychain profile, default
//                             `blokdust`), staple, Gatekeeper-check → build/plugin/dist/BlokDust-macOS.zip
//   pnpm bd plugin package   macOS installer: universal, macOS 11+, signed, BlokDust-<version>-Mac.pkg notarised + stapled
//                             (build/plugin-release/dist), with its .sha256 (CHG-0005 task 12)
//   pnpm bd plugin ios build|test|device [--no-build]   iPadOS AUv3: Simulator build/test, or an iPad (CHG-0025; ios.ts)
//   pnpm bd plugin test       build + validate + load the BUILT VST3 like a DAW: golden fixtures must hash exactly
//                             like the native engine, and the WebView editor must build the stage from the patch
import { spawn, spawnSync } from 'node:child_process';
import { requiredSetting, setting } from '../lib/local-config.ts';
import { iosBuild, iosDevice, iosTest } from './ios.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ART = 'build/plugin/plugin/BlokDust_artefacts/Release';
const VST3 = `${ART}/VST3/BlokDust.vst3`;
const AU = `${ART}/AU/BlokDust.component`;
const FX_ART = 'build/plugin/plugin/BlokDustFX_artefacts/Release';
const FX_VST3 = `${FX_ART}/VST3/BlokDust FX.vst3`;
const FX_AU = `${FX_ART}/AU/BlokDust FX.component`;
const HOST = 'build/plugin/plugin/blokdust_host_test_artefacts/Release/blokdust_host_test';
const PLUGINVAL = '.cache/pluginval/pluginval.app/Contents/MacOS/pluginval';
// Plugin state is a patch, so timeline scripts cannot be replayed: use the script-free golden fixtures.
const FIXTURES = ['tests/golden/emitter-tone.json', 'tests/golden/toggle-pulse.json'];

const run = (cmd: string, args: string[], quiet = false) => spawnSync(cmd, args, { encoding: 'utf8', stdio: quiet ? 'pipe' : ['ignore', 'inherit', 'inherit'] });

function build() {
  if (!existsSync('web/dist/index.html')) { if (run('pnpm', ['web:build']).status !== 0) throw new Error('web build failed'); }
  if (run('cmake', ['--preset', 'plugin']).status !== 0) throw new Error('configure failed');
  if (run('cmake', ['--build', '--preset', 'plugin', '-j', '8']).status !== 0) throw new Error('plugin build failed');
  if (process.platform === 'darwin') resignAdHoc();
}

/** The four plugin bundles (macOS). */
const BUNDLES = () => [VST3, AU, FX_VST3, FX_AU];
/**
 * JUCE rewrites files inside the AU bundles after signing them, leaving "code has no resources but signature
 * indicates they must be present": macOS then refuses to load them in other processes (Logic shows nothing, no
 * error). Re-sign every bundle ad hoc after each build and verify (release signing is `bd plugin sign`).
 */
function resignAdHoc(): void {
  for (const b of BUNDLES()) {
    if (!existsSync(b)) continue;
    if (run('codesign', ['--force', '--deep', '--sign', '-', b], true).status !== 0) throw new Error(`codesign failed: ${b}`);
    const v = run('codesign', ['-v', b], true);
    if (v.status !== 0) throw new Error(`invalid signature after re-signing ${b}: ${v.stderr}`);
  }
}

/** Deploy to the externally configured SSH test host. See docs/engineering/local-configuration.md. */
function deploy(noBuild: boolean, force = false): void {
  const host = requiredSetting('BLOKDUST_TEST_HOST');
  if (!noBuild) build(); else resignAdHoc();
  for (const b of BUNDLES()) if (!existsSync(b)) throw new Error(`no ${b}: build first (pnpm bd plugin build)`);
  const ssh = (cmd: string) => run('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, cmd], true);
  if (ssh('true').status !== 0) throw new Error(`cannot reach ${host} over SSH (Remote Login on, this machine's key in its authorized_keys?)`);
  // Owner (Logic, 2026-11-12): replacing a plugin a DAW has loaded (and resetting the AU registry under it) leaves that
  // session broken in ways that look like plugin bugs. Refuse while any process there has a BlokDust binary mapped.
  const busy = ssh(`for p in $(pgrep -f "Logic Pro|Ableton Live|REAPER|GarageBand|AUHostingService|Bitwig"); do lsof -p "$p" 2>/dev/null | grep -q "/BlokDust" && ps -o comm= -p "$p" | xargs basename; done | sort -u`);
  const users = busy.stdout.trim().split('\n').filter(Boolean);
  if (users.length && !force) throw new Error(`BlokDust is loaded on ${host} by: ${users.join(', ')}. Quit it there first (or --force)`);
  ssh('mkdir -p ~/Library/Audio/Plug-Ins/VST3 ~/Library/Audio/Plug-Ins/Components');
  const shipped: string[] = [];
  for (const b of BUNDLES()) {
    const dest = b.endsWith('.vst3') ? 'Library/Audio/Plug-Ins/VST3/' : 'Library/Audio/Plug-Ins/Components/';
    const r = run('rsync', ['-a', '--delete', b, `${host}:${dest}`], true);
    if (r.status !== 0) throw new Error(`rsync failed for ${b}: ${r.stderr}`);
    shipped.push(dest + b.split('/').pop());
  }
  const quoted = shipped.map(p => `"$HOME/${p}"`).join(' ');
  ssh(`xattr -dr com.apple.quarantine ${quoted} 2>/dev/null || true`);
  const verify = ssh(`for b in ${quoted}; do codesign -v "$b" || exit 1; done`);
  if (verify.status !== 0) throw new Error(`a deployed bundle has an invalid signature on ${host}: the DAW would silently skip it\n${verify.stderr}`);
  ssh('killall -9 AudioComponentRegistrar 2>/dev/null || true');  // Logic re-reads the AU list
  const rev = run('git', ['rev-parse', '--short', 'HEAD'], true).stdout.trim();
  console.log(JSON.stringify({ host, deployed: shipped, signatures: 'valid', commit: rev }));
  console.error(`Deployed ${rev} to ${host}. Logic uses the AUs (BlokDust, BlokDust FX); Live the VST3s. AU validation on that machine must run in Terminal.app (an SSH session can't see AUs): auval -v aumu Bdst Bldt`);
}

function validate(): Record<string, string> {
  if (!existsSync(PLUGINVAL)) {
    run('sh', ['-c', 'mkdir -p .cache/pluginval && cd .cache/pluginval && gh release download v1.0.4 --repo Tracktion/pluginval --pattern pluginval_macOS.zip --clobber && unzip -q -o pluginval_macOS.zip']);
  }
  const out: Record<string, string> = {};
  for (const [name, path] of [['vst3', VST3], ['fxVst3', FX_VST3]] as const) {
    if (!existsSync(path)) { out[name] = 'not built'; continue; }
    const r = run(PLUGINVAL, ['--strictness-level', '5', '--skip-gui-tests', '--validate', resolve(path)], true);
    const log = `${r.stdout}${r.stderr}`;
    out[name] = r.status === 0 ? 'pass' : /No types found|Unable to load|not found/i.test(log) ? 'not loadable from build dir' : `fail (exit ${r.status})`;
    if (r.status !== 0) console.error(`--- pluginval ${name} ---\n${log.split('\n').slice(-25).join('\n')}`);
  }
  return out;
}

const hostRender = (plugin: string, fixture: string, extra: string[] = [], env: Record<string, string> = {}) => {
  const r = spawnSync(HOST, [plugin, fixture, ...extra], { encoding: 'utf8', env: { ...process.env, ...env } });
  if (r.status !== 0) return { error: r.stderr.trim() } as any;
  return JSON.parse(r.stdout.trim().split('\n').pop()!);
};
const expected = (fixture: string) => JSON.parse(readFileSync(join('tests/golden/expected', fixture.split('/').pop()!), 'utf8'));
/** The native engine's render of a fixture right now (fixtures outside the golden set, e.g. with sample files). */
const nativeRender = (fixture: string) => JSON.parse(spawnSync('node', ['tools/bd.ts', 'render', fixture], { encoding: 'utf8' }).stdout.trim().split('\n').pop()!);
/** DAW state for tests/golden/samples/sample-file.json: its patch with the file ref's path made absolute (a project). */
function sampleState(moved = false): string {
  const fx = JSON.parse(readFileSync('tests/golden/samples/sample-file.json', 'utf8'));
  for (const r of Object.values(fx.patch.refs) as any[]) if (r.provider === 'file') {
    r.path = resolve(r.path);
    if (moved) {  // the project remembers an old folder; the file now lives in a sibling folder (DATA-0005 relink)
      const root = resolve('.cache/relink');
      rmSync(root, { recursive: true, force: true });
      mkdirSync(join(root, 'old'), { recursive: true }); mkdirSync(join(root, 'moved'), { recursive: true });
      cpSync(r.path, join(root, 'moved', 'chord.wav'));
      r.path = join(root, 'old', 'chord.wav');
    }
  }
  const out = resolve(`.cache/plugin-sample-state${moved ? '-moved' : ''}.json`);
  writeFileSync(out, JSON.stringify(fx.patch));
  return out;
}

function test() {
  build();
  const pluginval = validate();
  const diag = resolve('.cache/plugin-ui-diag.json');
  // Dust 1 = 0.75 on filter.gain (−35..35) gives 17.5 dB: the dust-filter fixture's patch, reached by automation.
  const automationState = 'tests/golden/states/dust-filter.state.json';
  const cases = [
    { name: 'emitter-tone (state + editor)', plugin: VST3, fixture: 'tests/golden/emitter-tone.json', extra: ['--editor', diag], editorBlocks: 2 },
    { name: 'toggle-pulse (44.1 kHz)', plugin: VST3, fixture: 'tests/golden/toggle-pulse.json', extra: [] },
    { name: 'keys / laser fixtures need scripts: covered natively', skip: true },
    { name: 'Dust 1 automation', plugin: VST3, fixture: 'tests/golden/dust-filter.json', extra: ['--state', automationState, '--param', '0=0.75'], noRoundTripCheck: true,
      paramName: [0, 'Dust 1 \u00b7 Filter \u00b7 Gain'] },  // CHG-0004 3.9: lanes named after their target
    { name: 'FX: Audio In with input', plugin: FX_VST3, fixture: 'tests/golden/fx-audio-in.json', extra: [] },
    // CHG-0004 3.4: the instrument's side-chain bus, once enabled, feeds Audio Input exactly like the FX's input.
    { name: 'Instrument: side-chain → Audio Input', plugin: VST3, fixture: 'tests/golden/fx-audio-in.json', extra: ['--sidechain'] },
    // Host MIDI at the same samples as the fixture's script (velocity of note-on is ignored by the engine today).
    { name: 'host MIDI notes', plugin: VST3, fixture: 'tests/golden/midi-notes.json', extra: ['--midi', 'on:60@4800,off:60@48000,on:67/76@72000,off:67@120000'] },  // velocity 76/127, as in the fixture
    // In a DAW the computer keys are the host's (Logic Musical Typing, Live's Computer MIDI Keyboard): they arrive as MIDI.
    { name: 'DAW keys → Computer Keyboard', plugin: VST3, fixture: 'tests/golden/keyboard-host-midi.json', extra: ['--midi', 'on:60@4800,on:64@24000,off:60@48000,off:64@60000'] },
    // CHG-0004 3.6: a DAW project whose Sample uses the user's own file (absolute path): the plugin loads it natively,
    // relinks nothing, and renders like the native engine with the same WAV attached.
    { name: "state: Sample with the user's file", plugin: VST3, fixture: 'tests/golden/samples/sample-file.json', extra: ['--state', sampleState(), '--settle', '2000'], native: true, noRoundTripCheck: true },
    { name: 'state: moved file relinked by name', plugin: VST3, fixture: 'tests/golden/samples/sample-file.json', extra: ['--state', sampleState(true), '--settle', '2000'], native: true, noRoundTripCheck: true },
    // CHG-0004 3.5: the host's transport (120 BPM, beat each block) ≡ the patch tempo rendered natively.
    { name: 'host tempo + transport', plugin: VST3, fixture: 'tests/golden/tempo-host.json', extra: ['--tempo', '120'] },
    // PLUGIN-0004: a raw MPE stream through the plugin's own parser ≡ the web parser's commands rendered natively.
    { name: 'host MPE MIDI', plugin: VST3, fixture: 'tests/golden/mpe-midi.json',
      extra: ['--midi-raw', (JSON.parse(readFileSync('tests/golden/mpe-midi.json', 'utf8')).midi as number[][]).map(m => `${m[0]}:${m[1]},${m[2]},${m[3]}`).join(';')] },
  ].filter(c => !c.skip) as any[];
  const renders = cases.map(c => {
    const got = hostRender(c.plugin, c.fixture, c.extra, { BLOKDUST_DIAG_FILE: diag });
    const exp = c.native ? nativeRender(c.fixture) : expected(c.fixture);
    const nameOk = !c.paramName || got.params?.[c.paramName[0]] === c.paramName[1];
    const ok = nameOk && got.audioHash === exp.audioHash && (c.noRoundTripCheck || got.stateRoundTrips === true) && (c.editorBlocks === undefined || got.editor?.blocks === c.editorBlocks);
    return { case: c.name, ok, audioHash: got.audioHash ?? got.error, expected: exp.audioHash, ...(got.editor ? { editor: got.editor } : {}) };
  });
  // CHG-0004 3.10 (found by the REAPER save/reopen check): Dust values are part of the plugin's saved state.
  {
    const r = hostRender(VST3, 'tests/golden/dust-filter.json', ['--state', automationState, '--param', '0=0.6', '--param', '7=0.25', '--reload']);
    const v = r.reloadedValues ?? [];
    const ok = Math.abs((v[0] ?? -1) - 0.6) < 1e-4 && Math.abs((v[7] ?? -1) - 0.25) < 1e-4;
    renders.push({ case: 'state keeps Dust 1-8 values (save, reopen)', ok, audioHash: JSON.stringify(v.slice(0, 8)), expected: '[0.6,…,0.25]' });
  }
  // Owner (Ableton, 2026-11-12): a Dust lane moves its block param, and the patch the host saves says so (the editor
  // shows the same value: ui-regressions dust-moves-sliders). Dust 1 = 0.75 on filter.gain (−35..35) is 17.5 dB.
  {
    const r = hostRender(VST3, 'tests/golden/dust-filter.json', ['--state', automationState, '--param', '0=0.75']);
    const gain = r.stateAfter?.blocks?.find((b: any) => b.id === 'filter')?.params?.gain;
    renders.push({ case: 'Dust moves the saved block param', ok: typeof gain === 'number' && Math.abs(gain - 17.5) < 1e-6, audioHash: String(gain), expected: '17.5' });
  }
  // CHG-0004 3.9: a MIDI CC bound to Dust 1 (learned → "cc" in the automation entry) drives it like the host lane.
  {
    const st = JSON.parse(readFileSync(automationState, 'utf8'));
    st.automation[0].cc = 20;
    const ccState = resolve('.cache/plugin-cc-state.json');
    writeFileSync(ccState, JSON.stringify(st));
    const byCc = hostRender(VST3, 'tests/golden/dust-filter.json', ['--state', ccState, '--midi-raw', '0:176,20,127']);
    const byLane = hostRender(VST3, 'tests/golden/dust-filter.json', ['--state', ccState, '--param', '0=1.0']);
    const ok = !!byCc.audioHash && byCc.audioHash === byLane.audioHash;
    renders.push({ case: 'MIDI CC 20 → Dust 1 (learned)', ok, audioHash: byCc.audioHash ?? byCc.error, expected: byLane.audioHash });
  }
  // Owner (Logic): bypassed, the plugin is silent but its world keeps running, so the stage still connects blocks;
  // once back on it sounds exactly as if it had never been bypassed.
  {
    const from = String(48000 * 2);
    const bypassed = hostRender(VST3, 'tests/golden/emitter-tone.json', ['--bypass-until', from, '--tail-from', from]);
    const normal = hostRender(VST3, 'tests/golden/emitter-tone.json', ['--tail-from', from]);
    const ok = !!bypassed.tailHash && bypassed.tailHash === normal.tailHash && normal.peak > 0.001;
    renders.push({ case: 'bypassed: the world keeps running', ok, audioHash: bypassed.tailHash ?? bypassed.error, expected: normal.tailHash });
  }
  // Owner (Ableton): pressing Play resyncs the world, so takes from bar 1 match whatever happened before (here the
  // transport stopped at different times, then played from bar 1 at the same sample).
  {
    const again = '144000';
    const a = hostRender(VST3, 'tests/golden/tempo-host.json', ['--tempo', '120', '--stopped', `60000:${again}`, '--tail-from', again]);
    const b = hostRender(VST3, 'tests/golden/tempo-host.json', ['--tempo', '120', '--stopped', `101000:${again}`, '--tail-from', again]);
    const ok = !!a.tailHash && a.tailHash === b.tailHash && a.peak > 0.001;
    renders.push({ case: 'Play resyncs: takes from bar 1 match', ok, audioHash: a.tailHash ?? a.error, expected: b.tailHash });
  }
  // Owner (Logic): a disabled plugin gets no audio callbacks at all; with its editor open the stage must still update.
  {
    const r = hostRender(VST3, 'tests/golden/emitter-tone.json', ['--idle', '--editor', diag], { BLOKDUST_DIAG_FILE: diag });
    const seq = r.editor?.snapshotSeq ?? 0;
    renders.push({ case: 'no audio callbacks: the editor still ticks the world', ok: seq > 0, audioHash: String(seq), expected: '> 0 snapshots' });
  }
  // CHG-0005: patch files (save, list) and the Open / Insert merge the processor applies.
  {
    const r = spawnSync(HOST, ['--selftest-patches'], { encoding: 'utf8' });
    let j: any = {};
    try { j = JSON.parse(r.stdout.trim().split('\n').pop() ?? '{}'); } catch { /* reported below */ }
    renders.push({ case: 'patch files: save, list, open/insert merge', ok: j.ok === true, audioHash: JSON.stringify(j.checks ?? r.stderr), expected: 'all checks true' });
  }
  for (const r of renders.filter(r => !r.ok)) console.error(`FAIL ${JSON.stringify(r)}`);
  const ok = pluginval.vst3 === 'pass' && pluginval.fxVst3 === 'pass' && renders.every(r => r.ok);
  console.log(JSON.stringify({ pluginval, renders: renders.map(({ case: c, ok, editor }) => ({ case: c, ok, ...(editor ? { editor } : {}) })) }));
  if (!ok) process.exit(1);
}

function au(keep = false) {
  if (process.platform !== 'darwin') throw new Error('AU is macOS only');
  if (!existsSync(AU) || !existsSync(FX_AU)) build();
  const dir = join(homedir(), 'Library/Audio/Plug-Ins/Components');
  // type/subtype/manufacturer = AU_MAIN_TYPE / PLUGIN_CODE / PLUGIN_MANUFACTURER_CODE (plugin/CMakeLists.txt)
  const plugins = [
    { src: AU, dest: join(dir, 'BlokDust.component'), auval: ['aumu', 'Bdst', 'Bldt'], id: 'AudioUnit:Synths/aumu,Bdst,Bldt', fixture: 'tests/golden/plugin-start.json' },
    { src: FX_AU, dest: join(dir, 'BlokDust FX.component'), auval: ['aufx', 'Bdfx', 'Bldt'], id: 'AudioUnit:Effects/aufx,Bdfx,Bldt', fixture: 'tests/golden/fx-demo.json' },
  ];
  for (const p of plugins) if (existsSync(p.dest) && !keep) throw new Error(`${p.dest} already exists; not touching an install this tool did not make`);
  const refresh = () => run('killall', ['-9', 'AudioComponentRegistrar'], true);  // macOS caches the AU list
  const results: any[] = [];
  try {
    for (const p of plugins) { rmSync(p.dest, { recursive: true, force: true }); cpSync(p.src, p.dest, { recursive: true }); }
    refresh();
    for (const p of plugins) {
      const r: any = { plugin: p.id };
      const auval = run('auval', ['-v', ...p.auval], true);
      r.auval = /AU VALIDATION SUCCEEDED/.test(auval.stdout) ? 'pass' : 'fail';
      if (r.auval !== 'pass') console.error(auval.stdout.split('\n').slice(-30).join('\n'));
      const pv = run(PLUGINVAL, ['--strictness-level', '5', '--skip-gui-tests', '--validate', p.dest], true);
      r.pluginval = pv.status === 0 ? 'pass' : `fail (exit ${pv.status})`;
      if (pv.status !== 0) console.error(`${pv.stdout}${pv.stderr}`.split('\n').slice(-25).join('\n'));
      // The installed AU in a JUCE host with its default patch (AU state is a property list): must equal native.
      const got = hostRender(p.id, p.fixture, ['--no-state']);
      r.render = { ok: got.audioHash === expected(p.fixture).audioHash, audioHash: got.audioHash ?? got.error };
      results.push(r);
    }
  } finally {
    if (!keep) { for (const p of plugins) rmSync(p.dest, { recursive: true, force: true }); refresh(); }
  }
  console.log(JSON.stringify({ results, installed: keep ? 'kept' : 'removed after the test' }));
  if (results.some(r => r.auval !== 'pass' || r.pluginval !== 'pass' || !r.render.ok)) process.exit(1);
}

/** Copy every bundle (both plugins × VST3, AU; the Standalone app is BlokDust's only, CHG-0010) from a build tree into `dist` and Developer ID sign each
 * with hardened runtime and a secure timestamp. */
function signBundles(buildDir: string, dist: string, identity: string): { path: string; entitlements: string }[] {
  rmSync(dist, { recursive: true, force: true });
  run('mkdir', ['-p', dist], true);
  const bundles: { path: string; entitlements: string }[] = [];
  for (const [target, product] of [['BlokDust', 'BlokDust'], ['BlokDustFX', 'BlokDust FX']]) {
    const art = `${buildDir}/plugin/${target}_artefacts`;
    for (const [fmt, ext] of [['VST3', 'vst3'], ['AU', 'component'], ['Standalone', 'app']]) {
      if (fmt === 'Standalone' && target === 'BlokDustFX') continue;  // an older build tree may still hold one
      const src = `${art}/Release/${fmt}/${product}.${ext}`;
      const dest = join(dist, `${product}.${ext}`);
      cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
      bundles.push({ path: dest, entitlements: `${art}/JuceLibraryCode/${target}_${fmt}.entitlements` });
    }
  }
  for (const b of bundles) {
    const r = run('codesign', ['--force', '--options', 'runtime', '--timestamp', '--entitlements', b.entitlements, '--sign', identity, b.path], true);
    if (r.status !== 0) throw new Error(`codesign ${b.path}: ${r.stderr}`);
    const v = run('codesign', ['--verify', '--strict', '--deep', b.path], true);
    if (v.status !== 0) throw new Error(`verify ${b.path}: ${v.stderr}`);
  }
  return bundles;
}

function sign(profile: string, identity: string) {
  if (process.platform !== 'darwin') throw new Error('macOS only');
  build();
  const dist = resolve('build/plugin/dist/macos');
  const bundles = signBundles('build/plugin', dist, identity);
  const result: Record<string, unknown> = { identity, profile, bundles: bundles.map(b => b.path.split('/').pop()) };
  result.signed = 'pass';
  // Notarisation needs credentials stored once in the login keychain (never in the repo): see docs/engineering/signing.md.
  const hasProfile = run('xcrun', ['notarytool', 'history', '--keychain-profile', profile], true).status === 0;
  if (!hasProfile) {
    result.notarization = { status: 'skipped', reason: `no keychain profile "${profile}"`,
      fix: `xcrun notarytool store-credentials ${profile} --apple-id <apple-id> --team-id <team-id> --password <app-specific-password>` };
    console.log(JSON.stringify(result));
    return;  // signed and verified; notarise later with the same command once the profile exists
  }
  const zip = resolve('build/plugin/dist/BlokDust-macOS.zip');
  rmSync(zip, { force: true });
  run('ditto', ['-c', '-k', '--keepParent', dist, zip], true);
  const n = run('xcrun', ['notarytool', 'submit', zip, '--keychain-profile', profile, '--wait', '--timeout', '30m', '--output-format', 'json'], true);
  let sub: any = {}; try { sub = JSON.parse(n.stdout); } catch { sub = { status: 'error', message: `${n.stdout}${n.stderr}`.trim() }; }
  result.notarization = { id: sub.id, status: sub.status };
  if (sub.status !== 'Accepted') {
    if (sub.id) console.error(run('xcrun', ['notarytool', 'log', sub.id, '--keychain-profile', profile], true).stdout);
    console.log(JSON.stringify(result)); process.exit(1);
  }
  for (const b of bundles) {
    const st = run('xcrun', ['stapler', 'staple', b.path], true);
    if (st.status !== 0) throw new Error(`staple ${b.path}: ${st.stdout}${st.stderr}`);
  }
  result.stapled = 'pass';
  // Gatekeeper's verdict on the apps (plugins are loaded by hosts, not assessed as executables).
  result.gatekeeper = bundles.filter(b => b.path.endsWith('.app')).map(b => {
    const g = run('spctl', ['--assess', '--type', 'execute', '-vv', b.path], true);
    return { app: b.path.split('/').pop(), ok: g.status === 0, source: /source=(.*)/.exec(`${g.stdout}${g.stderr}`)?.[1] ?? null };
  });
  rmSync(zip, { force: true });
  run('ditto', ['-c', '-k', '--keepParent', dist, zip], true);  // re-zip with stapled tickets
  result.artifact = zip;
  console.log(JSON.stringify(result));
  if ((result.gatekeeper as any[]).some(g => !g.ok)) process.exit(1);
}

/** The release version: the root package.json's (CMake reads the same field). */
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

/**
 * The macOS installer (CHG-0005 task 12): BlokDust-<version>-Mac.pkg with both plugins as VST3 and AU and the BlokDust Standalone app, built
 * universal (arm64 + x86_64) for macOS 11+ (`plugin-release` preset), Developer ID signed, the package signed with
 * Developer ID Installer, notarised, stapled and accepted by Gatekeeper; plus its .sha256. The licences go to
 * /Library/Application Support/BlokDust. See docs/engineering/signing.md.
 */
function packageMac(profile: string, appId: string, installerId: string, noBuild: boolean) {
  if (process.platform !== 'darwin') throw new Error('macOS only');
  if (!noBuild) {
    if (run('pnpm', ['web:build']).status !== 0) throw new Error('web build failed');
    if (run('cmake', ['--preset', 'plugin-release']).status !== 0) throw new Error('configure failed');
    if (run('cmake', ['--build', '--preset', 'plugin-release', '-j', '8']).status !== 0) throw new Error('build failed');
  }
  const out = resolve('build/plugin-release/dist');
  const staging = join(out, 'staging');
  const bundles = signBundles('build/plugin-release', join(staging, 'bundles'), appId);
  // Every binary: both architectures, macOS 11, the release version.
  const checks = bundles.map(b => {
    const name = b.path.split('/').pop()!, exe = join(b.path, 'Contents/MacOS', name.replace(/\.(vst3|component|app)$/, ''));
    const archs = run('lipo', ['-archs', exe], true).stdout.trim().split(/\s+/).sort().join(',');
    const minos = /minos (\S+)/.exec(run('vtool', ['-show-build', exe], true).stdout)?.[1];
    const plist = run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', join(b.path, 'Contents/Info.plist')], true).stdout.trim();
    return { name, archs, minos, version: plist };
  });
  const bad = checks.filter(c => c.archs !== 'arm64,x86_64' || c.minos !== '11.0' || c.version !== VERSION);
  if (bad.length) throw new Error(`not releasable: ${JSON.stringify(bad)}`);
  // One component package per install location.
  const roots: Record<string, { dir: string; ext?: string; to: string }> = {
    vst3: { dir: join(staging, 'vst3'), ext: '.vst3', to: '/Library/Audio/Plug-Ins/VST3' },
    au: { dir: join(staging, 'au'), ext: '.component', to: '/Library/Audio/Plug-Ins/Components' },
    app: { dir: join(staging, 'app'), ext: '.app', to: '/Applications' },
    docs: { dir: join(staging, 'docs'), to: '/Library/Application Support/BlokDust' },
  };
  const pkgs = join(staging, 'pkgs');
  mkdirSync(pkgs, { recursive: true });
  for (const [key, r] of Object.entries(roots)) {
    mkdirSync(r.dir, { recursive: true });
    if (r.ext) for (const b of bundles.filter(x => x.path.endsWith(r.ext!))) cpSync(b.path, join(r.dir, b.path.split('/').pop()!), { recursive: true, verbatimSymlinks: true });
    else { cpSync('NOTICE.md', join(r.dir, 'NOTICE.txt')); cpSync('LICENSE', join(r.dir, 'LICENSE.txt')); }
    const args = ['--root', r.dir, '--identifier', `com.funputs.blokdust.pkg.${key}`, '--version', VERSION, '--install-location', r.to];
    if (r.ext) {
      // Install where it says, not over a copy the user moved elsewhere (bundles are relocatable by default).
      const plist = join(staging, `${key}.plist`);
      run('pkgbuild', ['--analyze', '--root', r.dir, plist], true);
      // The plist is an array with one entry per top-level bundle.
      for (let i = 0; run('/usr/libexec/PlistBuddy', ['-c', `Set :${i}:BundleIsRelocatable false`, plist], true).status === 0; i++);
      args.push('--component-plist', plist);
    }
    const p = run('pkgbuild', [...args, join(pkgs, `${key}.pkg`)], true);
    if (p.status !== 0) throw new Error(`pkgbuild ${key}: ${p.stderr}`);
  }
  const ref = (key: string) => `<pkg-ref id="com.funputs.blokdust.pkg.${key}" version="${VERSION}">${key}.pkg</pkg-ref>`;
  writeFileSync(join(staging, 'distribution.xml'), `<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>BlokDust ${VERSION}</title>
    <organization>com.funputs</organization>
    <options customize="allow" require-scripts="false" hostArchitectures="arm64,x86_64"/>
    <volume-check><allowed-os-versions><os-version min="11.0"/></allowed-os-versions></volume-check>
    <choices-outline>
        <line choice="vst3"/><line choice="au"/><line choice="app"/><line choice="docs"/>
    </choices-outline>
    <choice id="vst3" title="VST3 plug-ins" description="BlokDust and BlokDust FX, in /Library/Audio/Plug-Ins/VST3 (Live, REAPER, Bitwig, Cubase)."><pkg-ref id="com.funputs.blokdust.pkg.vst3"/></choice>
    <choice id="au" title="Audio Unit plug-ins" description="BlokDust and BlokDust FX, in /Library/Audio/Plug-Ins/Components (Logic, GarageBand)."><pkg-ref id="com.funputs.blokdust.pkg.au"/></choice>
    <choice id="app" title="Standalone app" description="BlokDust, in /Applications."><pkg-ref id="com.funputs.blokdust.pkg.app"/></choice>
    <choice id="docs" title="Licences" visible="false" description="Notices and licences."><pkg-ref id="com.funputs.blokdust.pkg.docs"/></choice>
    ${ref('vst3')}
    ${ref('au')}
    ${ref('app')}
    ${ref('docs')}
</installer-gui-script>
`);
  const pkg = join(out, `BlokDust-${VERSION}-Mac.pkg`);
  rmSync(pkg, { force: true });
  const pb = run('productbuild', ['--distribution', join(staging, 'distribution.xml'), '--package-path', pkgs, '--sign', installerId, '--timestamp', pkg], true);
  if (pb.status !== 0) throw new Error(`productbuild: ${pb.stderr}`);
  const result: Record<string, unknown> = { pkg, version: VERSION, bundles: checks };
  // Notarisation credentials live once in this Mac's login keychain (never in the repo): docs/engineering/signing.md.
  if (run('xcrun', ['notarytool', 'history', '--keychain-profile', profile], true).status !== 0) {
    result.notarization = { status: 'missing credentials', fix: `xcrun notarytool store-credentials ${profile} --apple-id <apple-id> --team-id <team-id> --password <app-specific-password>` };
    console.log(JSON.stringify(result)); process.exit(2);
  }
  const n = run('xcrun', ['notarytool', 'submit', pkg, '--keychain-profile', profile, '--wait', '--timeout', '30m', '--output-format', 'json'], true);
  let sub: any = {}; try { sub = JSON.parse(n.stdout); } catch { sub = { status: 'error', message: `${n.stdout}${n.stderr}`.trim() }; }
  result.notarization = { id: sub.id, status: sub.status, message: sub.message };
  if (sub.status !== 'Accepted') {
    if (sub.id) console.error(run('xcrun', ['notarytool', 'log', sub.id, '--keychain-profile', profile], true).stdout);
    console.log(JSON.stringify(result)); process.exit(1);
  }
  const st = run('xcrun', ['stapler', 'staple', pkg], true);
  if (st.status !== 0) throw new Error(`staple: ${st.stdout}${st.stderr}`);
  // What a user's Mac decides, asked the way it asks.
  const g = run('spctl', ['--assess', '--type', 'install', '-vv', pkg], true);
  result.gatekeeper = { ok: /accepted/.test(`${g.stdout}${g.stderr}`), source: /source=(.*)/.exec(`${g.stdout}${g.stderr}`)?.[1] ?? null };
  const sha = run('shasum', ['-a', '256', pkg], true).stdout.split(/\s+/)[0];
  writeFileSync(`${pkg}.sha256`, `${sha}  BlokDust-${VERSION}-Mac.pkg\n`);
  result.sha256 = sha;
  rmSync(staging, { recursive: true, force: true });
  console.log(JSON.stringify(result));
  if (!(result.gatekeeper as { ok: boolean }).ok) process.exit(1);
}

/**
 * REAPER on macOS (CHG-0004 3.10): an isolated REAPER (its own resource folder via -cfgfile: your REAPER settings are
 * untouched) loads the built plugins from the build folder and runs tools/reaper/__startup.lua plans: instrument
 * playback, an MPE MIDI item, the FX on a tone generator, and a project saved and reopened with Dust 1 set.
 */
async function reaperMac() {
  if (process.platform !== 'darwin') throw new Error('macOS only (Windows: bd win plugin)');
  const app = '/Applications/REAPER.app/Contents/MacOS/REAPER';
  if (!existsSync(app)) throw new Error('REAPER is not installed');
  if (!existsSync(VST3) || !existsSync(FX_VST3)) build();
  // REAPER's evaluation dialog (trial) holds every start until "Still evaluating" is pressed: a helper presses it. It
  // needs Accessibility access once (a stable path, so the grant survives rebuilds).
  const tools = resolve('.cache/reaper-tools'), click = join(tools, 'evaluation-click');
  mkdirSync(tools, { recursive: true });
  if (!existsSync(click) || statSync(click).mtimeMs < statSync('tools/reaper/evaluation-click.swift').mtimeMs)
    if (spawnSync('swiftc', ['-O', 'tools/reaper/evaluation-click.swift', '-o', click], { stdio: 'inherit' }).status !== 0) throw new Error('evaluation-click build failed');
  if (spawnSync(click, ['0'], { encoding: 'utf8' }).status === 2)
    throw new Error(`REAPER automation needs Accessibility access for ${click} (System Settings › Privacy & Security › Accessibility › +), once`);
  const home = resolve('.cache/reaper-home');
  rmSync(home, { recursive: true, force: true });
  mkdirSync(join(home, 'Scripts'), { recursive: true });
  mkdirSync(join(home, 'Effects', 'synthesis'), { recursive: true });
  cpSync('tools/reaper/__startup.lua', join(home, 'Scripts', '__startup.lua'));
  cpSync('/Applications/REAPER.app/Contents/InstallFiles/Effects/synthesis/tonegenerator', join(home, 'Effects', 'synthesis', 'tonegenerator'));
  const vstDirs = [resolve(ART, 'VST3'), resolve(FX_ART, 'VST3')].join(';');
  const ini = join(home, 'reaper.ini');
  writeFileSync(ini, `[REAPER]\nvstpath=${vstDirs}\nvstpath64=${vstDirs}\nvstpath_arm64=${vstDirs}\nsplashscreen=0\nnewprojdo=0\nloadlastproj=0\nverchk=0\n` +
    // The default system devices, as a fresh REAPER would ask for (the question would hold the start).
    'coreaudioindevnew=<default system devices>\ncoreaudiooutdevnew=<default system devices>\ncoreaudiosrate=48000\ncoreaudiobs=512\n');
  const plans = [
    { name: 'instrument plays', fx: 'VST3i:BlokDust', mode: 'play', seconds: 6, ok: (r: any) => r.loaded && r.peak > 0.001 },
    { name: 'MPE MIDI item plays', fx: 'VST3i:BlokDust', mode: 'mpe', seconds: 4, ok: (r: any) => r.loaded && r.midiItem && r.peak > 0.001 },
    { name: 'FX: tone generator through Audio In', fx: 'VST3:BlokDust FX', mode: 'fx', seconds: 4, ok: (r: any) => r.loaded && r.peak > 0.001 },
    { name: 'project saved and reopened (state, Dust 1)', fx: 'VST3i:BlokDust', mode: 'state', seconds: 1,
      ok: (r: any) => r.loaded && r.reopened?.fxCount === 1 && /BlokDust/.test(r.reopened.fx) && Math.abs(r.reopened.dust1 - 0.6) < 0.01 },
  ];
  const results: any[] = [];
  for (const p of plans) {
    const report = join(home, 'blokdust-reaper-report.json');
    rmSync(report, { force: true });
    writeFileSync(join(home, 'blokdust-reaper-plan.txt'), `fx=${p.fx}\nseconds=${p.seconds}\nmode=${p.mode}\nquit=1\n`);
    const child = spawn(app, ['-cfgfile', ini, '-newinst', '-new'], { env: { ...process.env, BLOKDUST_REAPER_HOME: home }, stdio: 'ignore', detached: true });
    spawn(click, ['90'], { stdio: 'ignore', detached: true }).unref();  // presses "Still evaluating" when the dialog shows
    const deadline = Date.now() + (p.seconds + 120) * 1000;  // first launch scans plugins
    while (Date.now() < deadline && !existsSync(report)) await new Promise(r => setTimeout(r, 500));
    await new Promise(r => setTimeout(r, 1500));
    try { process.kill(-child.pid!, 'SIGTERM'); } catch { /* quit already */ }
    const r = existsSync(report) ? JSON.parse(readFileSync(report, 'utf8')) : { error: 'no report (REAPER did not run the plan)' };
    const ok = !r.error && p.ok(r);
    results.push({ case: p.name, ok, ...r });
    console.error(`${ok ? 'pass' : 'FAIL'} ${p.name} ${JSON.stringify(r)}`);
  }
  console.log(JSON.stringify({ reaper: results[0]?.reaper, results }));
  if (results.some(r => !r.ok)) process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'build') build();
else if (cmd === 'reaper') await reaperMac();
else if (cmd === 'deploy') deploy(process.argv.includes('--no-build'), process.argv.includes('--force'));
else if (cmd === 'validate') { const v = validate(); console.log(JSON.stringify(v)); if (v.vst3 !== 'pass') process.exit(1); }
else if (cmd === 'test') test();
else if (cmd === 'ios' && process.argv[3] === 'build') iosBuild();
else if (cmd === 'ios' && process.argv[3] === 'test') iosTest(process.argv.includes('--no-build'));
else if (cmd === 'ios' && process.argv[3] === 'device') iosDevice(process.argv.includes('--no-build'));
else if (cmd === 'au') au(process.argv.includes('--keep'));
else if (cmd === 'sign') {
  const arg = (k: string, d: string | (() => string)) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : typeof d === 'function' ? d() : d; };
  sign(arg('--profile', setting('BLOKDUST_NOTARY_PROFILE', 'blokdust')), arg('--identity', () => requiredSetting('BLOKDUST_SIGNING_IDENTITY')));
}
else if (cmd === 'package') {
  const arg = (k: string, d: string | (() => string)) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : typeof d === 'function' ? d() : d; };
  packageMac(arg('--profile', setting('BLOKDUST_NOTARY_PROFILE', 'blokdust')), arg('--identity', () => requiredSetting('BLOKDUST_SIGNING_IDENTITY')),
    arg('--installer-identity', () => requiredSetting('BLOKDUST_INSTALLER_IDENTITY')), process.argv.includes('--no-build'));
}
else { console.error('usage: bd plugin build | package [--no-build] | validate | test | ios build|test|device [--no-build] | au [--keep] | reaper | deploy [--no-build] | sign [--profile blokdust] [--identity ...]'); process.exit(2); }
