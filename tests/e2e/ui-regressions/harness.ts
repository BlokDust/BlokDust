// ui-regressions' shared harness: the served build, one browser, and the app opened with blocks.
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';
import type {} from '../pageGlobals.ts';
import { serveDist } from '../serve.ts';
import { decayWav } from './wav.ts';

export const OUT = 'tests/visual/output/ui-regressions';
mkdirSync(OUT, { recursive: true });
export const { url, server } = await serveDist();
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** One check: `errors` collects the page's errors; it returns whether it passed and what it saw. */
export type RegressionTest = (errors: string[]) => Promise<[boolean, unknown]>;

export interface Block {
  Id: number;
  Type: string;
  Position: { x: number; y: number };
}
export const comp = (blocks: Block[]) =>
  encodeURIComponent(
    JSON.stringify({
      Composition: blocks,
      ZoomLevel: 1,
      DragOffset: { x: 0, y: 0 },
      ColorThemeNo: 0,
    }),
  );
export const blk = (Id: number, Type: string, x: number, y: number): Block => ({
  Id,
  Type,
  Position: { x, y },
});
export const state = (page: Page) => page.evaluate(() => window.__bd_probe.state);
export const toCss = (page: Page, x: number, y: number) =>
  page.evaluate(([gx, gy]) => window.__bd_probe.toCss(gx, gy), [x, y]);
/** The first theme's text colour, as getComputedStyle writes it. */
export const txt = (() => {
  const theme = THEMES[0],
    match = theme.colors[theme.roles.txt].match(/\d+/g);
  if (!match) throw new Error('theme text colour is not rgb');
  return `rgb(${match[0]}, ${match[1]}, ${match[2]})`;
})();
/** Freesound's CDN answered locally: a decaying `seconds` sine, after `delayMs`. Requests are
 * recorded (url + Range header) so tests can check what was downloaded. */
export const cdn = {
  seconds: 3,
  delayMs: 0,
  requests: [] as { url: string; range: string | undefined }[],
};
export async function open(b: Browser, blocks: Block[], errors: string[]): Promise<Page> {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://cdn.freesound.org/**', async (route) => {
    cdn.requests.push({ url: route.request().url(), range: route.request().headers().range });
    if (cdn.delayMs) await new Promise((res) => setTimeout(res, cdn.delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: decayWav(cdn.seconds),
    });
  });
  await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
  await page.waitForFunction(() => window.__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200); // header/CreateNew tweens settle
  return page;
}
export const maxOver = async (page: Page, key: 'rms' | 'particles', ms: number) => {
  let peak = 0;
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    peak = Math.max(peak, (await state(page))[key]);
    await page.waitForTimeout(50);
  }
  return peak;
};
/** Largest per-channel change between two screenshots of a css-px rect, taken `gapMs` apart. */
export async function maxChange(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  gapMs: number,
) {
  const { PNG } = await import('pngjs');
  const a = PNG.sync.read(await page.screenshot({ clip }));
  await page.waitForTimeout(gapMs);
  const b = PNG.sync.read(await page.screenshot({ clip }));
  let largest = 0;
  for (let i = 0; i < a.data.length; i += 4)
    for (let k = 0; k < 3; k++) largest = Math.max(largest, Math.abs(a.data[i + k] - b.data[i + k]));
  return largest;
}
