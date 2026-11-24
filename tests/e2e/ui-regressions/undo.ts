// ui-regressions: Undo and redo.
import { blk, browser, open, type RegressionTest } from './harness.ts';

export const undoTests: Record<string, RegressionTest> = {
  /** Owner (2026-11-11): deleting is undoable. Cmd/Ctrl+Z brings back a block deleted with Backspace, one dragged to
   * the trash, and a whole selection deleted at once: same type, place, id and settings, still connected (the tone
   * sounds again when its Power comes back). */
  async 'undo-delete'(errors: string[]) {
    const p = await open(
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
      p.evaluate(() =>
        (window as any).__bd_probe.state.patch.blocks
          .map((b: any) => JSON.stringify([b.id, b.type, b.x, b.y, b.params]))
          .sort(),
      ) as Promise<string[]>;
    const engineIds = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.state.blocks.map((b: any) => [b.id, b.type]),
      ) as Promise<[number, string][]>;
    const idOf = async (type: string) => (await engineIds()).find((q) => q[1] === type)![0];
    const at = (id: number) =>
      p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const level = async () => {
      await p.waitForTimeout(1200);
      return p.evaluate(() => (window as any).__bd_probe.state.rms);
    };
    const undo = async () => {
      await p.mouse.move(640, 120);
      await p.keyboard.press('ControlOrMeta+z');
      await p.waitForTimeout(300);
    };
    // A setting that must come back: the Filter's frequency.
    await p.evaluate(() => {
      const pr = (window as any).__bd_probe;
      const id = pr.state.blocks.find((b: any) => b.type === 'fx.filter').id;
      pr.scene.host.setParam(id, 'frequency', 1234);
    });
    const p0 = await patch(),
      sounding = await level();
    const r: Record<string, unknown> = { sounding };
    // 1. Click the Power, Backspace: gone, silent. Undo: back, sounding.
    {
      const [x, y] = await at(await idOf('power.power'));
      await p.mouse.click(x, y);
      await p.waitForTimeout(300);
    }
    await p.keyboard.press('Backspace');
    await p.waitForTimeout(300);
    r.backspace = { n: (await patch()).length, level: await level() };
    await undo();
    r.backspaceUndo = {
      same: JSON.stringify(await patch()) === JSON.stringify(p0),
      level: await level(),
    };
    // 2. Drag the Filter to the trash. Undo.
    {
      const [x, y] = await at(await idOf('fx.filter'));
      await p.mouse.move(x, y);
      await p.mouse.down();
      for (let i = 1; i <= 14; i++)
        await p.mouse.move(x + ((1250 - x) * i) / 14, y + ((770 - y) * i) / 14);
      await p.mouse.up();
      await p.waitForTimeout(300);
    }
    r.trash = (await patch()).length;
    await undo();
    r.trashUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // 3. Shift+click the Filter and the Noise, Delete: both gone. Undo: both back in one step.
    await p.keyboard.down('Shift');
    for (const t of ['fx.filter', 'source.noise']) {
      const [x, y] = await at(await idOf(t));
      await p.mouse.click(x, y);
      await p.waitForTimeout(150);
    }
    await p.keyboard.up('Shift');
    await p.keyboard.press('Delete');
    await p.waitForTimeout(300);
    r.group = (await patch()).length;
    await undo();
    r.groupUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // Nothing left to undo: Cmd+Z does nothing.
    await undo();
    r.extra = (await patch()).length;
    await p.close();
    const ok =
      sounding > 0.01 &&
      (r.backspace as any).n === 3 &&
      (r.backspace as any).level < 0.001 &&
      (r.backspaceUndo as any).same &&
      (r.backspaceUndo as any).level > 0.01 &&
      r.trash === 3 &&
      r.trashUndo &&
      r.group === 2 &&
      r.groupUndo &&
      r.extra === 4;
    return [ok, r];
  },
  /** Owner (2026-11-12, CHG-0010): undo and redo for moving, duplicating (Cmd/Ctrl+D and Alt-drag) and deleting
   * blocks. Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z redoes; a new action clears what could be redone. */
  async 'undo-redo'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 2)], errors);
    const tones = () =>
      p.evaluate(() =>
        (window as any).__bd_probe.state.patch.blocks
          .filter((b: any) => b.type === 'source.tone')
          .map((b: any) => [b.x, b.y])
          .sort(),
      ) as Promise<number[][]>;
    const firstId = () =>
      p.evaluate(
        () => (window as any).__bd_probe.state.blocks.find((b: any) => b.type === 'source.tone').id,
      ) as Promise<number>;
    const at = (id: number) =>
      p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const key = async (k: string) => {
      await p.mouse.move(640, 120);
      await p.keyboard.press(k);
      await p.waitForTimeout(300);
    };
    const r: Record<string, unknown> = {};
    // Move: drag the tone 6 cells right.
    {
      const [x, y] = await at(await firstId()),
        [x2] = await p.evaluate(() => (window as any).__bd_probe.toCss(0, 2));
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x2, y, { steps: 10 });
      await p.mouse.up();
      await p.waitForTimeout(300);
    }
    r.moved = await tones();
    await key('ControlOrMeta+z');
    r.moveUndo = await tones();
    await key('ControlOrMeta+Shift+z');
    r.moveRedo = await tones();
    // Duplicate with Cmd/Ctrl+D (select it first).
    await p.keyboard.down('Shift');
    {
      const [x, y] = await at(await firstId());
      await p.mouse.click(x, y);
    }
    await p.keyboard.up('Shift');
    await p.waitForTimeout(200);
    await key('ControlOrMeta+d');
    r.dup = (await tones()).length;
    await key('ControlOrMeta+z');
    r.dupUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z');
    r.dupRedo = (await tones()).length;
    await key('Escape');
    // Alt-drag a copy of the first tone.
    {
      const [x, y] = await at(await firstId());
      await p.keyboard.down('Alt');
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x, y + 150, { steps: 10 });
      await p.mouse.up();
      await p.keyboard.up('Alt');
      await p.waitForTimeout(300);
    }
    r.alt = (await tones()).length;
    await key('ControlOrMeta+z');
    r.altUndo = (await tones()).length;
    // Delete, undo, redo.
    {
      const [x, y] = await at(await firstId());
      await p.mouse.click(x, y);
      await p.waitForTimeout(200);
    }
    await key('Backspace');
    r.del = (await tones()).length;
    await key('ControlOrMeta+z');
    r.delUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z');
    r.delRedo = (await tones()).length;
    // A new action clears redo: undo the delete, move something, then redo does nothing.
    await key('ControlOrMeta+z');
    const before = await tones();
    {
      const [x, y] = await at(await firstId());
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x + 60, y, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(300);
    }
    const afterMove = await tones();
    await key('ControlOrMeta+Shift+z');
    r.redoCleared =
      JSON.stringify(await tones()) === JSON.stringify(afterMove) &&
      JSON.stringify(afterMove) !== JSON.stringify(before);
    await p.close();
    const ok =
      JSON.stringify(r.moved) === '[[0,2]]' &&
      JSON.stringify(r.moveUndo) === '[[-6,2]]' &&
      JSON.stringify(r.moveRedo) === '[[0,2]]' &&
      r.dup === 2 &&
      r.dupUndo === 1 &&
      r.dupRedo === 2 &&
      r.alt === 3 &&
      r.altUndo === 2 &&
      r.del === 1 &&
      r.delUndo === 2 &&
      r.delRedo === 1 &&
      r.redoCleared === true;
    return [ok, r];
  },
};
