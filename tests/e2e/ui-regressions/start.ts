// ui-regressions: The START button and the splash.
import { OUT, blk, browser, comp, type RegressionTest, url } from './harness.ts';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';

export const startTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-11): the start screen is v1's Splash, ported: its play button (Palette[7] triangle on Palette[0],
   * v1 showed it on iOS) with START under it in v1's header type; START plays v1's intro (panels sliding to
   * BLOKDUST), then the stage shows and takes input. `splash=1`: automated browsers skip it otherwise. */
  async 'start-button'(errors: string[]) {
    const p = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    await p.goto(
      `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.waitForTimeout(1200);
    const { PNG } = await import('pngjs');
    const pixel = async (x: number, y: number) => {
      const b = await p.screenshot({ clip: { x, y, width: 1, height: 1 } });
      const png = PNG.sync.read(b);
      return [png.data[0], png.data[1], png.data[2]];
    };
    const green = THEMES[0].colors[7].match(/\d+/g)!.slice(0, 3).map(Number);
    const triangle = await pixel(630, 400),
      start = await p.evaluate(() => (window as any).__texts.includes('START'));
    await p.screenshot({ path: `${OUT}/start-button.png` });
    await p.evaluate(() => {
      const g: number[] = ((window as any).__gaps = []);
      let last = performance.now();
      const t0 = last;
      const sp = () => (window as any).__bd_probe.scene.splash;
      const f = (t: number) => {
        g.push(t - last);
        last = t;
        if (sp().ButtonOffset > 0 && !(window as any).__moved) (window as any).__moved = g.length;
        if (t - t0 < 1500) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await p.mouse.click(640, 400);
    await p.waitForTimeout(1500);
    const worstFrameMs = await p.evaluate(() => Math.round(Math.max(...(window as any).__gaps)));
    const worstMovingMs = await p.evaluate(() =>
      Math.round(Math.max(...(window as any).__gaps.slice((window as any).__moved ?? 0))),
    );
    const gapsAt = await p.evaluate(() => {
      let t = 0;
      return (window as any).__gaps
        .map((__gap: number) => [Math.round((t += __gap)), Math.round(__gap)])
        .filter((x: number[]) => x[1] > 25);
    });
    const during = await p.evaluate(() => ({
      held: !!document.getElementById('start'),
      title: (window as any).__texts.includes('BLOKDUST 2'),
    })); // the app's name (owner, 2026-11-14)
    await p.screenshot({ path: `${OUT}/start-intro.png` });
    await p.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 });
    await p.waitForTimeout(1000);
    const after = await p.evaluate(() => ({
      started: (window as any).__bd_probe.state.started,
      rms: (window as any).__bd_probe.state.rms,
    }));
    await p.screenshot({ path: `${OUT}/start-after.png` });
    const stageShows = (await pixel(640, 400)).join() !== '10,10,10';
    await p.close();
    const r = {
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
    return [ok, r];
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(
      `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.waitForTimeout(1000);
    await p.mouse.move(640, 400);
    await p.evaluate(() => {
      (window as any).__downAt = 0;
      addEventListener(
        'pointerdown',
        () => {
          (window as any).__downAt = performance.now();
        },
        { capture: true, once: true },
      );
    });
    await p.mouse.down();
    const begun = await p
      .waitForFunction(
        () => {
          const s = (window as any).__bd_probe.scene.splash;
          return s && !s.IOSPause ? performance.now() - (window as any).__downAt : 0;
        },
        null,
        { timeout: 5000 },
      )
      .then((h) => h.jsonValue())
      .catch(() => -1);
    await p.waitForTimeout(500); // v1 holds the button still for 300 ms, then slides it away
    const stillDown = await p.evaluate(
      () => (window as any).__bd_probe.scene.splash?.ButtonOffset ?? 0,
    );
    await p.mouse.up();
    await p
      .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
      .catch(() => {});
    await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({
      held: !!document.getElementById('start'),
      started: (window as any).__bd_probe.state.started,
      rms: (window as any).__bd_probe.state.rms,
    }));
    await ctx.close();
    const r = { pressToIntroMs: Math.round(begun), buttonMovingWhileHeld: stillDown > 0, ...after };
    return [
      begun >= 0 &&
        begun < 100 &&
        r.buttonMovingWhileHeld &&
        !after.held &&
        after.started &&
        after.rms > 0.01,
      r,
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
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(
        `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
      );
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.waitForTimeout(1000);
      const t0 = Date.now();
      if (touch) {
        await p.touchscreen.tap(640, 400);
        await p.waitForTimeout(50);
        await p.touchscreen.tap(300, 200);
      } else {
        await p.mouse.click(640, 400);
        await p.waitForTimeout(700);
        await p.mouse.click(300, 200);
      }
      await p
        .waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 })
        .catch(() => {});
      const ms = Date.now() - t0;
      const st = await p.evaluate(() => {
        const sc = (window as any).__bd_probe.scene;
        return {
          drawing: sc.splashDrawing,
          splashing: sc.splashing,
          held: !!document.getElementById('start'),
          started: (window as any).__bd_probe.state.started,
          blocks: (window as any).__bd_probe.state.patch.blocks.length,
        };
      });
      await p.screenshot({ path: `${OUT}/splash-skip-${touch ? 'touch' : 'mouse'}.png` });
      await ctx.close();
      return { ms, ...st };
    };
    const mouse = await run(false),
      touch = await run(true);
    const good = (r: typeof mouse) =>
      r.ms < 2000 && !r.drawing && !r.splashing && !r.held && r.started && r.blocks === 2;
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => {
      const seen: number[] = ((window as any).__title = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        if (t === 'BLOKDUST 2') seen.push(this.measureText(t).width / this.canvas.width);
        return (f as any).call(this, t, ...a);
      };
    });
    await p.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.tap('#start');
    await p.waitForTimeout(4000);
    const widths = await p.evaluate(() => (window as any).__title as number[]);
    await ctx.close();
    const widest = Math.max(0, ...widths);
    return [widths.length > 0 && widest <= 0.81, { drawn: widths.length, widest }];
  },
};
