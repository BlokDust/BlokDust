// pnpm test:worklet (after `pnpm bd wasm build && pnpm -C web build`): every golden fixture through
// the real AudioWorklet + WASM (128-frame quanta) has the native engine's audio hash, bit for bit.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './serve.ts';

const { url, server } = await serveDist();
const browser = await chromium.launch();
const results: { name: string; ok: boolean; browser?: string; native: string; error?: string }[] =
  [];
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}/golden.html`);
  await page.waitForFunction(() => document.title.includes('(ready)'));
  for (const file of readdirSync('tests/golden')
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const fixture: unknown = JSON.parse(readFileSync(join('tests/golden', file), 'utf8'));
    const expected = JSON.parse(readFileSync(join('tests/golden/expected', file), 'utf8')) as {
      audioHash: string;
    };
    const native = expected.audioHash;
    try {
      const rendered = await page.evaluate((fx) => {
        if (!window.renderGolden) throw new Error('golden.html has no renderGolden');
        return window.renderGolden(fx);
      }, fixture);
      results.push({
        name: basename(file, '.json'),
        ok: rendered.audioHash === native,
        browser: rendered.audioHash,
        native,
      });
    } catch (error) {
      results.push({ name: basename(file, '.json'), ok: false, native, error: String(error) });
    }
  }
  if (errors.length)
    results.push({ name: 'page', ok: false, native: '', error: errors.join('; ') });
} finally {
  await browser.close();
  server.close();
}
for (const result of results.filter((each) => !each.ok))
  console.error(`MISMATCH ${JSON.stringify(result)}`);
console.log(
  JSON.stringify({
    fixtures: results.length,
    identical: results.filter((result) => result.ok).length,
  }),
);
if (results.some((result) => !result.ok)) process.exit(1);
