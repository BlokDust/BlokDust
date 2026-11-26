// Smoke test of the web build (pnpm test:web, after `pnpm -C web build`): the block library in
// headless Chromium renders blocks (non-background pixels) with no page or console error.
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './serve.ts';

const { url, server } = await serveDist();
const results: Record<string, unknown> = {};
const browser = await chromium.launch();
let failed = false;
try {
  for (const theme of [0, 3]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`${url}/library.html?theme=${theme}`);
    await page.waitForFunction(() => document.querySelector('canvas') !== null);
    await page.waitForTimeout(500);
    mkdirSync('tests/visual/output', { recursive: true });
    const png = `tests/visual/output/web-library.theme${theme}.png`;
    await page.screenshot({ path: png });
    // Count pixels that differ from the theme background in the screenshot (blocks + labels).
    const { PNG } = await import('pngjs');
    const img = PNG.sync.read(readFileSync(png));
    const bg = [img.data[0], img.data[1], img.data[2]];
    let fg = 0;
    for (let i = 0; i < img.data.length; i += 4)
      if (
        Math.abs(img.data[i] - bg[0]) +
          Math.abs(img.data[i + 1] - bg[1]) +
          Math.abs(img.data[i + 2] - bg[2]) >
        30
      )
        fg++;
    const ratio = fg / (img.width * img.height);
    const ok = errors.length === 0 && ratio > 0.01;
    failed ||= !ok;
    results[`theme${theme}`] = { ok, foregroundRatio: +ratio.toFixed(4), errors, png };
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify(results));
if (failed) process.exit(1);
