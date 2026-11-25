// ui-regressions: The START button and the splash.
import { OUT, blk, browser, comp, type RegressionTest, url } from './harness.ts';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';
import type { SceneSplash } from './v1Views.ts';

export const startTests: Record<string, RegressionTest> = {
  /** The start screen is v1's Splash: its play button and START play v1's intro, then the
   * stage takes input. `splash=1`: automated browsers skip it otherwise. */
  async 'start-button'(errors: string[]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
    });
    await page.goto(
      `${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.waitForTimeout(1200);
    const { PNG } = await import('pngjs');
    const pixel = async (x: number, y: number) => {
      const png = PNG.sync.read(await page.screenshot({ clip: { x, y, width: 1, height: 1 } }));
      return [png.data[0], png.data[1], png.data[2]];
    };
    const green = (THEMES[0].colors[7].match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const triangle = await pixel(630, 400),
      start = await page.evaluate(() => (window.__texts ?? []).includes('START'));
    await page.screenshot({ path: `${OUT}/start-button.png` });
    await page.evaluate(() => {
      const gaps: number[] = (window.__gaps = []);
      let last = performance.now();
      const t0 = last;
      const splash = () => (window.__bd_probe.scene as unknown as SceneSplash).splash;
      const frame = (time: number) => {
        gaps.push(time - last);
        last = time;
        if ((splash()?.ButtonOffset ?? 0) > 0 && !window.__moved) window.__moved = gaps.length;
        if (time - t0 < 1500) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await page.mouse.click(640, 400);
    await page.waitForTimeout(1500);
    const worstFrameMs = await page.evaluate(() => Math.round(Math.max(...(window.__gaps ?? []))));
    const worstMovingMs = await page.evaluate(() =>
      Math.round(Math.max(...(window.__gaps ?? []).slice(window.__moved ?? 0))),
    );
    const gapsAt = await page.evaluate(() => {
      let elapsed = 0;
      return (window.__gaps ?? [])
        .map((gap) => [Math.round((elapsed += gap)), Math.round(gap)])
        .filter((entry) => entry[1] > 25);
    });
    // The intro ends on the app's name.
    const during = await page.evaluate(() => ({
      held: !!document.getElementById('start'),
      title: (window.__texts ?? []).includes('BLOKDUST 2'),
    }));
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
      triangle.every((channel, i) => Math.abs(channel - green[i]) < 3) &&
      start &&
      during.held &&
      during.title &&
      after.started &&
      after.rms > 0.01 &&
      stageShows &&
      worstMovingMs < 50;
    return [ok, result];
  },
  /** START's intro begins within 100 ms of the press (v1 Splash.MouseDown), the engine prepared
   * while the start screen shows; on release the sound starts and the stage takes input. */
  async 'start-on-press'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
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
          const splash = (window.__bd_probe.scene as unknown as SceneSplash).splash;
          return splash && !splash.IOSPause ? performance.now() - (window.__downAt ?? 0) : 0;
        },
        null,
        { timeout: 5000 },
      )
      .then((handle) => handle.jsonValue())
      .catch(() => -1);
    await page.waitForTimeout(500); // v1 holds the button still for 300 ms, then slides it away
    const stillDown = await page.evaluate(
      () => (window.__bd_probe.scene as unknown as SceneSplash).splash?.ButtonOffset ?? 0,
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
    await context.close();
    const result = {
      pressToIntroMs: Math.round(begun),
      buttonMovingWhileHeld: stillDown > 0,
      ...after,
    };
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
  /** A click mid-intro, or a tap straight after START (maybe before the intro has begun), skips the
   * ~3.5 s intro: the tweens stop and the stage takes input at once. */
  async 'splash-skip'(errors: string[]) {
    const run = async (touch: boolean) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        hasTouch: touch,
      });
      const page = await context.newPage();
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
      await context.close();
      return { ms, ...st };
    };
    const mouse = await run(false),
      touch = await run(true);
    const good = (result: typeof mouse) =>
      result.ms < 2000 &&
      !result.drawing &&
      !result.splashing &&
      !result.held &&
      result.started &&
      result.blocks === 2;
    return [good(mouse) && good(touch), { mouse, touch }];
  },
  // CHG-0035: on a phone held upright the splash title BLOKDUST 2 nearly touched the edges.
  async 'splash-title-fits-phone'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const seen: number[] = (window.__title = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        if (text === 'BLOKDUST 2') seen.push(this.measureText(text).width / this.canvas.width);
        drawText.call(this, text, ...rest);
      };
    });
    await page.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.tap('#start');
    await page.waitForTimeout(4000);
    const widths = await page.evaluate(() => window.__title ?? []);
    await context.close();
    const widest = Math.max(0, ...widths);
    return [widths.length > 0 && widest <= 0.81, { drawn: widths.length, widest }];
  },
};
