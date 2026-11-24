// ui-regressions: Settings › Support: connecting to support.
import { OUT, browser, open, type RegressionTest } from './harness.ts';

export const supportTests: Record<string, RegressionTest> = {
  /** CHG-0036 owner review: Connect holds the form; existing canvas controls and typography supply its chrome. */
  /** CHG-0036 review: intro, matching input type, square switch cells and a vertically centred attachment row. */
  async 'support-connect-spacing'(errors: string[]) {
    const p = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    const point = await p.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
      return [settingsPanel.MenuItems[1].Position.x / devicePixelRatio, 30];
    });
    await p.mouse.click(point[0], point[1]);
    await p.waitForTimeout(1000);
    await p.evaluate(() => {
      const proto = CanvasRenderingContext2D.prototype,
        original = {
          fillText: proto.fillText,
          fillRect: proto.fillRect,
          moveTo: proto.moveTo,
          lineTo: proto.lineTo,
        };
      let drawing: any = null,
        from = [0, 0],
        rule = 0,
        intro = 0,
        message = 0;
      proto.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
        if (text.startsWith('Tell us')) intro = y; // SUGGESTION's line (CHG-0041)
        if (text === 'YOUR MESSAGE') message = y;
        if (text.endsWith('PATCH AND DIAGNOSTICS')) drawing = { rule, intro, message };
        else if (drawing && text === '') {
          (window as any).__supportDrawing = drawing;
          drawing = null;
        }
        return (original.fillText as any).call(this, text, x, y, ...rest);
      };
      proto.moveTo = function (x, y) {
        from = [x, y];
        if (drawing?.bar) drawing.glyphBottom = Math.max(drawing.glyphBottom ?? 0, y);
        original.moveTo.call(this, x, y);
      };
      proto.lineTo = function (x, y) {
        const email = document.getElementById('feedback-email')!.getBoundingClientRect(),
          send = document.getElementById('feedback-send')!.getBoundingClientRect(),
          pr = devicePixelRatio;
        if (
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
      proto.fillRect = function (x, y, w, h) {
        if (drawing && !drawing.bar) drawing.bar = { x, y, w, h };
        original.fillRect.call(this, x, y, w, h);
      };
    });
    await p.mouse.move(10, 120);
    await p.waitForTimeout(200);
    const result = await p.evaluate(() => {
      const email = document.getElementById('feedback-email')!,
        msg = document.getElementById('feedback-message')!,
        send = document.getElementById('feedback-send')!;
      const d = (window as any).__supportDrawing,
        unit = (window as any).__bd_probe.v1App.Unit;
      return {
        d,
        sameType: getComputedStyle(email).font === getComputedStyle(msg).font,
        compactEmail: email.getBoundingClientRect().height < msg.getBoundingClientRect().height / 2,
        square: !!d && Math.abs(d.bar.w / d.separator.height - 1) < 0.05,
        gap: d ? (d.bar.y - d.glyphBottom) / unit : 0,
        centred:
          !!d &&
          Math.abs(
            (d.separator.top + d.bar.y + d.bar.h) / 2 -
              (d.rule + send.getBoundingClientRect().top * devicePixelRatio) / 2,
          ) <=
            2 * unit,
        intro: !!d && d.intro > 0 && d.intro < d.message,
        label: document.getElementById('feedback-include')!.getAttribute('aria-label'),
      };
    });
    await p.screenshot({ path: `${OUT}/support-connect-spacing.png` });
    await p.close();
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
    const p = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    const point = await p.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
        t = settingsPanel.MenuItems[1];
      return [
        t.Position.x / devicePixelRatio,
        (settingsPanel.OffsetY + 30 * (window as any).__bd_probe.v1App.Unit) / devicePixelRatio,
      ];
    });
    await p.mouse.click(point[0], point[1]);
    await p.waitForTimeout(1200);
    const visible = await p.locator('#feedback-message').isVisible();
    const copy = await p.locator('#feedback-panel').textContent();
    const style = await p.locator('#feedback-message').evaluate((el) => ({
      border: getComputedStyle(el).borderTopWidth,
      font: getComputedStyle(el).fontFamily,
    }));
    const toggle = p.getByRole('switch', { name: 'Share patch and diagnostics' });
    const on = await toggle.getAttribute('aria-checked');
    await toggle.click();
    const off = await toggle.getAttribute('aria-checked');
    const tabs = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.MenuItems.map(
        (MenuItem: any) => MenuItem.Name,
      ),
    );
    await p.close();
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
