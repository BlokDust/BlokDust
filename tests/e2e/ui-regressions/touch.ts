// ui-regressions: Touch input: trash, inserting patches and several fingers at once.
import { OUT, blk, browser, comp, state, toCss, type RegressionTest, url } from './harness.ts';
import { keepPresets, patchesAt } from './patchesPanel.ts';

export const touchTests: Record<string, RegressionTest> = {
  /** After a block was dragged to the trash, tapping another deleted it too: a finger lands
   * elsewhere with no pointermove, so the trash still saw the last spot. Real touches (CDP). */
  async 'touch-trash-once'(errors) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1200);
    const cdp = await context.newCDPSession(page);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    const [ax, ay] = await toCss(page, -6, 0),
      [bx, by] = await toCss(page, 6, 0);
    await touch('touchStart', ax + 4, ay + 4);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', ax + 4 + ((1250 - ax) * i) / 12, ay + 4 + ((770 - ay) * i) / 12);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(400);
    const afterTrash = (await state(page)).blocks.length;
    await touch('touchStart', bx + 4, by + 4);
    await page.waitForTimeout(60);
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(600);
    const afterTap = (await state(page)).blocks.length;
    await page.screenshot({ path: `${OUT}/touch-trash-once.png` });
    await context.close();
    return [afterTrash === 1 && afterTap === 1, { afterTrash, afterTap }];
  },
  /** On a touch screen an Insert lands mid-view; a finger drags it from wherever it lands, without
   * jumping, and lifting the finger puts it down. */
  async 'insert-touch'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0)])}`);
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1200);
    const cdp = await context.newCDPSession(page);
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
      await page.waitForTimeout(40);
      await touch('touchEnd', 0, 0);
      await page.waitForTimeout(700);
    };
    await keepPresets(page);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.OpenPanel(1);
    });
    await page.waitForTimeout(1200);
    const [ix, iy] = await patchesAt(page, 'ins0');
    await tap(ix, iy);
    const blocks = () =>
      page.evaluate(() =>
        window.__bd_probe.state.patch.blocks
          .slice(1)
          .map((b): [number, number] => [b.x ?? 0, b.y ?? 0]),
      );
    const atStart = await blocks(),
      placing = await page.evaluate(() => window.__bd_placing());
    await touch('touchStart', 900, 700);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', 900 - 30 * i, 700 - 30 * i);
      await page.waitForTimeout(16);
    }
    const moving = await page.evaluate(() => !!window.__bd_placing());
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(400);
    const after = await blocks(),
      done = await page.evaluate(() => window.__bd_placing());
    // An Insert is not selected.
    const selected = await page.evaluate(() => window.__bd_selection());
    await page.screenshot({ path: `${OUT}/insert-touch.png` });
    await context.close();
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
  /** CHG-0005, CHG-0035: each finger drags its own block; two on the stage pinch-zoom about their
   * midpoint within 0.15×–4×; two on two sliders move each its own. */
  async multitouch(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    // Distortion: an effect with two sliders (the Filter's became a graph in CHG-0010).
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 6), blk(2, 'ToneSource', 12, 6), blk(3, 'Distortion', 0, -4)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1200);
    const cdp = await context.newCDPSession(page);
    const down = new Map<number, { x: number; y: number }>();
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel') =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: [...down.entries()].map(([id, value]) => ({ id, x: value.x, y: value.y })),
      });
    const start = async (id: number, x: number, y: number) => {
      down.set(id, { x, y });
      await send('touchStart');
      await page.waitForTimeout(30);
    };
    const move = async (moves: [number, number, number][], steps = 8) => {
      const from = moves.map(([id]) => {
        const point = down.get(id);
        if (!point) throw new Error(`finger ${id} is not down`);
        return { ...point };
      });
      for (let i = 1; i <= steps; i++) {
        moves.forEach(([id, x, y], k) => {
          down.set(id, {
            x: from[k].x + ((x - from[k].x) * i) / steps,
            y: from[k].y + ((y - from[k].y) * i) / steps,
          });
        });
        await send('touchMove');
        await page.waitForTimeout(16);
      }
    };
    const end = async (id: number) => {
      down.delete(id);
      await send(down.size ? 'touchMove' : 'touchEnd');
      await page.waitForTimeout(60);
    };
    const endAll = async () => {
      down.clear();
      await send('touchEnd');
      await page.waitForTimeout(300);
    };
    const pos = () =>
      page.evaluate(() =>
        Object.fromEntries(
          window.__bd_probe.state.patch.blocks.map((b): [string, [number, number]] => [
            b.id,
            [b.x ?? 0, b.y ?? 0],
          ]),
        ),
      );
    const at = (id: number) =>
      page.evaluate((i) => window.__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const view = () =>
      page.evaluate(() => {
        const v1App = window.__bd_probe.v1App;
        return { zoom: v1App.ZoomLevel, drag: { x: v1App.DragOffset.x, y: v1App.DragOffset.y } };
      });
    // Patch ids, then engine ids in the same order: tone, tone, distortion.
    const ids = Object.keys(await pos());
    const eid = await page.evaluate(() => window.__bd_probe.state.blocks.map((b) => b.id));

    // 1. Two fingers, two blocks.
    const before = await pos();
    const [ax, ay] = await at(eid[0]),
      [bx, by] = await at(eid[1]);
    await start(1, ax, ay);
    await start(2, bx, by);
    const held = await page.evaluate(() => window.__bd_touch());
    await move([
      [1, ax - 120, ay - 60],
      [2, bx + 120, by - 60],
    ]);
    await endAll();
    const after = await pos();
    const moved = (id: string, dx: number) => {
      const from = before[id] as [number, number] | undefined,
        to = after[id] as [number, number] | undefined;
      return !!from && !!to && Math.sign(to[0] - from[0]) === dx && to[1] < from[1];
    };
    const twoBlocks =
      moved(ids[0], -1) &&
      moved(ids[1], 1) &&
      held.primaryRole === 'block' &&
      (held.extras[0]?.[1] as { kind?: string } | undefined)?.kind === 'block';

    // 2. Pinch on the empty stage: twice the distance is 2×; the midpoint keeps its stage point.
    const v0 = await view(),
      probeAt = (x: number, y: number) =>
        page.evaluate(([cssX, cssY]) => window.__bd_probe.cssToGrid(cssX, cssY), [x, y]);
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
    const pinched = await page.evaluate(() => window.__bd_touch());
    await endAll();
    const v1 = await view(),
      mid1 = await probeAt(640, 560);
    await page.screenshot({ path: `${OUT}/multitouch-pinch.png` });
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
      Math.abs(mid0[0] - mid1[0]) < 0.2 &&
      Math.abs(mid0[1] - mid1[1]) < 0.2 &&
      v2.zoom === 0.15;
    await page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      scene.pinchView(1, { x: 0, y: 0 });
      scene.host.setZoom(1);
      scene.host.setDrag({ x: 0, y: 0 });
    });
    await page.waitForTimeout(300);

    // 3. The Distortion's options panel: one finger on each of two sliders.
    const [fx, fy] = await at(eid[2]);
    await start(1, fx, fy);
    await end(1);
    await page.waitForTimeout(900);
    const rows = await page.evaluate(() => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return optionsPanel.Options.map((opt, i) => ({
        i,
        type: opt.Type,
        setting: opt.Setting,
        y: (optionsPanel.Position.y + opt.Position.y + opt.Size.height / 2) / pr,
        x0: (optionsPanel.Position.x + optionsPanel.Margin) / pr,
        w: optionsPanel.Range / pr,
        value: opt.Value,
      })).filter((result) => result.type === 'slider');
    });
    const [r1, r2] = rows;
    await start(1, r1.x0 + r1.w * 0.5, r1.y);
    await start(2, r2.x0 + r2.w * 0.5, r2.y);
    await move([
      [1, r1.x0 + r1.w * 0.1, r1.y],
      [2, r2.x0 + r2.w * 0.9, r2.y],
    ]);
    const sliders = await page.evaluate(() =>
      window.__bd_probe.scene.OptionsPanel.Options.filter((Option) => Option.Type === 'slider').map(
        (option) => option.Position.x / window.__bd_probe.scene.OptionsPanel.Range,
      ),
    );
    await page.screenshot({ path: `${OUT}/multitouch-sliders.png` });
    await endAll();
    const twoSliders =
      rows.length >= 2 && Math.abs(sliders[0] - 0.1) < 0.03 && Math.abs(sliders[1] - 0.9) < 0.03;
    await context.close();
    return [
      twoBlocks && pinch && twoSliders,
      {
        twoBlocks: { before, after, held },
        pinch: { v0, v1, v2, mid0, mid1, pinched },
        sliders: { rows: rows.map((row) => row.setting), sliders },
      },
    ];
  },
};
