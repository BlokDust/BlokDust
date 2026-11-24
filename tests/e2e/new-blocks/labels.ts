// Label tests (CHG-0020), run by tests/e2e/new-blocks.ts.
import { OUT, browser, blk, state, open, idOf, menuItems, type Tests } from './harness.ts';

export const labelsTests: Tests = {
  // CHG-0020 (UI-0011): labels come with the patch and are drawn; a click edits the words, a drag moves one, the bin
  // deletes it, and the Interaction menu makes a new one. They never reach the engine.
  // Owner 2026-11-14: labels join the multi-selection: Shift+click, the box, Cmd/Ctrl+A; dragging any selected item moves
  // them all (blocks too); Cmd/Ctrl+D copies, Delete deletes, Cmd/Ctrl+G takes them into the Stage with the blocks.
  async 'label-multi-select'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors, {
      labels: [
        { id: 'l1', text: 'Mine', x: -8, y: -6 },
        { id: 'l2', text: 'Not mine', x: 6, y: 6 },
      ],
    });
    const labels = () =>
      p.evaluate(
        () =>
          (window as any).__bd_probe.labels as {
            id: string;
            text: string;
            x: number;
            y: number;
            cx: number;
            cy: number;
          }[],
      );
    const sel = () =>
      p.evaluate(() => ({
        blocks: (window as any).__bd_selection().length as number,
        labels: (window as any).__bd_label_selection() as string[],
      }));
    const tone = async () =>
      (await state(p)).patch.blocks.find((b: any) => b.type === 'source.tone');
    const tAt = (await p.evaluate(
      (i) => (window as any).__bd_probe.blockPoint(i),
      await idOf(p, 't'),
    )) as [number, number];
    const r: Record<string, unknown> = {};
    // Shift+click the Tone and the first label
    await p.keyboard.down('Shift');
    await p.mouse.click(tAt[0], tAt[1]);
    const l1 = (await labels())[0];
    await p.mouse.click(l1.cx, l1.cy);
    await p.keyboard.up('Shift');
    await p.waitForTimeout(200);
    r.picked = await sel();
    await p.screenshot({ path: `${OUT}/label-multi-select.png` });
    // drag the Tone: the label comes with it; the other stays
    const t0 = await tone(),
      a0 = (await labels())[0],
      b0 = (await labels())[1];
    await p.mouse.move(tAt[0], tAt[1]);
    await p.mouse.down();
    await p.mouse.move(tAt[0] + 60, tAt[1] + 45, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const t1 = await tone(),
      a1 = (await labels())[0],
      b1 = (await labels())[1];
    r.byBlock = {
      block: [t1.x - t0.x, t1.y - t0.y],
      label: [a1.x - a0.x, a1.y - a0.y],
      other: [b1.x - b0.x, b1.y - b0.y],
    };
    // drag the label: the Tone comes with it
    await p.mouse.move(a1.cx, a1.cy);
    await p.mouse.down();
    await p.mouse.move(a1.cx - 60, a1.cy - 45, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const t2 = await tone(),
      a2 = (await labels())[0];
    r.byLabel = { block: [t2.x - t1.x, t2.y - t1.y], label: [a2.x - a1.x, a2.y - a1.y] };
    r.stillPicked = await sel();
    // Cmd/Ctrl+D copies both; Delete deletes the copies
    await p.mouse.move(640, 600);
    await p.keyboard.press('ControlOrMeta+d');
    await p.waitForTimeout(300);
    r.copied = {
      blocks: (await state(p)).patch.blocks.length,
      labels: (await labels()).length,
      sel: await sel(),
    };
    await p.keyboard.press('Delete');
    await p.waitForTimeout(300);
    r.deleted = { blocks: (await state(p)).patch.blocks.length, labels: (await labels()).length };
    // Cmd/Ctrl+A takes the labels too; Esc lets go
    await p.keyboard.press('ControlOrMeta+a');
    await p.waitForTimeout(200);
    r.all = await sel();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    r.none = await sel();
    // the box (Shift+drag on the stage) round the first label and the Tone
    const now = await labels(),
      tAt2 = (await p.evaluate(
        (i) => (window as any).__bd_probe.blockPoint(i),
        await idOf(p, 't'),
      )) as [number, number];
    const x0 = Math.min(now[0].cx, tAt2[0]) - 40,
      y0 = Math.min(now[0].cy, tAt2[1]) - 40,
      x1 = Math.max(now[0].cx, tAt2[0]) + 40,
      y1 = Math.max(now[0].cy, tAt2[1]) + 40;
    await p.keyboard.down('Shift');
    await p.mouse.move(x0, y0);
    await p.mouse.down();
    await p.mouse.move(x1, y1, { steps: 6 });
    await p.mouse.up();
    await p.keyboard.up('Shift');
    await p.waitForTimeout(200);
    r.boxed = await sel();
    // Cmd/Ctrl+G: into a new Stage with the Tone
    await p.keyboard.press('ControlOrMeta+g');
    await p.waitForTimeout(500);
    const patch = (await state(p)).patch;
    r.staged = {
      outerLabels: (patch.labels ?? []).map((l: any) => l.text),
      inner: patch.macros?.[0]?.labels?.map((label: any) => label.text),
      blocks: patch.blocks.map((b: any) => b.type),
    };
    await p.close();
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const bb = r.byBlock as any,
      bl = r.byLabel as any;
    const pass =
      eq(r.picked, { blocks: 1, labels: ['l1'] }) &&
      bb.block[0] !== 0 &&
      eq(bb.block, bb.label) &&
      eq(bb.other, [0, 0]) &&
      bl.block[0] !== 0 &&
      eq(bl.block, bl.label) &&
      eq(r.stillPicked, { blocks: 1, labels: ['l1'] }) &&
      eq(
        {
          b: (r.copied as any).blocks,
          l: (r.copied as any).labels,
          n: (r.copied as any).sel.blocks,
          m: (r.copied as any).sel.labels.length,
        },
        { b: 2, l: 3, n: 1, m: 1 },
      ) &&
      eq(r.deleted, { blocks: 1, labels: 2 }) &&
      eq(r.all, { blocks: 1, labels: ['l1', 'l2'] }) &&
      eq(r.none, { blocks: 0, labels: [] }) &&
      eq(r.boxed, { blocks: 1, labels: ['l1'] }) &&
      eq(r.staged, { outerLabels: ['Not mine'], inner: ['Mine'], blocks: ['source.stage'] });
    return [pass, r];
  },
  // Owner 2026-11-14: making, moving and deleting labels are undo/redo steps, as for blocks (one step with the blocks).
  async 'label-undo-redo'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors);
    const labels = () =>
      p.evaluate(
        () =>
          (window as any).__bd_probe.labels as {
            id: string;
            text: string;
            x: number;
            y: number;
            cx: number;
            cy: number;
          }[],
      );
    const blocks = async () => (await state(p)).patch.blocks.length;
    const key = async (k: string) => {
      await p.mouse.move(640, 650);
      await p.keyboard.press(k);
      await p.waitForTimeout(300);
    };
    const r: Record<string, unknown> = {};
    // a Label from the Interaction menu, dropped and typed into
    await p.mouse.click(843, 45);
    await p.waitForTimeout(800);
    const item = await p.evaluate(() => {
      const P = (window as any).__bd_probe,
        pr = P.v1App.Metrics.PixelRatio;
      for (const cat of P.scene.Header.MenuItems)
        for (const it of cat.Items)
          if (String(it.Name).toLowerCase() === 'label') return it.Position.x / pr;
      return null;
    });
    await p.mouse.move(item!, 180);
    await p.mouse.down();
    await p.mouse.move(item!, 400, { steps: 6 });
    await p.mouse.move(500, 560, { steps: 6 });
    await p.mouse.up();
    await p.waitForSelector('#labelEdit');
    await p.keyboard.type('Hello');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    r.made = (await labels()).map((l) => l.text);
    await key('ControlOrMeta+z');
    r.madeUndone = (await labels()).length;
    await key('ControlOrMeta+Shift+z');
    r.madeRedone = (await labels()).map((l) => l.text);
    // moved
    const a = (await labels())[0];
    await p.mouse.move(a.cx, a.cy);
    await p.mouse.down();
    await p.mouse.move(a.cx + 80, a.cy - 60, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(300);
    const b = (await labels())[0];
    await key('ControlOrMeta+z');
    const c = (await labels())[0];
    await key('ControlOrMeta+Shift+z');
    const d = (await labels())[0];
    r.move = {
      moved: b.x !== a.x || b.y !== a.y,
      undone: c.x === a.x && c.y === a.y,
      redone: d.x === b.x && d.y === b.y,
    };
    // binned
    await p.mouse.move(d.cx, d.cy);
    await p.mouse.down();
    await p.mouse.move(1235, 755, { steps: 10 });
    await p.waitForTimeout(150);
    await p.mouse.up();
    await p.waitForTimeout(300);
    r.binned = (await labels()).length;
    await key('ControlOrMeta+z');
    const e = (await labels())[0];
    r.binUndone = e && e.x === d.x && e.y === d.y && e.text === 'Hello';
    await key('ControlOrMeta+Shift+z');
    r.binRedone = (await labels()).length;
    await key('ControlOrMeta+z');
    // Cmd/Ctrl+A, Delete: one step brings back the Tone and the label
    await key('ControlOrMeta+a');
    await key('Delete');
    r.deleted = { blocks: await blocks(), labels: (await labels()).length };
    await key('ControlOrMeta+z');
    r.restored = { blocks: await blocks(), labels: (await labels()).length };
    await p.close();
    const eq = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    const pass =
      eq(r.made, ['Hello']) &&
      r.madeUndone === 0 &&
      eq(r.madeRedone, ['Hello']) &&
      eq(r.move, { moved: true, undone: true, redone: true }) &&
      r.binned === 0 &&
      r.binUndone === true &&
      r.binRedone === 0 &&
      eq(r.deleted, { blocks: 0, labels: 0 }) &&
      eq(r.restored, { blocks: 1, labels: 1 });
    return [pass, r];
  },
  async labels(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors, {
      labels: [
        { id: 'l1', text: 'Press the tone', x: -8, y: -6 },
        { id: 'l2', text: 'Bin me', x: 6, y: 6 },
      ],
    });
    const menu = await menuItems(p, 'Interaction');
    const labels = () =>
      p.evaluate(
        () =>
          (window as any).__bd_probe.labels as {
            id: string;
            text: string;
            x: number;
            y: number;
            cx: number;
            cy: number;
          }[],
      );
    const first = await labels();
    await p.screenshot({ path: `${OUT}/labels.png` });
    // click → edit in place
    await p.mouse.click(first[0].cx, first[0].cy);
    await p.waitForSelector('#labelEdit');
    await p.keyboard.type('Hold a key');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(200);
    const edited = (await labels())[0].text;
    // drag → moved (and saved in the patch)
    const a = (await labels())[0];
    await p.mouse.move(a.cx, a.cy);
    await p.mouse.down();
    await p.mouse.move(a.cx + 60, a.cy + 45, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(200);
    const moved = (await labels())[0];
    // drag onto the bin → gone
    const b = (await labels())[1];
    await p.mouse.move(b.cx, b.cy);
    await p.mouse.down();
    await p.mouse.move(1235, 755, { steps: 10 });
    await p.waitForTimeout(150);
    await p.mouse.up();
    await p.waitForTimeout(300);
    const left = await labels();
    const saved = (await state(p)).patch.labels,
      blocks = (await state(p)).blocks.length;
    await p.screenshot({ path: `${OUT}/labels-after.png` });
    await p.close();
    const pass =
      menu.includes('Label') &&
      first.length === 2 &&
      edited === 'Hold a key' &&
      (moved.x !== a.x || moved.y !== a.y) &&
      left.length === 1 &&
      saved?.length === 1 &&
      saved[0].text === 'Hold a key' &&
      saved[0].x === moved.x &&
      blocks === 1;
    return [
      pass,
      {
        menu,
        first: first.map((l) => [l.text, l.x, l.y]),
        edited,
        moved: [moved.x, moved.y],
        left: left.length,
        saved,
        blocks,
      },
    ];
  },
};
