// ui-regressions: Panning, zooming and keeping a patch's blocks in view.
import {
  OUT,
  blk,
  browser,
  comp,
  maxChange,
  maxOver,
  open,
  toCss,
  type RegressionTest,
  url,
} from './harness.ts';
import { THEMES } from '../../../web/src/generated/palettes.gen.ts';
import { keepPresets, openList, patchesAt, patchesClick, rowButton } from './patchesPanel.ts';
import { openPlugin } from './pluginPage.ts';
import type { SettingsOpenTab } from './v1Views.ts';

export const stageViewTests: Record<string, RegressionTest> = {
  /** Dragging the empty background pans the stage (v1 StageDragger); it sent every block to NaN. */
  async 'stage-drag-pans'(errors) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const [x0, y0] = await toCss(page, 0, 0);
    await page.mouse.move(300, 600);
    await page.mouse.down();
    await page.mouse.move(400, 650, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    const [x1, y1] = await toCss(page, 0, 0);
    await page.screenshot({ path: `${OUT}/stage-drag-pans.png` });
    const moved = Number.isFinite(x1) && Number.isFinite(y1) && x1 - x0 > 50 && y1 - y0 > 20;
    if (!moved) {
      await page.close();
      return [false, { before: [x0, y0], after: [x1, y1] }];
    }
    // and the block is still drawn where the grid now puts it
    const { PNG } = await import('pngjs');
    const shot = PNG.sync.read(
      await page.screenshot({
        clip: { x: Math.round(x1) - 4, y: Math.round(y1) + 2, width: 8, height: 8 },
      }),
    );
    const bg = (THEMES[0].colors[0].match(/\d+/g) ?? []).map(Number);
    let drawn = 0;
    for (let i = 0; i < shot.data.length; i += 4)
      if (
        Math.abs(shot.data[i] - bg[0]) +
          Math.abs(shot.data[i + 1] - bg[1]) +
          Math.abs(shot.data[i + 2] - bg[2]) >
        30
      )
        drawn++;
    await page.close();
    return [drawn > 10, { before: [x0, y0], after: [x1, y1], blockPixels: drawn }];
  },
  /** Particles are drawn under v1's UI layer (v1 MainScene order): under a translucent open panel
   * they change pixels a little, on top they would change them by ~230 levels. */
  async 'particles-under-panels'(errors) {
    const seen: Record<string, number> = {},
      flying: Record<string, number> = {};
    for (const [name, at] of [
      ['settings', [1233, 45]],
      ['patches', [1138, 45]],
    ] as const) {
      const page = await open(
        browser,
        [blk(1, 'ParticleEmitter', 0, 8), blk(2, 'Power', -3, 8)],
        errors,
      );
      await page.mouse.click(at[0], at[1]);
      await page.mouse.move(5, 795);
      await page.waitForTimeout(1500);
      flying[name] = await maxOver(page, 'particles', 300);
      await page.screenshot({ path: `${OUT}/particles-under-${name}.png` });
      seen[name] = await maxChange(page, { x: 0, y: 100, width: 1280, height: 620 }, 300);
      await page.close();
    }
    return [
      flying.settings > 0 && flying.patches > 0 && seen.settings < 40 && seen.patches < 40,
      { particlesFlying: flying, maxChangeUnderPanel: seen },
    ];
  },
  async 'blocks-never-all-off-screen'(errors: string[]) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 528 } });
    await context.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(
        'blokdust2.autosave',
        JSON.stringify({
          format: 'blokdust.patch',
          version: 2,
          seed: 1,
          view: { x: 4000, y: -3000, zoom: 1 },
          blocks: [
            { id: 'a', type: 'source.tone', x: 0, y: 0, params: {} },
            { id: 'b', type: 'power.power', x: -3, y: 0, params: {} },
          ],
        }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(2000);
    const onScreen = () =>
      page.evaluate(() => {
        const probe = window.__bd_probe;
        return probe.state.blocks.filter((b) => {
          const point = probe.blockPoint(b.id);
          return (
            point && point[0] > 0 && point[0] < innerWidth && point[1] > 0 && point[1] < innerHeight
          );
        }).length;
      });
    const atStart = await onScreen();
    await page.screenshot({ path: `${OUT}/blocks-never-all-off-screen.png` });
    await context.close();
    return [atStart === 2, { atStart }];
  },
  /** CHG-0010, SPEC-PATCH-FORMAT-V2 R2: a patch keeps the view it was saved at and opens in it
   * (links, files, autosave, presets); in the plugin the DAW project keeps it. */
  async 'patch-view'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await keepPresets(page);
    const view = () =>
      page.evaluate(() => {
        const v1App = window.__bd_probe.v1App;
        return {
          zoom: +v1App.ZoomLevel.toFixed(3),
          x: +v1App.DragOffset.x.toFixed(3),
          y: +v1App.DragOffset.y.toFixed(3),
        };
      });
    await page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      scene.pinchView(0.5, { x: 3, y: -2 });
      scene.host.setZoom(0.5);
      scene.host.setDrag({ x: 3, y: -2 });
      scene.pinchEnd();
    });
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => window.__bd_probe.state.patch);
    // Reopened (as the autosave, a link or a file would be).
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript((pt) => {
      localStorage.setItem('blokdust2.autosave', pt);
    }, JSON.stringify(saved));
    const otherPage = await context.newPage();
    otherPage.on('pageerror', (error) => errors.push(error.message));
    await otherPage.goto(`${url}/index.html`);
    await otherPage.waitForFunction(() => window.__bd_probe);
    await otherPage.click('#start');
    await otherPage.waitForTimeout(1500);
    const reopened = await otherPage.evaluate(() => {
      const v1App = window.__bd_probe.v1App;
      return {
        zoom: +v1App.ZoomLevel.toFixed(3),
        x: +v1App.DragOffset.x.toFixed(3),
        y: +v1App.DragOffset.y.toFixed(3),
      };
    });
    await context.close();
    // A preset with a view: Step Sequencer opens zoomed out.
    await openList(page);
    await rowButton(page, 'open', 'Step Sequencer', 300);
    if ((await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View)) === 'confirm')
      await patchesClick(page, 'openAnyway', 600);
    await page.waitForTimeout(800);
    const preset = await view();
    await page.close();
    // Plugin: the patch from the processor has a view; the page shows it and reports new ones.
    const { pg, close } = await openPlugin(
      {
        format: 'blokdust.patch',
        version: 2,
        seed: 1,
        view: { x: -4, y: 1, zoom: 0.75 },
        blocks: [{ id: 't', type: 'source.tone', x: 0, y: 0, params: {} }],
      },
      errors,
    );
    const plugin = await pg.evaluate(() => {
      const v1App = window.__bd_probe.v1App;
      return {
        zoom: +v1App.ZoomLevel.toFixed(3),
        x: +v1App.DragOffset.x.toFixed(3),
        y: +v1App.DragOffset.y.toFixed(3),
      };
    });
    await pg.evaluate(() => {
      const scene = window.__bd_probe.scene;
      scene.pinchView(2, { x: 1, y: 1 });
      scene.host.setZoom(2);
      scene.host.setDrag({ x: 1, y: 1 });
      scene.pinchEnd();
    });
    await pg.waitForTimeout(1500);
    const reported = await pg.evaluate(
      () => (window.__sent ?? []).filter((message) => message.id === 'bd_view').pop()?.v,
    );
    await close();
    const ok =
      JSON.stringify(saved.view) === JSON.stringify({ x: 3, y: -2, zoom: 0.5 }) &&
      JSON.stringify(reopened) === JSON.stringify({ zoom: 0.5, x: 3, y: -2 }) &&
      preset.zoom === 0.6 &&
      JSON.stringify(plugin) === JSON.stringify({ zoom: 0.75, x: -4, y: 1 }) &&
      JSON.stringify(reported) === JSON.stringify({ x: 1, y: 1, zoom: 2 });
    return [ok, { saved: saved.view, reopened, preset, plugin, reported }];
  },
  /** A trackpad pinch zooms smoothly about the pointer: Chrome and Firefox send wheel events with
   * ctrlKey (CDP modifiers 2), Safari gesture events. */
  async 'trackpad-pinch'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const cdp = await page.context().newCDPSession(page);
    const zoom = () => page.evaluate(() => window.__bd_probe.v1App.ZoomLevel);
    const cx = 900,
      cy = 300;
    // The grid point under the pointer: found from two grid points' css positions.
    const gridAt = async () => {
      const [ax, ay] = await toCss(page, 0, 0),
        [bx, by] = await toCss(page, 1, 1);
      return [(cx - ax) / (bx - ax), (cy - ay) / (by - ay)];
    };
    const g0 = await gridAt(),
      z0 = await zoom();
    const pinchStep = (deltaY: number) =>
      cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: cx,
        y: cy,
        deltaX: 0,
        deltaY,
        modifiers: 2,
      });
    for (let i = 0; i < 12; i++) {
      await pinchStep(-6);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(100);
    const z1 = await zoom(),
      g1 = await gridAt();
    for (let i = 0; i < 30; i++) {
      await pinchStep(8);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(400);
    const z2 = await zoom();
    const z3 = await zoom();
    // Safari (macOS): gesture events, no touches.
    await page.mouse.move(cx, cy);
    const z4a = await zoom();
    await page.evaluate(
      ([x, y]) => {
        const stage = document.getElementById('stage');
        if (!stage) throw new Error('no #stage');
        const ev = (type: string, scale: number) => {
          const gesture = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
            scale,
            clientX: x,
            clientY: y,
          });
          stage.dispatchEvent(gesture);
        };
        ev('gesturestart', 1);
        ev('gesturechange', 1.2);
        ev('gesturechange', 1.5);
        ev('gestureend', 1.5);
      },
      [cx, cy],
    );
    await page.waitForTimeout(100);
    const z4 = await zoom();
    await page.close();
    const result = { z0, z1, anchor: [g0, g1], z2, z3, z4a, z4 };
    const ok =
      z1 > z0 * 1.3 &&
      Math.abs(g0[0] - g1[0]) < 0.05 &&
      Math.abs(g0[1] - g1[1]) < 0.05 &&
      ![0.15, 0.25, 0.5, 1, 2, 4].includes(z1) &&
      z2 < z1 &&
      z3 === z2 &&
      Math.abs(z4 / z4a - 1.5) < 0.01;
    return [ok, result];
  },
  /** CHG-0010, CHG-0035: the wheel zooms about the pointer within 0.15×–4×, one notch ×e^0.125;
   * over an open panel it leaves the stage's zoom alone. */
  async 'mouse-wheel-zoom'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const zoom = () => page.evaluate(() => window.__bd_probe.v1App.ZoomLevel);
    const cx = 900,
      cy = 300;
    const gridAt = async () => {
      const [ax, ay] = await toCss(page, 0, 0),
        [bx, by] = await toCss(page, 1, 1);
      return [(cx - ax) / (bx - ax), (cy - ay) / (by - ay)];
    };
    await page.mouse.move(cx, cy);
    const g0 = await gridAt(),
      z0 = await zoom();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100); // one notch towards you: in
    const zNotch = await zoom();
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(100);
    const z1 = await zoom(),
      g1 = await gridAt();
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(10);
    } // far out: stops at 0.15
    await page.waitForTimeout(400);
    const z2 = await zoom();
    // Settings open: the wheel is the panel's.
    for (
      let i = 0;
      i < 6 && !(await page.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await page.mouse.click(1233, 45);
      await page.waitForTimeout(700);
    }
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(400);
    const z3 = await zoom();
    await page.close();
    const ok =
      Math.abs(zNotch / z0 - Math.exp(0.125)) < 0.01 &&
      z1 > z0 * 1.3 &&
      Math.abs(g0[0] - g1[0]) < 0.05 &&
      Math.abs(g0[1] - g1[1]) < 0.05 &&
      Math.abs(z2 - 0.15) < 1e-6 &&
      z3 === z2;
    return [ok, { z0, zNotch, z1, anchor: [g0, g1], z2, z3 }];
  },
  // CHG-0035: the zoom goes out to 0.15 (v1 stopped at 0.25).
  async 'zoom-out-to-0-15'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.__bd_probe.scene.ZoomButtons.ZoomOut();
      });
      await page.waitForTimeout(700);
    }
    const zoom = await page.evaluate(() => window.__bd_probe.v1App.ZoomLevel);
    await page.screenshot({ path: `${OUT}/zoom-out-to-0-15.png` });
    await page.close();
    return [Math.abs(zoom - 0.15) < 1e-9, { zoom }];
  },
  /** CHG-0025: GarageBand's ~1000×290 plugin view. Past 2:1 the height sets the unit (MAX_ASPECT),
   * so the Patches and Settings tabs are on top and switch, and chrome and stage share one unit. */
  async 'short-wide-view'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1000, height: 290 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForTimeout(1500);
    const units = await page.evaluate(() => {
      const v1App = window.__bd_probe.v1App;
      return { unit: v1App.Unit, grid: v1App.GridSize };
    });
    await page.evaluate(() => {
      try {
        localStorage.removeItem('blokdust.patchesTab');
      } catch {
        /* */
      }
      window.__bd_probe.scene.PatchesPanel.OpenPanel();
    });
    await page.waitForTimeout(1200);
    const [ox, oy] = await patchesAt(page, 'tab1');
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.tagName,
      [ox, oy],
    );
    await page.mouse.move(ox, oy);
    await page.mouse.click(ox, oy);
    await page.waitForTimeout(700);
    const patchesTab = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Tab);
    await page.screenshot({ path: `${OUT}/short-wide-patches.png` });
    await patchesClick(page, 'close', 900);
    await page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.OpenPanel();
    });
    await page.waitForTimeout(1200);
    const [ax, ay] = await page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel,
        v1App = window.__bd_probe.v1App,
        pr = v1App.Metrics.PixelRatio;
      // MenuItems[1] is the divider.
      return [
        settingsPanel.MenuItems[2].Position.x / pr,
        (settingsPanel.OffsetY + settingsPanel.Height * v1App.Unit * 0.5) / pr,
      ];
    });
    await page.mouse.move(ax, ay);
    await page.mouse.click(ax, ay);
    await page.waitForTimeout(900);
    const settingsTab = await page.evaluate(
      () => (window.__bd_probe.scene.SettingsPanel as unknown as SettingsOpenTab)._OpenTab,
    );
    await page.screenshot({ path: `${OUT}/short-wide-about.png` });
    await context.close();
    const want = ((290 * 2) / 850) * 2; // height · MAX_ASPECT ÷ 850, at device pixel ratio 2
    const ok =
      Math.abs(units.unit - want) < 1e-6 &&
      onTop === 'CANVAS' &&
      patchesTab === 1 &&
      settingsTab === 2;
    return [ok, { units, want, openTabUnder: onTop, patchesTab, settingsTab }];
  },
};
