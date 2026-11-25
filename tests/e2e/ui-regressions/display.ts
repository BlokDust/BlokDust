// ui-regressions: the window moving between displays.
import { writeFileSync } from 'node:fs';
import type { Page } from 'playwright';
import { OUT, blk, browser, comp, url, type RegressionTest } from './harness.ts';

const demo = comp([
  blk(1, 'ToneSource', 0, 0),
  blk(2, 'ParticleEmitter', -4, 0),
  blk(3, 'Power', -4, 3),
]);

/** Every layer drawn for the window as it is now: canvas backing stores are the window in device
 * pixels, and the stage and v1's UI share one unit. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const dpr = devicePixelRatio,
      width = innerWidth,
      height = innerHeight,
      v1App = window.__bd_probe.v1App;
    const canvases = [...document.querySelectorAll('#stage canvas')].map((element) => {
      const canvas = element as HTMLCanvasElement;
      return [canvas.width, canvas.height];
    });
    // Metrics: MAX_ASPECT 2, desktop division 850
    const unit = (Math.min(width, height * 2) / 850) * dpr;
    return {
      dpr,
      w: width,
      h: height,
      canvases,
      v1: { unit: v1App.Unit, width: v1App.Width, height: v1App.Height },
      unit,
      fits:
        canvases.every(
          ([cw, ch]) => Math.abs(cw - width * dpr) <= 1 && Math.abs(ch - height * dpr) <= 1,
        ) &&
        Math.abs(v1App.Width - width * dpr) <= 1 &&
        Math.abs(v1App.Unit - unit) < 1e-6,
    };
  });

/** Opens the app on a Retina laptop, then moves the window to a 1× monitor: a tab opened on the
 * laptop drew blocks, panels and START at mismatched sizes on a large monitor. */
const moved = async (
  errors: string[],
  to: { width: number; height: number },
  name: string,
  tabReturn = false,
) => {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 528 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}/index.html?v1=${demo}`);
  await page.waitForFunction(() => window.__bd_probe);
  const before = await layout(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    ...to,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.waitForFunction(() => devicePixelRatio === 1);
  // Headless emulation fires no resize or resolution query for a ratio-only change (a real move
  // fires the query); coming back to the tab must be enough on its own.
  if (tabReturn) await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(500);
  const after = await layout(page);
  // Through the same CDP session: Playwright's own screenshot drops the override.
  writeFileSync(
    `${OUT}/${name}.png`,
    Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
  );
  await context.close();
  return [before.fits && after.fits, { before, after }] as [boolean, unknown];
};
export const displayTests: Record<string, RegressionTest> = {
  'display-change-larger-monitor': (errors) =>
    moved(errors, { width: 1920, height: 1080 }, 'display-change-larger-monitor'),
  // Same window size, only the pixel ratio changes: measured again on coming back to the tab.
  'display-change-tab-return': (errors) =>
    moved(errors, { width: 1000, height: 528 }, 'display-change-tab-return', true),
};
