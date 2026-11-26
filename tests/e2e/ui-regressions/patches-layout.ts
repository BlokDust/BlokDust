// ui-regressions: The Patches panel's layout on phones and narrow screens.
import { OUT, blk, browser, open, type RegressionTest, url } from './harness.ts';
import { keepPresets, openList, openPatches, patchesClick } from './patchesPanel.ts';
import type { PatchesPanelInternals } from './v1Views.ts';

export const patchesLayoutTests: Record<string, RegressionTest> = {
  /** Phone: Patches lists run from the tabs to the screen's foot in one scrolling list, no file
   * button; the video view has BACK at the left, no name, and the link under it. */
  async 'patches-phone-layout'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      (patchesPanel as unknown as PatchesPanelInternals).host.listPatches = () =>
        Promise.resolve(
          Array.from({ length: 30 }, (_, i) => ({
            name: `Patch ${i}`,
            detail: 'Saved 16 Nov 2026',
            removable: true,
          })) as Awaited<ReturnType<PatchesPanelInternals['host']['listPatches']>>,
        );
      const texts: string[] = (window.__texts = []),
        proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        texts.push(text);
        drawText.call(this, text, ...rest);
      };
      patchesPanel.OpenPanel(1);
    });
    await page.waitForTimeout(1200);
    const texts = () =>
      page.evaluate(() => {
        const texts = window.__texts ?? [];
        const unique = [...new Set(texts)];
        texts.length = 0;
        return unique;
      });
    await texts();
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.scrollOpen(0);
    });
    await page.waitForTimeout(300);
    const drawn = await texts();
    const first = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.centreOf('open0'));
    const last = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.centreOf('open12'));
    // A drag up scrolls the list (a touch on the list, away from the buttons).
    await page.mouse.move(60, 600);
    await page.mouse.down();
    await page.mouse.move(60, 300, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const scrolled = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.OpenScroll);
    // The video view.
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      patchesPanel.selectTab(0);
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      const links = (patchesPanel as unknown as PatchesPanelInternals).host.links;
      if (!links) throw new Error('no share links here');
      links.current = () => ({
        url: 'https://example.com/?c=x',
        owned: true,
        stale: false,
      });
      patchesPanel.View = 'video';
      patchesPanel.VideoState = 'idle';
      patchesPanel.Update();
    });
    await page.waitForTimeout(500);
    const video = await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel,
        back = patchesPanel.centreOf('videoBack'),
        player = patchesPanel.centreOf('player'),
        link = patchesPanel.centreOf('url');
      return {
        back,
        player,
        link,
        title: document.getElementById('patchTitle')?.style.display,
        url: document.getElementById('patchUrl')?.style.display,
      };
    });
    await page.screenshot({ path: `${OUT}/patches-phone-video.png` });
    await context.close();
    const ok =
      !drawn.includes('OPEN FROM YOUR DEVICE') &&
      !drawn.some((text) => / of 30$|^1\/\d/.test(text)) &&
      drawn.includes('PATCH 0') &&
      drawn.includes('PATCH 12') &&
      !!first &&
      !!last &&
      last[1] > first[1] &&
      last[1] < 844 &&
      scrolled > 0 &&
      !!video.back &&
      video.back[0] < 100 &&
      video.title === 'none' &&
      video.url === 'block' &&
      !!video.link &&
      !!video.player &&
      video.link[1] > video.player[1];
    return [ok, { drawn: drawn.length, first, last, scrolled, video }];
  },
  /** While a Patches page slides, its fields (page elements, not canvas) are cut off at the tabs'
   * foot: the SAVE name field showed above the tabs. */
  async 'patches-fields-under-tabs'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.selectTab(1);
    });
    const seen: { top: number; tabs: number; shownAbove: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      seen.push(
        await page.evaluate(() => {
          const pp = window.__bd_probe.scene.PatchesPanel,
            v1App = window.__bd_probe.v1App,
            pr = v1App.Metrics.PixelRatio;
          const el = document.getElementById('patchTitle');
          if (!el) throw new Error('no #patchTitle');
          const boundingClientRect = el.getBoundingClientRect(),
            tabs = (pp.OffsetY + 60 * v1App.Unit) / pr,
            cs = getComputedStyle(el);
          const clipped =
            cs.visibility === 'hidden' ||
            cs.display === 'none' ||
            (cs.clipPath !== 'none' && cs.clipPath !== '');
          return {
            top: boundingClientRect.top,
            tabs,
            shownAbove: boundingClientRect.top < tabs - 1 && !clipped,
          };
        }),
      );
      await page.waitForTimeout(25);
    }
    await page.close();
    return [
      seen.some((frame) => frame.top < frame.tabs) && !seen.some((frame) => frame.shownAbove),
      seen.filter((frame) => frame.top < frame.tabs).slice(0, 3),
    ];
  },
  // CHG-0035: Patches' tabs slide their pages as Settings' do (old lifts out, new drops in).
  async 'patches-tabs-slide'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    const dy = () =>
      page.evaluate(() => [
        ...(window.__bd_probe.scene.PatchesPanel as unknown as PatchesPanelInternals).pageDy,
      ]);
    const before = await dy();
    await patchesClick(page, 'tab1', 150);
    const leaving = await dy();
    await page.waitForTimeout(450);
    const arriving = await dy();
    await page.waitForTimeout(900);
    const after = await dy();
    await page.close();
    return [
      before[0] === 0 &&
        leaving[0] < 0 &&
        arriving[1] > -800 &&
        arriving[1] < 0 &&
        after[1] === 0 &&
        after[0] <= -790,
      { before, leaving, arriving, after },
    ];
  },
  // CHG-0035: OPEN and GALLERY show whole rows and a half; the first row sits under the rule as
  // each row under the one above, and the last row is never cut off.
  async 'patch-lists-half-row'(errors: string[]) {
    const page = await open(browser, [], errors);
    await keepPresets(page);
    await openList(page);
    await page.waitForTimeout(800); // the OPEN page drops in (CHG-0035)
    const result = await page.evaluate(() => {
      const panel = window.__bd_probe.scene.PatchesPanel,
        pp = panel as unknown as PatchesPanelInternals,
        unit = window.__bd_probe.v1App.Unit,
        open = pp.openLayout(),
        rows = (open.bottom - open.top) / pp.rowH;
      panel.Tab = 2;
      const gallery = pp.galleryWindow(),
        galleryLayout = pp.galleryLayout(),
        grows = (gallery.bottom - gallery.top) / pp.rowH;
      panel.Tab = 1;
      const count = panel.Items.length;
      // The first title sits under the rule as each title under its divider (28 units down).
      return {
        rows,
        grows,
        firstGap: (pp.openRowY(0) + panel.OpenScroll - pp.rowGap - open.rule) / unit,
        rowGap: (28 * unit - pp.rowGap) / unit,
        galleryTop: (gallery.top - galleryLayout.rule) / unit,
        end:
          Math.max(0, count * pp.rowH + 10 * unit - (open.bottom - open.top)) - pp.openMaxScroll(),
        n: count,
      };
    });
    await page.screenshot({ path: `${OUT}/patch-lists-half-row.png` });
    await page.close();
    const half = (x: number) => Math.abs(x - Math.floor(x) - 0.5) < 1e-6;
    return [
      half(result.rows) &&
        half(result.grows) &&
        Math.abs(result.galleryTop + 2) < 1e-6 &&
        Math.abs(result.firstGap - result.rowGap) < 1e-6 &&
        result.end === 0,
      result,
    ];
  },
  // CHG-0035: MAKE VIDEO is hidden (and off) until the video export gets its own round of work.
  async 'make-video-hidden'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    const result = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel as unknown as PatchesPanelInternals;
      return { video: !!pp.host.video, on: pp.videoOn, main: pp.mainAction().label };
    });
    await page.close();
    return [!result.video && !result.on && result.main === 'Save', result];
  },
};
