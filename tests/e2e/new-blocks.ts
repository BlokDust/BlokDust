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
const idOf = (p: Page, uid: string) => p.evaluate(u => { const s = (window as any).__bd_probe.state; const i = s.patch.blocks.findIndex((b: any) => b.id === u); return s.blocks[i]?.id as number; }, uid);
/** Click a block (opens its options panel) and wait for the panel. */
async function openPanel(p: Page, uid: string): Promise<void> {
  const id = await idOf(p, uid);
  const at = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as [number, number] | null;
  if (!at) throw new Error(`no point on block ${uid}`);
  await p.mouse.move(at[0], at[1]); await p.mouse.click(at[0], at[1]);
  await p.waitForFunction(() => (window as any).__bd_probe.scene.OptionsPanel.Scale === 1, null, { timeout: 5000 });
  await p.waitForTimeout(300);
}
/** The open panel's rows: type, name and whatever a live row says it drew. */
const rows = (p: Page) => p.evaluate(() => ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).map(o => ({ type: o.Type, name: o.Name, setting: o.Setting, value: o.Value, shown: o.Shown })));
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
    const meter = r.find(x => x.type === 'live')?.shown as { level: number; reduction: number; thresholdX: number; width: number } | undefined;
    const names = r.map(x => x.name);
    const sounding = (await state(p)).rms > 0.001;
    await p.close();
    const pass = inMenu && sounding && !!meter && meter.level > -40 && meter.level < 0 && meter.reduction < -1 &&
      Math.abs(meter.thresholdX - meter.width * (20 / 60)) < 1 && ['Threshold', 'Ratio', 'Knee', 'Attack', 'Release', 'Makeup'].every(n => names.includes(n));
    return [pass, { inMenu, sounding, meter, names }];
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
    const five = (await rows(p)).find(x => x.type === 'live')?.shown as { pattern: string } | undefined;
    await p.screenshot({ path: `${OUT}/counter-panel.png` });
    const s = await state(p);
    await p.close();
    const pass = ['Counter', 'Chance', 'Prism'].every(n => menu.includes(n)) && first?.pattern === 'x..x..x.' && !!later && later.next !== first.next &&
      five?.pattern === 'x.x.xx.x' && s.hits > 0 && s.connections.length === 0;
    return [pass, { menu, first, later, five, hits: s.hits, connections: s.connections }];
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
