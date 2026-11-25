// ui-regressions: Undo and redo.
import { blk, browser, open, type RegressionTest } from './harness.ts';

export const undoTests: Record<string, RegressionTest> = {
  /** Cmd/Ctrl+Z brings back a block deleted with Backspace, dragged to the trash, or deleted with
   * a selection: same type, place, id and settings, still connected (the tone sounds again). */
  async 'undo-delete'(errors: string[]) {
    const page = await open(
      browser,
      [
        blk(1, 'ToneSource', -3, 3),
        blk(2, 'Power', -6, 3),
        blk(3, 'Filter', 8, -4),
        blk(4, 'Noise', 14, -4),
      ],
      errors,
    );
    const patch = () =>
      page.evaluate(() =>
        window.__bd_probe.state.patch.blocks
          .map((b) => JSON.stringify([b.id, b.type, b.x, b.y, b.params]))
          .sort(),
      );
    const engineIds = () =>
      page.evaluate(() =>
        window.__bd_probe.state.blocks.map((b): [number, string] => [b.id, b.type]),
      );
    const idOf = async (type: string) => {
      const entry = (await engineIds()).find(([, blockType]) => blockType === type);
      if (!entry) throw new Error(`no ${type} on the stage`);
      return entry[0];
    };
    const at = (id: number) =>
      page.evaluate((i) => window.__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const level = async () => {
      await page.waitForTimeout(1200);
      return page.evaluate(() => window.__bd_probe.state.rms);
    };
    const undo = async () => {
      await page.mouse.move(640, 120);
      await page.keyboard.press('ControlOrMeta+z');
      await page.waitForTimeout(300);
    };
    // A setting that must come back: the Filter's frequency.
    await page.evaluate(() => {
      const probe = window.__bd_probe;
      const filter = probe.state.blocks.find((b) => b.type === 'fx.filter');
      if (!filter) throw new Error('no filter');
      probe.scene.host.setParam(filter.id, 'frequency', 1234);
    });
    const p0 = await patch(),
      sounding = await level();
    const result: Record<string, unknown> = { sounding };
    // 1. Click the Power, Backspace: gone, silent. Undo: back, sounding.
    {
      const [x, y] = await at(await idOf('power.power'));
      await page.mouse.click(x, y);
      await page.waitForTimeout(300);
    }
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);
    const backspace = { n: (await patch()).length, level: await level() };
    result.backspace = backspace;
    await undo();
    const backspaceUndo = {
      same: JSON.stringify(await patch()) === JSON.stringify(p0),
      level: await level(),
    };
    result.backspaceUndo = backspaceUndo;
    // 2. Drag the Filter to the trash. Undo.
    {
      const [x, y] = await at(await idOf('fx.filter'));
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 14; i++)
        await page.mouse.move(x + ((1250 - x) * i) / 14, y + ((770 - y) * i) / 14);
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    result.trash = (await patch()).length;
    await undo();
    result.trashUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // 3. Shift+click the Filter and the Noise, Delete: both gone. Undo: both back in one step.
    await page.keyboard.down('Shift');
    for (const text of ['fx.filter', 'source.noise']) {
      const [x, y] = await at(await idOf(text));
      await page.mouse.click(x, y);
      await page.waitForTimeout(150);
    }
    await page.keyboard.up('Shift');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    result.group = (await patch()).length;
    await undo();
    result.groupUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // Nothing left to undo: Cmd+Z does nothing.
    await undo();
    result.extra = (await patch()).length;
    await page.close();
    const ok =
      sounding > 0.01 &&
      backspace.n === 3 &&
      backspace.level < 0.001 &&
      backspaceUndo.same &&
      backspaceUndo.level > 0.01 &&
      result.trash === 3 &&
      result.trashUndo === true &&
      result.group === 2 &&
      result.groupUndo === true &&
      result.extra === 4;
    return [ok, result];
  },
  /** CHG-0010: Cmd/Ctrl+Z undoes and Cmd/Ctrl+Shift+Z redoes moving, duplicating (Cmd/Ctrl+D,
   * Alt-drag) and deleting; a new action clears what could be redone. */
  async 'undo-redo'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', -6, 2)], errors);
    const tones = () =>
      page.evaluate(() =>
        window.__bd_probe.state.patch.blocks
          .filter((b) => b.type === 'source.tone')
          .map((b) => [b.x, b.y])
          .sort(),
      );
    const firstId = () =>
      page.evaluate(() => {
        const tone = window.__bd_probe.state.blocks.find((b) => b.type === 'source.tone');
        if (!tone) throw new Error('no tone');
        return tone.id;
      });
    const at = (id: number) =>
      page.evaluate((i) => window.__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const key = async (keys: string) => {
      await page.mouse.move(640, 120);
      await page.keyboard.press(keys);
      await page.waitForTimeout(300);
    };
    const result: Record<string, unknown> = {};
    // Move: drag the tone 6 cells right.
    {
      const [x, y] = await at(await firstId()),
        [x2] = await page.evaluate(() => window.__bd_probe.toCss(0, 2));
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x2, y, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    result.moved = await tones();
    await key('ControlOrMeta+z');
    result.moveUndo = await tones();
    await key('ControlOrMeta+Shift+z');
    result.moveRedo = await tones();
    // Duplicate with Cmd/Ctrl+D (select it first).
    await page.keyboard.down('Shift');
    {
      const [x, y] = await at(await firstId());
      await page.mouse.click(x, y);
    }
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
    await key('ControlOrMeta+d');
    result.dup = (await tones()).length;
    await key('ControlOrMeta+z');
    result.dupUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z');
    result.dupRedo = (await tones()).length;
    await key('Escape');
    // Alt-drag a copy of the first tone.
    {
      const [x, y] = await at(await firstId());
      await page.keyboard.down('Alt');
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 150, { steps: 10 });
      await page.mouse.up();
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);
    }
    result.alt = (await tones()).length;
    await key('ControlOrMeta+z');
    result.altUndo = (await tones()).length;
    // Delete, undo, redo.
    {
      const [x, y] = await at(await firstId());
      await page.mouse.click(x, y);
      await page.waitForTimeout(200);
    }
    await key('Backspace');
    result.del = (await tones()).length;
    await key('ControlOrMeta+z');
    result.delUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z');
    result.delRedo = (await tones()).length;
    // A new action clears redo: undo the delete, move something, then redo does nothing.
    await key('ControlOrMeta+z');
    const before = await tones();
    {
      const [x, y] = await at(await firstId());
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 60, y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    const afterMove = await tones();
    await key('ControlOrMeta+Shift+z');
    result.redoCleared =
      JSON.stringify(await tones()) === JSON.stringify(afterMove) &&
      JSON.stringify(afterMove) !== JSON.stringify(before);
    await page.close();
    const ok =
      JSON.stringify(result.moved) === '[[0,2]]' &&
      JSON.stringify(result.moveUndo) === '[[-6,2]]' &&
      JSON.stringify(result.moveRedo) === '[[0,2]]' &&
      result.dup === 2 &&
      result.dupUndo === 1 &&
      result.dupRedo === 2 &&
      result.alt === 3 &&
      result.altUndo === 2 &&
      result.del === 1 &&
      result.delUndo === 2 &&
      result.delRedo === 1 &&
      result.redoCleared === true;
    return [ok, result];
  },
};
