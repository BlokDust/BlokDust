// The window moving between displays: ui-regressions' tests for it, one file per area.
import { writeFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright';

export interface DisplayHarness {
  browser: Browser;
  url: string;
  OUT: string;
  demo: string;
}

/** Every layer of the stage and v1's UI drawn for the window as it is now: the canvases' backing stores are the window
 * in device pixels, and the stage and v1's UI share one unit. */
const layout = (p: Page) =>
  p.evaluate(() => {
    const dpr = devicePixelRatio,
      w = innerWidth,
      h = innerHeight,
      A = (window as any).__bd_probe.v1App;
    const canvases = [...document.querySelectorAll('#stage canvas')].map((element) => {
      const canvas = element as HTMLCanvasElement;
      return [canvas.width, canvas.height];
    });
    const unit = (Math.min(w, h * 2) / 850) * dpr; // Metrics: MAX_ASPECT 2, desktop division 850
    return {
      dpr,
      w,
      h,
      canvases,
      v1: { unit: A.Unit, width: A.Width, height: A.Height },
      unit,
      fits:
        canvases.every(([cw, ch]) => Math.abs(cw - w * dpr) <= 1 && Math.abs(ch - h * dpr) <= 1) &&
        Math.abs(A.Width - w * dpr) <= 1 &&
        Math.abs(A.Unit - unit) < 1e-6,
    };
  });

export function displayTests({
  browser,
  url,
  OUT,
  demo,
}: DisplayHarness): Record<string, (errors: string[]) => Promise<[boolean, unknown]>> {
  /** Opens the app on a Retina laptop, then moves the window to a 1× monitor (owner, 2026-11-23: a tab opened on the
   * laptop drew blocks, panels and START at mismatched sizes once a large monitor was plugged in). */
  const moved = async (
    errors: string[],
    to: { width: number; height: number },
    name: string,
    tabReturn = false,
  ) => {
    const ctx = await browser.newContext({
      viewport: { width: 1000, height: 528 },
      deviceScaleFactor: 2,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${demo}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    const before = await layout(p);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      ...to,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await p.waitForFunction(() => devicePixelRatio === 1);
    // Headless emulation fires neither resize nor the resolution media query for a ratio-only change (a real display
    // move does fire the media query); coming back to the tab is the owner's path and must be enough on its own.
    if (tabReturn) await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await p.waitForTimeout(500);
    const after = await layout(p);
    // Through the same CDP session: Playwright's own screenshot drops the override.
    writeFileSync(
      `${OUT}/${name}.png`,
      Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
    );
    await ctx.close();
    return [before.fits && after.fits, { before, after }] as [boolean, unknown];
  };
  return {
    'display-change-larger-monitor': (errors) =>
      moved(errors, { width: 1920, height: 1080 }, 'display-change-larger-monitor'),
    // Same window size, only the pixel ratio changes: no resize to react to, measured again on coming back to the tab.
    'display-change-tab-return': (errors) =>
      moved(errors, { width: 1000, height: 528 }, 'display-change-tab-return', true),
  };
}
