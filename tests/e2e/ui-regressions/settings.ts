// ui-regressions: Settings: tempo, the tour, themes, Release 1 pages and downloads.
import { OUT, blk, browser, comp, open, state, type RegressionTest, url } from './harness.ts';

export const settingsTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-10): v1's Tour row is the patch Tempo (web), set once for every synced block: pressing where
   * "Launch Tutorial" was sets the tempo, and the panel stays open. The tour (CHG-0035) has its own row under it. */
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
      window.__bd_probe.scene.SettingsPanel.Options.filter(
        (Option) => Option.Type !== 'hidden',
      ).map((option) => option.Name),
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
    const btn = (await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.tourButton(),
    )) as { x: number; y: number };
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
  /** Owner (2026-11-10): Settings loses its Connect tab (dated share buttons; the guide site is lost) and the "Chrome
   * Recommended" footer; About has the owner's text (no Web Audio API / Tone.js); the footer links the code on GitHub,
   * (where the licences are too; owner 2026-11-11), underlined on hover, opening in a new window; the build carries
   * NOTICE.txt (v1's MIT notice) and LICENSE.txt. */
  /** Owner review 2 (CHG-0023/0024, 2026-11-15): the GitHub link and the build line show on About only; the ADD TO
   * GALLERY switch's icons sit clear of its underline (as in an options-panel row); BACK is at the top right of the
   * page, its label centred under the chevron. */
  /** Bug (owner review 3, 2026-11-16): the colour theme went back to the first one on every reload. It is the user's
   * preference, kept in this browser, and stays when another patch opens. */
  async 'theme-remembered'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const boot = async (q = '') => {
      await page.goto(`${url}/index.html${q}`);
      await page.waitForFunction(() => window.__bd_probe);
      await page.click('#start');
      await page.waitForTimeout(1200);
    };
    const no = () => page.evaluate(() => window.__bd_probe.v1App.ThemeManager.CurrentThemeNo);
    await boot();
    const first = await no();
    await page.evaluate(() => window.__bd_probe.v1App.ThemeManager.LoadTheme(3));
    await page.waitForTimeout(300);
    await boot();
    const reloaded = await no();
    await boot(`?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    const another = await no();
    await ctx.close();
    return [first === 0 && reloaded === 3 && another === 3, { first, reloaded, another }];
  },
  // Owner (2026-11-17, CHG-0035): a first visit gets a random theme from those matching the system's light or dark
  // setting, and keeps it; a kept theme wins.
  async 'first-theme-follows-system'(errors: string[]) {
    const DARK = new Set([0, 3, 6, 10]);
    const visit = async (scheme: 'dark' | 'light') => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
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
      const again = await page.evaluate(
        () => window.__bd_probe.v1App.ThemeManager.CurrentThemeNo,
      );
      await ctx.close();
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
  async 'settings-release1'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
      window.__opened = [];
      window.open = (target?: string | URL) => {
        window.__opened.push(String(target));
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
          tab: settingsPanel._OpenTab,
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
    const links = (await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.footerLinks(),
    )) as { label: string; x: number; y: number }[];
    const link = [links[0].x, links[0].y];
    await page.mouse.move(link[0] - 300, link[1]);
    await page.waitForTimeout(300);
    const clip = { x: link[0] - 90, y: link[1] - 15, width: 180, height: 30 };
    const idle = await page.screenshot({ clip });
    await page.mouse.move(link[0], link[1]);
    await page.waitForTimeout(300);
    const hover = await page.screenshot({ clip });
    await page.screenshot({ path: `${OUT}/settings-about.png` });
    for (const l of links) {
      await page.mouse.move(l.x, l.y);
      await page.mouse.click(l.x, l.y);
      await page.waitForTimeout(300);
    }
    // Every build carries the licences (task 11): v1's MIT notice, and the AGPL.
    const notice = await (await fetch(`${url}/NOTICE.txt`)).text(),
      licence = await (await fetch(`${url}/LICENSE.txt`)).text();
    const shipped =
      notice.includes('BlokDust v1') &&
      notice.includes('MIT License') &&
      licence.includes('GNU AFFERO GENERAL PUBLIC LICENSE');
    // (v1 still draws the Connect page, clipped away above the panel: its tab can't be opened, so it never shows.)
    const result = await page.evaluate(() => {
      const texts: string[] = window.__texts,
        settingsPanel = window.__bd_probe.scene.SettingsPanel;
      return {
        chrome: texts.includes('Chrome Recommended'),
        connect: texts.includes('FEEDBACK'),
        connectAway: settingsPanel.MenuItems[1].YOffset === -settingsPanel.DrawTo.Height,
        about: texts.some((x) => x.includes('This rebuild was released in 2026')),
        toneJs: texts.some((x) => x.includes('Tone.js')),
        source: texts.includes('View the code on GitHub'),
        opened: window.__opened,
      };
    });
    await page.close();
    // SIGN IN: CHG-0023 owner review 2026-11-15.
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
      // SPEC-SHARING-USAGE-ANALYTICS R12 (owner, 2026-11-16): no Privacy link until production serves the page.
      JSON.stringify(links.map((link) => link.label)) ===
        JSON.stringify(['View the code on GitHub']) &&
      JSON.stringify(result.opened) === JSON.stringify(['https://github.com/BlokDust/BlokDust']);
    return [ok, { tabs, aboutTab, ...result, links, shipped, hoverUnderlines: !idle.equals(hover) }];
  },
  async 'settings-download'(errors: string[]) {
    const page = await open(browser, [], errors);
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
      window.__opened = [];
      window.open = (target?: string | URL) => {
        window.__opened.push(String(target));
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
      window.__bd_probe.scene.SettingsPanel.MenuItems.map(
        (MenuItem) => MenuItem.Name,
      ),
    );
    const tab = await page.evaluate(() => {
      const menuCategory = window.__bd_probe.scene.SettingsPanel.MenuItems[3],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [menuCategory.Position.x / pr, 30];
    });
    await page.mouse.move(tab[0], tab[1]);
    await page.mouse.click(tab[0], tab[1]);
    await page.waitForTimeout(1200);
    const openTab = await page.evaluate(() => window.__bd_probe.scene.SettingsPanel._OpenTab);
    const texts = () =>
      page.evaluate(() => {
        const t = window.__texts as string[];
        const r = [...new Set(t)];
        t.length = 0;
        return r;
      });
    // Before any release (2.0.0 is in web/src/releases.json now, so it is set back to none here).
    await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.setRelease({
        version: null,
        macos: null,
        windows: null,
      }),
    );
    await texts();
    await page.mouse.move(640, 650);
    await page.waitForTimeout(300);
    const before = await texts();
    let buttons = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.downloadButtons(),
    );
    await page.mouse.click(buttons[0].x, buttons[0].y);
    await page.waitForTimeout(200);
    const openedBefore = await page.evaluate(() => window.__opened.length);
    await page.screenshot({ path: `${OUT}/settings-download-soon.png` });
    // As published (the shape `bd release publish` writes).
    await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.setRelease({
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
      }),
    );
    buttons = await page.evaluate(() =>
      window.__bd_probe.scene.SettingsPanel.downloadButtons(),
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
    const opened = await page.evaluate(() => window.__opened);
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
      new Set(buttons.map((b) => b.y)).size === 1 && // one row, as v1 Connect's share buttons (owner, 2026-11-16) && !after.some(t => /More info|isn't signed/.test(t))
      JSON.stringify(opened) ===
        JSON.stringify(
          buttons.filter((b) => b.url).map((b) => `${b.url}?source=download-page`),
        );
    return [ok, { names, openTab, before, after, opened }];
  },
};
