// ui-regressions: Patches › OPEN on the web: the list, presets, deleting, unsaved changes.
import { OUT, blk, browser, maxOver, open, state, toCss, type RegressionTest } from './harness.ts';
import {
  keepPresets,
  openList,
  openPatches,
  patchesAt,
  patchesClick,
  rowButton,
} from './patchesPanel.ts';
import { readFileSync } from 'node:fs';

export const patchesOpenTests: Record<string, RegressionTest> = {
  /** CHG-0005 (web; SAVE / OPEN tabs, owner 2026-11-10): OPEN lists the presets with OPEN and INSERT on each row.
   * INSERT hands the blocks to the pointer (half transparent) until a click puts them down, where the pointer is;
   * Cmd/Ctrl+Z takes them out again. SAVE TO COMPUTER downloads a `.blokdust` file where the browser has no save dialog.
   * FROM YOUR COMPUTER and a dropped file ask Open or Insert. */
  async 'patches-web'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      delete (window as any).showSaveFilePicker;
    }); // a browser without a save dialog
    await keepPresets(p);
    const count = async () => (await state(p)).patch.blocks.length;
    const centre = async (from: number) =>
      p.evaluate((n) => {
        const b = (window as any).__bd_probe.state.patch.blocks.slice(n);
        const xs = b.map((q: any) => q.x),
          ys = b.map((q: any) => q.y);
        return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      }, from) as Promise<[number, number]>;
    await openPatches(p);
    const tab = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    const title = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    await patchesClick(p, 'tab1', 1100);
    const items = await p.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name),
    );
    await p.screenshot({ path: `${OUT}/patches-web.png` });
    // INSERT: the blocks follow the pointer, drawn like a pressed block, until a click.
    await patchesClick(p, 'ins0', 100);
    await p.mouse.move(400, 600, { steps: 8 });
    await p.waitForTimeout(300);
    const placing = await p.evaluate(() => (window as any).__bd_placing());
    await p.screenshot({ path: `${OUT}/patches-web-placing.png` });
    await p.mouse.click(400, 600);
    await p.waitForTimeout(300);
    const placed = {
      count: await count(),
      centre: await centre(1),
      placing: await p.evaluate(() => (window as any).__bd_placing()),
    };
    const [cx, cy] = await toCss(p, placed.centre[0], placed.centre[1]);
    await p.keyboard.press('ControlOrMeta+z');
    await p.waitForTimeout(300);
    const undone = await count();
    // Esc while placing puts nothing down.
    await openList(p);
    await patchesClick(p, 'ins0', 100);
    await p.mouse.move(500, 300, { steps: 4 });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    const escaped = await count();
    // SAVE TO COMPUTER (download)
    await openPatches(p);
    const dl = p.waitForEvent('download');
    await patchesClick(p, 'save');
    const d = await dl,
      file = JSON.parse(readFileSync(await d.path(), 'utf8'));
    const saved = {
      name: d.suggestedFilename(),
      title: file.meta?.title,
      blocks: file.blocks?.length,
      format: file.format,
    };
    // The saved patch is listed first (this browser only); OPEN a preset: just saved, so no question.
    await openList(p);
    const mine = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items[0]);
    await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const afterOpen = await count();
    await openList(p);
    await rowButton(p, 'open', title); // the saved one (nothing changed since the preset opened: no question)
    const reopened = {
      blocks: await count(),
      title: await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title),
    };
    await openList(p);
    await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const openTitle = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    // FROM YOUR COMPUTER → Insert
    await openList(p);
    const chooser = p.waitForEvent('filechooser');
    await patchesClick(p, 'file', 0);
    await (
      await chooser
    ).setFiles({
      name: 'two.blokdust',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          format: 'blokdust.patch',
          version: 2,
          meta: { title: 'Two' },
          blocks: [
            { id: 'a', type: 'source.noise', x: 0, y: 0 },
            { id: 'b', type: 'fx.reverb', x: 3, y: 0 },
          ],
        }),
      ),
    });
    await p.waitForTimeout(600);
    const choice = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel;
      return { view: pp.View, picked: pp.Picked };
    });
    await p.screenshot({ path: `${OUT}/patches-web-file.png` });
    await patchesClick(p, 'fileInsert', 100);
    await p.mouse.move(900, 600, { steps: 4 });
    await p.mouse.click(900, 600);
    await p.waitForTimeout(300);
    const afterFile = await count();
    // A dropped file: the same question
    await p.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(
        new File(
          [
            JSON.stringify({
              format: 'blokdust.patch',
              version: 2,
              blocks: [{ id: 'z', type: 'fx.filter', x: 0, y: 0 }],
            }),
          ],
          'one.blokdust',
          { type: 'application/json' },
        ),
      );
      window.dispatchEvent(
        new DragEvent('drop', {
          dataTransfer: dt,
          clientX: 300,
          clientY: 600,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await p.waitForTimeout(1200);
    const dropView = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    await patchesClick(p, 'fileInsert', 100);
    await p.mouse.move(300, 650, { steps: 4 });
    await p.mouse.click(300, 650);
    await p.waitForTimeout(300);
    const afterDrop = await count();
    await p.screenshot({ path: `${OUT}/patches-web-after.png` });
    await p.close();
    const ok =
      tab === 0 &&
      items.includes('MIDI Keys + 2 Tones') &&
      items.length === 6 &&
      !!title &&
      mine?.name === title &&
      /^Saved \d/.test(mine?.detail) &&
      reopened.blocks === 1 &&
      reopened.title === title &&
      placing?.ids.length === 6 &&
      placed.count === 7 &&
      !placed.placing &&
      Math.hypot(cx - 400, cy - 600) < 40 &&
      undone === 1 &&
      escaped === 1 &&
      saved.name === `${title}.blokdust` &&
      saved.title === title &&
      saved.blocks === 1 &&
      saved.format === 'blokdust.patch' &&
      afterOpen === 6 &&
      openTitle === 'Computer Keys + 2 Tones' &&
      choice.view === 'file' &&
      choice.picked?.title === 'Two' &&
      afterFile === 8 &&
      dropView === 'file' &&
      afterDrop === 9;
    return [
      ok,
      {
        tab,
        items,
        title,
        mine,
        reopened,
        placing,
        placed,
        droppedAt: [cx, cy],
        undone,
        escaped,
        saved,
        afterOpen,
        openTitle,
        choice,
        afterFile,
        dropView,
        afterDrop,
      },
    ];
  },
  /** Owner (2026-11-10): Open over unsaved changes asks first (CANCEL · SAVE FIRST · OPEN ANYWAY); an unchanged patch
   * opens straight away, and Insert never asks. SAVE FIRST saves, then opens. */
  async 'open-confirms-unsaved'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      delete (window as any).showSaveFilePicker;
    });
    await keepPresets(p);
    const count = async () => (await state(p)).patch.blocks.length;
    /** Drag the patch's first block 4 cells right: a change. */
    const change = async () => {
      const b = (await state(p)).patch.blocks[0],
        [x, y] = await toCss(p, b.x, b.y + 0.2),
        [x2, y2] = await toCss(p, b.x + 4, b.y + 0.2);
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(x2, y2, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(300);
    };
    const view = () =>
      p.evaluate(() => {
        const pp = (window as any).__bd_probe.scene.PatchesPanel;
        return pp.Open ? pp.View : 'closed';
      });
    // Unchanged (opened from a link): no question.
    await openList(p);
    await rowButton(p, 'open', 'Rotating Sequencer');
    const unchanged = { view: await view(), blocks: await count() };
    // Changed: asked; CANCEL keeps the work.
    await change();
    await openList(p);
    await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const asked = await view();
    await p.screenshot({ path: `${OUT}/open-confirms-unsaved.png` });
    await patchesClick(p, 'cancel');
    const cancelled = { view: await view(), blocks: await count() };
    // INSERT never asks.
    await rowButton(p, 'ins', 'Microphone + Recorder', 100);
    await p.mouse.click(300, 600);
    await p.waitForTimeout(300);
    const inserted = { view: await view(), blocks: await count() };
    // SAVE FIRST: the file is saved, then the patch opens.
    await openList(p);
    await rowButton(p, 'open', 'Computer Keys + 2 Tones', 300);
    const dl = p.waitForEvent('download');
    await patchesClick(p, 'saveFirst', 0);
    const d = await dl,
      savedBlocks = JSON.parse(readFileSync(await d.path(), 'utf8')).blocks.length;
    await p.waitForTimeout(800);
    const afterSaveFirst = { view: await view(), blocks: await count() };
    // OPEN ANYWAY
    await change();
    await openList(p);
    await rowButton(p, 'open', 'Step Sequencer');
    const asked2 = await view();
    await patchesClick(p, 'openAnyway', 600);
    const anyway = { view: await view(), blocks: await count() };
    await p.close();
    // Rotating Sequencer has 10 blocks, Step Sequencer 21 (the owner's presets, 2026-11-12).
    const ok =
      unchanged.view === 'closed' &&
      unchanged.blocks === 10 &&
      asked === 'confirm' &&
      cancelled.view === 'list' &&
      cancelled.blocks === 10 &&
      inserted.view === 'closed' &&
      inserted.blocks === 15 &&
      savedBlocks === 15 &&
      afterSaveFirst.view === 'closed' &&
      afterSaveFirst.blocks === 6 &&
      asked2 === 'confirm' &&
      anyway.view === 'closed' &&
      anyway.blocks === 21;
    return [
      ok,
      { unchanged, asked, cancelled, inserted, savedBlocks, afterSaveFirst, asked2, anyway },
    ];
  },
  /** CHG-0005: every built-in preset opens with all its blocks, and the self-playing ones (Rotating Sequencer, Step
   * Sequencer: Power blocks run their laser and emitters) are heard without touching anything. Keys and Microphone presets wait for the player. */
  async 'presets-load'(errors: string[]) {
    const p = await open(browser, [], errors);
    await keepPresets(p);
    await openList(p);
    const items: string[] = await p.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name),
    );
    const want: Record<string, number> = {
      'Computer Keys + 2 Tones': 6,
      'MIDI Keys + 2 Tones': 6,
      'Microphone + Recorder': 5,
      'Rotating Sequencer': 10,
      'Step Sequencer': 21,
      'Self Playing Scene': 29,
    };
    const selfPlaying = new Set(['Rotating Sequencer', 'Step Sequencer', 'Self Playing Scene']);
    const got: Record<string, unknown> = {};
    for (let i = 0; i < items.length; i++) {
      if (i) await openList(p);
      await rowButton(p, 'open', items[i], 400); // a preset just opened is saved: no confirm
      const pb = (await state(p)).patch.blocks,
        blocks = pb.length;
      // Owner (PR #1 review, 2026-11-12): lasers and emitters are never self-powered; a Power block next to each runs it.
      if (pb.some((b: any) => /laser|emitter/.test(b.type) && b.params?.selfPoweredMode))
        got[`${items[i]}: self-powered`] = true;
      // CHG-0013: the owner's Self Playing Scene opens with its two Toggles opposite (they flip together: the chords take turns).
      const toggles = pb
        .filter((b: any) => b.type === 'power.toggle')
        .map((b: any) => !!b.params?.logic);
      const plays = selfPlaying.has(items[i]) ? await maxOver(p, 'rms', 3000) : null;
      got[items[i]] = {
        blocks,
        ...(plays !== null ? { rms: plays } : {}),
        ...(toggles.length ? { toggles } : {}),
      };
    }
    await p.close();
    const ok =
      Object.entries(want).every(([key, k]) => (got[key] as any)?.blocks === k) &&
      !Object.keys(got).some((k) => k.endsWith('self-powered')) &&
      [...selfPlaying].every((n) => (got[n] as any)?.rms > 0.001) &&
      (got['Self Playing Scene'] as any)?.toggles?.length === 2 &&
      (got['Self Playing Scene'] as any).toggles[0] !==
        (got['Self Playing Scene'] as any).toggles[1];
    return [ok, got];
  },
  /** Owner (2026-11-10): the user's own saved patches have a bin (a small v1 trash can) right of INSERT; it asks first,
   * then takes the patch off this browser's list. Owner review 3 (2026-11-16): OPEN lists only the user's own patches
   * (no presets: they are @blokdust's in the gallery), so with that one gone it is empty. */
  async 'patch-delete'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      delete (window as any).showSaveFilePicker;
    });
    await openPatches(p);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells'));
    const dl = p.waitForEvent('download');
    await patchesClick(p, 'save', 600);
    await dl;
    await openList(p);
    const listed = await p.evaluate(() =>
      (window as any).__bd_probe.scene.PatchesPanel.Items.map(
        (i: any) => `${i.name}${i.removable ? ' [bin]' : ''}`,
      ),
    );
    const [bx, by] = await patchesAt(p, 'bin0');
    await p.mouse.move(bx, by);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/patch-delete.png` });
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) {
        seen.push(t);
        return (f as any).call(this, t, ...a);
      };
    });
    await p.mouse.click(bx, by);
    await p.waitForTimeout(400);
    const asked = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    // Owner's wording (2026-11-10): "Delete <name>?", then what is and isn't touched.
    const words = await p.evaluate(() => {
      const t: string[] = (window as any).__texts;
      return {
        title: t.includes('DELETE BASS + BELLS?'),
        line: t
          .join(' ')
          .includes('This patch will be removed from the patches list. Your local downloaded'),
      };
    });
    await p.screenshot({ path: `${OUT}/patch-delete-confirm.png` });
    await patchesClick(p, 'removeCancel', 400);
    const kept = await p.evaluate(
      () => (window as any).__bd_probe.scene.PatchesPanel.Items[0]?.name,
    );
    await patchesClick(p, 'bin0', 400);
    await patchesClick(p, 'removeOk', 800);
    const after = await p.evaluate(() => ({
      items: (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name),
      stored: JSON.parse(localStorage.getItem('blokdust.myPatches') ?? '[]').length,
    }));
    await p.waitForTimeout(300);
    const empty = await p.evaluate(() => (window as any).__texts.includes('NO PATCHES YET'));
    await p.screenshot({ path: `${OUT}/open-empty.png` });
    await p.close();
    const ok =
      listed.length === 1 &&
      listed[0] === 'Bass + Bells [bin]' &&
      asked === 'remove' &&
      kept === 'Bass + Bells' &&
      words.title &&
      words.line &&
      after.items.length === 0 &&
      after.stored === 0 &&
      empty;
    return [ok, { listed, asked, kept, words, after, empty }];
  },
};
