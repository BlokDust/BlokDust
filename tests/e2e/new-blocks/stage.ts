// Stage block tests: making a Stage and going into it (CHG-0021, UI-0012); run by
// tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
import type { AppSettingsPanel } from '../pageGlobals.shared.ts';
import { steadySineWav } from '../steadySine.ts';
import {
  OUT,
  browser,
  blk,
  state,
  open,
  idOf,
  openPanel,
  rows,
  menuItems,
  type Tests,
  pointOf,
  setParam,
} from './harness.ts';

/** The Stage's window while it is open. */
async function insideWindow(page: Page) {
  const win = await page.evaluate(() => window.__bd_probe.inside);
  if (!win) throw new Error('no Stage is open');
  return win;
}
/** css px of the block with engine id `id`. */
async function pointOfId(page: Page, id: number): Promise<[number, number]> {
  const at = await page.evaluate((blockId) => window.__bd_probe.blockPoint(blockId), id);
  if (!at) throw new Error(`no point on block ${id}`);
  return at;
}
/** The engine id of the first block of `type` on the stage. */
async function idOfType(page: Page, type: string): Promise<number> {
  const block = (await state(page)).blocks.find((each) => each.type === type);
  if (!block) throw new Error(`no ${type} on the stage`);
  return block.id;
}
const sortedTypes = (blocks: { type: string }[]) =>
  blocks
    .map((block) => block.type)
    .sort()
    .join();

