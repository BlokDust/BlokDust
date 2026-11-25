// One check per bug found in review, each failing first on the build that had it: real app, real
// pointer, real AudioWorklet. Usage: pnpm test:ui-regressions [--only name,name]
import { writeFileSync } from 'node:fs';
import {
  OUT,
  blk,
  browser,
  comp,
  server,
  toCss,
  url,
  type RegressionTest,
} from './ui-regressions/harness.ts';
import { ORDER } from './ui-regressions/order.ts';
import { openPlugin, plugPatch } from './ui-regressions/pluginPage.ts';
import { waveformTests } from './ui-regressions/waveform.ts';
import { tourTests } from './ui-regressions/tour.ts';
import { displayTests } from './ui-regressions/display.ts';
import { decayWav } from './ui-regressions/wav.ts';
import { stageViewTests } from './ui-regressions/stage-view.ts';
import { stageEditingTests } from './ui-regressions/stage-editing.ts';
import { undoTests } from './ui-regressions/undo.ts';
import { iosTests } from './ui-regressions/ios.ts';
import { touchTests } from './ui-regressions/touch.ts';
import { playingTests } from './ui-regressions/playing.ts';
import { powerTests } from './ui-regressions/power.ts';
import { samplersTests } from './ui-regressions/samplers.ts';
import { soundSourcesTests } from './ui-regressions/sound-sources.ts';
import { recorderTests } from './ui-regressions/recorder.ts';
import { midiTests } from './ui-regressions/midi.ts';
import { optionsTests } from './ui-regressions/options.ts';
import { dustTests } from './ui-regressions/dust.ts';
import { menusTests } from './ui-regressions/menus.ts';
import { supportTests } from './ui-regressions/support.ts';
import { settingsTests } from './ui-regressions/settings.ts';
import { settingsLayoutTests } from './ui-regressions/settings-layout.ts';
import { patchesOpenTests } from './ui-regressions/patches-open.ts';
import { patchesSaveTests } from './ui-regressions/patches-save.ts';
import { patchesLayoutTests } from './ui-regressions/patches-layout.ts';
import { patchLoadingTests } from './ui-regressions/patch-loading.ts';
import { shareTests } from './ui-regressions/share.ts';
import { startTests } from './ui-regressions/start.ts';
import { pluginPatchesTests } from './ui-regressions/plugin-patches.ts';
import { pluginStageTests } from './ui-regressions/plugin-stage.ts';
import { pluginKeysTests } from './ui-regressions/plugin-keys.ts';
import { pluginSamplesTests } from './ui-regressions/plugin-samples.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const results: Record<string, unknown> = {};
let ok = true;

const byName: Record<string, RegressionTest> = {
  ...stageViewTests,
  ...stageEditingTests,
  ...undoTests,
  ...iosTests,
  ...touchTests,
  ...playingTests,
  ...powerTests,
  ...samplersTests,
  ...soundSourcesTests,
  ...recorderTests,
  ...midiTests,
  ...optionsTests,
  ...dustTests,
  ...menusTests,
  ...supportTests,
  ...settingsTests,
  ...settingsLayoutTests,
  ...patchesOpenTests,
  ...patchesSaveTests,
  ...patchesLayoutTests,
  ...patchLoadingTests,
  ...shareTests,
  ...startTests,
  ...pluginPatchesTests,
  ...pluginStageTests,
  ...pluginKeysTests,
  ...pluginSamplesTests,
};
const unordered = Object.keys(byName).filter((name) => !ORDER.includes(name));
if (unordered.length) throw new Error(`not in ui-regressions/order.ts: ${unordered.join(', ')}`);
const tests: Record<string, RegressionTest> = {};
for (const name of ORDER) tests[name] = byName[name];

// The waveform zoom's tests (CHG-0028), in their own file.
Object.assign(
  tests,
  waveformTests({ browser, url, OUT, comp, blk, toCss, decayWav, openPlugin, plugPatch }),
);
Object.assign(tests, tourTests);
Object.assign(tests, displayTests);
/** Bugs captured but not fixed yet: reported as KNOWN with the reason, not failing CI. */
const KNOWN: Record<string, string> = {};

try {
  for (const [name, run] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    const errors: string[] = [];
    let pass = false,
      detail: unknown;
    try {
      [pass, detail] = await run(errors);
    } catch (error) {
      detail = String(error);
    }
    if (errors.length) {
      pass = false;
      detail = { detail, pageErrors: errors };
    }
    const known = KNOWN[name];
    results[name] = pass
      ? known
        ? 'PASS (known failure now passes: remove it from KNOWN)'
        : true
      : known
        ? `KNOWN ${known}`
        : `FAIL ${JSON.stringify(detail)}`;
    ok &&= pass || !!known;
    console.error(`${pass ? 'pass' : known ? 'KNOWN' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  }
} finally {
  await browser.close();
  server.close();
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (!ok) process.exit(1);
