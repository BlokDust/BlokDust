// Black-box tests for the post-2.0 blocks (SCOPE-0005, CHG-0014 … CHG-0021): the real app, pointer and AudioWorklet.
//   pnpm test:new-blocks [--only name,name]
// Each test opens a v2 patch from a `?c=p…` link, so it also proves the blocks load from a shared patch.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { encodePatch } from '../../web/src/patch/share.ts';
import type { Patch, PatchBlock } from '../../web/src/patch/loadPatch.ts';

const OUT = 'tests/visual/output/new-blocks';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const results: Record<string, unknown> = {};
let ok = true;

const blk = (id: string, type: string, x: number, y: number, params: Record<string, unknown> = {}): PatchBlock => ({ id, type, x, y, params });
/** A second of a 220 Hz sine as a 16-bit WAV file's bytes. */
const sineWav = () => {
  const n = 44100, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
  return [...b];
};
const state = (p: Page) => p.evaluate(() => (window as any).__bd_probe.state);
/** Open the app on `blocks` (a v2 patch in a share link), press START and wait for the engine. */
async function open(b: Browser, blocks: PatchBlock[], errors: string[], extra: Partial<Patch> = {}, viewport = { width: 1280, height: 800 }): Promise<Page> {
  const page = await b.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  const token = await encodePatch({ format: 'blokdust.patch', version: 2, seed: 1, blocks, ...extra });
  await page.goto(`${url}/index.html?c=${token}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200);  // header tweens settle
  return page;
}
/** The engine id of the block with patch id `uid`. */
const idOf = (p: Page, uid: string) => p.evaluate(u => (window as any).__bd_probe.idOf(u) as number, uid);
/** Click a block (opens its options panel) and wait for the panel. */
async function openPanel(p: Page, uid: string): Promise<void> {
  const id = await idOf(p, uid);
  const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as [number, number] | null;
  if (!at) throw new Error(`no point on block ${uid}`);
  await p.mouse.move(at[0], at[1]); await p.mouse.click(at[0], at[1]);
  await p.waitForFunction(i => { const o = (window as any).__bd_probe.scene.OptionsPanel; return o.Scale === 1 && !o.Opening && o.SelectedBlock?.Id === i; }, id, { timeout: 5000 });
  await p.waitForTimeout(500);
}
/** The open panel's rows: type, name and whatever a live row says it drew. */
const rows = (p: Page) => p.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).map(o => ({ type: o.Type, name: o.Name, setting: o.Setting, value: o.Value, shown: o.Shown })));
/** css px of a point `frac` of the way along the open panel's row `setting` (v1's slider range), at its middle. */
const rowPoint = (p: Page, setting: string, frac: number) => p.evaluate(([s, f]) => {
  const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio, r = (o.Options as any[]).find(x => x.Setting === s);
  return [(o.Position.x + o.Margin + o.Range * (f as number)) / pr, (o.Position.y + r.Position.y + r.Size.height / 2) / pr] as [number, number];
}, [setting, frac] as const);
/** Menu item names of a header category. */
const menuItems = (p: Page, category: string) => p.evaluate(c => ((window as any).__bd_probe.v1App.BlockCreator.MenuJson.categories as any[]).find(x => x.name === c)?.items.map((i: any) => i.name) as string[], category);

const tests: Record<string, (errors: string[]) => Promise<[boolean, unknown]>> = {
  // CHG-0014: the Compressor is in the Effect menu; its panel shows the meter (level, threshold, gain reduction).
  async 'compressor-panel'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('c', 'fx.compressor', 3, 0, { threshold: -40, ratio: 12 })], errors);
    const inMenu = (await menuItems(p, 'Effect')).includes('Compressor');
    await openPanel(p, 'c');
    await p.waitForTimeout(600);
    const r = await rows(p);
    await p.screenshot({ path: `${OUT}/compressor-panel.png` });
    const meter = r.find(x => x.setting === 'compMeter')?.shown as { level: number; reduction: number; thresholdX: number; width: number } | undefined;
    const names = r.map(x => x.name);
    const sounding = (await state(p)).rms > 0.001;
    // The Level meter's line is the Threshold (owner, 2026-11-14): drag it to the middle → −30 dB.
    const from = await rowPoint(p, 'compMeter', 20 / 60), to = await rowPoint(p, 'compMeter', 0.5);
    await p.mouse.move(...from); await p.mouse.down(); await p.mouse.move(...to, { steps: 6 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const dragged = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.threshold;
    await p.close();
    const pass = inMenu && sounding && !!meter && meter.level > -40 && meter.level < 0 && meter.reduction < -1 && Math.abs(meter.thresholdX - meter.width * (20 / 60)) < 1 &&
      ['Level', 'Ratio', 'Knee', 'Attack', 'Release', 'Makeup'].every(n => names.includes(n)) && !names.includes('Threshold') && Math.abs(dragged + 30) < 1;
    return [pass, { inMenu, sounding, meter, names, dragged }];
  },
  // CHG-0014: the emitter's Offset row, after Swing when synced and after Fire Rate when not.
  async 'emitter-offset-row'(errors) {
    const p = await open(browser, [blk('e', 'power.emitter', 0, 0, { sync: true, offset: 0.25 })], errors);
    await openPanel(p, 'e');
    const synced = (await rows(p)).map(x => x.name);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('sync', false));
    await p.waitForTimeout(300);
    const free = (await rows(p)).map(x => x.name);
    const saved = (await state(p)).patch.blocks[0].params.offset;
    await p.close();
    const pass = synced.indexOf('Offset') === synced.indexOf('Swing') + 1 && free.indexOf('Offset') === free.indexOf('Fire Rate') + 1 && saved === 0.25;
    return [pass, { synced, free, saved }];
  },
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
  // Owner review 2026-11-14: the Power block's panel (Gap On Hit, then Gap); a Laser's Rotate sticks at 0; an emitter's
  // panel draws the way it fires.
  async 'power-gap-rotate-guide'(errors) {
    const p = await open(browser, [blk('pw', 'power.power', -8, 0), blk('l', 'power.laser', 0, 0, { rotate: 200 }), blk('e', 'power.emitter', 8, 0, { angle: 0 })], errors);
    await openPanel(p, 'pw');
    const off = (await rows(p)).map(x => x.type === 'switches' ? 'switches' : x.name);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('gapOnHit', true));
    await p.waitForTimeout(300);
    const on = (await rows(p)).map(x => x.type === 'switches' ? 'switches' : x.name);
    const gapSaved = (await state(p)).patch.blocks.find((b: any) => b.id === 'pw').params;
    await p.mouse.click(1100, 700); await p.waitForTimeout(500);
    await openPanel(p, 'l');
    const near = await rowPoint(p, 'rotate', 0.53);
    await p.mouse.move(...near); await p.mouse.down(); await p.waitForTimeout(100);
    const snapped = (await state(p)).patch.blocks.find((b: any) => b.id === 'l').params.rotate ?? 0;
    await p.waitForTimeout(700);
    await p.mouse.move(near[0] + 2, near[1]); await p.mouse.move(near[0], near[1]); await p.mouse.up();
    const fine = (await state(p)).patch.blocks.find((b: any) => b.id === 'l').params.rotate ?? 0;
    await p.mouse.click(1100, 700); await p.waitForTimeout(500);
    await openPanel(p, 'e');
    const guide = await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.PrismExits as [number, number][]);
    await p.screenshot({ path: `${OUT}/emitter-guide.png` });
    await p.close();
    const pass = off.join() === 'switches' && on.join() === 'switches,Gap' && gapSaved.gapOnHit === 1 && snapped === 0 && fine > 0 && fine < 50 &&
      guide?.length === 1 && guide[0][0] > 0 && Math.abs(guide[0][1]) < 1;
    return [pass, { off, on, gapSaved, snapped, fine, guide }];
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
  // Owner 2026-11-14: OPEN STAGE and LOAD PATCH sit side by side on one row; a real click on each half does its own.
  async 'stage-panel-buttons'(errors) {
    const p = await open(browser, [blk('st', 'source.stage', 0, 0)], errors);
    await p.evaluate(() => { const h = (window as any).__bd_probe.scene.host, seen: string[] = ((window as any).__pressed = []); h.openStage = () => seen.push('open'); h.loadStagePatch = () => seen.push('load'); });
    await openPanel(p, 'st');
    const row = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      const r = (o.Options as any[]).find(x => x.Type === 'buttonpair'); if (!r) return null;
      const y = (o.Position.y + r.Position.y + r.Size.height / 2) / pr, x = (f: number) => (o.Position.x + o.Margin + o.Range * f) / pr;
      return { rows: (o.Options as any[]).map(x => x.Type), left: [x(0.25), y], right: [x(0.75), y] }; });
    if (!row) { await p.close(); return [false, 'no button pair row']; }
    await p.screenshot({ path: `${OUT}/stage-panel-buttons.png` });
    for (const at of [row.left, row.right]) { await p.mouse.move(at[0], at[1]); await p.mouse.click(at[0], at[1]); await p.waitForTimeout(200); }
    const pressed = await p.evaluate(() => (window as any).__pressed);
    await p.close();
    return [row.rows.filter((t: string) => t === 'buttonpair').length === 1 && !row.rows.includes('actionbutton') && pressed.join() === 'open,load', { rows: row.rows, pressed }];
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
  // CHG-0020 (UI-0011): labels come with the patch and are drawn; a click edits the words, a drag moves one, the bin
  // deletes it, and the Interaction menu makes a new one. They never reach the engine.
  // Owner 2026-11-14: labels join the multi-selection: Shift+click, the box, Cmd/Ctrl+A; dragging any selected item moves
  // them all (blocks too); Cmd/Ctrl+D copies, Delete deletes, Cmd/Ctrl+G takes them into the Stage with the blocks.
  async 'label-multi-select'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors,
      { labels: [{ id: 'l1', text: 'Mine', x: -8, y: -6 }, { id: 'l2', text: 'Not mine', x: 6, y: 6 }] });
    const labels = () => p.evaluate(() => (window as any).__bd_probe.labels as { id: string; text: string; x: number; y: number; cx: number; cy: number }[]);
    const sel = () => p.evaluate(() => ({ blocks: (window as any).__bd_selection().length as number, labels: (window as any).__bd_label_selection() as string[] }));
    const tone = async () => (await state(p)).patch.blocks.find((b: any) => b.type === 'source.tone');
    const tAt = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 't')) as [number, number];
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
    const t0 = await tone(), a0 = (await labels())[0], b0 = (await labels())[1];
    await p.mouse.move(tAt[0], tAt[1]); await p.mouse.down(); await p.mouse.move(tAt[0] + 60, tAt[1] + 45, { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const t1 = await tone(), a1 = (await labels())[0], b1 = (await labels())[1];
    r.byBlock = { block: [t1.x - t0.x, t1.y - t0.y], label: [a1.x - a0.x, a1.y - a0.y], other: [b1.x - b0.x, b1.y - b0.y] };
    // drag the label: the Tone comes with it
    await p.mouse.move(a1.cx, a1.cy); await p.mouse.down(); await p.mouse.move(a1.cx - 60, a1.cy - 45, { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const t2 = await tone(), a2 = (await labels())[0];
    r.byLabel = { block: [t2.x - t1.x, t2.y - t1.y], label: [a2.x - a1.x, a2.y - a1.y] };
    r.stillPicked = await sel();
    // Cmd/Ctrl+D copies both; Delete deletes the copies
    await p.mouse.move(640, 600);
    await p.keyboard.press('ControlOrMeta+d'); await p.waitForTimeout(300);
    r.copied = { blocks: (await state(p)).patch.blocks.length, labels: (await labels()).length, sel: await sel() };
    await p.keyboard.press('Delete'); await p.waitForTimeout(300);
    r.deleted = { blocks: (await state(p)).patch.blocks.length, labels: (await labels()).length };
    // Cmd/Ctrl+A takes the labels too; Esc lets go
    await p.keyboard.press('ControlOrMeta+a'); await p.waitForTimeout(200);
    r.all = await sel();
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    r.none = await sel();
    // the box (Shift+drag on the stage) round the first label and the Tone
    const now = await labels(), tAt2 = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 't')) as [number, number];
    const x0 = Math.min(now[0].cx, tAt2[0]) - 40, y0 = Math.min(now[0].cy, tAt2[1]) - 40, x1 = Math.max(now[0].cx, tAt2[0]) + 40, y1 = Math.max(now[0].cy, tAt2[1]) + 40;
    await p.keyboard.down('Shift'); await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 6 }); await p.mouse.up(); await p.keyboard.up('Shift');
    await p.waitForTimeout(200);
    r.boxed = await sel();
    // Cmd/Ctrl+G: into a new Stage with the Tone
    await p.keyboard.press('ControlOrMeta+g'); await p.waitForTimeout(500);
    const patch = (await state(p)).patch;
    r.staged = { outerLabels: (patch.labels ?? []).map((l: any) => l.text), inner: patch.macros?.[0]?.labels?.map((l: any) => l.text), blocks: patch.blocks.map((b: any) => b.type) };
    await p.close();
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const bb = r.byBlock as any, bl = r.byLabel as any;
    const pass = eq(r.picked, { blocks: 1, labels: ['l1'] }) && bb.block[0] !== 0 && eq(bb.block, bb.label) && eq(bb.other, [0, 0]) &&
      bl.block[0] !== 0 && eq(bl.block, bl.label) && eq(r.stillPicked, { blocks: 1, labels: ['l1'] }) &&
      eq({ b: (r.copied as any).blocks, l: (r.copied as any).labels, n: (r.copied as any).sel.blocks, m: (r.copied as any).sel.labels.length }, { b: 2, l: 3, n: 1, m: 1 }) &&
      eq(r.deleted, { blocks: 1, labels: 2 }) && eq(r.all, { blocks: 1, labels: ['l1', 'l2'] }) && eq(r.none, { blocks: 0, labels: [] }) &&
      eq(r.boxed, { blocks: 1, labels: ['l1'] }) && eq(r.staged, { outerLabels: ['Not mine'], inner: ['Mine'], blocks: ['source.stage'] });
    return [pass, r];
  },
  // Owner 2026-11-14: making, moving and deleting labels are undo/redo steps, as for blocks (one step with the blocks).
  async 'label-undo-redo'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors);
    const labels = () => p.evaluate(() => (window as any).__bd_probe.labels as { id: string; text: string; x: number; y: number; cx: number; cy: number }[]);
    const blocks = async () => (await state(p)).patch.blocks.length;
    const key = async (k: string) => { await p.mouse.move(640, 650); await p.keyboard.press(k); await p.waitForTimeout(300); };
    const r: Record<string, unknown> = {};
    // a Label from the Interaction menu, dropped and typed into
    await p.mouse.click(843, 45); await p.waitForTimeout(800);
    const item = await p.evaluate(() => { const P = (window as any).__bd_probe, pr = P.v1App.Metrics.PixelRatio;
      for (const cat of P.scene.Header.MenuItems) for (const it of cat.Items) if (String(it.Name).toLowerCase() === 'label') return it.Position.x / pr; return null; });
    await p.mouse.move(item!, 180); await p.mouse.down(); await p.mouse.move(item!, 400, { steps: 6 }); await p.mouse.move(500, 560, { steps: 6 }); await p.mouse.up();
    await p.waitForSelector('#labelEdit'); await p.keyboard.type('Hello'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    r.made = (await labels()).map(l => l.text);
    await key('ControlOrMeta+z'); r.madeUndone = (await labels()).length;
    await key('ControlOrMeta+Shift+z'); r.madeRedone = (await labels()).map(l => l.text);
    // moved
    const a = (await labels())[0];
    await p.mouse.move(a.cx, a.cy); await p.mouse.down(); await p.mouse.move(a.cx + 80, a.cy - 60, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    const b = (await labels())[0];
    await key('ControlOrMeta+z'); const c = (await labels())[0];
    await key('ControlOrMeta+Shift+z'); const d = (await labels())[0];
    r.move = { moved: b.x !== a.x || b.y !== a.y, undone: c.x === a.x && c.y === a.y, redone: d.x === b.x && d.y === b.y };
    // binned
    await p.mouse.move(d.cx, d.cy); await p.mouse.down(); await p.mouse.move(1235, 755, { steps: 10 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(300);
    r.binned = (await labels()).length;
    await key('ControlOrMeta+z'); const e = (await labels())[0];
    r.binUndone = e && e.x === d.x && e.y === d.y && e.text === 'Hello';
    await key('ControlOrMeta+Shift+z'); r.binRedone = (await labels()).length;
    await key('ControlOrMeta+z');
    // Cmd/Ctrl+A, Delete: one step brings back the Tone and the label
    await key('ControlOrMeta+a'); await key('Delete');
    r.deleted = { blocks: await blocks(), labels: (await labels()).length };
    await key('ControlOrMeta+z');
    r.restored = { blocks: await blocks(), labels: (await labels()).length };
    await p.close();
    const eq = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    const pass = eq(r.made, ['Hello']) && r.madeUndone === 0 && eq(r.madeRedone, ['Hello']) && eq(r.move, { moved: true, undone: true, redone: true }) &&
      r.binned === 0 && r.binUndone === true && r.binRedone === 0 && eq(r.deleted, { blocks: 0, labels: 0 }) && eq(r.restored, { blocks: 1, labels: 1 });
    return [pass, r];
  },
  async 'labels'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0)], errors,
      { labels: [{ id: 'l1', text: 'Press the tone', x: -8, y: -6 }, { id: 'l2', text: 'Bin me', x: 6, y: 6 }] });
    const menu = await menuItems(p, 'Interaction');
    const labels = () => p.evaluate(() => (window as any).__bd_probe.labels as { id: string; text: string; x: number; y: number; cx: number; cy: number }[]);
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
    await p.mouse.move(a.cx, a.cy); await p.mouse.down(); await p.mouse.move(a.cx + 60, a.cy + 45, { steps: 6 }); await p.mouse.up();
    await p.waitForTimeout(200);
    const moved = (await labels())[0];
    // drag onto the bin → gone
    const b = (await labels())[1];
    await p.mouse.move(b.cx, b.cy); await p.mouse.down(); await p.mouse.move(1235, 755, { steps: 10 }); await p.waitForTimeout(150); await p.mouse.up();
    await p.waitForTimeout(300);
    const left = await labels();
    const saved = (await state(p)).patch.labels, blocks = (await state(p)).blocks.length;
    await p.screenshot({ path: `${OUT}/labels-after.png` });
    await p.close();
    const pass = menu.includes('Label') && first.length === 2 && edited === 'Hold a key' && (moved.x !== a.x || moved.y !== a.y) && left.length === 1 &&
      saved?.length === 1 && saved[0].text === 'Hold a key' && saved[0].x === moved.x && blocks === 1;
    return [pass, { menu, first: first.map(l => [l.text, l.x, l.y]), edited, moved: [moved.x, moved.y], left: left.length, saved, blocks }];
  },
  // CHG-0019 (UI-0010): the Touchpad's pads are in its panel, in key; a pad plays, a slide is legato, Key and Scale change
  // the notes, and the panel fits between the header and the bottom controls.
  async 'touchpad'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)], errors);
    const menu = await menuItems(p, 'Interaction');
    await openPanel(p, 'g');
    const info = () => p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pads = (o.Options as any[]).find(x => x.Type === 'pads');
      return { x: o.Position.x, y: o.Position.y, top: o.Position.y - o.Size.height / 2, bottom: o.Position.y + o.Size.height / 2, shown: pads.Shown,
        pads: (pads.Pads as any[]).map(q => ({ cx: o.Position.x + q.x + q.w / 2, cy: o.Position.y + q.y + q.h / 2, note: q.note, h: q.h })) }; });
    const a = await info();
    await p.screenshot({ path: `${OUT}/touchpad.png` });
    const names = (await rows(p)).map(x => x.name ?? x.type);
    // bottom row, left to right, in C major: C D E F G A B C
    const bottom = a.pads.slice(0, 8).map(q => q.note), second = a.pads.slice(8, 16).map(q => q.note);
    const g0 = (await state(p)).gateOns;
    const e = a.pads[2], f = a.pads[3];  // E3, F3
    await p.mouse.move(e.cx, e.cy); await p.mouse.down(); await p.waitForTimeout(300);
    const struck = (await state(p)).gateOns - g0, loud = (await state(p)).rms > 0.005, held = await p.evaluate(() => (window as any).__bd_pads());
    await p.mouse.move(f.cx, f.cy, { steps: 4 }); await p.waitForTimeout(300);
    const slid = await p.evaluate(() => (window as any).__bd_pads()), afterSlide = (await state(p)).gateOns - g0, stillLoud = (await state(p)).rms > 0.005;
    await p.mouse.up(); await p.waitForTimeout(400);
    const quiet = (await state(p)).rms < 0.001, released = await p.evaluate(() => (window as any).__bd_pads());
    // Key D, scale minor: the bottom row starts on D and follows D minor.
    await p.evaluate(() => { const b = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock; b.SetParam('key', 2); b.SetParam('scale', 1); b.RefreshOptionsPanel(); });
    await p.waitForTimeout(300);
    const dminor = (await info()).pads.slice(0, 8).map(q => q.note);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('inKey', false));
    await p.waitForTimeout(300);
    const chromatic = (await info()).pads.slice(0, 8).map(q => q.note);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'g').params;
    await p.close();
    const pass = menu.includes('Touchpad') && a.shown.cols === 8 && a.shown.rows === 4 && a.top > 90 + 20 && a.bottom < 800 - 100 && a.pads[0].h > 45 &&
      bottom.join() === '48,50,52,53,55,57,59,60' && second.join() === '53,55,57,59,60,62,64,65' &&
      struck === 1 && loud && held.join() === '52' && slid.join() === '53' && afterSlide === 1 && stillLoud && quiet && released.length === 0 &&
      dminor.join() === '50,52,53,55,57,58,60,62' && chromatic.join() === '50,51,52,53,54,55,56,57' && saved.key === 2 && saved.scale === 1 && saved.chromatic === 1;
    return [pass, { menu, names, shown: a.shown, top: a.top, bottom: a.bottom, padH: a.pads[0].h, bottomRow: bottom, second, struck, loud, held, slid, afterSlide, stillLoud, quiet, released, dminor, chromatic, saved }];
  },
  // CHG-0019: two fingers on two pads sound two voices (multi-touch), on a phone-sized screen with its 6 × 5 pads.
  async 'touchpad-touch'(errors) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const token = await encodePatch({ format: 'blokdust.patch', version: 2, seed: 1, blocks: [blk('t', 'source.tone', 0, 0), blk('g', 'input.touchpad', 0, -3)] });
    await p.goto(`${url}/index.html?c=${token}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    await openPanel(p, 'g');
    const a = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pads = (o.Options as any[]).find(x => x.Type === 'pads'), d = devicePixelRatio;
      return { top: (o.Position.y - o.Size.height / 2) / d, bottom: (o.Position.y + o.Size.height / 2) / d, shown: pads.Shown,
        pads: (pads.Pads as any[]).map(q => ({ cx: (o.Position.x + q.x + q.w / 2) / d, cy: (o.Position.y + q.y + q.h / 2) / d, note: q.note, w: q.w / d, h: q.h / d })) }; });
    await p.screenshot({ path: `${OUT}/touchpad-phone.png` });
    const cdp = await ctx.newCDPSession(p);
    const g0 = (await state(p)).gateOns;
    const pt = (i: number, id: number) => ({ x: a.pads[i].cx, y: a.pads[i].cy, id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1), pt(4, 2)] });
    await p.waitForTimeout(400);
    const two = await p.evaluate(() => (window as any).__bd_pads()), struck = (await state(p)).gateOns - g0;
    // A third finger in the gap between two pads plays the nearer one (owner, 2026-11-14), and nothing zooms.
    const gap = { x: (a.pads[1].cx + a.pads[2].cx) / 2, y: a.pads[1].cy, id: 3 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1), pt(4, 2), gap] });
    await p.waitForTimeout(300);
    const three = await p.evaluate(() => (window as any).__bd_pads()), pinch = await p.evaluate(() => (window as any).__bd_touch().pinch);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(0, 1), pt(4, 2)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(4, 2)] });
    await p.waitForTimeout(200);
    const one = await p.evaluate(() => (window as any).__bd_pads());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(300);
    const none = await p.evaluate(() => (window as any).__bd_pads());
    await ctx.close();
    const pass = a.shown.cols === 6 && a.shown.rows === 5 && a.pads[0].w > 44 && a.pads[0].h > 40 && a.bottom < 844 - 60 && a.top > 100 &&
      two.length === 2 && struck === 2 && three.length === 3 && !pinch && one.length === 1 && none.length === 0;
    return [pass, { shown: a.shown, top: a.top, bottom: a.bottom, pad: [a.pads[0].w, a.pads[0].h], two, struck, three, pinch, one, none }];
  },
  // CHG-0018: an LFO beside a Volume aims at its Level; the Volume's open slider follows; the patch keeps the target by
  // block id and the Level where it was set. The carousel lists "Block · Param" for what is connected.
  async 'lfo'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('v', 'fx.volume', 3, 0, { gain: 0 }),
      blk('l', 'fx.lfo', 7, 0, { target: 'v:gain', rate: 2, depth: 1, targetBlock: 99 })], errors);
    const menu = await menuItems(p, 'Effect');
    // Heard: the level swings, so the loudness differs between moments.
    const levels: number[] = [];
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(90); levels.push((await state(p)).rms); }
    await openPanel(p, 'v');
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) { await p.waitForTimeout(80); seen.push(await p.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(o => o.Setting === 'gain').Followed as number)); }
    await p.screenshot({ path: `${OUT}/lfo-follow.png` });
    await p.mouse.click(200, 650); await p.waitForTimeout(500);
    const q = await open(browser, [blk('t', 'source.tone', 0, 0), blk('v', 'fx.volume', 3, 0), blk('l', 'fx.lfo', 0, 3, { target: 'v:gain' })], errors);
    await openPanel(q, 'l');
    const target = () => q.evaluate(() => { const o = ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(x => x.Setting === 'lfoTarget'); return String(o.DisplayConversion(o.Value)); });
    const first = await target();
    const list = await q.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.LfoTargets as any[]).map(t => t.label));
    await q.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('lfoTarget', 1));  // the first entry: the Tone's Note
    await q.waitForTimeout(300);
    const second = await target();
    const names = (await rows(q)).map(x => x.name);
    await q.screenshot({ path: `${OUT}/lfo-panel.png` });
    const saved = (await state(q)).patch.blocks.find((b: any) => b.id === 'l').params;
    const savedGain = (await state(p)).patch.blocks.find((b: any) => b.id === 'v').params.gain;
    await p.close(); await q.close();
    const swing = Math.max(...levels) / Math.max(1e-6, Math.min(...levels));
    const pass = menu.includes('LFO') && swing > 2 && Math.max(...seen) - Math.min(...seen) > 5 && savedGain === 0 &&
      first === 'VOLUME · LEVEL' && list.join() === 'TONE · NOTE,TONE · FINE,VOLUME · LEVEL' && second === 'TONE · NOTE' && saved.target === 't:transpose' &&
      ['Target', 'Shape', 'Rate', 'Depth', 'Phase'].every(n => names.includes(n));
    return [pass, { swing, seen, savedGain, first, list, second, saved, names }];
  },
  // CHG-0017: Keys set pitch is a switch on the keyboards, off by default; on, held keys are silent and a press
  // (power) on the Tone plays them.
  async 'keys-set-pitch'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('k', 'input.computer-keyboard', 0, -3)], errors);
    await openPanel(p, 'k');
    const sw = await p.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).find(o => o.Type === 'switches').Switches.map((s: any) => ({ name: s.Name, on: !!s.Selected })));
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('keysSetPitch', true));
    await p.mouse.click(200, 650);  // close the panel
    await p.waitForTimeout(500);
    const before = (await state(p)).gateOns;
    await p.keyboard.down('KeyZ'); await p.keyboard.down('KeyC'); await p.keyboard.down('KeyB');  // C E G
    await p.waitForTimeout(400);
    const held = (await state(p)).gateOns - before, quiet = (await state(p)).rms < 0.0005;
    const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), await idOf(p, 't')) as [number, number];
    await p.mouse.move(at[0], at[1]); await p.mouse.down();
    await p.waitForTimeout(400);
    const struck = (await state(p)).gateOns - before, loud = (await state(p)).rms > 0.005;
    await p.mouse.up();
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.up(k);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 'k').params.keysSetPitch;
    await p.close();
    const pass = sw.some((s: any) => s.name === 'Set Pitch' && !s.on) && held === 0 && quiet && struck === 3 && loud && !!saved;
    return [pass, { sw, held, quiet, struck, loud, saved }];
  },
  // CHG-0017: Chord, Arpeggiator and Random Note are in the Effect menu; a Chord by a powered Tone sounds three voices;
  // the Arpeggiator's panel has Speed, and Per Hit hides it.
  async 'note-effects'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0), blk('ch', 'fx.chord', 3, 0),
      blk('t2', 'source.tone', -14, -8), blk('pw2', 'power.power', -17, -8), blk('arp', 'fx.arpeggiator', -11, -8, { sync: false, speed: 10 }), blk('ch2', 'fx.chord', -11, -5)], errors);
    const menu = await menuItems(p, 'Effect');
    const s0 = await state(p);
    await p.waitForTimeout(1000);
    const s1 = await state(p);
    await openPanel(p, 'arp');
    const timed = (await rows(p)).map(x => x.name);
    await p.screenshot({ path: `${OUT}/arpeggiator.png` });
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('perHit', true));
    await p.waitForTimeout(300);
    const perHit = (await rows(p)).map(x => x.name);
    await p.close();
    const q = await open(browser, [blk('rn', 'fx.random-note', 0, 0)], errors);
    await openPanel(q, 'rn');
    const random = (await rows(q)).map(x => ({ name: x.name, type: x.type }));
    await q.screenshot({ path: `${OUT}/random-note.png` });
    await q.close();
    const steps = s1.gateOns - s0.gateOns;  // the arpeggiated Tone strikes about 10 notes a second
    const pass = ['Chord', 'Arpeggiator', 'Random Note'].every(n => menu.includes(n)) && steps >= 8 && steps <= 12 &&
      timed.includes('Speed') && timed.includes('Pattern') && timed.includes('Octaves') && !perHit.includes('Speed') &&
      random.filter(r => r.type === 'selector').map(r => r.name).join() === 'Key,Scale';
    return [pass, { menu, steps, timed, perHit, random }];
  },
  // CHG-0016: a Sound Laser hears the Tone beside it; its beam powers a second Tone; a higher threshold turns it off.
  async 'sound-laser'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('pw', 'power.power', -3, 0),
      blk('s', 'power.sound-laser', 3, 0, { angle: 0, hold: 0 }), blk('far', 'source.tone', 10, 0, { transpose: 7 })], errors);
    await p.waitForTimeout(400);
    const onBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const powered = (await state(p)).powered as number[];
    await openPanel(p, 's');
    await p.waitForTimeout(400);
    const r = await rows(p);
    const meter = r.find(x => x.setting === 'soundMeter')?.shown as { level: number; on: boolean } | undefined;
    await p.screenshot({ path: `${OUT}/sound-laser.png` });
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('threshold', -3));
    await p.waitForTimeout(500);
    const offBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('whenQuieter', 1));
    await p.waitForTimeout(500);
    const invertedBeams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const saved = (await state(p)).patch.blocks.find((b: any) => b.id === 's').params;
    const menu = await menuItems(p, 'Power');
    await p.close();
    const names = r.map(x => x.name);
    const pass = menu.includes('Sound Laser') && onBeams === 1 && powered.length >= 2 && !!meter && meter.on && meter.level > -25 && offBeams === 0 && invertedBeams === 1 &&
      saved.invert === 1 && saved.threshold === -3 && ['Level', 'Band', 'Beam on', 'Hold', 'Angle', 'Range'].every(n => names.includes(n)) && !names.includes('Threshold') && !names.includes('Rotate');
    return [pass, { onBeams, offBeams, invertedBeams, powered, meter, names, saved }];
  },
  // CHG-0015: Counter, Chance and Prism are in the Power menu; the Counter's panel shows its pattern and where it is.
  async 'counter-panel'(errors) {
    const p = await open(browser, [blk('e', 'power.emitter', -8, 0, { angle: 0, selfPoweredMode: true, rate: 30, speed: 12 }),
      blk('c', 'power.counter', 0, 0, { steps: 8, hits: 3 }), blk('t', 'source.tone', 6, 0)], errors);
    const menu = await menuItems(p, 'Power');
    await openPanel(p, 'c');
    const first = (await rows(p)).find(x => x.type === 'live')?.shown as { pattern: string; next: number } | undefined;
    await p.waitForTimeout(1200);  // a couple more particles
    const later = (await rows(p)).find(x => x.type === 'live')?.shown as { pattern: string; next: number } | undefined;
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('hits', 5));
    await p.waitForTimeout(300);
    const five = (await rows(p)).find(x => x.type === 'live')?.shown as { pattern: string; cells: number[] } | undefined;
    await p.screenshot({ path: `${OUT}/counter-panel.png` });
    const s = await state(p);
    // A click on a step toggles it (owner, 2026-11-14); moving Steps, Hits or Rotate gives the pattern back.
    const step2 = await p.evaluate(x => { const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio, r = (o.Options as any[]).find(q => q.Setting === 'counterPattern');
      return [(o.Position.x + x) / pr, (o.Position.y + r.Position.y + r.Size.height / 2) / pr]; }, five!.cells[1]) as [number, number];
    await p.mouse.click(...step2); await p.waitForTimeout(300);
    const toggled = (await rows(p)).find(x => x.type === 'live')?.shown.pattern, mask = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.pattern;
    const hitsAt = await rowPoint(p, 'hits', 5 / 16);
    await p.mouse.click(...hitsAt); await p.waitForTimeout(300);
    const back = (await rows(p)).find(x => x.type === 'live')?.shown.pattern, cleared = (await state(p)).patch.blocks.find((b: any) => b.id === 'c').params.pattern;
    await p.close();
    const pass = ['Counter', 'Chance', 'Prism'].every(n => menu.includes(n)) && first?.pattern === 'x..x..x.' && !!later && later.next !== first.next &&
      five?.pattern === 'x.x.xx.x' && s.hits > 0 && s.connections.length === 0 && toggled === 'xxx.xx.x' && mask === 0b10110111 && back === 'x.x.xx.x' && (cleared ?? -1) === -1;
    return [pass, { menu, first, later, five: five?.pattern, hits: s.hits, connections: s.connections, toggled, mask, back, cleared }];
  },
  // CHG-0031 (SPEC-AUDIO-WAVETABLE R7): the Wavetable is in the Source menu and sounds; its panel draws the frame it
  // plays, which changes with Table and follows an LFO moving Position.
  async 'wavetable'(errors) {
    const p = await open(browser, [blk('w', 'source.wavetable', 0, 0, { table: 0, position: 0.2 }), blk('pw', 'power.power', -3, 0),
      blk('l', 'fx.lfo', 3, 0, { target: 'w:position', rate: 2, depth: 1 })], errors);
    const inMenu = (await menuItems(p, 'Source')).includes('Wavetable');
    const sounding = (await state(p)).rms > 0.001;
    await openPanel(p, 'w');
    await p.waitForTimeout(300);
    const r1 = await rows(p);
    const names = r1.map(x => x.name);
    const pic1 = r1.find(x => x.setting === 'wavePicture')?.shown as { table: string; position: number; drawn: boolean; first: number[] } | undefined;
    await p.screenshot({ path: `${OUT}/wavetable-panel.png` });
    await p.waitForTimeout(170);  // the LFO moves Position: the picture follows
    const pic2 = (await rows(p)).find(x => x.setting === 'wavePicture')?.shown as typeof pic1;
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('table', 6));
    await p.waitForTimeout(300);
    const pic3 = (await rows(p)).find(x => x.setting === 'wavePicture')?.shown as typeof pic1;
    const table = (await state(p)).patch.blocks.find((b: any) => b.id === 'w').params.table;
    await p.close();
    const phone = await open(browser, [blk('w', 'source.wavetable', 0, 0, { table: 2, position: 0.6 })], errors, {}, { width: 390, height: 844 });
    await openPanel(phone, 'w');
    await phone.screenshot({ path: `${OUT}/wavetable-panel-phone.png` });
    await phone.close();
    const pass = inMenu && sounding && ['Wave', 'Table', 'Position', 'Note', 'Fine'].every(n => names.includes(n)) &&
      !!pic1?.drawn && pic1.table === 'BELL' && !!pic2 && pic2.position !== pic1.position && pic3?.table === 'SYNC' && table === 6;
    return [pass, { inMenu, sounding, names, pic1: pic1 && { ...pic1, first: undefined }, moved: pic2?.position, pic3: pic3?.table, table }];
  },
  // CHG-0015: a Prism splits a laser's beam into its streams, and its panel draws the exit lines on the stage.
  async 'prism-splits-beam'(errors) {
    const p = await open(browser, [blk('l', 'power.laser', -6, 0, { angle: 0, selfPoweredMode: true, range: 300 }),
      blk('pr', 'power.prism', 0, 0, { angle: -90, streams: 3, spread: 90 }), blk('t', 'source.tone', 0, -8)], errors);
    await p.waitForTimeout(400);
    const beams = await p.evaluate(() => (window as any).__bd_probe.beams as number);
    const sounding = (await state(p)).rms > 0.001;  // the middle stream points at the Tone
    await openPanel(p, 'pr');
    await p.waitForTimeout(300);
    const exits = await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.PrismExits as [number, number][]);
    const names = (await rows(p)).map(x => x.name);
    await p.screenshot({ path: `${OUT}/prism.png` });
    await p.close();
    const up = exits?.[1], pass = beams === 4 && sounding && exits?.length === 3 && Math.abs(up[0]) < 0.5 && up[1] < 0 &&
      ['Angle', 'Rotate', 'Streams', 'Spread'].every(n => names.includes(n));
    return [pass, { beams, sounding, exits, names }];
  },
};

try {
  for (const [name, run] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    const errors: string[] = [];
    let pass = false, detail: unknown;
    try { [pass, detail] = await run(errors); } catch (e) { detail = String(e); }
    if (errors.length) { pass = false; detail = { detail, pageErrors: errors }; }
    results[name] = pass ? true : `FAIL ${JSON.stringify(detail)}`;
    ok &&= pass;
    console.error(`${pass ? 'pass' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  }
} finally {
  await browser.close(); server.close();
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (!ok) process.exit(1);
