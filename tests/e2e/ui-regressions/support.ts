// ui-regressions: Settings › Support: connecting to support.
import { OUT, browser, open, type RegressionTest } from './harness.ts';
import type { SupportDrawing } from '../pageGlobals.ts';

export const supportTests: Record<string, RegressionTest> = {
  /** CHG-0036: Connect holds the form in v1's canvas controls and type: an intro, matching inputs,
   * square switch cells and a vertically centred attachment row. */
  async 'support-connect-spacing'(errors: string[]) {
    const page = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    const point = await page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel;
      return [settingsPanel.MenuItems[1].Position.x / devicePixelRatio, 30];
    });
    await page.mouse.click(point[0], point[1]);
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const proto = CanvasRenderingContext2D.prototype,
        descriptor = (name: keyof CanvasRenderingContext2D) =>
          Object.getOwnPropertyDescriptor(proto, name)?.value as unknown,
        original = {
          fillText: descriptor('fillText') as typeof proto.fillText,
          fillRect: descriptor('fillRect') as typeof proto.fillRect,
          moveTo: descriptor('moveTo') as typeof proto.moveTo,
          lineTo: descriptor('lineTo') as typeof proto.lineTo,
        };
      let drawing: SupportDrawing | null = null,
        from = [0, 0],
        rule = 0,
        intro = 0,
        message = 0;
      proto.fillText = function (text: string, x: number, y: number, ...rest: [number?]) {
        if (text.startsWith('Tell us')) intro = y; // SUGGESTION's line (CHG-0041)
        if (text === 'YOUR MESSAGE') message = y;
        if (text.endsWith('PATCH AND DIAGNOSTICS')) drawing = { rule, intro, message };
        else if (drawing && text === '') {
          window.__supportDrawing = drawing;
          drawing = null;
        }
        original.fillText.call(this, text, x, y, ...rest);
      };
      proto.moveTo = function (x, y) {
        from = [x, y];
        if (drawing?.bar) drawing.glyphBottom = Math.max(drawing.glyphBottom ?? 0, y);
        original.moveTo.call(this, x, y);
      };
      proto.lineTo = function (x, y) {
        const email = document.getElementById('feedback-email')?.getBoundingClientRect(),
          send = document.getElementById('feedback-send')?.getBoundingClientRect(),
          pr = devicePixelRatio;
        if (
          email &&
          send &&
          from[1] === y &&
          Math.abs(Math.abs(x - from[0]) - email.width * pr) < 1 &&
          y > email.bottom * pr &&
          y < send.top * pr
        )
          rule = y;
        if (drawing && !drawing.separator && x === from[0])
          drawing.separator = { top: from[1], height: y - from[1] };
        if (drawing?.bar) drawing.glyphBottom = Math.max(drawing.glyphBottom ?? 0, y);
        from = [x, y];
        original.lineTo.call(this, x, y);
      };
      proto.fillRect = function (x, y, width, height) {
        if (drawing && !drawing.bar) drawing.bar = { x, y, w: width, h: height };
        original.fillRect.call(this, x, y, width, height);
      };
    });
    await page.mouse.move(10, 120);
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const element = (id: string) => {
        const found = document.getElementById(id);
        if (!found) throw new Error(`no #${id}`);
        return found;
      };
      const email = element('feedback-email'),
        msg = element('feedback-message'),
        send = element('feedback-send');
      const drawn = window.__supportDrawing,
        bar = drawn?.bar,
        separator = drawn?.separator,
        unit = window.__bd_probe.v1App.Unit;
      return {
        d: drawn,
        sameType: getComputedStyle(email).font === getComputedStyle(msg).font,
        compactEmail: email.getBoundingClientRect().height < msg.getBoundingClientRect().height / 2,
        square: !!bar && !!separator && Math.abs(bar.w / separator.height - 1) < 0.05,
        gap: drawn && bar ? (bar.y - (drawn.glyphBottom ?? NaN)) / unit : 0,
        centred:
          !!drawn &&
          !!bar &&
          !!separator &&
          Math.abs(
            (separator.top + bar.y + bar.h) / 2 -
              (drawn.rule + send.getBoundingClientRect().top * devicePixelRatio) / 2,
          ) <=
            2 * unit,
        intro: !!drawn && drawn.intro > 0 && drawn.intro < drawn.message,
        label: element('feedback-include').getAttribute('aria-label'),
      };
    });
    await page.screenshot({ path: `${OUT}/support-connect-spacing.png` });
    await page.close();
    return [
      result.sameType &&
        result.compactEmail &&
        result.square &&
        result.gap >= 6 &&
        result.centred &&
        result.intro &&
        result.label === 'Share patch and diagnostics',
      result,
    ];
  },
  async 'support-connect'(errors: string[]) {
    const page = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    const point = await page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel,
        menuCategory = settingsPanel.MenuItems[1];
      return [
        menuCategory.Position.x / devicePixelRatio,
        (settingsPanel.OffsetY + 30 * window.__bd_probe.v1App.Unit) / devicePixelRatio,
      ];
    });
    await page.mouse.click(point[0], point[1]);
    await page.waitForTimeout(1200);
    const visible = await page.locator('#feedback-message').isVisible();
    const copy = await page.locator('#feedback-panel').textContent();
    const style = await page.locator('#feedback-message').evaluate((el) => ({
      border: getComputedStyle(el).borderTopWidth,
      font: getComputedStyle(el).fontFamily,
    }));
    const toggle = page.getByRole('switch', { name: 'Share patch and diagnostics' });
    const on = await toggle.getAttribute('aria-checked');
    await toggle.click();
    const off = await toggle.getAttribute('aria-checked');
    const tabs = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.MenuItems.map((MenuItem) => MenuItem.Name),
    );
    await page.close();
    return [
      visible &&
        !copy?.includes('technical diagnostics') &&
        on === 'true' &&
        off === 'false' &&
        style.border === '0px' &&
        style.font.includes('Dosis') &&
        tabs[1] === 'FEEDBACK',
      { visible, style, on, off, tabs },
    ];
  },
};
