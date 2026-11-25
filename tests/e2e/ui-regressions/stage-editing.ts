// ui-regressions: Clearing, duplicating, selecting and drawing blocks on the stage.
import {
  OUT,
  blk,
  blockAt,
  browser,
  comp,
  open,
  state,
  toCss,
  type Block,
  type RegressionTest,
  url,
} from './harness.ts';
import { BLOCKS } from '../../../web/src/generated/blocks.gen.ts';
import { drawnPoints, insidePolygon, selectionRing } from '../../../web/src/stage/ring.ts';
import type { GeometryLayer } from '../../../web/src/generated/blocks.gen.ts';
import type { Metrics } from '../../../web/src/stage/metrics.ts';
import type { Theme } from '../../../web/src/generated/palettes.gen.ts';
import type { PatchItem } from '../../../web/src/v1ui/patches/hosts.ts';

export const stageEditingTests: Record<string, RegressionTest> = {
  /** CreateNew (+, then ✓) clears the stage (v1 MainScene.ResetScene) and closes: v1 checks its
   * state once after deleting every block; checking per block kept "CLEAR THE STAGE?" open. */
  async 'clear-stage'(errors) {
    const page = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, 0)],
      errors,
    );
    await page.mouse.click(37, 45);
    await page.waitForTimeout(900); // icon (IconPos 25·unit, header centre)
    await page.mouse.click(195, 135);
    await page.waitForTimeout(1200); // ✓ (TickX 130·unit, header row 1.5)
    const cleared = await state(page);
    const ui = await page.evaluate(() => {
      const createNew = window.__bd_probe.scene.CreateNew;
      return {
        open: createNew.Open,
        selected: createNew.Selected,
        panelY: createNew.PanelOffset.y,
        iconX: createNew.IconOffset.x,
      };
    });
    await page.screenshot({ path: `${OUT}/clear-stage.png` });
    await page.close();
    const closed = !ui.open && ui.selected === 0 && ui.panelY === -1 && ui.iconX === -1;
    return [
      cleared.blocks.length === 0 && cleared.patch.blocks.length === 0 && closed,
      { blocks: cleared.blocks.length, patchBlocks: cleared.patch.blocks.length, ui },
    ];
  },
  /** SPEC-SIMULATION-POWER-AND-PARTICLES R1b: after CLEAR, or opening a preset, the old patch's
   * particles no longer fly across the new stage. */
  async 'clear-and-open-clear-particles'(errors) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const fire = () =>
      page.evaluate(() => {
        const host = window.__bd_probe.scene.host,
          id = host.createBlock('ParticleEmitter', -6, 0);
        if (id === null) throw new Error('no emitter made');
        host.setParam(id, 'selfPoweredMode', 1);
        host.setParam(id, 'speed', 1);
      });
    const flying = () =>
      page
        .waitForFunction(() => window.__bd_probe.state.particles > 2, null, {
          timeout: 10000,
        })
        .then(() => true)
        .catch(() => false);
    await fire();
    await page.mouse.click(5, 400);
    const before = await flying();
    await page.mouse.click(37, 45);
    await page.waitForTimeout(900); // CLEAR (as clear-stage)
    await page.mouse.click(195, 135);
    await page.waitForTimeout(600);
    const afterClear = await page.evaluate(() => window.__bd_probe.state.particles);
    await fire();
    await page.mouse.click(5, 400);
    const before2 = await flying();
    await page.evaluate(async () => {
      await window.__bd_probe.scene.host.openPatch(
        { key: 'preset:01-computer-keys-2-tones.blokdust' } as PatchItem,
        'open',
      );
    });
    await page.waitForTimeout(150);
    const afterOpen = await page.evaluate(() => window.__bd_probe.state.particles);
    await page.close();
    return [
      before && afterClear === 0 && before2 && afterOpen === 0,
      { before, afterClear, before2, afterOpen },
    ];
  },
  /** Alt + drag duplicates the block with its params and drags the copy (v1 Block.MouseMove). */
  async 'alt-duplicate'(errors) {
    const page = await open(
      browser,
      [{ ...blk(1, 'ToneSource', -6, 3), Params: { waveform: 3, transpose: 7 } } as Block],
      errors,
    );
    const [x, y] = await toCss(page, -6, 3.2);
    await page.keyboard.down('Alt');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y + 30, { steps: 5 });
    await page.mouse.move(x + 260, y + 90, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await page.waitForTimeout(400);
    const blocks = (await state(page)).patch.blocks;
    await page.screenshot({ path: `${OUT}/alt-duplicate.png` });
    await page.close();
    const tones = blocks.filter((b) => b.type === 'source.tone');
    const original = tones.find((b) => b.x === -6 && b.y === 3),
      copy = tones.find((b) => b !== original);
    return [
      tones.length === 2 &&
        !!original &&
        !!copy &&
        copy.params?.waveform === 3 &&
        copy.params.transpose === 7 &&
        (copy.x !== -6 || copy.y !== 3),
      { blocks: blocks.map((b) => [b.type, b.x, b.y, b.params]) },
    ];
  },
  /** Every block's multi-select ring encloses all it draws as a polygon (it cut through the MIDI
   * Keyboard: v1's hit outline leaves out a corner it draws). */
  'select-ring-encloses-block'() {
    const misses = BLOCKS.flatMap((def) =>
      drawnPoints(def)
        .filter((point) => !insidePolygon(point, selectionRing(def)))
        .map((point) => `${def.id} (${point.join()})`),
    );
    return Promise.resolve([misses.length === 0, { misses }]);
  },
  /** CHG-0005: Shift+click, Shift+drag or a held finger selects blocks; dragging, Alt+drag,
   * Cmd/Ctrl+D, Delete and the trash act on them all; Esc or a tap on the stage clears. */
  async 'multi-select'(errors: string[]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 0), blk(2, 'ToneSource', -4, 0), blk(3, 'Filter', 4, 0), blk(4, 'Power', 12, 0)])}`,
    );
    await page.waitForFunction(() => window.__bd_probe);
    await page.click('#start');
    await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
    await page.waitForTimeout(1200);
    const eid = await page.evaluate(() => window.__bd_probe.state.blocks.map((b) => b.id));
    const sel = () => page.evaluate(() => window.__bd_selection().sort((a, b) => a - b));
    const pos = () =>
      page.evaluate(() =>
        window.__bd_probe.state.blocks.map((b): [number, number, number] => [b.id, b.x, b.y]),
      );
    const at = (id: number) => blockAt(page, id);
    const count = async () => (await pos()).length;
    const drag = async (from: [number, number], to: [number, number], steps = 10) => {
      await page.mouse.move(from[0], from[1]);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++)
        await page.mouse.move(
          from[0] + ((to[0] - from[0]) * i) / steps,
          from[1] + ((to[1] - from[1]) * i) / steps,
        );
      await page.mouse.up();
      await page.waitForTimeout(300);
    };
    const result: Record<string, unknown> = {};
    const sorted = (ids: number[]) => JSON.stringify([...ids].sort((a, b) => a - b));
    // Shift+click two blocks; drag one: both move.
    await page.keyboard.down('Shift');
    for (const id of [eid[0], eid[1]]) {
      const [x, y] = await at(id);
      await page.mouse.click(x, y);
      await page.waitForTimeout(150);
    }
    await page.keyboard.up('Shift');
    const shiftClick = await sel();
    result.shiftClick = shiftClick;
    await page.screenshot({ path: `${OUT}/multi-select.png` });
    const before = await pos(),
      a0 = await at(eid[0]);
    await drag(a0, [a0[0] + 60, a0[1] + 90]);
    const after = await pos(),
      find = (list: [number, number, number][], id: number) => {
        const entry = list.find((row) => row[0] === id);
        if (!entry) throw new Error(`block ${id} is gone`);
        return entry;
      };
    const delta = (i: number) => [
      find(after, eid[i])[1] - find(before, eid[i])[1],
      find(after, eid[i])[2] - find(before, eid[i])[2],
    ];
    result.groupMove = [delta(0), delta(1), delta(2)];
    const groupMoved =
      delta(0)[1] > 0 &&
      JSON.stringify(delta(0)) === JSON.stringify(delta(1)) &&
      delta(2)[0] === 0 &&
      delta(2)[1] === 0;
    // A tap on the stage clears.
    await page.mouse.click(300, 650);
    await page.waitForTimeout(300); // (not the power switch, bottom centre)
    const afterTap = await sel();
    result.afterTap = afterTap;
    // Shift+drag a box over the Filter and the Power.
    const [fx, fy] = await at(eid[2]),
      [qx, qy] = await at(eid[3]);
    await page.keyboard.down('Shift');
    await drag([fx - 40, fy - 70], [qx + 40, qy + 70]);
    await page.keyboard.up('Shift');
    const box = await sel();
    result.box = box;
    // Alt+drag one of them: both copied, the copies selected and moved; the originals stay.
    const n0 = await count(),
      f0 = await at(eid[2]);
    await page.keyboard.down('Alt');
    await drag(f0, [f0[0], f0[1] - 150]);
    await page.keyboard.up('Alt');
    const copies = await sel(),
      posAlt = await pos();
    result.altCopy = { n0, n: posAlt.length, copies };
    const altOk =
      posAlt.length === n0 + 2 &&
      copies.length === 2 &&
      !copies.includes(eid[2]) &&
      !copies.includes(eid[3]) &&
      find(posAlt, eid[2])[2] === find(before, eid[2])[2];
    // Cmd/Ctrl+D duplicates the selection; Delete deletes it.
    await page.keyboard.press('ControlOrMeta+d');
    await page.waitForTimeout(300);
    const nd = await count(),
      dup = await sel();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    result.dupDelete = {
      afterDup: nd,
      dupSelected: dup.length,
      afterDelete: await count(),
      sel: await sel(),
    };
    const dupOk = nd === n0 + 4 && dup.length === 2 && (await count()) === n0 + 2;
    // Esc clears.
    await page.keyboard.down('Shift');
    {
      const [x, y] = await at(eid[0]);
      await page.mouse.click(x, y);
    }
    await page.keyboard.up('Shift');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const esc = await sel();
    result.esc = esc;
    // Touch: hold a finger still on the stage, then drag a box over the two tones.
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
    const [t1x, t1y] = await at(eid[0]),
      [t2x, t2y] = await at(eid[1]);
    const view0 = await page.evaluate(() => {
      const { x, y } = window.__bd_probe.v1App.DragOffset;
      return { x, y };
    });
    await touch('touchStart', Math.min(t1x, t2x) - 50, Math.min(t1y, t2y) - 80);
    await page.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) {
      await touch(
        'touchMove',
        Math.min(t1x, t2x) - 50 + ((Math.max(t1x, t2x) - Math.min(t1x, t2x) + 100) * i) / 8,
        Math.min(t1y, t2y) - 80 + ((Math.abs(t2y - t1y) + 160) * i) / 8,
      );
      await page.waitForTimeout(16);
    }
    await page.screenshot({ path: `${OUT}/multi-select-box.png` });
    await touch('touchEnd', 0, 0);
    await page.waitForTimeout(300);
    const view1 = await page.evaluate(() => {
      const { x, y } = window.__bd_probe.v1App.DragOffset;
      return { x, y };
    });
    const touchBox = { sel: await sel(), viewStill: view0.x === view1.x && view0.y === view1.y };
    result.touchBox = touchBox;
    // Drag the selection onto the trash: both deleted.
    const nt = await count(),
      grabbed = await at(eid[0]);
    await drag(grabbed, [1250, 770], 14);
    const trash = { before: nt, after: await count() };
    result.trash = trash;
    await context.close();
    const ok =
      JSON.stringify(shiftClick) === sorted([eid[0], eid[1]]) &&
      groupMoved &&
      afterTap.length === 0 &&
      JSON.stringify(box) === sorted([eid[2], eid[3]]) &&
      altOk &&
      dupOk &&
      esc.length === 0 &&
      JSON.stringify(touchBox.sel) === sorted([eid[0], eid[1]]) &&
      touchBox.viewStill &&
      trash.after === nt - 2;
    return [ok, result];
  },
  /** Block faces are drawn without a hairline of the face beneath round their edges: each pixel is
   * within a lone polygon's anti-aliasing error of v1's layers drawn 8× and averaged down. */
  async 'block-edges-clean'(errors: string[]) {
    const page = await open(browser, [], errors);
    const result = await page.evaluate(() => {
      const { drawBlocks, BLOCKS_BY_ID } = window.__bd_probe.blockDrawing,
        pal = window.__bd_probe.v1App.Palette;
      const GRID = 37.3,
        SUPERSAMPLE = 8,
        SIZE = (6 * GRID) | 0,
        OX = SIZE / 2 + 0.37,
        OY = SIZE / 2 + 0.61;
      const canvas = (scale: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = SIZE * scale;
        const x = canvas.getContext('2d', { willReadFrequently: true });
        if (!x) throw new Error('no 2D canvas');
        x.fillStyle = pal[0];
        x.fillRect(0, 0, canvas.width, canvas.height);
        return x;
      };
      const v1Draw = (x: CanvasRenderingContext2D, layers: GeometryLayer[], scale: number) => {
        for (const layer of layers) {
          x.beginPath();
          layer.points.forEach(([px, py], i) => {
            const cx = (OX + px * GRID) * scale,
              cy = (OY + py * GRID) * scale;
            if (i) x.lineTo(cx, cy);
            else x.moveTo(cx, cy);
          });
          x.closePath();
          x.fillStyle = pal[layer.palette];
          x.fill();
        }
      };
      // Each pixel against its true mix of colours (v1's layers drawn 8×, averaged down). Corners
      // are left out: there even a lone polygon's anti-aliasing differs from the average.
      const worst = (
        got: CanvasRenderingContext2D,
        ref: CanvasRenderingContext2D,
        corners: number[][],
      ) => {
        const pixels = got.getImageData(0, 0, SIZE, SIZE).data,
          big = ref.getImageData(0, 0, SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE).data;
        let largest = 0;
        for (let y = 0; y < SIZE; y++)
          for (let x = 0; x < SIZE; x++) {
            if (corners.some(([cx, cy]) => Math.hypot(cx - x - 0.5, cy - y - 0.5) < 2.5)) continue;
            for (let ch = 0; ch < 3; ch++) {
              let sum = 0;
              for (let j = 0; j < SUPERSAMPLE; j++)
                for (let i = 0; i < SUPERSAMPLE; i++)
                  sum +=
                    big[
                      ((y * SUPERSAMPLE + j) * SIZE * SUPERSAMPLE + x * SUPERSAMPLE + i) * 4 + ch
                    ];
              largest = Math.max(
                largest,
                Math.abs(sum / (SUPERSAMPLE * SUPERSAMPLE) - pixels[(y * SIZE + x) * 4 + ch]),
              );
            }
          }
        return Math.round(largest);
      };
      const out: Record<string, { lone: number; drawn: number }> = {};
      for (const [id, def] of BLOCKS_BY_ID) {
        const layers = def.geometry.layers;
        // The stars are pixel layers, drawn as v1.
        if (layers.some((layer) => layer.units === 'unit')) continue;
        const corners = layers.flatMap((layer) =>
          layer.points.map(([px, py]) => [OX + px * GRID, OY + py * GRID]),
        );
        const ref = canvas(SUPERSAMPLE);
        v1Draw(ref, layers, SUPERSAMPLE);
        const got = canvas(1);
        drawBlocks(
          got,
          { originX: OX, originY: OY, scaledGridSize: GRID } as Metrics,
          { colors: pal } as Theme,
          [{ block: { id: 1, type: id, x: 0, y: 0 }, def }],
        );
        // The same measure for each layer alone: what anti-aliasing gets wrong anyway.
        let lone = 0;
        for (const layer of layers) {
          const a = canvas(1),
            b = canvas(SUPERSAMPLE);
          v1Draw(a, [layer], 1);
          v1Draw(b, [layer], SUPERSAMPLE);
          lone = Math.max(lone, worst(a, b, corners));
        }
        out[id] = { lone, drawn: worst(got, ref, corners) };
      }
      return out;
    });
    await page.close();
    // v1's way (faces over a whole base) was up to 74 out; a hairline is well past a lone polygon.
    const bad = Object.fromEntries(
      Object.entries(result).filter(([, value]) => value.drawn > value.lone + 12),
    );
    return [
      Object.keys(result).length > 40 && Object.keys(bad).length === 0,
      { bad, worst: Math.max(...Object.values(result).map((value) => value.drawn)) },
    ];
  },
};
