// The full browser audio path is bit-identical to the native engine: render every golden fixture through the real
// AudioWorklet + WASM (OfflineAudioContext, 128-frame quanta) in headless Chromium and compare audio hashes.
// Usage: pnpm test:worklet   (expects `pnpm bd wasm build && pnpm -C web build`)
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
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}/golden.html`);
  await page.waitForFunction(() => document.title.includes('(ready)'));
  for (const f of readdirSync('tests/golden')
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    const fixture = JSON.parse(readFileSync(join('tests/golden', f), 'utf8'));
    const native = JSON.parse(readFileSync(join('tests/golden/expected', f), 'utf8')).audioHash;
    try {
      const r = await page.evaluate((fx) => (window as any).renderGolden(fx), fixture);
      results.push({
        name: basename(f, '.json'),
        ok: r.audioHash === native,
        browser: r.audioHash,
        native,
      });
    } catch (e) {
      results.push({ name: basename(f, '.json'), ok: false, native, error: String(e) });
    }
  }
  if (errors.length)
    results.push({ name: 'page', ok: false, native: '', error: errors.join('; ') });
} finally {
  await browser.close();
  server.close();
}
for (const r of results.filter((r) => !r.ok)) console.error(`MISMATCH ${JSON.stringify(r)}`);
console.log(
  JSON.stringify({
    fixtures: results.length,
    identical: results.filter((result) => result.ok).length,
  }),
);
if (results.some((result) => !result.ok)) process.exit(1);
