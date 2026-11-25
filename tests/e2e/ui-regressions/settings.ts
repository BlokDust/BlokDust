// ui-regressions: Settings: tempo, the tour, themes, Release 1 pages and downloads.
import { OUT, blk, browser, comp, open, state, type RegressionTest, url } from './harness.ts';
import type { SettingsFooter, SettingsOpenTab } from './v1Views.ts';

export const settingsTests: Record<string, RegressionTest> = {
  /** v1's Tour row is the patch Tempo (web), set once for every synced block, and the panel stays
   * open; the tour (CHG-0035) has its own row under it. */
  async 'settings-tempo-and-tour'(errors: string[]) {
    const page = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(1200);
    const names = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.Options.filter((row) => row.Type !== 'hidden').map(
        (option) => option.Name,
      ),
    );
    const tempo = () => page.evaluate(() => window.__bd_probe.scene.host.tempo());
    const before = await tempo();
    await page.mouse.move(700, 452);
    await page.mouse.down();
    await page.mouse.move(800, 452, { steps: 5 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/settings-tempo-and-tour.png` });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const after = await tempo(),
      saved = (await state(page)).patch.tempo;
    const still = await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open);
    // CHG-0035: the tour has a row of its own under Tempo; LAUNCH TOUR closes Settings and asks.
    const btn = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).tourButton(),
    );
    if (!btn) throw new Error('no LAUNCH TOUR row');
    await page.mouse.move(btn.x, btn.y);
    await page.mouse.click(btn.x, btn.y);
    await page.waitForTimeout(1200);
    const tour = await page.evaluate(() => ({
      settings: window.__bd_probe.scene.SettingsPanel.Open,
      asked: window.__bd_probe.scene.Tutorial.SplashOpen,
    }));
    await page.close();
    const ok =
      JSON.stringify(names) ===
        JSON.stringify(['Color Theme', 'Master Volume', 'DB Meter', 'Tempo', 'Tour']) &&
      still &&
      before === 120 &&
      after > 120 &&
      after <= 240 &&
      Number.isInteger(after) &&
      saved === after &&
      !tour.settings &&
      tour.asked;
    return [ok, { names, settingsStillOpen: still, before, after, saved, tour }];
  },
  /** The colour theme is the user's, kept in this browser across reloads and other patches (it went
   * back to the first one on every reload). */
  async 'theme-remembered'(errors: string[]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const boot = async (query = '') => {
      await page.goto(`${url}/index.html${query}`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForTimeout(1200);
    };
    const no = () => page.evaluate(() => window.__bd_probe.v1App.ThemeManager.CurrentThemeNo);
    await boot();
    const first = await no();
    await page.evaluate(() => {
      window.__bd_probe.v1App.ThemeManager.LoadTheme(3);
    });
    await page.waitForTimeout(300);
    await boot();
    const reloaded = await no();
    await boot(`?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    const another = await no();
    await context.close();
    return [first === 0 && reloaded === 3 && another === 3, { first, reloaded, another }];
  },
  // CHG-0035: a first visit gets a random theme matching the system's light or dark setting, and
  // keeps it; a kept theme wins.
  async 'first-theme-follows-system'(errors: string[]) {
    const DARK = new Set([0, 3, 6, 10]);
    const visit = async (scheme: 'dark' | 'light') => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const boot = async () => {
        await page.goto(`${url}/index.html?demo&firsttheme=1`);
        await page.waitForFunction(() => window.__bd_probe);
        await page.waitForTimeout(300);
      };
      await boot();
      const first = await page.evaluate(() => ({
        now: window.__bd_probe.v1App.ThemeManager.CurrentThemeNo,
        kept: localStorage.getItem('blokdust.theme'),
      }));
      await boot();
      const again = await page.evaluate(() => window.__bd_probe.v1App.ThemeManager.CurrentThemeNo);
      await context.close();
      return { ...first, again };
    };
    const picks: { scheme: string; now: number; kept: string | null; again: number }[] = [];
    for (let i = 0; i < 4; i++)
      for (const scheme of ['dark', 'light'] as const)
        picks.push({ scheme, ...(await visit(scheme)) });
    const pass = picks.every(
      (pick) =>
        DARK.has(pick.now) === (pick.scheme === 'dark') &&
        pick.kept === String(pick.now) &&
        pick.again === pick.now,
    );
    return [pass, picks];
  },
  /** Release 1 Settings: no Connect tab or "Chrome Recommended"; About has the owner's text; the
   * footer links GitHub (hover underline, new window); builds ship NOTICE.txt and LICENSE.txt. */
  async 'settings-release1'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      const opened: string[] = (window.__opened = []);
      window.open = (target?: string | URL) => {
        opened.push(String(target));
        return null;
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
    await page.waitForTimeout(1200);
    const sp = () =>
      page.evaluate(() => {
        const settingsPanel = window.__bd_probe.scene.SettingsPanel;
        return {
          names: settingsPanel.MenuItems.map((MenuItem) => MenuItem.Name),
          tab: (settingsPanel as unknown as SettingsOpenTab)._OpenTab,
        };
      });
    const tabs = await sp();
    const about = await page.evaluate(() => {
      const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [menuCategory.Position.x / pr, 30];
    });
    await page.mouse.move(about[0], about[1]);
    await page.mouse.click(about[0], about[1]);
    await page.waitForTimeout(1200);
    const aboutTab = (await sp()).tab;
    const links = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).footerLinks(),
    );
    const link = [links[0].x, links[0].y];
    await page.mouse.move(link[0] - 300, link[1]);
    await page.waitForTimeout(300);
    const clip = { x: link[0] - 90, y: link[1] - 15, width: 180, height: 30 };
    const idle = await page.screenshot({ clip });
    await page.mouse.move(link[0], link[1]);
    await page.waitForTimeout(300);
    const hover = await page.screenshot({ clip });
    await page.screenshot({ path: `${OUT}/settings-about.png` });
    for (const footerLink of links) {
      await page.mouse.move(footerLink.x, footerLink.y);
      await page.mouse.click(footerLink.x, footerLink.y);
      await page.waitForTimeout(300);
    }
    // Every build carries the licences (task 11): v1's MIT notice, and the AGPL.
    const notice = await (await fetch(`${url}/NOTICE.txt`)).text(),
      licence = await (await fetch(`${url}/LICENSE.txt`)).text();
    const shipped =
      notice.includes('BlokDust v1') &&
      notice.includes('MIT License') &&
      licence.includes('GNU AFFERO GENERAL PUBLIC LICENSE');
    // v1 still draws the Connect page, clipped away above the panel; its tab can't open.
    const result = await page.evaluate(() => {
      const texts = window.__texts ?? [],
        settingsPanel = window.__bd_probe.scene.SettingsPanel;
      return {
        chrome: texts.includes('Chrome Recommended'),
        connect: texts.includes('FEEDBACK'),
        connectAway:
          settingsPanel.MenuItems[1].YOffset ===
          -(settingsPanel.DrawTo as { Height: number }).Height,
        about: texts.some((x) => x.includes('This rebuild was released in 2026')),
        toneJs: texts.some((x) => x.includes('Tone.js')),
        source: texts.includes('View the code on GitHub'),
        opened: window.__opened ?? [],
      };
    });
    await page.close();
    // SIGN IN: CHG-0023.
    const ok =
      JSON.stringify(tabs.names) ===
        JSON.stringify(['SETTINGS', 'FEEDBACK', 'ABOUT', 'DOWNLOAD', 'SIGN IN']) &&
      aboutTab === 2 &&
      !result.chrome &&
      result.connect &&
      result.connectAway &&
      result.about &&
      !result.toneJs &&
      result.source &&
      !idle.equals(hover) &&
      shipped &&
      // SPEC-SHARING-USAGE-ANALYTICS R12: no Privacy link until production serves the page.
      JSON.stringify(links.map((link) => link.label)) ===
        JSON.stringify(['View the code on GitHub']) &&
      JSON.stringify(result.opened) === JSON.stringify(['https://github.com/BlokDust/BlokDust']);
    return [
      ok,
      { tabs, aboutTab, ...result, links, shipped, hoverUnderlines: !idle.equals(hover) },
    ];
  },
  /** CHG-0005, CHG-0010: Settings › DOWNLOAD says "Coming soon." with its buttons off before a
   * release, and once published opens the installers (?source=download-page) in one row. */
  async 'settings-download'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
      const opened: string[] = (window.__opened = []);
      window.open = (target?: string | URL) => {
        opened.push(String(target));
        return null;
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
    await page.waitForTimeout(1200);
    const names = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.MenuItems.map((MenuItem) => MenuItem.Name),
    );
    const tab = await page.evaluate(() => {
      const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[3],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [menuCategory.Position.x / pr, 30];
    });
    await page.mouse.move(tab[0], tab[1]);
    await page.mouse.click(tab[0], tab[1]);
    await page.waitForTimeout(1200);
    const openTab = await page.evaluate(
      () => (window.__bd_probe.scene.SettingsPanel as unknown as SettingsOpenTab)._OpenTab,
    );
    const texts = () =>
      page.evaluate(() => {
        const texts = window.__texts ?? [];
        const unique = [...new Set(texts)];
        texts.length = 0;
        return unique;
      });
    // Before any release (releases.json has 2.0.0 now, so it is set back to none here).
    await page.evaluate(() => {
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).setRelease({
        version: null,
        macos: null,
        windows: null,
      });
    });
    await texts();
    await page.mouse.move(640, 650);
    await page.waitForTimeout(300);
    const before = await texts();
    let buttons = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).downloadButtons(),
    );
    await page.mouse.click(buttons[0].x, buttons[0].y);
    await page.waitForTimeout(200);
    const openedBefore = await page.evaluate(() => (window.__opened ?? []).length);
    await page.screenshot({ path: `${OUT}/settings-download-soon.png` });
    // As published (the shape `bd release publish` writes).
    await page.evaluate(() => {
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).setRelease({
        version: '2.0.0',
        macos: {
          file: 'BlokDust-2.0.0-Mac.pkg',
          url: 'https://downloads.funputs.com/releases/blokdust/2.0.0/BlokDust-2.0.0-Mac.pkg',
          sha256: 'x',
          bytes: 1,
        },
        windows: {
          file: 'BlokDust-2.0.0-Windows.zip',
          url: 'https://downloads.funputs.com/releases/blokdust/2.0.0/BlokDust-2.0.0-Windows.zip',
          sha256: 'x',
          bytes: 1,
        },
      });
    });
    buttons = await page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as unknown as SettingsFooter).downloadButtons(),
    );
    await page.mouse.move(buttons[0].x, buttons[0].y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/settings-download.png` });
    const after = await texts();
    for (const b of buttons) {
      await page.mouse.move(b.x, b.y);
      await page.mouse.click(b.x, b.y);
      await page.waitForTimeout(200);
    }
    const opened = await page.evaluate(() => window.__opened ?? []);
    await page.close();
    const ok =
      JSON.stringify(names) ===
        JSON.stringify(['SETTINGS', 'FEEDBACK', 'ABOUT', 'DOWNLOAD', 'SIGN IN']) &&
      openTab === 3 && // SIGN IN: CHG-0023; CONNECT: CHG-0036
      before.includes('Coming soon.') &&
      openedBefore === 0 &&
      before.includes(
        'Download the standalone app or VST3/AU plugins to use in your DAW, or get the iPad app with its AUv3 plugin.',
      ) &&
      before.includes('BlokDust can be used as both an instrument and an effect.') &&
      buttons.length === 3 &&
      after.includes('MACOS') &&
      after.includes('WINDOWS') &&
      after.includes('IPAD') &&
      after.includes('Version 2.0.0') &&
      // One row, as v1 Connect's share buttons; no unsigned-Windows note (it is in the README).
      new Set(buttons.map((b) => b.y)).size === 1 &&
      !after.some((text) => /More info|isn't signed/.test(text)) &&
      JSON.stringify(opened) ===
        JSON.stringify(buttons.filter((b) => b.url).map((b) => `${b.url}?source=download-page`));
    return [ok, { names, openTab, before, after, opened }];
  },
};
