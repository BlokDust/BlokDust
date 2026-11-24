// ui-regressions: Touch input: trash, inserting patches and several fingers at once.
import { OUT, blk, browser, comp, state, toCss, type RegressionTest, url } from './harness.ts';
import { keepPresets, patchesAt } from './patchesPanel.ts';

export const touchTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-08, mobile): after dragging a block onto the trash, tapping another block deleted it too. The
   * trash only noticed where the pointer was on pointermove; a finger lifts and lands elsewhere without one, so the
   * next drag "ended over the trash". Real touches through CDP (Input.dispatchTouchEvent). */
  async 'touch-trash-once'(errors) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    const [ax, ay] = await toCss(p, -6, 0),
      [bx, by] = await toCss(p, 6, 0);
    await touch('touchStart', ax + 4, ay + 4);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', ax + 4 + ((1250 - ax) * i) / 12, ay + 4 + ((770 - ay) * i) / 12);
      await p.waitForTimeout(16);
    }
    await touch('touchEnd', 0, 0);
    await p.waitForTimeout(400);
    const afterTrash = (await state(p)).blocks.length;
    await touch('touchStart', bx + 4, by + 4);
    await p.waitForTimeout(60);
    await touch('touchEnd', 0, 0);
    await p.waitForTimeout(600);
    const afterTap = (await state(p)).blocks.length;
    await p.screenshot({ path: `${OUT}/touch-trash-once.png` });
    await ctx.close();
    return [afterTrash === 1 && afterTap === 1, { afterTrash, afterTap }];
  },
  /** Owner (2026-11-10): on a touch screen an Insert lands in the middle of the view; a finger drags it (from wherever
   * it lands, without jumping) and lifting the finger puts it down. */
  async 'insert-touch'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    const tap = async (x: number, y: number) => {
      await touch('touchStart', x, y);
      await p.waitForTimeout(40);
      await touch('touchEnd', 0, 0);
      await p.waitForTimeout(700);
    };
    await keepPresets(p);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(1));
    await p.waitForTimeout(1200);
    const [ix, iy] = await patchesAt(p, 'ins0');
    await tap(ix, iy);
    const blocks = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.state.patch.blocks.slice(1).map((b: any) => [b.x, b.y]),
      );
    const atStart = await blocks(),
      placing = await p.evaluate(() => (window as any).__bd_placing());
    await touch('touchStart', 900, 700);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', 900 - 30 * i, 700 - 30 * i);
      await p.waitForTimeout(16);
    }
    const moving = await p.evaluate(() => !!(window as any).__bd_placing());
    await touch('touchEnd', 0, 0);
    await p.waitForTimeout(400);
    const after = await blocks(),
      done = await p.evaluate(() => (window as any).__bd_placing());
    const selected = await p.evaluate(() => (window as any).__bd_selection()); // owner, 2026-11-11: an Insert is not selected
    await p.screenshot({ path: `${OUT}/insert-touch.png` });
    await ctx.close();
    const [gx0, gy0] = atStart[0] ?? [0, 0],
      [gx1, gy1] = after[0] ?? [0, 0];
    const ok =
      placing?.touch === true &&
      atStart.length === 6 &&
      moving &&
      !done &&
      after.length === 6 &&
      gx1 < gx0 &&
      gy1 < gy0 &&
      selected.length === 0;
    return [ok, { placing, atStart, after, selected }];
  },
  /** CHG-0005 task 8 (owner): multi-touch. Each finger drags its own block (powered while held, drawn pressed); two
   * fingers on the stage pinch-zoom about their midpoint (which stays over the same spot) within 0.15×–4× (v1 0.25×; CHG-0035);
   * two fingers on two sliders of the open options panel move each its own. One finger behaves as before. */
  async multitouch(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    // Distortion: an effect with two sliders (the Filter's became a graph in CHG-0010).
    await p.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 6), blk(2, 'ToneSource', 12, 6), blk(3, 'Distortion', 0, -4)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const down = new Map<number, { x: number; y: number }>();
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel') =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: [...down.entries()].map(([id, value]) => ({ id, x: value.x, y: value.y })),
      });
    const start = async (id: number, x: number, y: number) => {
      down.set(id, { x, y });
      await send('touchStart');
      await p.waitForTimeout(30);
    };
    const move = async (moves: [number, number, number][], steps = 8) => {
      const from = moves.map(([id]) => ({ ...down.get(id)! }));
      for (let i = 1; i <= steps; i++) {
        moves.forEach(([id, x, y], k) =>
          down.set(id, {
            x: from[k].x + ((x - from[k].x) * i) / steps,
            y: from[k].y + ((y - from[k].y) * i) / steps,
          }),
        );
        await send('touchMove');
        await p.waitForTimeout(16);
      }
    };
    const end = async (id: number) => {
      down.delete(id);
      await send(down.size ? 'touchMove' : 'touchEnd');
      await p.waitForTimeout(60);
    };
    const endAll = async () => {
      down.clear();
      await send('touchEnd');
      await p.waitForTimeout(300);
    };
    const pos = () =>
      p.evaluate(() =>
        Object.fromEntries(
          (window as any).__bd_probe.state.patch.blocks.map((b: any) => [b.id, [b.x, b.y]]),
        ),
      );
    const at = (id: number) =>
      p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const view = () =>
      p.evaluate(() => {
        const a = (window as any).__bd_probe.v1App;
        return { zoom: a.ZoomLevel, drag: { x: a.DragOffset.x, y: a.DragOffset.y } };
      });
    const ids = Object.keys(await pos()); // tone, tone, distortion (patch ids)
    const eid = await p.evaluate(() =>
      (window as any).__bd_probe.state.blocks.map((b: any) => b.id),
    ); // engine ids, same order

    // 1. Two fingers, two blocks.
    const before = await pos();
    const [ax, ay] = await at(eid[0]),
      [bx, by] = await at(eid[1]);
    await start(1, ax, ay);
    await start(2, bx, by);
    const held = await p.evaluate(() => (window as any).__bd_touch());
    await move([
      [1, ax - 120, ay - 60],
      [2, bx + 120, by - 60],
    ]);
    await endAll();
    const after = await pos();
    const moved = (id: string, dx: number) =>
      Math.sign(after[id][0] - before[id][0]) === dx && after[id][1] < before[id][1];
    const twoBlocks =
      moved(ids[0], -1) &&
      moved(ids[1], 1) &&
      held.primaryRole === 'block' &&
      held.extras[0]?.[1]?.kind === 'block';

    // 2. Pinch on the empty stage: spread to twice the distance → 2×, the midpoint keeps the same stage point.
    const v0 = await view(),
      probeAt = (x: number, y: number) =>
        p.evaluate(([x, y]) => (window as any).__bd_probe.cssToGrid?.(x, y) ?? null, [x, y]);
    const mid0 = await probeAt(640, 560);
    await start(1, 590, 560);
    await start(2, 690, 560);
    await move(
      [
        [1, 540, 560],
        [2, 740, 560],
      ],
      10,
    );
    const pinched = await p.evaluate(() => (window as any).__bd_touch());
    await endAll();
    const v1 = await view(),
      mid1 = await probeAt(640, 560);
    await p.screenshot({ path: `${OUT}/multitouch-pinch.png` });
    await start(1, 440, 560);
    await start(2, 840, 560);
    await move(
      [
        [1, 630, 560],
        [2, 650, 560],
      ],
      10,
    ); // pinch right in: stops at 0.15×
    await endAll();
    const v2 = await view();
    const pinch =
      pinched.pinch &&
      Math.abs(v1.zoom - 2 * v0.zoom) < 0.05 &&
      (!mid0 || (Math.abs(mid0[0] - mid1[0]) < 0.2 && Math.abs(mid0[1] - mid1[1]) < 0.2)) &&
      v2.zoom === 0.15;
    await p.evaluate(() => {
      const s = (window as any).__bd_probe.scene;
      s.pinchView(1, { x: 0, y: 0 });
      s.host.setZoom(1);
      s.host.setDrag({ x: 0, y: 0 });
    });
    await p.waitForTimeout(300);

    // 3. The Distortion's options panel: one finger on each of two sliders.
    const [fx, fy] = await at(eid[2]);
    await start(1, fx, fy);
    await end(1);
    await p.waitForTimeout(900);
    const rows = await p.evaluate(() => {
      const optionsPanel = (window as any).__bd_probe.scene.OptionsPanel,
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return optionsPanel.Options.map((opt: any, i: number) => ({
        i,
        type: opt.Type,
        setting: opt.Setting,
        y: (optionsPanel.Position.y + opt.Position.y + opt.Size.height / 2) / pr,
        x0: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
        w: optionsPanel.Range / pr,
        value: opt.Value,
      })).filter((r: any) => r.type === 'slider');
    });
    const [r1, r2] = rows;
    await start(1, r1.x0 + r1.w * 0.5, r1.y);
    await start(2, r2.x0 + r2.w * 0.5, r2.y);
    await move([
      [1, r1.x0 + r1.w * 0.1, r1.y],
      [2, r2.x0 + r2.w * 0.9, r2.y],
    ]);
    const sliders = await p.evaluate(() =>
      (window as any).__bd_probe.scene.OptionsPanel.Options.filter(
        (Option: any) => Option.Type === 'slider',
      ).map((o: any) => o.Position.x / (window as any).__bd_probe.scene.OptionsPanel.Range),
    );
    await p.screenshot({ path: `${OUT}/multitouch-sliders.png` });
    await endAll();
    const twoSliders =
      rows.length >= 2 && Math.abs(sliders[0] - 0.1) < 0.03 && Math.abs(sliders[1] - 0.9) < 0.03;
    await ctx.close();
    return [
      twoBlocks && pinch && twoSliders,
      {
        twoBlocks: { before, after, held },
        pinch: { v0, v1, v2, mid0, mid1, pinched },
        sliders: { rows: rows.map((row: any) => row.setting), sliders },
      },
    ];
  },
};
