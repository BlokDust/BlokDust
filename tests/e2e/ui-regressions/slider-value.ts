// ui-regressions: a slider's value while dragged stays readable over its own bar (CHG-0049).
import { PNG } from 'pngjs';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';
import { OUT, blk, browser, open, type RegressionTest } from './harness.ts';

const rgb = (colour: string) => (colour.match(/\d+/g) ?? []).slice(0, 3).map(Number);

export const sliderValueTests: Record<string, RegressionTest> = {
  /** CHG-0049: Tone's Note below the middle, its value over its bar: IKKO and Pencil Control
   * (unreadable in v1) take the panel's colour there; Fjord keeps v1's text colour. */
  async 'slider-value-readable-on-bar'(errors: string[]) {
    const cases = [
      { theme: 11, expect: 'panel' }, // IKKO: text and bar both rgb(55,53,53)
      { theme: 1, expect: 'panel' }, // Pencil Control: contrast 1.2
      { theme: 2, expect: 'text' }, // Fjord: contrast 7.5, v1 unchanged
    ] as const;
    const seen: Record<string, unknown> = {};
    let ok = true;
    for (const { theme, expect } of cases) {
      const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
      await page.evaluate((themeNo) => {
        window.__bd_probe.v1App.ThemeManager.LoadTheme(themeNo);
      }, theme);
      await page.waitForTimeout(1200);
      await page.mouse.click(640, 402); // open Tone's options (v1 ui fixture slider-note)
      await page.waitForTimeout(1000);
      await page.mouse.move(780, 407);
      await page.mouse.down();
      await page.mouse.move(640, 407, { steps: 4 }); // below the middle: bar right of the handle
      await page.waitForTimeout(400);
      const clip = { x: 660, y: 378, width: 112, height: 60 }; // inside the bar, right of the grab
      const png = PNG.sync.read(await page.screenshot({ clip }));
      await page.screenshot({ path: `${OUT}/slider-value-theme${theme}.png` });
      await page.close();
      const { colors, roles } = THEMES[theme];
      const want = rgb(expect === 'panel' ? colors[2] : colors[roles.txt]),
        bar = rgb(colors[roles.options[0]]);
      let glyph = 0,
        barPixels = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        const px = [png.data[i], png.data[i + 1], png.data[i + 2]];
        if (px.every((channel, k) => Math.abs(channel - want[k]) <= 12)) glyph++;
        if (px.every((channel, k) => Math.abs(channel - bar[k]) <= 12)) barPixels++;
      }
      // The bar fills the clip; the value's strokes are a few hundred pixels of `want` in it.
      const pass = barPixels > 3000 && glyph > 150 && glyph < barPixels;
      seen[THEMES[theme].name] = { expect, glyph, barPixels, pass };
      ok &&= pass;
    }
    return [ok, seen];
  },
};
