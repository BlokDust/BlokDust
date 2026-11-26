// ui-regressions: Settings and other panels laid out on small and odd-shaped screens.
import { OUT, blk, browser, comp, open, type RegressionTest, url } from './harness.ts';
import { openPatches, patchesAt, patchesClick } from './patchesPanel.ts';
import type { DrawTo, PatchesPanelInternals, SettingsFooter, SettingsOpenTab } from './v1Views.ts';

export const settingsLayoutTests: Record<string, RegressionTest> = {
  /** Settings' pages slid over the tabs when switching: every text of DOWNLOAD and SIGN IN is
   * drawn clipped, as SETTINGS and ABOUT are in v1's clipping box. */
  async 'settings-pages-clipped'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const proto = CanvasRenderingContext2D.prototype,
        stack: boolean[] = [],
        clipped = new WeakMap<object, boolean>(),
        original = (name: keyof CanvasRenderingContext2D) =>
          Object.getOwnPropertyDescriptor(proto, name)?.value as unknown;
      const save = original('save') as typeof proto.save,
        restore = original('restore') as typeof proto.restore,
        clip = original('clip') as (this: CanvasRenderingContext2D, ...args: unknown[]) => void,
        fill = original('fillText') as typeof proto.fillText;
      proto.save = function () {
        stack.push(!!clipped.get(this));
        save.call(this);
      };
      proto.restore = function () {
        clipped.set(this, stack.pop() ?? false);
        restore.call(this);
      };
      proto.clip = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        clipped.set(this, true);
        clip.apply(this, args);
      };
      const unclipped: string[] = (window.__unclipped = []);
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        if (!clipped.get(this)) unclipped.push(text);
        fill.call(this, text, ...rest);
      };
    });
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(900);
    const tabAt = (i: number) =>
      page.evaluate((i) => {
        const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[i],
          pr = window.__bd_probe.v1App.Metrics.PixelRatio;
        return [menuCategory.Position.x / pr, 30];
      }, i);
    // DOWNLOAD in, out to SETTINGS, then SIGN IN in and out to ABOUT: every frame of each slide.
    for (const i of [3, 0, 4, 2]) {
      const tab = await tabAt(i);
      await page.mouse.click(tab[0], tab[1]);
      await page.waitForTimeout(900);
    }
    const unclipped = await page.evaluate(() => [...new Set(window.__unclipped ?? [])]);
    await page.close();
    const pageWords = [
      'MACOS',
      'WINDOWS',
      'IPAD',
      'Coming soon.',
      'SIGN IN WITH GOOGLE',
      'CREATE ACCOUNT',
    ];
    const leaked = unclipped.filter(
      (text) => pageWords.includes(text) || text.startsWith('Download the standalone'),
    );
    return [leaked.length === 0, { leaked }];
  },
  /** Settings on a phone: tabs left of the ×, rows nearly the screen's width and taller, ABOUT's
   * people and DOWNLOAD's buttons one a row, and fields don't zoom for good (maximum-scale=1). */
  async 'settings-phone-layout'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.OpenPanel();
    });
    await page.waitForTimeout(1300);
    const result = await page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel,
        v1App = window.__bd_probe.v1App,
        width = v1App.Width,
        unit = v1App.Unit;
      const last = settingsPanel.MenuItems[settingsPanel.MenuItems.length - 1],
        tabsRight = last.Position.x + (last.Size as { width: number }).width / 2,
        crossLeft = width * 0.5 + v1App.SettingsMenuWidth(width) / 2 + 12.5 * unit;
      return {
        W: width,
        tabsRight,
        crossLeft,
        range: settingsPanel.Range,
        oldRange: (width / 7) * 5 - (v1App.SettingsMenuWidth(width) - settingsPanel.Range),
        row: v1App.SettingsRow,
        viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '',
      };
    });
    const tapTab = async (i: number) => {
      const at = await page.evaluate((k) => {
        const settingsPanel = window.__bd_probe.scene.SettingsPanel;
        return [
          settingsPanel.MenuItems[k].Position.x / devicePixelRatio,
          (settingsPanel.OffsetY + 30 * window.__bd_probe.v1App.Unit) / devicePixelRatio,
        ];
      }, i);
      await page.touchscreen.tap(at[0], at[1]);
      await page.waitForTimeout(1400);
    };
    await tapTab(2);
    const people = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).peoplePhone(),
    );
    await tapTab(3);
    const downloads = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).downloadButtons(),
    );
    await context.close();
    const ok =
      result.tabsRight <= result.crossLeft &&
      result.range > result.oldRange &&
      result.row > 48 &&
      result.viewport.includes('maximum-scale=1') &&
      people?.length === 3 &&
      people[1].icon[1] > people[0].icon[1] &&
      people[0].icon[0] === people[1].icon[0] &&
      people[0].text[0] > people[0].icon[0] &&
      downloads.length === 3 &&
      downloads[1].y > downloads[0].y &&
      downloads[0].x === downloads[1].x;
    return [ok, { r: result, people, downloads }];
  },
  // CHG-0035: DOWNLOAD and ACCOUNT are as wide as ABOUT, whose websites sit level on the line the
  // Twitter names had (they sat at different heights under blurbs of different lengths).
  async 'settings-pages-as-wide-as-about'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: { t: string; x: number; y: number }[] = (window.__texts3 = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, x: number, y: number, ...rest: [number?]) {
        seen.push({ t: text, x, y });
        drawText.call(this, text, x, y, ...rest);
      };
    });
    const panel = await page.evaluate(() => {
      const sp = window.__bd_probe.scene.SettingsPanel,
        v1App = window.__bd_probe.v1App,
        pr = v1App.Metrics.PixelRatio;
      sp.OpenPanel();
      (sp as unknown as SettingsOpenTab)._OpenTab = 2;
      sp.MenuItems.forEach((MenuItem, i) => {
        MenuItem.Selected = i === 2 ? 1 : 0;
        MenuItem.YOffset = i === 2 ? 0 : -(sp.DrawTo as DrawTo).Height;
      });
      const buttons = (sp as unknown as SettingsFooter).downloadButtons(),
        half = 65 * v1App.Unit; // unused: kept for the log
      return {
        width: v1App.Width / pr,
        column: ((v1App.Width / 7) * 4) / pr,
        buttons: buttons.map((x) => x.x),
        half,
      };
    });
    await page.waitForTimeout(1500);
    const about = await page.evaluate(() => {
      const seen = window.__texts3 ?? [];
      const sites = ['whitevinyldesign.com', 'funputs.com', 'edsilv.com'].map(
        (site) => seen.filter((entry) => entry.t === site).at(-1)?.y ?? null,
      );
      return { sites, twitter: seen.some((entry) => entry.t.startsWith('@')) };
    });
    await page.screenshot({ path: `${OUT}/settings-about-websites.png` });
    // DOWNLOAD's three buttons span the column: centres at 1/6, 1/2 and 5/6 of it, less the gaps.
    const left = (panel.width - panel.column) / 2,
      spread = panel.buttons[2] - panel.buttons[0];
    await page.close();
    const first = about.sites[0];
    const level = about.sites.every(
      (y) => y !== null && first !== null && Math.abs(y - first) < 0.5,
    );
    return [
      level &&
        !about.twitter &&
        spread > panel.column * 0.6 &&
        panel.buttons[0] < left + panel.column * 0.2,
      { about, s: panel, left, spread },
    ];
  },
  /** FEEDBACK fits a laptop (SEND was below the screen), GarageBand's plugin view and a phone. */
  async 'feedback-fits'(errors: string[]) {
    const out: Record<string, unknown> = {};
    let ok = true;
    for (const [name, width, height, choice] of [
      ['laptop', 1000, 528, 'Suggestion'],
      ['garageband', 1000, 290, 'Suggestion'],
      ['tall', 1280, 800, 'Suggestion'],
      ['phone', 390, 844, 'Suggestion'],
      ['laptop-bug', 1000, 528, 'Bug'],
    ] as const) {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${url}/index.html`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        const settingsPanel = window.__bd_probe.scene.SettingsPanel;
        (settingsPanel as unknown as SettingsOpenTab)._OpenTab = 1;
        settingsPanel.MenuItems.forEach((menuItem, k) => {
          menuItem.Selected = k === 1 ? 1 : 0;
          menuItem.YOffset = k === 1 ? 0 : -(settingsPanel.DrawTo as DrawTo).Height;
        });
        settingsPanel.OpenPanel();
      });
      await page.waitForTimeout(1200);
      if (choice !== 'Suggestion') {
        await page.getByRole('radio', { name: choice }).click();
        await page.waitForTimeout(300);
      }
      const result = await page.evaluate(() => {
        const box = (id: string) => {
          const element = document.getElementById(id);
          if (!element) throw new Error(`no #${id}`);
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, height: rect.height };
        };
        return {
          send: box('feedback-send'),
          email: box('feedback-email'),
          message: box('feedback-message'),
          choice: box('feedback-choice-suggestion'),
          h: innerHeight,
        };
      });
      await page.screenshot({ path: `${OUT}/feedback-fits-${name}.png` });
      await context.close();
      const fits =
        result.send.bottom <= result.h &&
        result.send.height > 10 &&
        result.email.height < 40 &&
        result.message.height >= 30 &&
        result.choice.top > 0;
      out[name] = {
        fits,
        send: Math.round(result.send.bottom),
        h: result.h,
        email: Math.round(result.email.height),
        message: Math.round(result.message.height),
      };
      ok &&= fits;
    }
    return [ok, out];
  },
  /** CHG-0023, CHG-0024: the GitHub link and build line show on About only; ADD TO GALLERY's icons
   * sit clear of its underline, MAKE VIDEO beside it; the video's BACK is at the top left. */
  async 'review2-panels'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.evaluate(() => {
      const seen: { t: string; x: number }[] = (window.__texts2 = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, x: number, ...rest: [number, number?]) {
        seen.push({ t: text, x });
        drawText.call(this, text, x, ...rest);
      };
    });
    const texts = () =>
      page.evaluate(() => {
        const seen = window.__texts2 ?? [];
        const drawn = seen.map((entry) => entry.t);
        seen.length = 0;
        return drawn;
      });
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(900);
    await texts();
    await page.mouse.move(600, 400);
    await page.waitForTimeout(400);
    const onSettings = await texts();
    const about = await page.evaluate(() => {
      const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [menuCategory.Position.x / pr, 30];
    });
    await page.mouse.click(about[0], about[1]);
    await page.waitForTimeout(1200);
    await texts();
    await page.mouse.move(600, 420);
    await page.waitForTimeout(400);
    const onAbout = await texts();
    const footer = (drawn: string[]) => ({
      github: drawn.includes('View the code on GitHub'),
      build: drawn.some((x) => x.startsWith('Current Build')),
    });
    await page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.ClosePanel();
    });
    await page.waitForTimeout(800);
    // v1 OptionSwitch puts the icons at 35% of the row and the underline at 55%: 7 units clear.
    await openPatches(page);
    // ADD TO GALLERY and MAKE VIDEO side by side, MAKE VIDEO in the right half.
    const sw = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel as unknown as PatchesPanelInternals,
        v1App = window.__bd_probe.v1App,
        unit = v1App.Unit,
        gallery = pp.gallerySwitch(),
        video = pp.videoSwitch();
      return {
        gap: (gallery.h * 0.55 - (gallery.h * 0.35 + 5 * unit)) / unit,
        sameRow: gallery.y === video.y,
        videoRight: video.x >= v1App.Width / 2,
      };
    });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/review3-switches.png` });
    // BACK on the video view (the patch has a block): the step after SAVE with MAKE VIDEO on.
    await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      pp.View = 'video';
      pp.VideoState = 'idle';
    });
    await page.waitForTimeout(300);
    await texts();
    await page.mouse.move(600, 700);
    await page.waitForTimeout(400);
    const drawn = await page.evaluate(() =>
      (window.__texts2 ?? []).filter((entry) => entry.t === 'BACK').map((entry) => entry.x),
    );
    const [, randomiseY] = await patchesAt(page, 'randomise');
    const back = await page.evaluate((nameY) => {
      const pp = window.__bd_probe.scene.PatchesPanel as unknown as PatchesPanelInternals,
        arrow = pp.backArrow(),
        pr = window.__bd_probe.v1App.Metrics.PixelRatio,
        unit = window.__bd_probe.v1App.Unit;
      return {
        x: arrow.x,
        y: arrow.y,
        mid: window.__bd_probe.v1App.Width / 2,
        right: window.__bd_probe.v1App.Width / 2 + 210 * unit,
        name: nameY * pr,
        u: unit,
      };
    }, randomiseY);
    await page.screenshot({ path: `${OUT}/review2-video-back.png` });
    await patchesClick(page, 'videoBack', 600);
    const left = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View);
    await page.close();
    const ok =
      !footer(onSettings).github &&
      !footer(onSettings).build &&
      footer(onAbout).github &&
      footer(onAbout).build &&
      sw.gap >= 6 &&
      sw.sameRow &&
      sw.videoRight &&
      back.x < back.mid - 150 * back.u && // the video's BACK at the top left
      drawn.length > 0 &&
      drawn.every((x) => Math.abs(x - back.x) < 0.5) &&
      left === 'list';
    return [
      ok,
      { onSettings: footer(onSettings), onAbout: footer(onAbout), sw, back, drawn, left },
    ];
  },
};
