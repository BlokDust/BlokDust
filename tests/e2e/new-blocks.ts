// pnpm test:new-blocks [--only name,name]: the post-2.0 blocks (SCOPE-0005, CHG-0014 … CHG-0021)
// in the real app; each test opens a `?c=p…` link, so the blocks also load from a shared patch.
import { writeFileSync } from 'node:fs';
import { OUT, browser, server, type Tests } from './new-blocks/harness.ts';
import { blockPanelTests } from './new-blocks/blockPanels.ts';
import { touchpadTests } from './new-blocks/touchpad.ts';
import { lfoTests } from './new-blocks/lfo.ts';
import { noteTests } from './new-blocks/notes.ts';
import { powerBlockTests } from './new-blocks/powerBlocks.ts';
import { wavetableTests } from './new-blocks/wavetable.ts';
import { powerGateTests } from './new-blocks/powerGates.ts';
import { stageTests } from './new-blocks/stage.ts';
import { stagePlayTests } from './new-blocks/stage-play.ts';
import { labelsTests } from './new-blocks/labels.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const results: Record<string, unknown> = {};
let ok = true;

const tests: Tests = {
  ...blockPanelTests,
  ...touchpadTests,
  ...lfoTests,
  ...noteTests,
  ...powerBlockTests,
  ...wavetableTests,
  ...powerGateTests,
  ...stageTests,
  ...stagePlayTests,
  ...labelsTests,
};

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
    results[name] = pass ? true : `FAIL ${JSON.stringify(detail)}`;
    ok &&= pass;
    console.error(`${pass ? 'pass' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  }
} finally {
  await browser.close();
  server.close();
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (!ok) process.exit(1);
