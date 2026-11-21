// Stage block tests: playing into a Stage, its panel and its particles (CHG-0021, UI-0012); run by tests/e2e/new-blocks.ts.
import { OUT, browser, blk, state, open, idOf, openPanel, rows, type Tests } from './harness.ts';

export const stagePlayTests: Tests = {
  // Owner review 3 (2026-11-14, UI-0012): opening a Stage shows its blocks. Its blocks sit far from the centre, and the
  // view saved with it shows none of them: the view moves to centre on them, zooming out to fit them all.
  async 'stage-opens-on-blocks'(errors) {
    const p = await open(browser, [blk('s', 'source.stage', 0, 0)], errors,
      { macros: [{ block: 's', view: { x: 0, y: 0, zoom: 2 }, blocks: [blk('t', 'source.tone', 60, 40), blk('pw', 'power.power', 75, 48), blk('f', 'fx.filter', 66, 30)] }] } as any);
    await p.evaluate(i => (window as any).__bd_stage.enter(i), await idOf(p, 's'));
    await p.waitForTimeout(500);
    const win = await p.evaluate(() => (window as any).__bd_probe.inside) as { x: number; y: number; w: number; h: number };
    const pts = await p.evaluate(() => { const pr = (window as any).__bd_probe; return pr.state.blocks.map((b: any) => pr.toCss(b.x, b.y)); }) as [number, number][];
    await p.screenshot({ path: `${OUT}/stage-opens-on-blocks.png` });
    // A Stage whose blocks the saved view already shows keeps that view.
    const p2 = await open(browser, [blk('s', 'source.stage', 0, 0)], errors,
      { macros: [{ block: 's', view: { x: 30, y: 0, zoom: 1 }, blocks: [blk('t', 'source.tone', -2, 0)] }] } as any);
    await p2.evaluate(i => (window as any).__bd_stage.enter(i), await idOf(p2, 's'));
    await p2.waitForTimeout(500);
    const kept = await p2.evaluate(() => { const pr = (window as any).__bd_probe; return pr.toCss(0, 0)[0] - innerWidth / 2; });
    await p.close(); await p2.close();
    const visible = pts.length === 3 && pts.every(([x, y]) => x > win.x && x < win.x + win.w && y > win.y && y < win.y + win.h);
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const centred = Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (win.x + win.w / 2)) < 2 && Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - (win.y + win.h / 2)) < 2;
    const keptView = Math.abs(kept - 30 * (1280 / 850)) < 2;
    return [visible && centred && keptView, { pts, win, kept }];
  },
  // Owner review 2 (UI-0012): the computer's keys play a Keyboard inside a Stage from outside it; a Keyboard touching a
  // Stage plays its Stage In.
  async 'stage-keys'(errors) {
    const p1 = await open(browser, [blk('s', 'source.stage', 0, 0)], errors, { macros: [{ block: 's', blocks: [blk('t', 'source.tone', 0, 0), blk('k', 'input.computer-keyboard', 3, 0)] }] } as any);
    const quiet1 = (await state(p1)).rms < 0.0005;
    await p1.keyboard.down('KeyQ'); await p1.waitForTimeout(500);
    const keyPlays = (await state(p1)).rms > 0.005;
    await p1.keyboard.up('KeyQ');
    await p1.close();
    const p2 = await open(browser, [blk('s', 'source.stage', 0, 0), blk('k', 'input.computer-keyboard', -3, 0)], errors,
      { macros: [{ block: 's', blocks: [blk('t', 'source.tone', 0, 0), blk('in', 'input.stage-in', 3, 0)] }] } as any);
    const quiet2 = (await state(p2)).rms < 0.0005;
    await p2.keyboard.down('KeyE'); await p2.waitForTimeout(500);
    const stageInPlays = (await state(p2)).rms > 0.005;
    await p2.keyboard.up('KeyE');
    await p2.close();
    return [quiet1 && keyPlays && quiet2 && stageInPlays, { quiet1, keyPlays, quiet2, stageInPlays }];
  },
  // Owner 2026-11-14 (R13b): a Stage's panel has Keep Particles (off by default); the switch is saved with the patch.
  async 'stage-keep-particles'(errors) {
    const p = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    await openPanel(p, 'st');
    const sw = () => p.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.OptionsForm.parameters as any[])
      .flatMap(r => r.type === 'switches' ? r.switches.map((x: any) => [x.name, !!x.value]) : []) as [string, boolean][]);
    const before = await sw();
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('keepParticles', true));
    await p.waitForTimeout(300);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'st').params;
    await p.mouse.click(1100, 700); await p.waitForTimeout(500);
    await openPanel(p, 'st');
    const after = await sw();
    await p.screenshot({ path: `${OUT}/stage-keep-particles.png` });
    await p.close();
    const pass = JSON.stringify(before) === '[["Keep Particles",false]]' && saved.keepParticles === 1 && JSON.stringify(after) === '[["Keep Particles",true]]';
    return [pass, { before, saved, after }];
  },
  // Owner 2026-11-20: LOAD PATCH is gone (it read a file only; a patch from OPEN or the gallery goes in with INSERT while
  // the Stage is open): the panel's last row is OPEN STAGE alone, and a real click on it opens the Stage.
  async 'stage-panel-buttons'(errors) {
    const p = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    await p.evaluate(() => { const h = (window as any).__bd_probe.scene.host, seen: string[] = ((window as any).__pressed = []); h.openStage = () => seen.push('open'); });
    await openPanel(p, 'st');
    const row = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      const r = (o.Options as any[]).find(x => x.Setting === 'openStage'); if (!r) return null;
      const y = (o.Position.y + r.Position.y + r.Size.height / 2) / pr;
      return { rows: (o.Options as any[]).map(x => x.Type), type: r.Type, text: r._Text, at: [(o.Position.x + o.Margin + o.Range * 0.5) / pr, y] }; });
    if (!row) { await p.close(); return [false, 'no OPEN STAGE row']; }
    await p.screenshot({ path: `${OUT}/stage-panel-buttons.png` });
    await p.mouse.move(row.at[0], row.at[1]); await p.mouse.click(row.at[0], row.at[1]); await p.waitForTimeout(200);
    const pressed = await p.evaluate(() => (window as any).__pressed);
    await p.close();
    return [row.type === 'actionbutton' && row.text === 'Open Stage' && !row.rows.includes('buttonpair') && pressed.join() === 'open', { ...row, pressed }];
  },
  // Owner 2026-11-20: with a Stage open, INSERT (Patches › OPEN, or the gallery) puts the patch inside that Stage, placed
  // like any insert; its own Stage blocks stay out (one level). The world outside is untouched.
  async 'stage-insert-inside'(errors) {
    const p = await open(browser, [blk('st', 'source.stage', 0, 0), blk('out', 'source.tone', 8, 0)], errors);
    const mine = { format: 'blokdust.patch', version: 2, seed: 1, meta: { title: 'Two Blocks' },
      blocks: [blk('a', 'source.tone', 0, 0), blk('b', 'power.power', 2, 0), blk('s', 'source.stage', 4, 0)] };
    await p.evaluate(m => localStorage.setItem('blokdust.myPatches', JSON.stringify([{ title: 'Two Blocks', saved: Date.UTC(2026, 10, 1), patch: m }])), mine);
    await p.evaluate(i => (window as any).__bd_stage.enter(i), await idOf(p, 'st')); await p.waitForTimeout(800);
    const click = async (name: string, wait = 800) => {
      const [x, y] = await p.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name) as [number, number];
      await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(wait);
    };
    await p.evaluate(() => { try { localStorage.removeItem('blokdust.patchesTab'); } catch { /* */ } });
    await p.mouse.move(1138, 45); await p.mouse.click(1138, 45); await p.waitForTimeout(1500);  // PATCHES
    await click('tab1', 1100);  // OPEN
    await click('ins0', 1000);  // INSERT on Two Blocks: its blocks follow the pointer
    await p.mouse.move(640, 500); await p.mouse.click(640, 500); await p.waitForTimeout(500);  // put them down
    const inner = await p.evaluate(() => [...(window as any).__bd_probe.state.patch.blocks].map((b: any) => b.type).sort());
    const stillInside = await p.evaluate(() => !!(window as any).__bd_probe.inside);
    await p.evaluate(() => (window as any).__bd_stage.exit()); await p.waitForTimeout(800);
    const after = await state(p);
    await p.close();
    const outer = after.patch.blocks.map((b: any) => b.type).sort();
    const macro = (after.patch.macros ?? []).find((m: any) => m.block === 'st');
    const inStage = (macro?.blocks ?? []).map((b: any) => b.type).sort();
    return [JSON.stringify(outer) === JSON.stringify(['source.stage', 'source.tone']) && JSON.stringify(inStage) === JSON.stringify(['power.power', 'source.tone']),
      { inner, stillInside, outer, inStage }];
  },
  // Owner 2026-11-14: a double click on a Stage opens it, and its options panel never shows (the first click had set it
  // on its way open).
  async 'stage-double-click-no-panel'(errors) {
    const p = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 'st')) as [number, number];
    await p.mouse.move(at[0], at[1]);
    await p.mouse.click(at[0], at[1]); await p.waitForTimeout(120); await p.mouse.click(at[0], at[1]);
    let maxScale = 0;
    for (let t = 0; t < 1200; t += 30) { maxScale = Math.max(maxScale, await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Scale)); await p.waitForTimeout(30); }
    const inside = !!(await p.evaluate(() => (window as any).__bd_probe.inside));
    // a single click still opens the panel (outside again first)
    await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    const out = !(await p.evaluate(() => (window as any).__bd_probe.inside));
    await openPanel(p, 'st').catch(() => {});
    const single = await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Scale);
    await p.close();
    return [inside && maxScale === 0 && out && single === 1, { inside, maxScale, out, single }];
  },
};
