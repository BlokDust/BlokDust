// ui-regressions: The START button and the splash.
import { OUT, blk, browser, comp, type RegressionTest, url } from './harness.ts';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';

export const startTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-11): the start screen is v1's Splash, ported: its play button (Palette[7] triangle on Palette[0],
   * v1 showed it on iOS) with START under it in v1's header type; START plays v1's intro (panels sliding to
   * BLOKDUST), then the stage shows and takes input. `splash=1`: automated browsers skip it otherwise. */
  async 'start-button'(errors: string[]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const seen: string[] = (window.__texts = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        seen.push(text);
        return (drawText as any).call(this, text, ...a);
      };
    });
    await page.goto(
      `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.waitForTimeout(1200);
    const { PNG } = await import('pngjs');
    const pixel = async (x: number, y: number) => {
      const b = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
      const png = PNG.sync.read(b);
      return [png.data[0], png.data[1], png.data[2]];
    };
    const green = THEMES[0].colors[7].match(/\d+/g)!.slice(0, 3).map(Number);
    const triangle = await pixel(630, 400),
      start = await page.evaluate(() => window.__texts.includes('START'));
    await page.screenshot({ path: `${OUT}/start-button.png` });
    await page.evaluate(() => {
      const g: number[] = (window.__gaps = []);
      let last = performance.now();
      const t0 = last;
      const sp = () => window.__bd_probe.scene.splash;
      const f = (t: number) => {
        g.push(t - last);
        last = t;
        if (sp().ButtonOffset > 0 && !window.__moved) window.__moved = g.length;
        if (t - t0 < 1500) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await page.mouse.click(640, 400);
    await page.waitForTimeout(1500);
    const worstFrameMs = await page.evaluate(() => Math.round(Math.max(...window.__gaps)));
    const worstMovingMs = await page.evaluate(() =>
      Math.round(Math.max(...window.__gaps.slice(window.__moved ?? 0))),
    );
    const gapsAt = await page.evaluate(() => {
      let t = 0;
      return window.__gaps
        .map((__gap: number) => [Math.round((t += __gap)), Math.round(__gap)])
        .filter((x: number[]) => x[1] > 25);
    });
    const during = await page.evaluate(() => ({
      held: !!document.getElementById('start'),
      title: window.__texts.includes('BLOKDUST 2'),
    })); // the app's name (owner, 2026-11-14)
    await page.screenshot({ path: `${OUT}/start-intro.png` });
    await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 });
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => ({
      started: window.__bd_probe.state.started,
      rms: window.__bd_probe.state.rms,
    }));
    await page.screenshot({ path: `${OUT}/start-after.png` });
    const stageShows = (await pixel(640, 400)).join() !== '10,10,10';
    await page.close();
    const result = {
      triangle,
      green,
      start,
      during,
      after,
      stageShows,
      worstFrameMs,
      worstMovingMs,
      gapsAt,
    };
    const ok =
      triangle.every((c, i) => Math.abs(c - green[i]) < 3) &&
      start &&
      during.held &&
      during.title &&
      after.started &&
      after.rms > 0.01 &&
      stageShows &&
      worstMovingMs < 50;
    return [ok, result];
  },
  /** Owner (2026-11-12): START felt slow, seconds between the press and the intro. The intro starts on the press
   * (v1 Splash.MouseDown), not the release, and does not wait for the engine: the AudioContext, worklet and WASM are
   * prepared while the start screen shows. Holding the button down, the intro has begun within 100 ms; on release the
   * sound starts and the stage takes input as before. */
  async 'start-on-press'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.waitForTimeout(1000);
    await page.mouse.move(640, 400);
    await page.evaluate(() => {
      window.__downAt = 0;
      addEventListener(
        'pointerdown',
        () => {
          window.__downAt = performance.now();
        },
        { capture: true, once: true },
      );
    });
    await page.mouse.down();
    const begun = await page
      .waitForFunction(
        () => {
          const s = window.__bd_probe.scene.splash;
          return s && !s.IOSPause ? performance.now() - window.__downAt : 0;
        },
        null,
        { timeout: 5000 },
      )
      .then((h) => h.jsonValue())
      .catch(() => -1);
    await page.waitForTimeout(500); // v1 holds the button still for 300 ms, then slides it away
    const stillDown = await page.evaluate(
      () => window.__bd_probe.scene.splash?.ButtonOffset ?? 0,
    );
    await page.mouse.up();
    await page
      .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({
      held: !!document.getElementById('start'),
      started: window.__bd_probe.state.started,
      rms: window.__bd_probe.state.rms,
    }));
    await ctx.close();
    const result = { pressToIntroMs: Math.round(begun), buttonMovingWhileHeld: stillDown > 0, ...after };
    return [
      begun >= 0 &&
        begun < 100 &&
        result.buttonMovingWhileHeld &&
        !after.held &&
        after.started &&
        after.rms > 0.01,
      result,
    ];
  },
  /** Owner (PR #1 review, 2026-11-12): a click or a touch while the intro plays skips it: the tweens stop, the splash
   * is cleared and the stage takes input at once (the full intro is ~3.5 s). Mouse: a click mid-intro. Touch: a tap
   * straight after START, which may land before the intro has begun (the engine is still starting): it skips too. */
  async 'splash-skip'(errors: string[]) {
    const run = async (touch: boolean) => {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        hasTouch: touch,
      });
      const page = await ctx.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
      );
      await page.waitForFunction(() => window.__bd_probe);
      await page.waitForTimeout(1000);
      const t0 = Date.now();
      if (touch) {
        await page.touchscreen.tap(640, 400);
        await page.waitForTimeout(50);
        await page.touchscreen.tap(300, 200);
      } else {
        await page.mouse.click(640, 400);
        await page.waitForTimeout(700);
        await page.mouse.click(300, 200);
      }
      await page
        .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
        .catch(() => {});
      const ms = Date.now() - t0;
      const st = await page.evaluate(() => {
        const sc = window.__bd_probe.scene;
        return {
          drawing: sc.splashDrawing,
          splashing: sc.splashing,
          held: !!document.getElementById('start'),
          started: window.__bd_probe.state.started,
          blocks: window.__bd_probe.state.patch.blocks.length,
        };
      });
      await page.screenshot({ path: `${OUT}/splash-skip-${touch ? 'touch' : 'mouse'}.png` });
      await ctx.close();
      return { ms, ...st };
    };
    const mouse = await run(false),
      touch = await run(true);
    const good = (result: typeof mouse) =>
      result.ms < 2000 && !result.drawing && !result.splashing && !result.held && result.started && result.blocks === 2;
    return [good(mouse) && good(touch), { mouse, touch }];
  },
  // Owner (2026-11-17, CHG-0035): on a phone held upright the splash title BLOKDUST 2 nearly touched the edges.
  async 'splash-title-fits-phone'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const seen: number[] = (window.__title = []);
      const drawText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text: string, ...a: any[]) {
        if (text === 'BLOKDUST 2') seen.push(this.measureText(text).width / this.canvas.width);
        return (drawText as any).call(this, text, ...a);
      };
    });
    await page.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.tap('#start');
    await page.waitForTimeout(4000);
    const widths = await page.evaluate(() => window.__title as number[]);
    await ctx.close();
    const widest = Math.max(0, ...widths);
    return [widths.length > 0 && widest <= 0.81, { drawn: widths.length, widest }];
  },
};
