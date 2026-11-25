// Label tests (CHG-0020), run by tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
import { OUT, browser, blk, state, open, menuItems, type Tests, pointOf } from './harness.ts';

/** The labels on the stage, with their centres in css px. */
const labelsOn = (page: Page) => page.evaluate(() => window.__bd_probe.labels);
/** The selected blocks' count and the selected labels' ids. */
const selection = (page: Page) =>
  page.evaluate(() => ({
    blocks: window.__bd_selection().length,
    labels: window.__bd_label_selection(),
  }));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const labelsTests: Tests = {
  // CHG-0020 (UI-0011): labels join the multi-selection (Shift+click, box, Cmd/Ctrl+A); a drag
  // moves all selected; Cmd/Ctrl+D copies, Delete deletes, Cmd/Ctrl+G takes them into a Stage.
  async 'label-multi-select'(errors) {
    const page = await open(browser, [blk('t', 'source.tone', 0, 0)], errors, {
      labels: [
        { id: 'l1', text: 'Mine', x: -8, y: -6 },
        { id: 'l2', text: 'Not mine', x: 6, y: 6 },
      ],
    });
    const tonePosition = async (): Promise<[number, number]> => {
      const tone = (await state(page)).patch.blocks.find((block) => block.type === 'source.tone');
      if (!tone) throw new Error('the Tone is gone');
      return [tone.x ?? 0, tone.y ?? 0];
    };
    const toneAt = await pointOf(page, 't');
    // Shift+click the Tone and the first label.
    await page.keyboard.down('Shift');
    await page.mouse.click(toneAt[0], toneAt[1]);
    const firstLabel = (await labelsOn(page))[0];
    await page.mouse.click(firstLabel.cx, firstLabel.cy);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
    const picked = await selection(page);
    await page.screenshot({ path: `${OUT}/label-multi-select.png` });
    // Drag the Tone: the label comes with it; the other stays.
    const tone0 = await tonePosition(),
      [mine0, other0] = await labelsOn(page);
    await page.mouse.move(toneAt[0], toneAt[1]);
    await page.mouse.down();
    await page.mouse.move(toneAt[0] + 60, toneAt[1] + 45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const tone1 = await tonePosition(),
      [mine1, other1] = await labelsOn(page);
    const byBlock = {
      block: [tone1[0] - tone0[0], tone1[1] - tone0[1]],
      label: [mine1.x - mine0.x, mine1.y - mine0.y],
      other: [other1.x - other0.x, other1.y - other0.y],
    };
    // Drag the label: the Tone comes with it.
    await page.mouse.move(mine1.cx, mine1.cy);
    await page.mouse.down();
    await page.mouse.move(mine1.cx - 60, mine1.cy - 45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const tone2 = await tonePosition(),
      mine2 = (await labelsOn(page))[0];
    const byLabel = {
      block: [tone2[0] - tone1[0], tone2[1] - tone1[1]],
      label: [mine2.x - mine1.x, mine2.y - mine1.y],
    };
    const stillPicked = await selection(page);
    // Cmd/Ctrl+D copies both; Delete deletes the copies.
    await page.mouse.move(640, 600);
    await page.keyboard.press('ControlOrMeta+d');
    await page.waitForTimeout(300);
    const copied = {
      blocks: (await state(page)).patch.blocks.length,
      labels: (await labelsOn(page)).length,
      sel: await selection(page),
    };
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    const deleted = {
      blocks: (await state(page)).patch.blocks.length,
      labels: (await labelsOn(page)).length,
    };
    // Cmd/Ctrl+A takes the labels too; Esc lets go.
    await page.keyboard.press('ControlOrMeta+a');
    await page.waitForTimeout(200);
    const all = await selection(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const none = await selection(page);
    // The box (Shift+drag on the stage) round the first label and the Tone.
    const labelNow = (await labelsOn(page))[0],
      toneNow = await pointOf(page, 't');
    const x0 = Math.min(labelNow.cx, toneNow[0]) - 40,
      y0 = Math.min(labelNow.cy, toneNow[1]) - 40,
      x1 = Math.max(labelNow.cx, toneNow[0]) + 40,
      y1 = Math.max(labelNow.cy, toneNow[1]) + 40;
    await page.keyboard.down('Shift');
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
    const boxed = await selection(page);
    // Cmd/Ctrl+G: into a new Stage with the Tone.
    await page.keyboard.press('ControlOrMeta+g');
    await page.waitForTimeout(500);
    const patch = (await state(page)).patch;
    const staged = {
      outerLabels: (patch.labels ?? []).map((label) => label.text),
      inner: patch.macros?.[0]?.labels?.map((label) => label.text),
      blocks: patch.blocks.map((block) => block.type),
    };
    await page.close();
    const pass =
      same(picked, { blocks: 1, labels: ['l1'] }) &&
      byBlock.block[0] !== 0 &&
      same(byBlock.block, byBlock.label) &&
      same(byBlock.other, [0, 0]) &&
      byLabel.block[0] !== 0 &&
      same(byLabel.block, byLabel.label) &&
      same(stillPicked, { blocks: 1, labels: ['l1'] }) &&
      same(
        {
          b: copied.blocks,
          l: copied.labels,
          n: copied.sel.blocks,
          m: copied.sel.labels.length,
        },
        { b: 2, l: 3, n: 1, m: 1 },
      ) &&
      same(deleted, { blocks: 1, labels: 2 }) &&
      same(all, { blocks: 1, labels: ['l1', 'l2'] }) &&
      same(none, { blocks: 0, labels: [] }) &&
      same(boxed, { blocks: 1, labels: ['l1'] }) &&
      same(staged, { outerLabels: ['Not mine'], inner: ['Mine'], blocks: ['source.stage'] });
    return [
      pass,
      { picked, byBlock, byLabel, stillPicked, copied, deleted, all, none, boxed, staged },
    ];
  },
  // Making, moving and deleting labels are undo/redo steps, as for blocks (one step with the
  // blocks).
  async 'label-undo-redo'(errors) {
    const page = await open(browser, [blk('t', 'source.tone', 0, 0)], errors);
    const blocks = async () => (await state(page)).patch.blocks.length;
    const key = async (keys: string) => {
      await page.mouse.move(640, 650);
      await page.keyboard.press(keys);
      await page.waitForTimeout(300);
    };
    // A Label from the Interaction menu, dropped and typed into.
    await page.mouse.click(843, 45);
    await page.waitForTimeout(800);
    const itemX = await page.evaluate(() => {
      const probe = window.__bd_probe,
        pixelRatio = probe.v1App.Metrics.PixelRatio;
      for (const category of probe.scene.Header.MenuItems)
        for (const item of category.Items)
          if (item.Name.toLowerCase() === 'label') return item.Position.x / pixelRatio;
      return null;
    });
    if (itemX === null) throw new Error('no Label in the Interaction menu');
    await page.mouse.move(itemX, 180);
    await page.mouse.down();
    await page.mouse.move(itemX, 400, { steps: 6 });
    await page.mouse.move(500, 560, { steps: 6 });
    await page.mouse.up();
    await page.waitForSelector('#labelEdit');
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const made = (await labelsOn(page)).map((label) => label.text);
    await key('ControlOrMeta+z');
    const madeUndone = (await labelsOn(page)).length;
    await key('ControlOrMeta+Shift+z');
    const madeRedone = (await labelsOn(page)).map((label) => label.text);
    // Moved.
    const start = (await labelsOn(page))[0];
    await page.mouse.move(start.cx, start.cy);
    await page.mouse.down();
    await page.mouse.move(start.cx + 80, start.cy - 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const moved = (await labelsOn(page))[0];
    await key('ControlOrMeta+z');
    const undone = (await labelsOn(page))[0];
    await key('ControlOrMeta+Shift+z');
    const redone = (await labelsOn(page))[0];
    const move = {
      moved: moved.x !== start.x || moved.y !== start.y,
      undone: undone.x === start.x && undone.y === start.y,
      redone: redone.x === moved.x && redone.y === moved.y,
    };
    // Binned.
    await page.mouse.move(redone.cx, redone.cy);
    await page.mouse.down();
    await page.mouse.move(1235, 755, { steps: 10 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const binned = (await labelsOn(page)).length;
    await key('ControlOrMeta+z');
    const unbinned = (await labelsOn(page)).at(0);
    const binUndone =
      !!unbinned && unbinned.x === redone.x && unbinned.y === redone.y && unbinned.text === 'Hello';
    await key('ControlOrMeta+Shift+z');
    const binRedone = (await labelsOn(page)).length;
    await key('ControlOrMeta+z');
    // Cmd/Ctrl+A, Delete: one step brings back the Tone and the label.
    await key('ControlOrMeta+a');
    await key('Delete');
    const deleted = { blocks: await blocks(), labels: (await labelsOn(page)).length };
    await key('ControlOrMeta+z');
    const restored = { blocks: await blocks(), labels: (await labelsOn(page)).length };
    await page.close();
    const pass =
      same(made, ['Hello']) &&
      madeUndone === 0 &&
      same(madeRedone, ['Hello']) &&
      same(move, { moved: true, undone: true, redone: true }) &&
      binned === 0 &&
      binUndone &&
      binRedone === 0 &&
      same(deleted, { blocks: 0, labels: 0 }) &&
      same(restored, { blocks: 1, labels: 1 });
    return [
      pass,
      { made, madeUndone, madeRedone, move, binned, binUndone, binRedone, deleted, restored },
    ];
  },
  // CHG-0020 (UI-0011): labels come with the patch and are drawn; a click edits the words, a drag
  // moves one, the bin deletes it, the Interaction menu makes one. They never reach the engine.
  async labels(errors) {
    const page = await open(browser, [blk('t', 'source.tone', 0, 0)], errors, {
      labels: [
        { id: 'l1', text: 'Press the tone', x: -8, y: -6 },
        { id: 'l2', text: 'Bin me', x: 6, y: 6 },
      ],
    });
    const menu = await menuItems(page, 'Interaction');
    const first = await labelsOn(page);
    await page.screenshot({ path: `${OUT}/labels.png` });
    // Click: edit in place.
    await page.mouse.click(first[0].cx, first[0].cy);
    await page.waitForSelector('#labelEdit');
    await page.keyboard.type('Hold a key');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const edited = (await labelsOn(page))[0].text;
    // Drag: moved (and saved in the patch).
    const before = (await labelsOn(page))[0];
    await page.mouse.move(before.cx, before.cy);
    await page.mouse.down();
    await page.mouse.move(before.cx + 60, before.cy + 45, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const moved = (await labelsOn(page))[0];
    // Drag onto the bin: gone.
    const binMe = (await labelsOn(page))[1];
    await page.mouse.move(binMe.cx, binMe.cy);
    await page.mouse.down();
    await page.mouse.move(1235, 755, { steps: 10 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const left = await labelsOn(page);
    const saved = (await state(page)).patch.labels,
      blocks = (await state(page)).blocks.length;
    await page.screenshot({ path: `${OUT}/labels-after.png` });
    await page.close();
    const pass =
      menu.includes('Label') &&
      first.length === 2 &&
      edited === 'Hold a key' &&
      (moved.x !== before.x || moved.y !== before.y) &&
      left.length === 1 &&
      saved?.length === 1 &&
      saved[0].text === 'Hold a key' &&
      saved[0].x === moved.x &&
      blocks === 1;
    return [
      pass,
      {
        menu,
        first: first.map((label) => [label.text, label.x, label.y]),
        edited,
        moved: [moved.x, moved.y],
        left: left.length,
        saved,
        blocks,
      },
    ];
  },
};
