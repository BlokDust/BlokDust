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

export const stageViewTests: Record<string, RegressionTest> = {
  /** Dragging the empty background pans the stage (v1 StageDragger); it used to send every block to NaN. */
  async 'stage-drag-pans'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const [x0, y0] = await toCss(p, 0, 0);
    await p.mouse.move(300, 600);
    await p.mouse.down();
    await p.mouse.move(400, 650, { steps: 10 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    const [x1, y1] = await toCss(p, 0, 0);
    await p.screenshot({ path: `${OUT}/stage-drag-pans.png` });
    const moved = Number.isFinite(x1) && Number.isFinite(y1) && x1 - x0 > 50 && y1 - y0 > 20;
    if (!moved) {
      await p.close();
      return [false, { before: [x0, y0], after: [x1, y1] }];
    }
    // and the block is still drawn where the grid now puts it
    const { PNG } = await import('pngjs');
    const shot = PNG.sync.read(
      await p.screenshot({
        clip: { x: Math.round(x1) - 4, y: Math.round(y1) + 2, width: 8, height: 8 },
      }),
    );
    const bg = THEMES[0].colors[0].match(/\d+/g)!.map(Number);
    let drawn = 0;
    for (let i = 0; i < shot.data.length; i += 4)
      if (
        Math.abs(shot.data[i] - bg[0]) +
          Math.abs(shot.data[i + 1] - bg[1]) +
          Math.abs(shot.data[i + 2] - bg[2]) >
        30
      )
        drawn++;
    await p.close();
    return [moved && drawn > 10, { before: [x0, y0], after: [x1, y1], blockPixels: drawn }];
  },
  /** Particles are drawn under v1's UI layer (v1 MainScene display list: Particles, then ToolTip … SettingsPanel).
   * A silent patch keeps the panels still, so what changes inside an open panel is particles. v1's panels are
   * slightly translucent (the stage shows through faintly), so particles under them change pixels a little; drawn on
   * top they change them by the full particle-vs-panel contrast (~230 levels). */
  async 'particles-under-panels'(errors) {
    const seen: Record<string, number> = {},
      flying: Record<string, number> = {};
    for (const [name, at] of [
      ['settings', [1233, 45]],
      ['patches', [1138, 45]],
    ] as const) {
      const p = await open(
        browser,
        [blk(1, 'ParticleEmitter', 0, 8), blk(2, 'Power', -3, 8)],
        errors,
      );
      await p.mouse.click(at[0], at[1]);
      await p.mouse.move(5, 795);
      await p.waitForTimeout(1500);
      flying[name] = await maxOver(p, 'particles', 300);
      await p.screenshot({ path: `${OUT}/particles-under-${name}.png` });
      seen[name] = await maxChange(p, { x: 0, y: 100, width: 1280, height: 620 }, 300);
      await p.close();
    }
    return [
      flying.settings > 0 && flying.patches > 0 && seen.settings < 40 && seen.patches < 40,
      { particlesFlying: flying, maxChangeUnderPanel: seen },
    ];
  },
  async 'blocks-never-all-off-screen'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 528 } });
    await ctx.addInitScript(() => {
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(2000);
    const onScreen = () =>
      p.evaluate(() => {
        const s = (window as any).__bd_probe;
        return s.state.blocks.filter((b: any) => {
          const q = s.blockPoint(b.id);
          return q && q[0] > 0 && q[0] < innerWidth && q[1] > 0 && q[1] < innerHeight;
        }).length;
      });
    const atStart = await onScreen();
    await p.screenshot({ path: `${OUT}/blocks-never-all-off-screen.png` });
    await ctx.close();
    return [atStart === 2, { atStart }];
  },
  /** Owner (2026-11-12, CHG-0010): a patch keeps the view it was saved at (zoom and position, SPEC-PATCH-FORMAT-V2
   * R2 `view`), and opening it shows that view: links, files, the autosave and presets (the sequencers open zoomed
   * out). In the plugin the processor keeps the view with the DAW project. */
  async 'patch-view'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await keepPresets(p);
    const view = () =>
      p.evaluate(() => {
        const a = (window as any).__bd_probe.v1App;
        return {
          zoom: +a.ZoomLevel.toFixed(3),
          x: +a.DragOffset.x.toFixed(3),
          y: +a.DragOffset.y.toFixed(3),
        };
      });
    await p.evaluate(() => {
      const s = (window as any).__bd_probe.scene;
      s.pinchView(0.5, { x: 3, y: -2 });
      s.host.setZoom(0.5);
      s.host.setDrag({ x: 3, y: -2 });
      s.pinchEnd();
    });
    await p.waitForTimeout(300);
    const saved = await p.evaluate(() => (window as any).__bd_probe.state.patch);
    // Reopened (as the autosave, a link or a file would be).
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((pt) => {
      localStorage.setItem('blokdust2.autosave', pt);
    }, JSON.stringify(saved));
    const q = await ctx.newPage();
    q.on('pageerror', (e) => errors.push(e.message));
    await q.goto(`${url}/index.html`);
    await q.waitForFunction(() => (window as any).__bd_probe);
    await q.click('#start');
    await q.waitForTimeout(1500);
    const reopened = await q.evaluate(() => {
      const a = (window as any).__bd_probe.v1App;
      return {
        zoom: +a.ZoomLevel.toFixed(3),
        x: +a.DragOffset.x.toFixed(3),
        y: +a.DragOffset.y.toFixed(3),
      };
    });
    await ctx.close();
    // A preset with a view: Step Sequencer opens zoomed out.
    await openList(p);
    await rowButton(p, 'open', 'Step Sequencer', 300);
    if ((await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View)) === 'confirm')
      await patchesClick(p, 'openAnyway', 600);
    await p.waitForTimeout(800);
    const preset = await view();
    await p.close();
    // Plugin: the processor's patch carries a view; the page shows it, and reports a new view back (bd_view).
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
      const a = (window as any).__bd_probe.v1App;
      return {
        zoom: +a.ZoomLevel.toFixed(3),
        x: +a.DragOffset.x.toFixed(3),
        y: +a.DragOffset.y.toFixed(3),
      };
    });
    await pg.evaluate(() => {
      const s = (window as any).__bd_probe.scene;
      s.pinchView(2, { x: 1, y: 1 });
      s.host.setZoom(2);
      s.host.setDrag({ x: 1, y: 1 });
      s.pinchEnd();
    });
    await pg.waitForTimeout(1500);
    const reported = await pg.evaluate(
      () => (window as any).__sent.filter((x: any) => x.id === 'bd_view').pop()?.v,
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
  /** Owner (2026-11-11): a trackpad pinch zooms smoothly about the pointer, as a pinch on a touch screen does. Chrome
   * and Firefox send it as wheel events with ctrlKey (CDP modifiers 2); Safari as gesture events. (A plain wheel zooms
   * too since CHG-0010: mouse-wheel-zoom.) */
  async 'trackpad-pinch'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const cdp = await p.context().newCDPSession(p);
    const zoom = () =>
      p.evaluate(() => (window as any).__bd_probe.v1App.ZoomLevel) as Promise<number>;
    const cx = 900,
      cy = 300;
    // The grid point under the pointer: found from two grid points' css positions.
    const gridAt = async () => {
      const [ax, ay] = await toCss(p, 0, 0),
        [bx, by] = await toCss(p, 1, 1);
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
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(100);
    const z1 = await zoom(),
      g1 = await gridAt();
    for (let i = 0; i < 30; i++) {
      await pinchStep(8);
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(400);
    const z2 = await zoom();
    const z3 = await zoom();
    // Safari (macOS): gesture events, no touches.
    await p.mouse.move(cx, cy);
    const z4a = await zoom();
    await p.evaluate(
      ([x, y]) => {
        const st = document.getElementById('stage')!;
        const ev = (type: string, scale: number) => {
          const value = new Event(type, { bubbles: true, cancelable: true }) as any;
          value.scale = scale;
          value.clientX = x;
          value.clientY = y;
          st.dispatchEvent(value);
        };
        ev('gesturestart', 1);
        ev('gesturechange', 1.2);
        ev('gesturechange', 1.5);
        ev('gestureend', 1.5);
      },
      [cx, cy],
    );
    await p.waitForTimeout(100);
    const z4 = await zoom();
    await p.close();
    const r = { z0, z1, anchor: [g0, g1], z2, z3, z4a, z4 };
    const ok =
      z1 > z0 * 1.3 &&
      Math.abs(g0[0] - g1[0]) < 0.05 &&
      Math.abs(g0[1] - g1[1]) < 0.05 &&
      ![0.15, 0.25, 0.5, 1, 2, 4].includes(z1) &&
      z2 < z1 &&
      z3 === z2 &&
      Math.abs(z4 / z4a - 1.5) < 0.01;
    return [ok, r];
  },
  /** CHG-0010 (owner, 2026-11-12): the mouse wheel zooms like a pinch, smoothly about the pointer (the grid point under
   * it stays put), within 0.15×–4× (v1 0.25×; CHG-0035). A wheel over an open panel (Settings) leaves the stage's zoom alone. Owner
   * (2026-11-12): half a pinch's sensitivity, so one notch (deltaY 100, clamped to 25) is ×e^0.125 ≈ 1.13. */
  async 'mouse-wheel-zoom'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const zoom = () =>
      p.evaluate(() => (window as any).__bd_probe.v1App.ZoomLevel) as Promise<number>;
    const cx = 900,
      cy = 300;
    const gridAt = async () => {
      const [ax, ay] = await toCss(p, 0, 0),
        [bx, by] = await toCss(p, 1, 1);
      return [(cx - ax) / (bx - ax), (cy - ay) / (by - ay)];
    };
    await p.mouse.move(cx, cy);
    const g0 = await gridAt(),
      z0 = await zoom();
    await p.mouse.wheel(0, -100);
    await p.waitForTimeout(100); // one notch towards you: in
    const zNotch = await zoom();
    for (let i = 0; i < 2; i++) {
      await p.mouse.wheel(0, -100);
      await p.waitForTimeout(30);
    }
    await p.waitForTimeout(100);
    const z1 = await zoom(),
      g1 = await gridAt();
    for (let i = 0; i < 40; i++) {
      await p.mouse.wheel(0, 100);
      await p.waitForTimeout(10);
    } // far out: stops at 0.15
    await p.waitForTimeout(400);
    const z2 = await zoom();
    // Settings open: the wheel is the panel's.
    for (
      let i = 0;
      i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await p.mouse.click(1233, 45);
      await p.waitForTimeout(700);
    }
    await p.mouse.move(640, 400);
    await p.mouse.wheel(0, -100);
    await p.waitForTimeout(400);
    const z3 = await zoom();
    await p.close();
    const ok =
      Math.abs(zNotch / z0 - Math.exp(0.125)) < 0.01 &&
      z1 > z0 * 1.3 &&
      Math.abs(g0[0] - g1[0]) < 0.05 &&
      Math.abs(g0[1] - g1[1]) < 0.05 &&
      Math.abs(z2 - 0.15) < 1e-6 &&
      z3 === z2;
    return [ok, { z0, zNotch, z1, anchor: [g0, g1], z2, z3 }];
  },
  // Owner (2026-11-17, CHG-0035): the zoom goes out to 0.15 (v1 stopped at 0.25).
  async 'zoom-out-to-0-15'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    for (let i = 0; i < 5; i++) {
      await p.evaluate(() => (window as any).__bd_probe.scene.ZoomButtons.ZoomOut());
      await p.waitForTimeout(700);
    }
    const zoom = await p.evaluate(() => (window as any).__bd_probe.v1App.ZoomLevel);
    await p.screenshot({ path: `${OUT}/zoom-out-to-0-15.png` });
    await p.close();
    return [Math.abs(zoom - 0.15) < 1e-9, { zoom }];
  },
  /** Owner (2026-11-10): Patches opens on the tab last chosen, also after a reload; OPEN FROM YOUR DEVICE is the OPEN
   * tab's main button, filled in v1's SAVE colour (MenuOrder[3]) like the old GUIDE button. */
  /** Owner (2026-11-16, CHG-0025, iPad): above GarageBand's keyboard the plugin is ~1000×290 points. v1 sized the
   * UI from the width alone, so the Patches name field covered the OPEN tab and Settings' rows ran into its tabs. Past
   * 2:1 the height sets the unit (stage/metrics.ts MAX_ASPECT): both tabs are on top and switch, and the chrome and the
   * stage share one unit. */
  async 'short-wide-view'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1000, height: 290 },
      deviceScaleFactor: 2,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForTimeout(1500);
    const units = await p.evaluate(() => {
      const A = (window as any).__bd_probe.v1App;
      return { unit: A.Unit, grid: A.GridSize };
    });
    await p.evaluate(() => {
      try {
        localStorage.removeItem('blokdust.patchesTab');
      } catch {
        /* */
      }
      (window as any).__bd_probe.scene.PatchesPanel.OpenPanel();
    });
    await p.waitForTimeout(1200);
    const [ox, oy] = await patchesAt(p, 'tab1');
    const onTop = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName, [ox, oy]);
    await p.mouse.move(ox, oy);
    await p.mouse.click(ox, oy);
    await p.waitForTimeout(700);
    const patchesTab = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    await p.screenshot({ path: `${OUT}/short-wide-patches.png` });
    await patchesClick(p, 'close', 900);
    await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.OpenPanel());
    await p.waitForTimeout(1200);
    const [ax, ay] = await p.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
        A = (window as any).__bd_probe.v1App,
        pr = A.Metrics.PixelRatio;
      return [
        settingsPanel.MenuItems[2].Position.x / pr,
        (settingsPanel.OffsetY + settingsPanel.Height * A.Unit * 0.5) / pr,
      ]; // [1] is the divider
    });
    await p.mouse.move(ax, ay);
    await p.mouse.click(ax, ay);
    await p.waitForTimeout(900);
    const settingsTab = await p.evaluate(
      () => (window as any).__bd_probe.scene.SettingsPanel._OpenTab,
    );
    await p.screenshot({ path: `${OUT}/short-wide-about.png` });
    await ctx.close();
    const want = ((290 * 2) / 850) * 2; // height · MAX_ASPECT ÷ 850, at device pixel ratio 2
    const ok =
      Math.abs(units.unit - want) < 1e-6 &&
      onTop === 'CANVAS' &&
      patchesTab === 1 &&
      settingsTab === 2;
    return [ok, { units, want, openTabUnder: onTop, patchesTab, settingsTab }];
  },
};
