// Stage block tests: making a Stage and going into it (CHG-0021, UI-0012); run by tests/e2e/new-blocks.ts.
import type { Page } from 'playwright';
import { OUT, browser, blk, sineWav, state, open, idOf, openPanel, rows, menuItems, type Tests } from './harness.ts';

export const stageTests: Tests = {
  // CHG-0021 (SCOPE-0006, UI-0009): a Stage block plays what is inside it when powered; OPEN STAGE shows the inner world
  // in a window; an edit inside is kept in the patch; ×, Esc and a press outside go back out.
  async 'stage'(errors) {
    const macros = [{ block: 's', blocks: [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('f', 'fx.filter', 3, 0)] }];
    const p = await open(browser, [blk('s', 'source.stage', 0, 0), blk('outer', 'fx.volume', 0, 8)], errors, { macros } as any);
    const menu = await menuItems(p, 'Source');
    const silent = (await state(p)).rms < 0.0005;                       // nothing powers it
    const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 's')) as [number, number];
    await p.mouse.move(at[0], at[1]); await p.mouse.down(); await p.waitForTimeout(400);
    const held = (await state(p)).rms > 0.005;                          // a held pointer powers it: the inner Tone sounds
    await p.mouse.up(); await p.waitForTimeout(700);
    // its panel
    await openPanel(p, 's');
    const names = (await rows(p)).map(x => x.name || x.type);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('openStage', 1));
    await p.waitForFunction(() => (window as any).__bd_probe.inside, null, { timeout: 5000 });
    await p.waitForTimeout(900);
    const inner = (await state(p)).blocks.map((b: any) => b.type).sort();
    const win = await p.evaluate(() => (window as any).__bd_probe.inside);
    const insideMenu = await menuItems(p, 'Source'), insideInteraction = await menuItems(p, 'Interaction');
    const linked = (await state(p)).connections.length / 2;               // the inner world's own connections
    await p.screenshot({ path: `${OUT}/stage-inside.png` });
    // edit inside: move the inner Filter away (it disconnects)
    const fAt = await p.evaluate(() => { const s = (window as any).__bd_probe; const i = s.state.blocks.find((b: any) => b.type === 'fx.filter').id; return s.blockPoint(i); }) as [number, number];
    await p.mouse.move(fAt[0], fAt[1]); await p.mouse.down(); await p.mouse.move(fAt[0] + 260, fAt[1] + 60, { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(500);
    const unlinked = (await state(p)).connections.length / 2;
    // out by the ×
    await p.mouse.click(win.closeX, win.closeY); await p.waitForTimeout(500);
    const out1 = await p.evaluate(() => (window as any).__bd_probe.inside === null);
    const outerBlocks = (await state(p)).blocks.map((b: any) => b.type).sort();
    const outerInteraction = await menuItems(p, 'Interaction');
    const saved = (await state(p)).patch.macros?.[0];
    const movedFilter = saved?.blocks.find((b: any) => b.id === 'f');
    // in again by double click; out by Esc; in again; out by a press in the margin
    const at2 = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 's')) as [number, number];  // v1 moved the view for the panel
    await p.mouse.dblclick(at2[0], at2[1]); await p.waitForFunction(() => (window as any).__bd_probe.inside, null, { timeout: 5000 }); await p.waitForTimeout(700);
    const again = (await state(p)).blocks.length;
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const out2 = await p.evaluate(() => (window as any).__bd_probe.inside === null);
    await p.evaluate(i => (window as any).__bd_stage.enter(i), await idOf(p, 's')); await p.waitForTimeout(700);
    const w2 = await p.evaluate(() => (window as any).__bd_probe.inside);
    await p.mouse.click(w2.x - 40, w2.y + w2.h / 2); await p.waitForTimeout(400);
    const out3 = await p.evaluate(() => (window as any).__bd_probe.inside === null);
    // still plays, and the patch round-trips
    await p.mouse.move(at2[0], at2[1]); await p.mouse.down(); await p.waitForTimeout(400);
    const stillPlays = (await state(p)).rms > 0.005;
    await p.mouse.up();
    await p.close();
    const pass = menu.includes('Stage') && silent && held && names.includes('Volume') && names.filter((n: string) => n === 'buttonpair').length === 1 &&
      inner.join() === 'fx.filter,power.power,source.tone' && !insideMenu.includes('Stage') && insideMenu.includes('Sample') && insideMenu.includes('Microphone') && insideMenu.includes('Tone') &&
      insideInteraction.includes('Stage In') && !outerInteraction.includes('Stage In') &&
      linked === 2 && unlinked === 1 && out1 && outerBlocks.join() === 'fx.volume,source.stage' && !!movedFilter && movedFilter.x !== 3 && again === 3 && out2 && out3 && stillPlays &&
      win.w > 900 && win.h > 500;
    return [pass, { menu, silent, held, names, inner, insideMenu, insideInteraction, outerInteraction, linked, unlinked, out1, outerBlocks, movedFilter, again, out2, out3, stillPlays, win }];
  },
  // CHG-0021: selected blocks become what is inside a new Stage (Cmd/Ctrl+G); a copy of a Stage has its own inside.
  async 'stage-from-selection'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', -6, 0), blk('pw', 'power.power', -9, 0), blk('f', 'fx.filter', -3, 0), blk('keep', 'fx.reverb', 12, 6)], errors);
    await p.waitForTimeout(300);
    const before = (await state(p)).rms > 0.005;
    const ids = await Promise.all(['t', 'pw', 'f'].map(u => idOf(p, u)));
    const stageId = await p.evaluate(list => (window as any).__bd_stage.wrap(list, -6, 0), ids);
    await p.waitForTimeout(400);
    const s1 = await state(p);
    const quiet = s1.rms < 0.0005;                                      // inside now, and nothing powers the Stage
    // power it: a Power block beside it (through a patch insert would be heavier; press instead)
    const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), stageId) as [number, number];
    await p.mouse.move(at[0], at[1]); await p.mouse.down(); await p.waitForTimeout(400);
    const plays = (await state(p)).rms > 0.005;
    await p.mouse.up(); await p.waitForTimeout(600);
    await p.mouse.click(1100, 300); await p.waitForTimeout(400);       // close its panel
    const patch = (await state(p)).patch;
    await p.close();
    const macro = patch.macros?.[0];
    const pass = before && quiet && plays && s1.blocks.map((b: any) => b.type).sort().join() === 'fx.reverb,source.stage' &&
      macro?.blocks.map((b: any) => b.type).sort().join() === 'fx.filter,power.power,source.tone' && macro.block === patch.blocks.find((b: any) => b.type === 'source.stage').id;
    return [pass, { before, quiet, plays, outer: s1.blocks.map((b: any) => b.type), macro }];
  },
  // Owner review 2026-11-14: blocks dragged onto a Stage block go inside it (it is ringed while they would); with
  // what was there, to its right, keeping their connections.
  async 'drop-into-stage'(errors) {
    const macros = [{ block: 's', blocks: [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0)] }];
    const p = await open(browser, [blk('s', 'source.stage', 0, 0), blk('pw2', 'power.power', -4, 0), blk('t2', 'source.tone', 10, 6), blk('f2', 'fx.filter', 13, 6)], errors, { macros } as any);
    await p.waitForTimeout(400);
    const ids = await Promise.all(['t2', 'f2'].map(u => idOf(p, u)));
    await p.evaluate(list => (window as any).__bd_probe.select?.(list), ids);
    const from = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), ids[0]) as [number, number];
    const onto = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 's')) as [number, number];
    await p.mouse.move(...from); await p.mouse.down();
    await p.mouse.move(onto[0], onto[1], { steps: 12 }); await p.waitForTimeout(200);
    const ringed = await p.evaluate(() => (window as any).__bd_probe.dropTarget);
    await p.mouse.up(); await p.waitForTimeout(600);
    const s = await state(p), macro = s.patch.macros?.find((m: any) => m.block === 's');
    const sounds = s.rms > 0.005;   // the outer Power still powers the Stage, whose inner Tone plays
    await p.close();
    const inner = macro?.blocks.map((b: any) => b.type).sort().join();
    const outer = s.blocks.map((b: any) => b.type).sort().join();
    const added = macro?.blocks.filter((b: any) => ['t2', 'f2'].includes(b.id)) ?? [];
    const pass = ringed !== null && outer === 'power.power,source.stage' && inner === 'fx.filter,power.power,source.tone,source.tone' &&
      added.length === 2 && added.every((b: any) => b.x > 0) && (macro?.connectionOrder ?? []).some((c: string[]) => c.join() === 't2,f2') && sounds;
    return [pass, { ringed, outer, inner, added, order: macro?.connectionOrder, sounds }];
  },
  // Owner review 2 (2026-11-14, UI-0012): with blocks selected a MAKE STAGE button puts them all in a new Stage block,
  // samplers with their audio (nothing is left out), and they carry on playing inside.
  async 'make-stage-button'(errors) {
    const p = await open(browser, [blk('sm', 'source.sample', 0, 0), blk('pw', 'power.power', -3, 0), blk('po', 'power.power', 2, 0)], errors);
    const none = await p.evaluate(() => (window as any).__bd_probe.makeStage);
    await p.evaluate(([i, bytes]) => (window as any).__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer), [await idOf(p, 'sm'), sineWav()] as const);
    await p.waitForTimeout(300);
    await p.evaluate(list => (window as any).__bd_probe.select(list), await Promise.all(['sm', 'pw'].map(u => idOf(p, u))));
    await p.waitForTimeout(200);
    const btn = await p.evaluate(() => (window as any).__bd_probe.makeStage) as { x: number; y: number } | null;
    await p.screenshot({ path: `${OUT}/make-stage-button.png` });
    if (btn) await p.mouse.click(btn.x, btn.y);
    await p.waitForTimeout(1200);
    const s = await state(p), outer = s.blocks.map((b: any) => b.type).sort().join();
    const inner = s.patch.macros?.[0]?.blocks.map((b: any) => b.type).sort().join();
    const sounds = s.rms > 0.005;   // the outer Power powers the Stage; inside, its Power plays the Sample
    await p.evaluate(i => (window as any).__bd_stage.enter(i), s.blocks.find((b: any) => b.type === 'source.stage').id);
    await p.waitForTimeout(700);
    const shown = await p.evaluate(() => (window as any).__bd_probe.samples);
    await p.close();
    const pass = none === null && !!btn && outer === 'power.power,source.stage' && inner === 'power.power,source.sample' && sounds &&
      shown.length === 1 && shown[0].loaded && shown[0].frames > 0;
    return [pass, { none, btn, outer, inner, sounds, shown }];
  },
  // Owner (2026-11-17, UI-0012): MAKE STAGE covered the SIGNED IN AS line. It now sits beside the selection's top: on
  // its right, or its left with no room there. Only with every block selected and some out of view does it go top
  // right, under the SIGNED IN AS line. Drawn on v1's panel layer (no blurred shadow: no gradients in BlokDust).
  async 'make-stage-placement'(errors) {
    type B = { x: number; y: number; w: number; h: number };
    type R = { x0: number; y0: number; x1: number; y1: number };
    const hits = (a?: B | null, b?: B | null) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const right = (b?: B, s?: R) => !!b && !!s && b.x > s.x1 && b.x - s.x1 < 20 && Math.abs(b.y - s.y0) < 2;
    const left = (b?: B, s?: R) => !!b && !!s && b.x + b.w < s.x0 && s.x0 - (b.x + b.w) < 20 && Math.abs(b.y - s.y0) < 2;
    const corner = (b?: B, me?: B) => !!b && !!me && b.x + b.w > 1280 - 40 && b.y >= me.y + me.h;
    async function pick(p: Page, uids: string[], shot: string) {
      await p.evaluate(() => { (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account = { handle: 'someone_with_a_long_name' }; });
      await p.evaluate(list => (window as any).__bd_probe.select(list), await Promise.all(uids.map(u => idOf(p, u))));
      await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}/make-stage-${shot}.png` });
      return p.evaluate(() => { const pr = (window as any).__bd_probe; return { btn: pr.makeStage?.box as B | undefined, sel: pr.selectedBounds as R | undefined, me: pr.corners.meBox as B | undefined }; });
    }
    // In view: the tone and power near the middle, a filter near the right edge.
    let p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('f', 'fx.filter', 24, 4)], errors);
    await p.waitForTimeout(300);
    const some = await pick(p, ['t', 'pw'], 'beside');
    const edge = await pick(p, ['f'], 'edge');
    const allIn = await pick(p, ['t', 'pw', 'f'], 'all-in-view');
    await p.close();
    // One block far out of view.
    p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('far', 'fx.filter', 0, 90)], errors);
    await p.waitForTimeout(300);
    const allOut = await pick(p, ['t', 'pw', 'far'], 'all-out-of-view');
    await p.close();
    const r = { some: right(some.btn, some.sel), edge: left(edge.btn, edge.sel), allIn: right(allIn.btn, allIn.sel) || left(allIn.btn, allIn.sel),
      allOut: corner(allOut.btn, allOut.me), clear: ![some, edge, allIn, allOut].some(x => hits(x.btn, x.me)) };
    return [Object.values(r).every(Boolean), { ...r, some, edge, allIn, allOut }];
  },
};
