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

/** A saved .blokdust file, as far as these tests read it. */
interface SavedFile {
  format?: string;
  meta?: { title?: string };
  blocks?: unknown[];
}

export const patchesOpenTests: Record<string, RegressionTest> = {
  /** CHG-0005: OPEN's rows have OPEN and INSERT (the blocks follow the pointer till a click,
   * Cmd/Ctrl+Z undoes); SAVE downloads a file; a picked or dropped file asks Open or Insert. */
  async 'patches-web'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    // A browser without a save dialog.
    await page.evaluate(() => {
      delete window.showSaveFilePicker;
    });
    await keepPresets(page);
    const count = async () => (await state(page)).patch.blocks.length;
    const centre = async (from: number) =>
      page.evaluate((first): [number, number] => {
        const blocks = window.__bd_probe.state.patch.blocks.slice(first);
        const xs = blocks.map((patchBlock) => patchBlock.x ?? 0),
          ys = blocks.map((patchBlock) => patchBlock.y ?? 0);
        return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      }, from);
    await openPatches(page);
    const tab = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Tab);
    const title = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title);
    await patchesClick(page, 'tab1', 1100);
    const items = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.Items.map((i) => i.name),
    );
    await page.screenshot({ path: `${OUT}/patches-web.png` });
    // INSERT: the blocks follow the pointer, drawn like a pressed block, until a click.
    await patchesClick(page, 'ins0', 100);
    await page.mouse.move(400, 600, { steps: 8 });
    await page.waitForTimeout(300);
    const placing = await page.evaluate(() => window.__bd_placing());
    await page.screenshot({ path: `${OUT}/patches-web-placing.png` });
    await page.mouse.click(400, 600);
    await page.waitForTimeout(300);
    const placed = {
      count: await count(),
      centre: await centre(1),
      placing: await page.evaluate(() => window.__bd_placing()),
    };
    const [cx, cy] = await toCss(page, placed.centre[0], placed.centre[1]);
    await page.keyboard.press('ControlOrMeta+z');
    await page.waitForTimeout(300);
    const undone = await count();
    // Esc while placing puts nothing down.
    await openList(page);
    await patchesClick(page, 'ins0', 100);
    await page.mouse.move(500, 300, { steps: 4 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const escaped = await count();
    // SAVE TO COMPUTER (download)
    await openPatches(page);
    const dl = page.waitForEvent('download');
    await patchesClick(page, 'save');
    const download = await dl,
      file = JSON.parse(readFileSync(await download.path(), 'utf8')) as SavedFile;
    const saved = {
      name: download.suggestedFilename(),
      title: file.meta?.title,
      blocks: file.blocks?.length,
      format: file.format,
    };
    // The saved patch is listed first; OPEN a preset: just saved, so no question.
    await openList(page);
    const mine = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Items.at(0));
    await rowButton(page, 'open', 'Computer Keys + 2 Tones');
    const afterOpen = await count();
    await openList(page);
    await rowButton(page, 'open', title); // the saved one: nothing changed, so no question
    const reopened = {
      blocks: await count(),
      title: await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title),
    };
    await openList(page);
    await rowButton(page, 'open', 'Computer Keys + 2 Tones');
    const openTitle = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Title);
    // FROM YOUR COMPUTER → Insert
    await openList(page);
    const chooser = page.waitForEvent('filechooser');
    await patchesClick(page, 'file', 0);
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
    await page.waitForTimeout(600);
    const choice = await page.evaluate(() => {
      const pp = window.__bd_probe.scene.PatchesPanel;
      return { view: pp.View, picked: pp.Picked };
    });
    await page.screenshot({ path: `${OUT}/patches-web-file.png` });
    await patchesClick(page, 'fileInsert', 100);
    await page.mouse.move(900, 600, { steps: 4 });
    await page.mouse.click(900, 600);
    await page.waitForTimeout(300);
    const afterFile = await count();
    // A dropped file: the same question
    await page.evaluate(() => {
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
    await page.waitForTimeout(1200);
    const dropView = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View);
    await patchesClick(page, 'fileInsert', 100);
    await page.mouse.move(300, 650, { steps: 4 });
    await page.mouse.click(300, 650);
    await page.waitForTimeout(300);
    const afterDrop = await count();
    await page.screenshot({ path: `${OUT}/patches-web-after.png` });
    await page.close();
    const ok =
      tab === 0 &&
      items.includes('MIDI Keys + 2 Tones') &&
      items.length === 6 &&
      !!title &&
      mine?.name === title &&
      /^Saved \d/.test(mine.detail) &&
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
  /** Open over unsaved changes asks (CANCEL, SAVE FIRST, OPEN ANYWAY); an unchanged patch opens
   * at once and Insert never asks. SAVE FIRST saves, then opens. */
  async 'open-confirms-unsaved'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.evaluate(() => {
      delete window.showSaveFilePicker;
    });
    await keepPresets(page);
    const count = async () => (await state(page)).patch.blocks.length;
    /** Drag the patch's first block 4 cells right: a change. */
    const change = async () => {
      const first = (await state(page)).patch.blocks[0],
        bx = first.x ?? 0,
        by = first.y ?? 0,
        [x, y] = await toCss(page, bx, by + 0.2),
        [x2, y2] = await toCss(page, bx + 4, by + 0.2);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x2, y2, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    };
    const view = () =>
      page.evaluate(() => {
        const pp = window.__bd_probe.scene.PatchesPanel;
        return pp.Open ? pp.View : 'closed';
      });
    // Unchanged (opened from a link): no question.
    await openList(page);
    await rowButton(page, 'open', 'Rotating Sequencer');
    const unchanged = { view: await view(), blocks: await count() };
    // Changed: asked; CANCEL keeps the work.
    await change();
    await openList(page);
    await rowButton(page, 'open', 'Computer Keys + 2 Tones');
    const asked = await view();
    await page.screenshot({ path: `${OUT}/open-confirms-unsaved.png` });
    await patchesClick(page, 'cancel');
    const cancelled = { view: await view(), blocks: await count() };
    // INSERT never asks.
    await rowButton(page, 'ins', 'Microphone + Recorder', 100);
    await page.mouse.click(300, 600);
    await page.waitForTimeout(300);
    const inserted = { view: await view(), blocks: await count() };
    // SAVE FIRST: the file is saved, then the patch opens.
    await openList(page);
    await rowButton(page, 'open', 'Computer Keys + 2 Tones', 300);
    const dl = page.waitForEvent('download');
    await patchesClick(page, 'saveFirst', 0);
    const download = await dl,
      savedBlocks = (JSON.parse(readFileSync(await download.path(), 'utf8')) as SavedFile).blocks
        ?.length;
    await page.waitForTimeout(800);
    const afterSaveFirst = { view: await view(), blocks: await count() };
    // OPEN ANYWAY
    await change();
    await openList(page);
    await rowButton(page, 'open', 'Step Sequencer');
    const asked2 = await view();
    await patchesClick(page, 'openAnyway', 600);
    const anyway = { view: await view(), blocks: await count() };
    await page.close();
    // Rotating Sequencer has 10 blocks, Step Sequencer 21.
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
  /** CHG-0005: every preset opens with all its blocks; the self-playing ones (Power blocks run
   * their lasers and emitters) sound untouched, and Keys and Microphone presets wait. */
  async 'presets-load'(errors: string[]) {
    const page = await open(browser, [], errors);
    await keepPresets(page);
    await openList(page);
    const items = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.Items.map((i) => i.name),
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
    const got: Record<string, true | { blocks: number; rms?: number; toggles?: boolean[] }> = {};
    for (let i = 0; i < items.length; i++) {
      if (i) await openList(page);
      await rowButton(page, 'open', items[i], 400); // a preset just opened is saved: no confirm
      const pb = (await state(page)).patch.blocks,
        blocks = pb.length;
      // Lasers and emitters are never self-powered; a Power block next to each runs it.
      if (pb.some((b) => /laser|emitter/.test(b.type) && b.params?.selfPoweredMode))
        got[`${items[i]}: self-powered`] = true;
      // CHG-0013: Self Playing Scene's two Toggles open opposite, so its chords take turns.
      const toggles = pb.filter((b) => b.type === 'power.toggle').map((b) => !!b.params?.logic);
      const plays = selfPlaying.has(items[i]) ? await maxOver(page, 'rms', 3000) : null;
      got[items[i]] = {
        blocks,
        ...(plays !== null ? { rms: plays } : {}),
        ...(toggles.length ? { toggles } : {}),
      };
    }
    await page.close();
    const entry = (name: string) => {
      const found = got[name] as (typeof got)[string] | undefined;
      return found === true ? undefined : found;
    };
    const scene = entry('Self Playing Scene');
    const ok =
      Object.entries(want).every(([key, count]) => entry(key)?.blocks === count) &&
      !Object.keys(got).some((key) => key.endsWith('self-powered')) &&
      [...selfPlaying].every((name) => (entry(name)?.rms ?? 0) > 0.001) &&
      scene?.toggles?.length === 2 &&
      scene.toggles[0] !== scene.toggles[1];
    return [ok, got];
  },
  /** The user's saved patches have a bin right of INSERT: it asks, then takes the patch off this
   * browser's list; OPEN lists only the user's own patches, so then it is empty. */
  async 'patch-delete'(errors: string[]) {
    const page = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await page.evaluate(() => {
      delete window.showSaveFilePicker;
    });
    await openPatches(page);
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells');
    });
    const dl = page.waitForEvent('download');
    await patchesClick(page, 'save', 600);
    await dl;
    await openList(page);
    const listed = await page.evaluate(() =>
      window.__bd_probe.scene.PatchesPanel.Items.map(
        (i) => `${i.name}${i.removable ? ' [bin]' : ''}`,
      ),
    );
    const [bx, by] = await patchesAt(page, 'bin0');
    await page.mouse.move(bx, by);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/patch-delete.png` });
    await page.evaluate(() => {
      const seen: string[] = (window.__texts = []);
      const proto = CanvasRenderingContext2D.prototype,
        drawText = Object.getOwnPropertyDescriptor(proto, 'fillText')
          ?.value as typeof proto.fillText;
      proto.fillText = function (text: string, ...rest: [number, number, number?]) {
        seen.push(text);
        drawText.call(this, text, ...rest);
      };
    });
    await page.mouse.click(bx, by);
    await page.waitForTimeout(400);
    const asked = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.View);
    // The owner's wording: "Delete <name>?", then what is and isn't touched.
    const words = await page.evaluate(() => {
      const texts = window.__texts ?? [];
      return {
        title: texts.includes('DELETE BASS + BELLS?'),
        line: texts
          .join(' ')
          .includes('This patch will be removed from the patches list. Your local downloaded'),
      };
    });
    await page.screenshot({ path: `${OUT}/patch-delete-confirm.png` });
    await patchesClick(page, 'removeCancel', 400);
    const kept = await page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Items.at(0)?.name);
    await patchesClick(page, 'bin0', 400);
    await patchesClick(page, 'removeOk', 800);
    const after = await page.evaluate(() => ({
      items: window.__bd_probe.scene.PatchesPanel.Items.map((i) => i.name),
      stored: (JSON.parse(localStorage.getItem('blokdust.myPatches') ?? '[]') as unknown[]).length,
    }));
    await page.waitForTimeout(300);
    const empty = await page.evaluate(() => (window.__texts ?? []).includes('NO PATCHES YET'));
    await page.screenshot({ path: `${OUT}/open-empty.png` });
    await page.close();
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
