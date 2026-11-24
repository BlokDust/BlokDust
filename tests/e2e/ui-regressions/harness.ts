// ui-regressions' shared harness: the served build, one browser, and opening the app with blocks on the stage.
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';
import { serveDist } from '../serve.ts';
import { decayWav } from './wav.ts';

export const OUT = 'tests/visual/output/ui-regressions';
mkdirSync(OUT, { recursive: true });
export const { url, server } = await serveDist();
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** One regression check: `errors` collects the page's errors; it returns whether it passed and what it saw. */
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
export const state = (p: Page) => p.evaluate(() => (window as any).__bd_probe.state);
export const toCss = (p: Page, x: number, y: number) =>
  p.evaluate(([gx, gy]) => (window as any).__bd_probe.toCss(gx, gy), [x, y]) as Promise<
    [number, number]
  >;
export const txt = (() => {
  const theme = THEMES[0],
    m = theme.colors[theme.roles.txt].match(/\d+/g)!;
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
})();
/** Freesound's CDN (default sounds, previews) answered locally: a decaying `seconds` sine, after `delayMs`. Requests
 * are recorded (url + Range header) so tests can check what was downloaded. */
export const cdn = {
  seconds: 3,
  delayMs: 0,
  requests: [] as { url: string; range: string | undefined }[],
};
export async function open(b: Browser, blocks: Block[], errors: string[]): Promise<Page> {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://cdn.freesound.org/**', async (r) => {
    cdn.requests.push({ url: r.request().url(), range: r.request().headers().range });
    if (cdn.delayMs) await new Promise((res) => setTimeout(res, cdn.delayMs));
    await r.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: decayWav(cdn.seconds),
    });
  });
  await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200); // header/CreateNew tweens settle
  return page;
}
export const maxOver = async (p: Page, key: 'rms' | 'particles', ms: number) => {
  let m = 0;
  for (let t = 0; t < ms; t += 50) {
    m = Math.max(m, (await state(p))[key]);
    await p.waitForTimeout(50);
  }
  return m;
};
/** Largest per-channel change between two screenshots of a css-px rect, taken `gapMs` apart. */
export async function maxChange(
  p: Page,
  clip: { x: number; y: number; width: number; height: number },
  gapMs: number,
) {
  const { PNG } = await import('pngjs');
  const a = PNG.sync.read(await p.screenshot({ clip }));
  await p.waitForTimeout(gapMs);
  const b = PNG.sync.read(await p.screenshot({ clip }));
  let m = 0;
  for (let i = 0; i < a.data.length; i += 4)
    for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(a.data[i + k] - b.data[i + k]));
  return m;
}
