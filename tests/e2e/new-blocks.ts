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
  await p.waitForFunction(i => { const o = (window as any).__bd_probe.scene.OptionsPanel; return o.Scale === 1 && !o.Opening && o.SelectedBlock?.Id === i; }, id, { timeout: 5000 });
  await p.waitForTimeout(500);
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
      saved.invert === 1 && saved.threshold === -3 && ['Level', 'Threshold', 'Band', 'Beam on', 'Hold', 'Angle', 'Range', 'Rotate'].every(n => names.includes(n));
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
