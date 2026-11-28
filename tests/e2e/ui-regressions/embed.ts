// ui-regressions: the embed player (/embed/<id>, SPEC-SHARING-BACKEND R11).
import { readFileSync } from 'node:fs';
import { OUT, browser, maxChange, type RegressionTest, url } from './harness.ts';
import type { Patch } from '../../../web/src/patch/loadPatch.ts';
import { encodePatch } from '../../../web/src/patch/share.ts';

export const embedTests: Record<string, RegressionTest> = {
  /** Sentry BLOKDUST-WEB-2: an embed's first frame threw in v1's OptionsPanel and stopped Pixi's
   * ticker, freezing the stage after PLAY. Particles and lasers keep moving. */
  async 'embed-keeps-animating'(errors) {
    const golden = JSON.parse(
      readFileSync(new URL('../../golden/laser-strike.json', import.meta.url), 'utf8'),
    ) as { patch: Patch };
    const token = await encodePatch(golden.patch);
    const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
    page.on('pageerror', (error) => errors.push(error.message));
    // The Worker serves the app at /embed/<id> with this meta tag (embedIdFromPage).
    await page.route(`${url}/index.html`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<head>',
        `<head><meta name="blokdust-embed" content="${token}">`,
      );
      await route.fulfill({ response, body: html });
    });
    await page.goto(`${url}/index.html`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.started);
    await page.waitForTimeout(1500);
    const change = await maxChange(page, { x: 0, y: 0, width: 800, height: 450 }, 400);
    await page.screenshot({ path: `${OUT}/embed-keeps-animating.png` });
    await page.close();
    return [change > 0, { change }];
  },
};
