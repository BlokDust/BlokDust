// ui-regressions: Settings › ABOUT links to the BlokDust 2 guide (CHG-0047).
import type { Page } from 'playwright';
import { OUT, browser, open, type RegressionTest } from './harness.ts';
import type { SettingsFooter } from './v1Views.ts';

const GUIDE_URL = 'https://blokdust.funputs.com/guide/',
  GUIDE_LINE = 'Visit the BlokDust 2 guide for information, tutorials & more.';

/** Record every text drawn (with its y in CSS px) and every window opened. */
const record = (page: Page) =>
  page.evaluate(() => {
    const seen: { t: string; x: number; y: number }[] = (window.__texts3 = []);
    const proto = CanvasRenderingContext2D.prototype,
      drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')?.value as typeof proto.fillText;
    proto.fillText = function (text: string, x: number, y: number, ...rest: [number?]) {
      const pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      seen.push({ t: text, x: x / pr, y: y / pr });
      drawText.call(this, text, x, y, ...rest);
    };
    const opened: string[] = (window.__opened = []);
    window.open = (target?: string | URL) => {
      opened.push(String(target));
      return null;
    };
  });

/** Settings open on ABOUT, tweens settled. */
async function openAbout(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__bd_probe.scene.SettingsPanel.OpenPanel();
  });
  await page.waitForTimeout(1200);
  const about = await page.evaluate(() => {
    const panel = window.__bd_probe.scene.SettingsPanel,
      pr = window.__bd_probe.v1App.Metrics.PixelRatio;
    return [
      panel.MenuItems[2].Position.x / pr,
      (panel.OffsetY + 30 * window.__bd_probe.v1App.Unit) / pr,
    ];
  });
  await page.mouse.move(about[0], about[1]);
  await page.mouse.click(about[0], about[1]);
  await page.waitForTimeout(1200);
}

const guideButton = (page: Page) =>
  page.evaluate(() =>
    (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).guideButton(),
  );

export const aboutGuideTests: Record<string, RegressionTest> = {
  /** CHG-0047, SPEC-SHARING-BLOKDUST-GLOSSARY R5: v1's guide button between the people and the
   * footer at laptop, GarageBand and phone sizes; hover points at it, a press opens the guide. */
  async 'about-guide-link'(errors: string[]) {
    const sizes = [
      { width: 1000, height: 528 },
      { width: 1000, height: 290 },
      { width: 390, height: 844 },
    ];
    const results: Record<string, unknown>[] = [];
    let ok = true;
    for (const size of sizes) {
      const page = await open(browser, [], errors);
      await page.setViewportSize(size);
      await page.waitForTimeout(800);
      await record(page);
      await openAbout(page);
      const button = await guideButton(page);
      const footer = await page.evaluate(() =>
        (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).footerLinks(),
      );
      const texts = await page.evaluate(() => window.__texts3 ?? []);
      // The lowest of the people's lines (their websites), drawn on this frame.
      const website = Math.max(
        ...texts.filter((text) => text.t === 'funputs.com').map((text) => text.y),
      );
      const line = texts.findLast((text) => text.t === GUIDE_LINE),
        label = texts.findLast((text) => text.t === 'BLOKDUST 2 GUIDE');
      let hoverChanges = false,
        opened: string[] = [];
      if (button) {
        const below = {
          x: Math.round(button.x + button.w / 2 - 15),
          y: Math.round(button.y + button.h),
          width: 30,
          height: 10,
        };
        await page.mouse.move(button.x + button.w / 2, button.y - 40);
        await page.waitForTimeout(300);
        const idle = await page.screenshot({ clip: below });
        await page.mouse.move(button.x + button.w / 2, button.y + button.h / 2);
        await page.waitForTimeout(300);
        const hover = await page.screenshot({ clip: below });
        hoverChanges = !idle.equals(hover);
        await page.screenshot({ path: `${OUT}/about-guide-${size.width}x${size.height}.png` });
        await page.mouse.click(button.x + button.w / 2, button.y + button.h / 2);
        await page.waitForTimeout(300);
        opened = await page.evaluate(() => window.__opened ?? []);
      }
      await page.close();
      const footerTop = (footer[0]?.y ?? 0) - 10;
      const pass =
        !!button &&
        !!line &&
        !!label &&
        button.url === GUIDE_URL &&
        // under the people, above the footer, and never off the page's sides
        line.y > website + 10 &&
        button.y + button.h < footerTop &&
        button.x >= 0 &&
        button.x + button.w <= size.width &&
        hoverChanges &&
        JSON.stringify(opened) === JSON.stringify([GUIDE_URL]);
      ok &&= pass;
      results.push({
        size: `${size.width}x${size.height}`,
        pass,
        button,
        lineY: line?.y,
        website,
        footerTop,
        hoverChanges,
        opened,
      });
    }
    return [ok, results];
  },
};
