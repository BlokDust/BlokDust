// ui-regressions: The Patches panel's layout on phones and narrow screens.
import { OUT, blk, browser, open, type RegressionTest, url } from './harness.ts';
import { keepPresets, openList, openPatches, patchesClick } from './patchesPanel.ts';

export const patchesLayoutTests: Record<string, RegressionTest> = {
  /** CHG-0005 task 12 (owner, 2026-11-11: a DOWNLOAD tab, not in About): Settings on the web has SETTINGS · ABOUT ·
   * DOWNLOAD. Before a release is published both buttons are off and say "Coming soon."; once published they open
   * the installers (macOS .pkg, Windows .zip) with ?source=download-page; the version shows. CHG-0010 (owner, 2026-11-12):
   * the intro's second sentence starts its own line, and the SmartScreen note is gone (it is in the zip's README.txt). */
  /** Bug (owner, 2026-11-16): DOWNLOAD and SIGN IN / ACCOUNT slid over the tabs (or showed under them) when switching
   * tabs; SETTINGS and ABOUT are drawn in v1's clipping box. Every text of those two pages must be drawn clipped. */
  /** Owner review (2026-11-16, phone): the Patches panel used the middle of a tall screen, with wide gaps above and below,
   * small row type, pages of five and an OPEN FROM YOUR DEVICE that does nothing there; the video view had the name and
   * RANDOMISE again and BACK at the right. Now: lists from the tabs to the foot of the screen, one scrolling list,
   * larger rows, no file button in a phone's browser; the video's BACK at the left, no name, the link under it. */
  async 'patches-phone-layout'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      patchesPanel.host.listPatches = async () =>
        Array.from({ length: 30 }, (_, i) => ({
          name: `Patch ${i}`,
          detail: 'Saved 16 Nov 2026',
          removable: true,
        }));
      const t: string[] = (window.__texts = []),
        drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (x: string, ...a: any[]) {
        t.push(x);
        return (drawText as any).call(this, x, ...a);
      };
      patchesPanel.OpenPanel(1);
    });
    await page.waitForTimeout(1200);
    const texts = () =>
      page.evaluate(() => {
        const t = window.__texts as string[];
        const r = [...new Set(t)];
        t.length = 0;
        return r;
      });
    await texts();
    await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.scrollOpen(0));
    await page.waitForTimeout(300);
    const drawn = await texts();
    const first = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.centreOf('open0'),
    );
    const last = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.centreOf('open12'),
    );
    // A drag up scrolls the list (a touch on the list, away from the buttons).
    await page.mouse.move(60, 600);
    await page.mouse.down();
    await page.mouse.move(60, 300, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const scrolled = await page.evaluate(
      () => window.__bd_probe.scene.PatchesPanel.OpenScroll,
    );
    // The video view.
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      patchesPanel.selectTab(0);
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const patchesPanel = window.__bd_probe.scene.PatchesPanel;
      patchesPanel.host.links.current = () => ({
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
        title: document.getElementById('patchTitle')!.style.display,
        url: document.getElementById('patchUrl')!.style.display,
      };
    });
    await page.screenshot({ path: `${OUT}/patches-phone-video.png` });
    await ctx.close();
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
      video.back[0] < 100 &&
      video.title === 'none' &&
      video.url === 'block' &&
      video.link[1] > video.player[1];
    return [ok, { drawn: drawn.length, first, last, scrolled, video }];
  },
  /** Owner (2026-11-18): sliding SAVE / SHARE out, its name field (a page element, not the canvas) showed above the
   * tabs. Every field is cut off at the tabs' foot while its page slides. */
  async 'patches-fields-under-tabs'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.selectTab(1));
    const seen: { top: number; tabs: number; shownAbove: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      seen.push(
        await page.evaluate(() => {
          const pp = window.__bd_probe.scene.PatchesPanel,
            a = window.__bd_probe.v1App,
            pr = a.Metrics.PixelRatio;
          const el = document.getElementById('patchTitle')!,
            boundingClientRect = el.getBoundingClientRect(),
            tabs = (pp.OffsetY + 60 * a.Unit) / pr,
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
      seen.some((s) => s.top < s.tabs) && !seen.some((s) => s.shownAbove),
      seen.filter((s) => s.top < s.tabs).slice(0, 3),
    ];
  },
  // Owner (2026-11-17, CHG-0035): Patches' tabs slide their pages as Settings' do (the old lifts out, the new drops in).
  async 'patches-tabs-slide'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    const dy = () =>
      page.evaluate(() => [...window.__bd_probe.scene.PatchesPanel.pageDy] as number[]);
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
  // Owner (2026-11-17, CHG-0035): OPEN and GALLERY show whole rows and a half (so more below shows); the first row is
  // as far under the rule as each row under the one above; the last row is never cut off at the end.
  async 'patch-lists-half-row'(errors: string[]) {
    const page = await open(browser, [], errors);
    await keepPresets(page);
    await openList(page);
    await page.waitForTimeout(800); // the OPEN page drops in (CHG-0035)
    const result = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel,
        unit = window.__bd_probe.v1App.Unit,
        L = pp.openLayout(),
        rows = (L.bottom - L.top) / pp.rowH;
      pp.Tab = 2;
      const G = pp.galleryWindow(),
        Lg = pp.galleryLayout(),
        grows = (G.bottom - G.top) / pp.rowH;
      pp.Tab = 1;
      const lengthValue = pp.Items.length;
      // the first title under the rule as each title under the divider above it (divider: 28 units under a row's baseline)
      return {
        rows,
        grows,
        firstGap: (pp.openRowY(0) + pp.OpenScroll - pp.rowGap - L.rule) / unit,
        rowGap: (28 * unit - pp.rowGap) / unit,
        galleryTop: (G.top - Lg.rule) / unit,
        end:
          Math.max(0, lengthValue * pp.rowH + 10 * unit - (L.bottom - L.top)) - pp.openMaxScroll(),
        n: lengthValue,
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
  // Owner (2026-11-17, CHG-0035): MAKE VIDEO is hidden (and off) until the video export gets its own round of work.
  async 'make-video-hidden'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(page);
    const result = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      return { video: !!pp.host.video, on: pp.videoOn, main: pp.mainAction().label };
    });
    await page.close();
    return [!result.video && !result.on && result.main === 'Save', result];
  },
};
