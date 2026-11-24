// ui-regressions: Clearing, duplicating, selecting and drawing blocks on the stage.
import {
  OUT,
  blk,
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

export const stageEditingTests: Record<string, RegressionTest> = {
  /** CreateNew (the + icon, then ✓) clears the stage: v1 MainScene.ResetScene deletes every block and resets the view.
   * Owner (2026-11-08, web/mobile/plugin): after ✓ the "CLEAR THE STAGE?" panel stayed open with the icon frozen over
   * the logo. v1 checks CreateNew's state once after deleting them all; checking per block cancelled the close. */
  async 'clear-stage'(errors) {
    const p = await open(
      browser,
      [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, 0)],
      errors,
    );
    await p.mouse.click(37, 45);
    await p.waitForTimeout(900); // icon (IconPos 25·unit, header centre)
    await p.mouse.click(195, 135);
    await p.waitForTimeout(1200); // ✓ (TickX 130·unit, header row 1.5)
    const s = await state(p);
    const ui = await p.evaluate(() => {
      const createNew = (window as any).__bd_probe.scene.CreateNew;
      return {
        open: createNew.Open,
        selected: createNew.Selected,
        panelY: createNew.PanelOffset.y,
        iconX: createNew.IconOffset.x,
      };
    });
    await p.screenshot({ path: `${OUT}/clear-stage.png` });
    await p.close();
    const closed = !ui.open && ui.selected === 0 && ui.panelY === -1 && ui.iconX === -1;
    return [
      s.blocks.length === 0 && s.patch.blocks.length === 0 && closed,
      { blocks: s.blocks.length, patchBlocks: s.patch.blocks.length, ui },
    ];
  },
  /** Owner (2026-11-18): after CLEAR, or opening a preset, the old patch's particles went on flying across the new
   * stage (SPEC-SIMULATION-POWER-AND-PARTICLES R1b). */
  async 'clear-and-open-clear-particles'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const fire = () =>
      p.evaluate(() => {
        const h = (window as any).__bd_probe.scene.host,
          id = h.createBlock('ParticleEmitter', -6, 0);
        h.setParam(id, 'selfPoweredMode', 1);
        h.setParam(id, 'speed', 1);
      });
    const flying = () =>
      p
        .waitForFunction(() => (window as any).__bd_probe.state.particles > 2, null, {
          timeout: 10000,
        })
        .then(() => true)
        .catch(() => false);
    await fire();
    await p.mouse.click(5, 400);
    const before = await flying();
    await p.mouse.click(37, 45);
    await p.waitForTimeout(900); // CLEAR (as clear-stage)
    await p.mouse.click(195, 135);
    await p.waitForTimeout(600);
    const afterClear = await p.evaluate(() => (window as any).__bd_probe.state.particles as number);
    await fire();
    await p.mouse.click(5, 400);
    const before2 = await flying();
    await p.evaluate(() =>
      (window as any).__bd_probe.scene.host.openPatch(
        { key: 'preset:01-computer-keys-2-tones.blokdust' },
        'open',
      ),
    );
    await p.waitForTimeout(150);
    const afterOpen = await p.evaluate(() => (window as any).__bd_probe.state.particles as number);
    await p.close();
    return [
      before && afterClear === 0 && before2 && afterOpen === 0,
      { before, afterClear, before2, afterOpen },
    ];
  },
  /** Alt (Option) + drag duplicates the block with its params and drags the copy (v1 Block.MouseMove). */
  async 'alt-duplicate'(errors) {
    const p = await open(
      browser,
      [{ ...blk(1, 'ToneSource', -6, 3), Params: { waveform: 3, transpose: 7 } } as Block],
      errors,
    );
    const [x, y] = await toCss(p, -6, 3.2);
    await p.keyboard.down('Alt');
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 100, y + 30, { steps: 5 });
    await p.mouse.move(x + 260, y + 90, { steps: 5 });
    await p.mouse.up();
    await p.keyboard.up('Alt');
    await p.waitForTimeout(400);
    const blocks = (await state(p)).patch.blocks;
    await p.screenshot({ path: `${OUT}/alt-duplicate.png` });
    await p.close();
    const tones = blocks.filter((b: any) => b.type === 'source.tone');
    const original = tones.find((b: any) => b.x === -6 && b.y === 3),
      copy = tones.find((b: any) => b !== original);
    return [
      tones.length === 2 &&
        !!original &&
        !!copy &&
        copy.params.waveform === 3 &&
        copy.params.transpose === 7 &&
        (copy.x !== -6 || copy.y !== 3),
      { blocks: blocks.map((b: any) => [b.type, b.x, b.y, b.params]) },
    ];
  },
  /** Owner (2026-11-12): the multi-select ring cut through the MIDI Keyboard (v1's hit outline leaves out a corner it
   * draws). Every block's ring encloses everything it draws as a polygon. */
  async 'select-ring-encloses-block'() {
    const misses = BLOCKS.flatMap((def) =>
      drawnPoints(def)
        .filter((pt) => !insidePolygon(pt, selectionRing(def)))
        .map((pt) => `${def.id} (${pt})`),
    );
    return [misses.length === 0, { misses }];
  },
  /** CHG-0005 task 9 (owner): multi-select. Shift+click adds/removes blocks, Shift+drag on the stage boxes them, a
   * finger held still on the stage then dragged boxes them; dragging one selected block moves them all, Alt+drag copies
   * them all, Cmd/Ctrl+D duplicates, Delete deletes, dropping them on the trash deletes them all; Esc or a tap on the
   * stage clears. A plain click on a selected block is v1's click (options panel) and lets the group go. */
  async 'multi-select'(errors: string[]) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(
      `${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 0), blk(2, 'ToneSource', -4, 0), blk(3, 'Filter', 4, 0), blk(4, 'Power', 12, 0)])}`,
    );
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    const eid: number[] = await p.evaluate(() =>
      (window as any).__bd_probe.state.blocks.map((b: any) => b.id),
    );
    const sel = () =>
      p.evaluate(() =>
        (window as any).__bd_selection().sort((a: number, b: number) => a - b),
      ) as Promise<number[]>;
    const pos = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.state.blocks.map((b: any) => [b.id, b.x, b.y]),
      ) as Promise<[number, number, number][]>;
    const at = (id: number) =>
      p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const count = async () => (await pos()).length;
    const drag = async (from: [number, number], to: [number, number], steps = 10) => {
      await p.mouse.move(from[0], from[1]);
      await p.mouse.down();
      for (let i = 1; i <= steps; i++)
        await p.mouse.move(
          from[0] + ((to[0] - from[0]) * i) / steps,
          from[1] + ((to[1] - from[1]) * i) / steps,
        );
      await p.mouse.up();
      await p.waitForTimeout(300);
    };
    const r: Record<string, unknown> = {};
    // Shift+click two blocks; drag one: both move.
    await p.keyboard.down('Shift');
    for (const id of [eid[0], eid[1]]) {
      const [x, y] = await at(id);
      await p.mouse.click(x, y);
      await p.waitForTimeout(150);
    }
    await p.keyboard.up('Shift');
    r.shiftClick = await sel();
    await p.screenshot({ path: `${OUT}/multi-select.png` });
    const before = await pos(),
      a0 = await at(eid[0]);
    await drag(a0, [a0[0] + 60, a0[1] + 90]);
    const after = await pos(),
      find = (l: [number, number, number][], id: number) => l.find((q) => q[0] === id)!;
    const delta = (i: number) => [
      find(after, eid[i])[1] - find(before, eid[i])[1],
      find(after, eid[i])[2] - find(before, eid[i])[2],
    ];
    r.groupMove = [delta(0), delta(1), delta(2)];
    const groupMoved =
      delta(0)[1] > 0 &&
      JSON.stringify(delta(0)) === JSON.stringify(delta(1)) &&
      delta(2)[0] === 0 &&
      delta(2)[1] === 0;
    // A tap on the stage clears.
    await p.mouse.click(300, 650);
    await p.waitForTimeout(300); // (not the power switch, bottom centre)
    r.afterTap = await sel();
    // Shift+drag a box over the Filter and the Power.
    const [fx, fy] = await at(eid[2]),
      [qx, qy] = await at(eid[3]);
    await p.keyboard.down('Shift');
    await drag([fx - 40, fy - 70], [qx + 40, qy + 70]);
    await p.keyboard.up('Shift');
    r.box = await sel();
    // Alt+drag one of them: both copied, the copies selected and moved; the originals stay.
    const n0 = await count(),
      f0 = await at(eid[2]);
    await p.keyboard.down('Alt');
    await drag(f0, [f0[0], f0[1] - 150]);
    await p.keyboard.up('Alt');
    const copies = await sel(),
      posAlt = await pos();
    r.altCopy = { n0, n: posAlt.length, copies };
    const altOk =
      posAlt.length === n0 + 2 &&
      copies.length === 2 &&
      !copies.includes(eid[2]) &&
      !copies.includes(eid[3]) &&
      find(posAlt, eid[2])[2] === find(before, eid[2])[2];
    // Cmd/Ctrl+D duplicates the selection; Delete deletes it.
    await p.keyboard.press('ControlOrMeta+d');
    await p.waitForTimeout(300);
    const nd = await count(),
      dup = await sel();
    await p.keyboard.press('Delete');
    await p.waitForTimeout(300);
    r.dupDelete = {
      afterDup: nd,
      dupSelected: dup.length,
      afterDelete: await count(),
      sel: await sel(),
    };
    const dupOk = nd === n0 + 4 && dup.length === 2 && (await count()) === n0 + 2;
    // Esc clears.
    await p.keyboard.down('Shift');
    {
      const [x, y] = await at(eid[0]);
      await p.mouse.click(x, y);
    }
    await p.keyboard.up('Shift');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    r.esc = await sel();
    // Touch: hold a finger still on the stage, then drag a box over the two tones.
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
    const [t1x, t1y] = await at(eid[0]),
      [t2x, t2y] = await at(eid[1]);
    const view0 = await p.evaluate(() => ({ ...(window as any).__bd_probe.v1App.DragOffset }));
    await touch('touchStart', Math.min(t1x, t2x) - 50, Math.min(t1y, t2y) - 80);
    await p.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) {
      await touch(
        'touchMove',
        Math.min(t1x, t2x) - 50 + ((Math.max(t1x, t2x) - Math.min(t1x, t2x) + 100) * i) / 8,
        Math.min(t1y, t2y) - 80 + ((Math.abs(t2y - t1y) + 160) * i) / 8,
      );
      await p.waitForTimeout(16);
    }
    await p.screenshot({ path: `${OUT}/multi-select-box.png` });
    await touch('touchEnd', 0, 0);
    await p.waitForTimeout(300);
    const view1 = await p.evaluate(() => ({ ...(window as any).__bd_probe.v1App.DragOffset }));
    r.touchBox = { sel: await sel(), viewStill: view0.x === view1.x && view0.y === view1.y };
    // Drag the selection onto the trash: both deleted.
    const nt = await count(),
      g = await at(eid[0]);
    await drag(g, [1250, 770], 14);
    r.trash = { before: nt, after: await count() };
    await ctx.close();
    const ok =
      JSON.stringify(r.shiftClick) === JSON.stringify([eid[0], eid[1]].sort((a, b) => a - b)) &&
      groupMoved &&
      (r.afterTap as number[]).length === 0 &&
      JSON.stringify(r.box) === JSON.stringify([eid[2], eid[3]].sort((a, b) => a - b)) &&
      altOk &&
      dupOk &&
      (r.esc as number[]).length === 0 &&
      JSON.stringify((r.touchBox as any).sel) ===
        JSON.stringify([eid[0], eid[1]].sort((a, b) => a - b)) &&
      (r.touchBox as any).viewStill &&
      (r.trash as any).after === nt - 2;
    return [ok, r];
  },
  async 'block-edges-clean'(errors: string[]) {
    const p = await open(browser, [], errors);
    const r = await p.evaluate(() => {
      const { drawBlocks, BLOCKS_BY_ID } = (window as any).__bd_probe.blockDrawing,
        pal = (window as any).__bd_probe.v1App.Palette as string[];
      const G = 37.3,
        S = 8,
        W = (6 * G) | 0,
        OX = W / 2 + 0.37,
        OY = W / 2 + 0.61;
      const canvas = (scale: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = W * scale;
        const x = canvas.getContext('2d', { willReadFrequently: true })!;
        x.fillStyle = pal[0];
        x.fillRect(0, 0, canvas.width, canvas.height);
        return x;
      };
      const v1Draw = (x: CanvasRenderingContext2D, layers: any[], s: number) => {
        for (const l of layers) {
          x.beginPath();
          l.points.forEach(([px, py]: number[], i: number) => {
            const X = (OX + px * G) * s,
              Y = (OY + py * G) * s;
            if (i) x.lineTo(X, Y);
            else x.moveTo(X, Y);
          });
          x.closePath();
          x.fillStyle = pal[l.palette];
          x.fill();
        }
      };
      // Each pixel against its true mix of colours (v1's layers drawn 8× larger, averaged down). Corners are left out:
      // there the browser's anti-aliasing of even a lone polygon differs from the average.
      const worst = (
        got: CanvasRenderingContext2D,
        ref: CanvasRenderingContext2D,
        corners: number[][],
      ) => {
        const g = got.getImageData(0, 0, W, W).data,
          big = ref.getImageData(0, 0, W * S, W * S).data;
        let w = 0;
        for (let y = 0; y < W; y++)
          for (let x = 0; x < W; x++) {
            if (corners.some(([cx, cy]) => Math.hypot(cx - x - 0.5, cy - y - 0.5) < 2.5)) continue;
            for (let ch = 0; ch < 3; ch++) {
              let sum = 0;
              for (let j = 0; j < S; j++)
                for (let i = 0; i < S; i++) sum += big[((y * S + j) * W * S + x * S + i) * 4 + ch];
              w = Math.max(w, Math.abs(sum / (S * S) - g[(y * W + x) * 4 + ch]));
            }
          }
        return Math.round(w);
      };
      const out: Record<string, { lone: number; drawn: number }> = {};
      for (const [id, def] of BLOCKS_BY_ID as Map<string, any>) {
        const layers = def.geometry.layers;
        if (layers.some((layer: any) => layer.units === 'unit')) continue; // the stars: pixel layers, drawn as v1
        const corners = layers.flatMap((layer: any) =>
          layer.points.map(([px, py]: number[]) => [OX + px * G, OY + py * G]),
        );
        const ref = canvas(S);
        v1Draw(ref, layers, S);
        const got = canvas(1);
        drawBlocks(got, { originX: OX, originY: OY, scaledGridSize: G }, { colors: pal }, [
          { block: { id: 1, type: id, x: 0, y: 0 }, def },
        ]);
        let lone = 0; // the same measure for each layer drawn alone: what anti-aliasing gets wrong anyway
        for (const l of layers) {
          const a = canvas(1),
            b = canvas(S);
          v1Draw(a, [l], 1);
          v1Draw(b, [l], S);
          lone = Math.max(lone, worst(a, b, corners));
        }
        out[id] = { lone, drawn: worst(got, ref, corners) };
      }
      return out;
    });
    await p.close();
    // v1's way (faces drawn over a whole base) was up to 74 out; a hairline is anything well past a lone polygon's error.
    const bad = Object.fromEntries(
      Object.entries(r).filter(([, value]) => value.drawn > value.lone + 12),
    );
    return [
      Object.keys(r).length > 40 && Object.keys(bad).length === 0,
      { bad, worst: Math.max(...Object.values(r).map((v) => v.drawn)) },
    ];
  },
};
