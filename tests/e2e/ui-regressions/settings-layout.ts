// ui-regressions: Settings and other panels laid out on small and odd-shaped screens.
import { OUT, blk, browser, comp, open, type RegressionTest, url } from './harness.ts';
import { openPatches, patchesClick } from './patchesPanel.ts';

export const settingsLayoutTests: Record<string, RegressionTest> = {
  async 'settings-pages-clipped'(errors: string[]) {
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const P = CanvasRenderingContext2D.prototype as any,
        stack: boolean[] = [],
        st = new WeakMap<object, boolean>();
      const save = P.save,
        restore = P.restore,
        clip = P.clip,
        fill = P.fillText;
      P.save = function (this: any) {
        stack.push(!!st.get(this));
        return save.call(this);
      };
      P.restore = function (this: any) {
        st.set(this, stack.pop() ?? false);
        return restore.call(this);
      };
      P.clip = function (this: any, ...a: any[]) {
        st.set(this, true);
        return clip.apply(this, a);
      };
      (window as any).__unclipped = [];
      P.fillText = function (this: any, t: string, ...a: any[]) {
        if (!st.get(this)) (window as any).__unclipped.push(t);
        return fill.call(this, t, ...a);
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
    await p.waitForTimeout(900);
    const tabAt = (i: number) =>
      p.evaluate((i) => {
        const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[i],
          pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
        return [m.Position.x / pr, 30];
      }, i);
    // DOWNLOAD in, out to SETTINGS, then SIGN IN in and out to ABOUT: every frame of each slide.
    for (const i of [3, 0, 4, 2]) {
      const t = await tabAt(i);
      await p.mouse.click(t[0], t[1]);
      await p.waitForTimeout(900);
    }
    const unclipped: string[] = await p.evaluate(() => [
      ...new Set((window as any).__unclipped as string[]),
    ]);
    await p.close();
    const pageWords = [
      'MACOS',
      'WINDOWS',
      'IPAD',
      'Coming soon.',
      'SIGN IN WITH GOOGLE',
      'CREATE ACCOUNT',
    ];
    const leaked = unclipped.filter(
      (t) => pageWords.includes(t) || t.startsWith('Download the standalone'),
    );
    return [leaked.length === 0, { leaked }];
  },
  /** Owner (2026-11-18, iPhone): Settings on a phone. The tabs share the width left of the × (SIGN IN ran under it);
   * the rows are nearly the screen's width and taller; ABOUT's people and DOWNLOAD's buttons go one a row; and a text
   * field no longer zooms the page in for good (viewport maximum-scale=1). */
  async 'settings-phone-layout'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(1500);
    await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.OpenPanel());
    await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
        a = (window as any).__bd_probe.v1App,
        W = a.Width,
        unit = a.Unit;
      const last = settingsPanel.MenuItems[settingsPanel.MenuItems.length - 1],
        tabsRight = last.Position.x + last.Size.width / 2,
        crossLeft = W * 0.5 + settingsPanel.Range * 0 + a.SettingsMenuWidth(W) / 2 + 12.5 * unit;
      return {
        W,
        tabsRight,
        crossLeft,
        range: settingsPanel.Range,
        oldRange: (W / 7) * 5 - (a.SettingsMenuWidth(W) - settingsPanel.Range),
        row: a.SettingsRow,
        viewport: document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '',
      };
    });
    const tapTab = async (i: number) => {
      const at = await p.evaluate((k) => {
        const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
          a = (window as any).__bd_probe.v1App;
        return [
          settingsPanel.MenuItems[k].Position.x / devicePixelRatio,
          (settingsPanel.OffsetY + 30 * a.Unit) / devicePixelRatio,
        ];
      }, i);
      await p.touchscreen.tap(at[0], at[1]);
      await p.waitForTimeout(1400);
    };
    await tapTab(2);
    const people = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.peoplePhone(),
    );
    await tapTab(3);
    const downloads = await p.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.downloadButtons(),
    );
    await ctx.close();
    const ok =
      r.tabsRight <= r.crossLeft &&
      r.range > r.oldRange &&
      r.row > 48 &&
      r.viewport.includes('maximum-scale=1') &&
      people?.length === 3 &&
      people[1].icon[1] > people[0].icon[1] &&
      people[0].icon[0] === people[1].icon[0] &&
      people[0].text[0] > people[0].icon[0] &&
      downloads.length === 3 &&
      downloads[1].y > downloads[0].y &&
      downloads[0].x === downloads[1].x;
    return [ok, { r, people, downloads }];
  },
  // Owner (2026-11-17, CHG-0035): Settings › DOWNLOAD and ACCOUNT were narrower than ABOUT (420 units against v1's
  // menu width); About's websites sat at different heights under blurbs of different lengths, with Twitter names
  // under them (gone now: the websites take that line, all three level).
  async 'settings-pages-as-wide-as-about'(errors: string[]) {
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: { t: string; x: number; y: number }[] = ((window as any).__texts3 = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (
        t: string,
        x: number,
        y: number,
        ...a: any[]
      ) {
        seen.push({ t, x, y });
        return (f as any).call(this, t, x, y, ...a);
      };
    });
    const s = await p.evaluate(() => {
      const sp = (window as any).__bd_probe.scene.SettingsPanel,
        A = (window as any).__bd_probe.v1App,
        pr = A.Metrics.PixelRatio;
      sp.OpenPanel();
      sp._OpenTab = 2;
      sp.MenuItems.forEach((MenuItem: any, i: number) => {
        MenuItem.Selected = i === 2 ? 1 : 0;
        MenuItem.YOffset = i === 2 ? 0 : -sp.DrawTo.Height;
      });
      const b = sp.downloadButtons(),
        half = 65 * A.Unit; // unused: kept for the log
      return {
        width: A.Width / pr,
        column: ((A.Width / 7) * 4) / pr,
        buttons: b.map((x: any) => x.x),
        half,
      };
    });
    await p.waitForTimeout(1500);
    const about = await p.evaluate(() => {
      const seen = (window as any).__texts3 as { t: string; x: number; y: number }[];
      const sites = ['whitevinyldesign.com', 'funputs.com', 'edsilv.com'].map(
        (t) => seen.filter((e) => e.t === t).at(-1)?.y ?? null,
      );
      return { sites, twitter: seen.some((e) => e.t.startsWith('@')) };
    });
    await p.screenshot({ path: `${OUT}/settings-about-websites.png` });
    // DOWNLOAD's three buttons span the column: centres at 1/6, 1/2 and 5/6 of it (less the 15-unit gaps).
    const left = (s.width - s.column) / 2,
      spread = s.buttons[2] - s.buttons[0];
    await p.close();
    const level = about.sites.every((y) => y !== null && Math.abs(y - about.sites[0]!) < 0.5);
    return [
      level && !about.twitter && spread > s.column * 0.6 && s.buttons[0] < left + s.column * 0.2,
      { about, s, left, spread },
    ];
  },
  async 'feedback-fits'(errors: string[]) {
    const out: Record<string, unknown> = {};
    let ok = true;
    for (const [name, w, h, choice] of [
      ['laptop', 1000, 528, 'Suggestion'],
      ['garageband', 1000, 290, 'Suggestion'],
      ['tall', 1280, 800, 'Suggestion'],
      ['phone', 390, 844, 'Suggestion'],
      ['laptop-bug', 1000, 528, 'Bug'],
    ] as const) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        deviceScaleFactor: 2,
      });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(`${url}/index.html`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForTimeout(1500);
      await p.evaluate(() => {
        const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
        settingsPanel._OpenTab = 1;
        (settingsPanel.MenuItems as any[]).forEach((m, k) => {
          m.Selected = k === 1 ? 1 : 0;
          m.YOffset = k === 1 ? 0 : -settingsPanel.DrawTo.Height;
        });
        settingsPanel.OpenPanel();
      });
      await p.waitForTimeout(1200);
      if (choice !== 'Suggestion') {
        await p.getByRole('radio', { name: choice }).click();
        await p.waitForTimeout(300);
      }
      const r = await p.evaluate(() => {
        const box = (id: string) => {
          const b = document.getElementById(id)!.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, height: b.height };
        };
        return {
          send: box('feedback-send'),
          email: box('feedback-email'),
          message: box('feedback-message'),
          choice: box('feedback-choice-suggestion'),
          h: innerHeight,
        };
      });
      await p.screenshot({ path: `${OUT}/feedback-fits-${name}.png` });
      await ctx.close();
      const fits =
        r.send.bottom <= r.h &&
        r.send.height > 10 &&
        r.email.height < 40 &&
        r.message.height >= 30 &&
        r.choice.top > 0;
      out[name] = {
        fits,
        send: Math.round(r.send.bottom),
        h: r.h,
        email: Math.round(r.email.height),
        message: Math.round(r.message.height),
      };
      ok &&= fits;
    }
    return [ok, out];
  },
  async 'review2-panels'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      const seen: { t: string; x: number }[] = ((window as any).__texts2 = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, x: number, ...a: any[]) {
        seen.push({ t, x });
        return (f as any).call(this, t, x, ...a);
      };
    });
    const texts = () =>
      p.evaluate(() => {
        const t = (window as any).__texts2.map((e: any) => e.t);
        (window as any).__texts2.length = 0;
        return t as string[];
      });
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    await p.waitForTimeout(900);
    await texts();
    await p.mouse.move(600, 400);
    await p.waitForTimeout(400);
    const onSettings = await texts();
    const about = await p.evaluate(() => {
      const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return [m.Position.x / pr, 30];
    });
    await p.mouse.click(about[0], about[1]);
    await p.waitForTimeout(1200);
    await texts();
    await p.mouse.move(600, 420);
    await p.waitForTimeout(400);
    const onAbout = await texts();
    const footer = (t: string[]) => ({
      github: t.includes('View the code on GitHub'),
      build: t.some((x) => x.startsWith('Current Build')),
    });
    await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await p.waitForTimeout(800);
    // The switch: v1 OptionSwitch puts the icons at 35% of the row and the underline at 55%: 7 units clear in a 60-unit row.
    await openPatches(p);
    // Owner review 3 (2026-11-16): ADD TO GALLERY and MAKE VIDEO side by side, MAKE VIDEO in the right half.
    const sw = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel,
        A = (window as any).__bd_probe.v1App,
        unit = A.Unit,
        g = pp.gallerySwitch(),
        v = pp.videoSwitch();
      return {
        gap: (g.h * 0.55 - (g.h * 0.35 + 5 * unit)) / unit,
        sameRow: g.y === v.y,
        videoRight: v.x >= A.Width / 2,
      };
    });
    await p.mouse.move(5, 5);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/review3-switches.png` });
    // BACK on the video view (the patch has a block).
    await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel;
      pp.View = 'video';
      pp.VideoState = 'idle';
    }); // the video step (SAVE with MAKE VIDEO on)
    await p.waitForTimeout(300);
    await texts();
    await p.mouse.move(600, 700);
    await p.waitForTimeout(400);
    const drawn = (await p.evaluate(() =>
      (window as any).__texts2.filter((e: any) => e.t === 'BACK').map((e: any) => e.x),
    )) as number[];
    const back = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel,
        a = pp.backArrow(),
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio,
        unit = (window as any).__bd_probe.v1App.Unit;
      return {
        x: a.x,
        y: a.y,
        mid: (window as any).__bd_probe.v1App.Width / 2,
        right: (window as any).__bd_probe.v1App.Width / 2 + 210 * unit,
        name: pp.centreOf('randomise')[1] * pr,
        u: unit,
      };
    });
    await p.screenshot({ path: `${OUT}/review2-video-back.png` });
    await patchesClick(p, 'videoBack', 600);
    const left = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    await p.close();
    const ok =
      !footer(onSettings).github &&
      !footer(onSettings).build &&
      footer(onAbout).github &&
      footer(onAbout).build &&
      sw.gap >= 6 &&
      sw.sameRow &&
      sw.videoRight &&
      back.x < back.mid - 150 * back.u && // owner, 2026-11-16: the video's BACK at the top left
      drawn.length > 0 &&
      drawn.every((x) => Math.abs(x - back.x) < 0.5) &&
      left === 'list';
    return [
      ok,
      { onSettings: footer(onSettings), onAbout: footer(onAbout), sw, back, drawn, left },
    ];
  },
};