export const stageTests: Tests = {
  // CHG-0021 (SCOPE-0006, UI-0009): a Stage block plays what is inside it when powered; OPEN STAGE
  // shows the inner world in a window; an edit inside is kept; ×, Esc and a press outside go out.
  async stage(errors) {
    const macros = [
      {
        block: 's',
        blocks: [
          blk('t', 'source.tone', 0, 0),
          blk('pw', 'power.power', -3, 0),
          blk('f', 'fx.filter', 3, 0),
        ],
      },
    ];
    const page = await open(
      browser,
      [blk('s', 'source.stage', 0, 0), blk('outer', 'fx.volume', 0, 8)],
      errors,
      { macros },
    );
    const menu = await menuItems(page, 'Source');
    // Nothing powers it.
    const silent = (await state(page)).rms < 0.0005;
    const at = await pointOf(page, 's');
    await page.mouse.move(at[0], at[1]);
    await page.mouse.down();
    await page.waitForTimeout(400);
    // A held pointer powers it: the inner Tone sounds.
    const held = (await state(page)).rms > 0.005;
    await page.mouse.up();
    await page.waitForTimeout(700);
    // Its panel.
    await openPanel(page, 's');
    const names = (await rows(page)).map((row) => row.name || row.type);
    await setParam(page, 'openStage', 1);
    await page.waitForFunction(() => window.__bd_probe.inside, null, { timeout: 5000 });
    await page.waitForTimeout(900);
    const inner = (await state(page)).blocks.map((block) => block.type).sort();
    const win = await insideWindow(page);
    const insideMenu = await menuItems(page, 'Source'),
      insideInteraction = await menuItems(page, 'Interaction');
    // The inner world's own connections.
    const linked = (await state(page)).connections.length / 2;
    await page.screenshot({ path: `${OUT}/stage-inside.png` });
    // Edit inside: move the inner Filter away (it disconnects).
    const filterAt = await pointOfId(page, await idOfType(page, 'fx.filter'));
    await page.mouse.move(filterAt[0], filterAt[1]);
    await page.mouse.down();
    await page.mouse.move(filterAt[0] + 260, filterAt[1] + 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const unlinked = (await state(page)).connections.length / 2;
    // Out by the ×.
    await page.mouse.click(win.closeX, win.closeY);
    await page.waitForTimeout(500);
    const out1 = await page.evaluate(() => window.__bd_probe.inside === null);
    const outerBlocks = (await state(page)).blocks.map((block) => block.type).sort();
    const outerInteraction = await menuItems(page, 'Interaction');
    const saved = (await state(page)).patch.macros?.[0];
    const movedFilter = saved?.blocks.find((block) => block.id === 'f');
    // In again by double click; out by Esc; in again; out by a press in the margin. The point is
    // asked again: v1 moved the view for the panel.
    const at2 = await pointOf(page, 's');
    await page.mouse.dblclick(at2[0], at2[1]);
    await page.waitForFunction(() => window.__bd_probe.inside, null, { timeout: 5000 });
    await page.waitForTimeout(700);
    const again = (await state(page)).blocks.length;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const out2 = await page.evaluate(() => window.__bd_probe.inside === null);
    await page.evaluate(
      (stageId) => {
        window.__bd_stage.enter(stageId);
      },
      await idOf(page, 's'),
    );
    await page.waitForTimeout(700);
    const win2 = await insideWindow(page);
    await page.mouse.click(win2.x - 40, win2.y + win2.h / 2);
    await page.waitForTimeout(400);
    const out3 = await page.evaluate(() => window.__bd_probe.inside === null);
    // Still plays, and the patch round-trips.
    await page.mouse.move(at2[0], at2[1]);
    await page.mouse.down();
    await page.waitForTimeout(400);
    const stillPlays = (await state(page)).rms > 0.005;
    await page.mouse.up();
    await page.close();
    const pass =
      menu.includes('Stage') &&
      silent &&
      held &&
      names.includes('Volume') &&
      names.filter((name) => name === 'actionbutton').length === 1 &&
      inner.join() === 'fx.filter,power.power,source.tone' &&
      !insideMenu.includes('Stage') &&
      insideMenu.includes('Sample') &&
      insideMenu.includes('Microphone') &&
      insideMenu.includes('Tone') &&
      insideInteraction.includes('Stage In') &&
      !outerInteraction.includes('Stage In') &&
      linked === 2 &&
      unlinked === 1 &&
      out1 &&
      outerBlocks.join() === 'fx.volume,source.stage' &&
      !!movedFilter &&
      movedFilter.x !== 3 &&
      again === 3 &&
      out2 &&
      out3 &&
      stillPlays &&
      win.w > 900 &&
      win.h > 500;
    return [
      pass,
      {
        menu,
        silent,
        held,
        names,
        inner,
        insideMenu,
        insideInteraction,
        outerInteraction,
        linked,
        unlinked,
        out1,
        outerBlocks,
        movedFilter,
        again,
        out2,
        out3,
        stillPlays,
        win,
      },
    ];
  },
  // CHG-0021: selected blocks become what is inside a new Stage (Cmd/Ctrl+G); a copy of a Stage has
  // its own inside.
  async 'stage-from-selection'(errors) {
    const page = await open(
      browser,
      [
        blk('t', 'source.tone', -6, 0),
        blk('pw', 'power.power', -9, 0),
        blk('f', 'fx.filter', -3, 0),
        blk('keep', 'fx.reverb', 12, 6),
      ],
      errors,
    );
    await page.waitForTimeout(300);
    const before = (await state(page)).rms > 0.005;
    const ids = await Promise.all(['t', 'pw', 'f'].map((uid) => idOf(page, uid)));
    const stageId = await page.evaluate((list) => window.__bd_stage.wrap(list, -6, 0), ids);
    if (stageId === null) throw new Error('no Stage was made');
    await page.waitForTimeout(400);
    const wrapped = await state(page);
    // Inside now, and nothing powers the Stage.
    const quiet = wrapped.rms < 0.0005;
    // Power it by pressing on it.
    const at = await pointOfId(page, stageId);
    await page.mouse.move(at[0], at[1]);
    await page.mouse.down();
    await page.waitForTimeout(400);
    const plays = (await state(page)).rms > 0.005;
    await page.mouse.up();
    await page.waitForTimeout(600);
    // Close its panel.
    await page.mouse.click(1100, 300);
    await page.waitForTimeout(400);
    const patch = (await state(page)).patch;
    await page.close();
    const macro = patch.macros?.[0];
    const pass =
      before &&
      quiet &&
      plays &&
      sortedTypes(wrapped.blocks) === 'fx.reverb,source.stage' &&
      !!macro &&
      sortedTypes(macro.blocks) === 'fx.filter,power.power,source.tone' &&
      macro.block === patch.blocks.find((block) => block.type === 'source.stage')?.id;
    return [
      pass,
      { before, quiet, plays, outer: wrapped.blocks.map((block) => block.type), macro },
    ];
  },
  // Blocks dragged onto a Stage block go inside it (it is ringed while they would), to the right of
  // what was there, keeping their connections.
  async 'drop-into-stage'(errors) {
    const macros = [
      { block: 's', blocks: [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0)] },
    ];
    const page = await open(
      browser,
      [
        blk('s', 'source.stage', 0, 0),
        blk('pw2', 'power.power', -4, 0),
        blk('t2', 'source.tone', 10, 6),
        blk('f2', 'fx.filter', 13, 6),
      ],
      errors,
      { macros },
    );
    await page.waitForTimeout(400);
    const ids = await Promise.all(['t2', 'f2'].map((uid) => idOf(page, uid)));
    await page.evaluate((list) => {
      window.__bd_probe.select(list);
    }, ids);
    const from = await pointOfId(page, ids[0]);
    const onto = await pointOf(page, 's');
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(onto[0], onto[1], { steps: 12 });
    await page.waitForTimeout(200);
    const ringed = await page.evaluate(() => window.__bd_probe.dropTarget);
    await page.mouse.up();
    await page.waitForTimeout(600);
    const dropped = await state(page),
      macro = dropped.patch.macros?.find((each) => each.block === 's');
    // The outer Power still powers the Stage, whose inner Tone plays.
    const sounds = dropped.rms > 0.005;
    await page.close();
    const inner = macro && sortedTypes(macro.blocks);
    const outer = sortedTypes(dropped.blocks);
    const added = macro?.blocks.filter((block) => ['t2', 'f2'].includes(block.id)) ?? [];
    const pass =
      ringed !== null &&
      outer === 'power.power,source.stage' &&
      inner === 'fx.filter,power.power,source.tone,source.tone' &&
      added.length === 2 &&
      added.every((block) => (block.x ?? 0) > 0) &&
      (macro?.connectionOrder ?? []).some((pair) => pair.join() === 't2,f2') &&
      sounds;
    return [pass, { ringed, outer, inner, added, order: macro?.connectionOrder, sounds }];
  },
  // UI-0012: with blocks selected a MAKE STAGE button puts them all in a new Stage block, samplers
  // with their audio (nothing is left out), and they carry on playing inside.
  async 'make-stage-button'(errors) {
    const page = await open(
      browser,
      [
        blk('sm', 'source.sample', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('po', 'power.power', 2, 0),
      ],
      errors,
    );
    const none = await page.evaluate(() => window.__bd_probe.makeStage);
    await page.evaluate(
      ([id, bytes]) => window.__bd_loadSample(id, 'sine.wav', new Uint8Array(bytes).buffer),
      [await idOf(page, 'sm'), steadySineWav()] as const,
    );
    await page.waitForTimeout(300);
    await page.evaluate(
      (list) => {
        window.__bd_probe.select(list);
      },
      await Promise.all(['sm', 'pw'].map((uid) => idOf(page, uid))),
    );
    await page.waitForTimeout(200);
    const btn = await page.evaluate(() => window.__bd_probe.makeStage);
    await page.screenshot({ path: `${OUT}/make-stage-button.png` });
    if (btn) await page.mouse.click(btn.x, btn.y);
    await page.waitForTimeout(1200);
    const made = await state(page),
      outer = sortedTypes(made.blocks);
    const firstMacro = made.patch.macros?.[0];
    const inner = firstMacro && sortedTypes(firstMacro.blocks);
    // The outer Power powers the Stage; inside, its Power plays the Sample.
    const sounds = made.rms > 0.005;
    await page.evaluate(
      (stageId) => {
        window.__bd_stage.enter(stageId);
      },
      await idOfType(page, 'source.stage'),
    );
    await page.waitForTimeout(700);
    const shown = await page.evaluate(() => window.__bd_probe.samples);
    await page.close();
    const pass =
      none === null &&
      !!btn &&
      outer === 'power.power,source.stage' &&
      inner === 'power.power,source.sample' &&
      sounds &&
      shown.length === 1 &&
      shown[0].loaded &&
      shown[0].frames > 0;
    return [pass, { none, btn, outer, inner, sounds, shown }];
  },
  // UI-0012: MAKE STAGE sits beside the selection's top (right, or left with no room), clear of
  // SIGNED IN AS; top right under it only with every block selected and some out of view.
  async 'make-stage-placement'(errors) {
    interface Box {
      x: number;
      y: number;
      w: number;
      h: number;
    }
    interface Bounds {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    }
    const overlaps = (a?: Box | null, b?: Box | null) =>
      !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const right = (box?: Box, sel?: Bounds) =>
      !!box && !!sel && box.x > sel.x1 && box.x - sel.x1 < 20 && Math.abs(box.y - sel.y0) < 2;
    const left = (box?: Box, sel?: Bounds) =>
      !!box &&
      !!sel &&
      box.x + box.w < sel.x0 &&
      sel.x0 - (box.x + box.w) < 20 &&
      Math.abs(box.y - sel.y0) < 2;
    const corner = (box?: Box, me?: Box | null) =>
      !!box && !!me && box.x + box.w > 1280 - 40 && box.y >= me.y + me.h;
    async function pick(page: Page, uids: string[], shot: string) {
      await page.evaluate(() => {
        (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.Account = {
          handle: 'someone_with_a_long_name',
          passkeys: 0,
          providers: [],
        };
      });
      await page.evaluate(
        (list) => {
          window.__bd_probe.select(list);
        },
        await Promise.all(uids.map((uid) => idOf(page, uid))),
      );
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/make-stage-${shot}.png` });
      return page.evaluate(() => {
        const probe = window.__bd_probe;
        return {
          btn: probe.makeStage?.box,
          sel: probe.selectedBounds ?? undefined,
          me: probe.corners.meBox,
        };
      });
    }
    // In view: the tone and power near the middle, a filter near the right edge.
    let page = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('f', 'fx.filter', 24, 4),
      ],
      errors,
    );
    await page.waitForTimeout(300);
    const some = await pick(page, ['t', 'pw'], 'beside');
    const edge = await pick(page, ['f'], 'edge');
    const allIn = await pick(page, ['t', 'pw', 'f'], 'all-in-view');
    await page.close();
    // One block far out of view.
    page = await open(
      browser,
      [
        blk('t', 'source.tone', 0, 0),
        blk('pw', 'power.power', -3, 0),
        blk('far', 'fx.filter', 0, 90),
      ],
      errors,
    );
    await page.waitForTimeout(300);
    const allOut = await pick(page, ['t', 'pw', 'far'], 'all-out-of-view');
    await page.close();
    const placed = {
      some: right(some.btn, some.sel),
      edge: left(edge.btn, edge.sel),
      allIn: right(allIn.btn, allIn.sel) || left(allIn.btn, allIn.sel),
      allOut: corner(allOut.btn, allOut.me),
      clear: ![some, edge, allIn, allOut].some((picked) => overlaps(picked.btn, picked.me)),
    };
    return [Object.values(placed).every(Boolean), { ...placed, some, edge, allIn, allOut }];
  },
};
