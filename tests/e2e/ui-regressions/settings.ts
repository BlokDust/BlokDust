// ui-regressions: Settings: tempo, the tour, themes, Release 1 pages and downloads.
import { OUT, blk, browser, comp, open, state, type RegressionTest, url } from './harness.ts';

export const settingsTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-10): v1's Tour row is the patch Tempo (web), set once for every synced block: pressing where
   * "Launch Tutorial" was sets the tempo, and the panel stays open. The tour (CHG-0035) has its own row under it. */
  async 'settings-tempo-and-tour'(errors: string[]) {
    const p = await open(browser, [], errors);
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    await p.waitForTimeout(1200);
    const names = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.Options.filter(
        (Option: any) => Option.Type !== 'hidden',
      ).map((o: any) => o.Name),
    );
    const tempo = () => p.evaluate(() => (window as any).__bd_probe.scene.host.tempo());
    const before = await tempo();
    await p.mouse.move(700, 452);
    await p.mouse.down();
    await p.mouse.move(800, 452, { steps: 5 });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/settings-tempo-and-tour.png` });
    await p.mouse.up();
    await p.waitForTimeout(600);
    const after = await tempo(),
      saved = (await state(p)).patch.tempo;
    const still = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open);
    // CHG-0035: the tour has a row of its own under Tempo; LAUNCH TOUR closes Settings and asks.
    const btn = (await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.tourButton(),
    )) as { x: number; y: number };
    await p.mouse.move(btn.x, btn.y);
    await p.mouse.click(btn.x, btn.y);
    await p.waitForTimeout(1200);
    const tour = await p.evaluate(() => ({
      settings: (window as any).__bd_probe.scene.SettingsPanel.Open,
      asked: (window as any).__bd_probe.scene.Tutorial.SplashOpen,
    }));
    await p.close();
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const boot = async (q = '') => {
      await p.goto(`${url}/index.html${q}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForTimeout(1200);
    };
    const no = () => p.evaluate(() => (window as any).__bd_probe.v1App.ThemeManager.CurrentThemeNo);
    await boot();
    const first = await no();
    await p.evaluate(() => (window as any).__bd_probe.v1App.ThemeManager.LoadTheme(3));
    await p.waitForTimeout(300);
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
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      const boot = async () => {
        await p.goto(`${url}/index.html?demo&firsttheme=1`);
        await p.waitForFunction(() => (window as any).__bd_probe);
        await p.waitForTimeout(300);
      };
      await boot();
      const first = await p.evaluate(() => ({
        now: (window as any).__bd_probe.v1App.ThemeManager.CurrentThemeNo,
        kept: localStorage.getItem('blokdust.theme'),
      }));
      await boot();
      const again = await p.evaluate(
        () => (window as any).__bd_probe.v1App.ThemeManager.CurrentThemeNo,
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
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
      (window as any).__opened = [];
      window.open = (u?: string | URL) => {
        (window as any).__opened.push(String(u));
        return null;
      };
    });
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    await p.waitForTimeout(1200);
    const sp = () =>
      p.evaluate(() => {
        const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
        return {
          names: settingsPanel.MenuItems.map((MenuItem: any) => MenuItem.Name),
          tab: settingsPanel._OpenTab,
        };
      });
    const tabs = await sp();
    const about = await p.evaluate(() => {
      const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return [m.Position.x / pr, 30];
    });
    await p.mouse.move(about[0], about[1]);
    await p.mouse.click(about[0], about[1]);
    await p.waitForTimeout(1200);
    const aboutTab = (await sp()).tab;
    const links = (await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.footerLinks(),
    )) as { label: string; x: number; y: number }[];
    const link = [links[0].x, links[0].y];
    await p.mouse.move(link[0] - 300, link[1]);
    await p.waitForTimeout(300);
    const clip = { x: link[0] - 90, y: link[1] - 15, width: 180, height: 30 };
    const idle = await p.screenshot({ clip });
    await p.mouse.move(link[0], link[1]);
    await p.waitForTimeout(300);
    const hover = await p.screenshot({ clip });
    await p.screenshot({ path: `${OUT}/settings-about.png` });
    for (const l of links) {
      await p.mouse.move(l.x, l.y);
      await p.mouse.click(l.x, l.y);
      await p.waitForTimeout(300);
    }
    // Every build carries the licences (task 11): v1's MIT notice, and the AGPL.
    const notice = await (await fetch(`${url}/NOTICE.txt`)).text(),
      licence = await (await fetch(`${url}/LICENSE.txt`)).text();
    const shipped =
      notice.includes('BlokDust v1') &&
      notice.includes('MIT License') &&
      licence.includes('GNU AFFERO GENERAL PUBLIC LICENSE');
    // (v1 still draws the Connect page, clipped away above the panel: its tab can't be opened, so it never shows.)
    const r = await p.evaluate(() => {
      const t: string[] = (window as any).__texts,
        settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
      return {
        chrome: t.includes('Chrome Recommended'),
        connect: t.includes('FEEDBACK'),
        connectAway: settingsPanel.MenuItems[1].YOffset === -settingsPanel.DrawTo.Height,
        about: t.some((x) => x.includes('This rebuild was released in 2026')),
        toneJs: t.some((x) => x.includes('Tone.js')),
        source: t.includes('View the code on GitHub'),
        opened: (window as any).__opened,
      };
    });
    await p.close();
    // SIGN IN: CHG-0023 owner review 2026-11-15.
    const ok =
      JSON.stringify(tabs.names) ===
        JSON.stringify(['SETTINGS', 'FEEDBACK', 'ABOUT', 'DOWNLOAD', 'SIGN IN']) &&
      aboutTab === 2 &&
      !r.chrome &&
      r.connect &&
      r.connectAway &&
      r.about &&
      !r.toneJs &&
      r.source &&
      !idle.equals(hover) &&
      shipped &&
      // SPEC-SHARING-USAGE-ANALYTICS R12 (owner, 2026-11-16): no Privacy link until production serves the page.
      JSON.stringify(links.map((link) => link.label)) ===
        JSON.stringify(['View the code on GitHub']) &&
      JSON.stringify(r.opened) === JSON.stringify(['https://github.com/BlokDust/BlokDust']);
    return [ok, { tabs, aboutTab, ...r, links, shipped, hoverUnderlines: !idle.equals(hover) }];
  },
  async 'settings-download'(errors: string[]) {
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
      (window as any).__opened = [];
      window.open = (u?: string | URL) => {
        (window as any).__opened.push(String(u));
        return null;
      };
    });
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    await p.waitForTimeout(1200);
    const names = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.MenuItems.map(
        (MenuItem: any) => MenuItem.Name,
      ),
    );
    const tab = await p.evaluate(() => {
      const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[3],
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return [m.Position.x / pr, 30];
    });
    await p.mouse.move(tab[0], tab[1]);
    await p.mouse.click(tab[0], tab[1]);
    await p.waitForTimeout(1200);
    const openTab = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel._OpenTab);
    const texts = () =>
      p.evaluate(() => {
        const t = (window as any).__texts as string[];
        const r = [...new Set(t)];
        t.length = 0;
        return r;
      });
    // Before any release (2.0.0 is in web/src/releases.json now, so it is set back to none here).
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.setRelease({
        version: null,
        macos: null,
        windows: null,
      }),
    );
    await texts();
    await p.mouse.move(640, 650);
    await p.waitForTimeout(300);
    const before = await texts();
    let buttons = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.downloadButtons(),
    );
    await p.mouse.click(buttons[0].x, buttons[0].y);
    await p.waitForTimeout(200);
    const openedBefore = await p.evaluate(() => (window as any).__opened.length);
    await p.screenshot({ path: `${OUT}/settings-download-soon.png` });
    // As published (the shape `bd release publish` writes).
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.setRelease({
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
    buttons = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.downloadButtons(),
    );
    await p.mouse.move(buttons[0].x, buttons[0].y);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/settings-download.png` });
    const after = await texts();
    for (const b of buttons) {
      await p.mouse.move(b.x, b.y);
      await p.mouse.click(b.x, b.y);
      await p.waitForTimeout(200);
    }
    const opened = await p.evaluate(() => (window as any).__opened);
    await p.close();
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
      new Set(buttons.map((b: any) => b.y)).size === 1 && // one row, as v1 Connect's share buttons (owner, 2026-11-16) && !after.some(t => /More info|isn't signed/.test(t))
      JSON.stringify(opened) ===
        JSON.stringify(
          buttons.filter((b: any) => b.url).map((b: any) => `${b.url}?source=download-page`),
        );
    return [ok, { names, openTab, before, after, opened }];
  },
};
