// bd plugin ios test: the test host loads the AUv3 out of process as AUM does; golden fixtures
// must hash as native, state round-trip, and the editor report bd_ready.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_ID, OUT, must, run } from './ios-shared.ts';
import {
  APP,
  APPEX,
  APP_GROUP,
  COMPONENT,
  FIRST_PATCH,
  FIXTURES,
  FX_APPEX,
  FX_COMPONENT,
  FX_FIXTURES,
  HOST_APP,
  HOST_ID,
  SAMPLE_FIXTURE,
  SMALL_VIEW,
  STATS_FILE,
  extensionLines,
  sleep,
  statsFile,
} from './ios-paths.ts';
import { iosBuild, simulator } from './ios-build.ts';
import { logTime, waitForLog } from './ios-log.ts';
import { appCheck, sampleRelinkFixture } from './ios-app-check.ts';

export function iosTest(noBuild: boolean): void {
  if (!noBuild) iosBuild();
  for (const bundle of [APPEX, FX_APPEX, HOST_APP])
    if (!existsSync(bundle)) throw new Error(`missing ${bundle}: run pnpm bd plugin ios build`);
  const sim = simulator();
  run('xcrun', ['simctl', 'boot', sim.udid], true); // already booted is fine
  must(run('xcrun', ['simctl', 'bootstatus', sim.udid, '-b'], true), 'Simulator boot');
  run('xcrun', ['simctl', 'uninstall', sim.udid, APP_ID], true); // a first launch: no saved patch
  must(run('xcrun', ['simctl', 'install', sim.udid, APP], true), 'install BlokDust.app');
  must(run('xcrun', ['simctl', 'install', sim.udid, HOST_APP], true), 'install test host');
  mkdirSync(OUT, { recursive: true });
  // One patch in the shared folder: the app and the extension both count it (their "storage:" log line).
  const group = must(
    run('xcrun', ['simctl', 'get_app_container', sim.udid, APP_ID, APP_GROUP], true),
    'App Group container',
  ).stdout.trim();
  rmSync(resolve(group, 'BlokDust/Patches'), { recursive: true, force: true });
  mkdirSync(resolve(group, 'BlokDust/Patches'), { recursive: true });
  cpSync(FIRST_PATCH, resolve(group, 'BlokDust/Patches/Shared Test.blokdust'));
  const sampleCase = sampleRelinkFixture(group);
  writeFileSync(resolve(group, STATS_FILE), statsFile(false));
  const app = appCheck(sim.udid, group);

  const out = resolve(OUT, 'result.json');
  rmSync(out, { force: true });
  rmSync(resolve(OUT, 'editor-small.png'), { force: true });
  const job = resolve(OUT, 'job.json');
  writeFileSync(
    job,
    JSON.stringify({
      component: COMPONENT,
      fixtures: [
        ...FIXTURES.map((fixture) => resolve(fixture)),
        { path: sampleCase.fixture, settleMs: 3000 },
      ],
      out,
      editorSeconds: 15,
      smallView: SMALL_VIEW,
      fx: { component: FX_COMPONENT, fixtures: FX_FIXTURES.map((fixture) => resolve(fixture)) },
    }),
  );
  const started = new Date(Date.now() - 1000);
  must(
    run(
      'xcrun',
      ['simctl', 'launch', '--terminate-running-process', sim.udid, HOST_ID, '--job', job],
      true,
    ),
    'launch test host',
  );
  for (let i = 0; i < 120 && !existsSync(out); ++i) sleep(1000);
  if (!existsSync(out))
    throw new Error(
      `the test host wrote no result in 120 s (log: xcrun simctl spawn ${sim.udid} log show --last 5m --predicate 'subsystem BEGINSWITH "com.funputs.blokdust"')`,
    );
  const result = JSON.parse(readFileSync(out, 'utf8'));
  const shot = resolve(OUT, 'editor.png');
  run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', shot], true);
  const small = resolve(OUT, 'editor-small.png');
  if (
    waitForLog(sim.udid, started, [/view small/], 10, 'com.funputs.blokdust.ioshost').includes(
      'view small',
    )
  ) {
    sleep(4000); // the page relayouts
    run('xcrun', ['simctl', 'io', sim.udid, 'screenshot', small], true);
  }
  run('xcrun', ['simctl', 'terminate', sim.udid, HOST_ID], true);

  // The page's round-trip, from the extension's own log line (environment variables never reach an extension).
  const log = run(
    'xcrun',
    [
      'simctl',
      'spawn',
      sim.udid,
      'log',
      'show',
      '--start',
      logTime(started),
      '--style',
      'compact',
      '--predicate',
      'subsystem == "com.funputs.blokdust"',
    ],
    true,
  ).stdout;
  const ready = [...log.matchAll(/page: ready, (-?\d+) blocks/g)].map((match) => Number(match[1]));
  const wrapper = /processor created \((AUv3)/.exec(log)?.[1] ?? null;
  const extensionSharedFolder = log.includes('storage: app group, 1 patches');

  const all = result.renders as {
    fixture: string;
    audioHash?: string;
    error?: string;
    stateRoundTrips?: boolean;
  }[];
  const renders = all.slice(0, FIXTURES.length).map((render, i) => {
    const expected = JSON.parse(
      readFileSync(FIXTURES[i].replace('tests/golden/', 'tests/golden/expected/'), 'utf8'),
    ).audioHash;
    return {
      fixture: FIXTURES[i],
      audioHash: render.audioHash ?? null,
      expected,
      identical: render.audioHash === expected,
      stateRoundTrips: !!render.stateRoundTrips,
      error: render.error,
    };
  });
  const fxRenders = (
    (result.fxRenders ?? []) as { audioHash?: string; error?: string; stateRoundTrips?: boolean }[]
  ).map((render, i) => {
    const expected = JSON.parse(
      readFileSync(FX_FIXTURES[i].replace('tests/golden/', 'tests/golden/expected/'), 'utf8'),
    ).audioHash;
    return {
      fixture: FX_FIXTURES[i],
      audioHash: render.audioHash ?? null,
      expected,
      identical: render.audioHash === expected,
      stateRoundTrips: !!render.stateRoundTrips,
      error: render.error,
    };
  });
  // The relinked sample: the plugin rewrites the ref's path to the file it found, so the state cannot round-trip as is.
  const sampleRender = all[FIXTURES.length];
  const sample = {
    fixture: SAMPLE_FIXTURE,
    audioHash: sampleRender?.audioHash ?? null,
    expected: sampleCase.expected,
    identical: sampleRender?.audioHash === sampleCase.expected,
    relinked: log.includes('sample: relinked from Samples'),
    error: sampleRender?.error,
  };
  // the editor shows the last state set
  const lastBlocks = JSON.parse(readFileSync(SAMPLE_FIXTURE, 'utf8')).patch.blocks.length;
  const editor = {
    sharedFolder: extensionSharedFolder,
    usageStatsShared: extensionLines(log).includes('usage stats: app group, off'),
    view: !!result.view,
    ready: ready.at(-1) ?? null,
    expectedBlocks: lastBlocks,
    screenshot: shot,
    smallScreenshot: existsSync(small) ? small : null,
  };
  const ok =
    app.ok &&
    !result.error &&
    wrapper === 'AUv3' &&
    renders.length === FIXTURES.length &&
    renders.every((render) => render.identical && render.stateRoundTrips) &&
    sample.identical &&
    result.fxName === 'BlokDust FX' &&
    fxRenders.length === FX_FIXTURES.length &&
    fxRenders.every((fxRender) => fxRender.identical && fxRender.stateRoundTrips) &&
    sample.relinked &&
    editor.sharedFolder &&
    editor.usageStatsShared &&
    editor.view &&
    editor.ready === lastBlocks;
  console.log(
    JSON.stringify({
      ok,
      simulator: sim.name,
      component: COMPONENT,
      name: result.name,
      wrapper,
      params: result.params?.length ?? 0,
      error: result.error,
      app,
      renders,
      sample,
      fx: { name: result.fxName ?? null, renders: fxRenders },
      editor,
    }),
  );
  if (!ok) process.exit(1);
}
