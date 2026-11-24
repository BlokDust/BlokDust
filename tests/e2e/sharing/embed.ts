// The embed plays in a page on another origin, run by tests/e2e/sharing.ts.
import { type SharingTests, base, mocks, check, VIEW, OUT } from './harness.ts';

export const embedTests: SharingTests = {
  /** Acceptance: the embed plays in a test page (iframe on another origin, one tap). */
  async embed(browser) {
    const id = (globalThis as any).__sharedId as string | undefined;
    if (!id) {
      check('embed: needs share-and-load first', false);
      return;
    }
    const oe = await (
      await fetch(`${base}/oembed?url=${encodeURIComponent(`${base}/?c=${id}`)}`)
    ).json();
    // A third-party page (another origin) pasting the oEmbed HTML. Not a data: URL: an opaque-origin parent can't
    // delegate autoplay to the iframe, which no real embedding site is.
    const hostUrl = `${mocks!.url}/host.html?html=${encodeURIComponent(oe.html)}`;
    const ctx = await browser.newContext(VIEW);
    const page = await ctx.newPage();
    await page.goto(hostUrl);
    const frameEl = await page.waitForSelector('iframe');
    const frame = (await frameEl.contentFrame())!;
    await frame.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 30000 });
    await page.screenshot({ path: `${OUT}/embed-before-tap.png` });
    check(
      'embed: no editing chrome (no v1 UI drawn)',
      await frame.evaluate(() => !(window as any).__bd_probe.scene.Ctx),
    );
    check(
      'embed: has an "open in BlokDust" link to the share page',
      (await frame.getAttribute('#open-in-blokdust', 'href'))?.includes(`c=${id}`) ?? false,
    );
    await frame.click('#start');
    await frame.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await page.waitForTimeout(2500);
    const rms = await frame.evaluate(() => (window as any).__bd_probe.state.rms);
    await page.screenshot({ path: `${OUT}/embed-playing.png` });
    check('embed plays sound after one tap (AudioWorklet output not silent)', rms > 1e-3, rms);
    check(
      'embed never autosaves',
      await frame.evaluate(() => localStorage.getItem('blokdust2.autosave') === null),
    );
    const response = await fetch(`${base}/embed/A000000000`);
    check('embed of an unknown id → 404', response.status === 404);
    await ctx.close();
  },
};
