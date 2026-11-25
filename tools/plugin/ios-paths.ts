// Where the iPadOS builds, test fixtures and the App Group's files are (CHG-0025).
export const ART = 'build/plugin-ios-sim/plugin/BlokDust_artefacts/Release';

export const APP = `${ART}/Standalone/BlokDust.app`;

export const APPEX = `${APP}/PlugIns/BlokDust.appex`;

export const HOST_APP = 'build/plugin-ios-sim/ioshost/BlokDustIOSHost.app';

export const HOST_ID = 'com.funputs.tests.blokdust-ioshost';

export const COMPONENT = 'aumu,Bdst,Bldt';

export const FX_COMPONENT = 'aufx,Bdfx,Bldt'; // BlokDust FX, the app's second extension (task 9)

// its test sine goes in through the effect's input
export const FX_FIXTURES = ['tests/golden/fx-audio-in.json'];

export const FX_APPEX = `${APP}/PlugIns/BlokDust FX.appex`;

// as `bd plugin test`
export const FIXTURES = ['tests/golden/emitter-tone.json', 'tests/golden/toggle-pulse.json'];

// Task 6: a patch from another machine (its sample's path does not exist here) whose file is in the shared Samples
// folder: the extension relinks it by name and must render like the native engine with the same WAV.
export const SAMPLE_FIXTURE = 'tests/golden/samples/sample-file.json';

export const SMALL_VIEW = [480, 320]; // an AUM-sized plugin window (task 8): screenshot only, for review

export const APP_GROUP = 'group.com.funputs.blokdust'; // plugin/CMakeLists.txt BLOKDUST_APP_GROUP

// Usage stats (SPEC-SHARING-USAGE-ANALYTICS R8): one switch and one install id per iPad, in the App
// Group. The test turns the switch off there; the app and the extension must both read it.
export const STATS_FILE = 'usage-stats.settings';

// …and a page coming back into focus asks once for a change made elsewhere (owner, iPad: switched
// off in GarageBand, the app, still running, said on).
export const STATS_ASKED = /values: usageStats=1/;

/** The instrument extension's own log lines: the app's process has the same name (BlokDust), so pick it by its pid. */
export const extensionLines = (log: string) => {
  const pids = new Set(
    [...log.matchAll(/BlokDust\[(\d+):[^\]]*\].*instrument: processor created \(AUv3/g)].map(
      (match) => match[1],
    ),
  );
  return log
    .split('\n')
    .filter((line) => [...pids].some((pid) => line.includes(`BlokDust[${pid}:`)))
    .join('\n');
};

export const statsFile = (on: boolean) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n\n<PROPERTIES>\n  <VALUE name="usageStats" val="${on ? 1 : 0}"/>\n</PROPERTIES>\n`;

// the app's first launch (PluginProcessor.cpp)
export const FIRST_PATCH = 'web/src/patch/presets/04-rotating-sequencer.blokdust';

export const sleep = (ms: number) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
