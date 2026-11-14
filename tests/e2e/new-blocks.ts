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
  // CHG-0020 (UI-0011): labels come with the patch and are drawn; a click edits the words, a drag moves one, the bin
  // deletes it, and the Interaction menu makes a new one. They never reach the engine.
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
  // CHG-0019 (UI-0010): the Grid's pads are in its panel, in key; a pad plays, a slide is legato, Key and Scale change
  // the notes, and the panel fits between the header and the bottom controls.
  async 'grid'(errors) {
    const p = await open(browser, [blk('t', 'source.tone', 0, 0), blk('g', 'input.grid', 0, -3)], errors);
    const menu = await menuItems(p, 'Interaction');
    await openPanel(p, 'g');
    const info = () => p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pads = (o.Options as any[]).find(x => x.Type === 'pads');
      return { x: o.Position.x, y: o.Position.y, top: o.Position.y - o.Size.height / 2, bottom: o.Position.y + o.Size.height / 2, shown: pads.Shown,
        pads: (pads.Pads as any[]).map(q => ({ cx: o.Position.x + q.x + q.w / 2, cy: o.Position.y + q.y + q.h / 2, note: q.note, h: q.h })) }; });
    const a = await info();
    await p.screenshot({ path: `${OUT}/grid.png` });
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
    const pass = menu.includes('Grid') && a.shown.cols === 8 && a.shown.rows === 4 && a.top > 90 + 20 && a.bottom < 800 - 100 && a.pads[0].h > 45 &&
      bottom.join() === '48,50,52,53,55,57,59,60' && second.join() === '53,55,57,59,60,62,64,65' &&
      struck === 1 && loud && held.join() === '52' && slid.join() === '53' && afterSlide === 1 && stillLoud && quiet && released.length === 0 &&
      dminor.join() === '50,52,53,55,57,58,60,62' && chromatic.join() === '50,51,52,53,54,55,56,57' && saved.key === 2 && saved.scale === 1 && saved.chromatic === 1;
    return [pass, { menu, names, shown: a.shown, top: a.top, bottom: a.bottom, padH: a.pads[0].h, bottomRow: bottom, second, struck, loud, held, slid, afterSlide, stillLoud, quiet, released, dminor, chromatic, saved }];
  },
  // CHG-0019: two fingers on two pads sound two voices (multi-touch), on a phone-sized screen with its 6 × 5 pads.
  async 'grid-touch'(errors) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    const token = await encodePatch({ format: 'blokdust.patch', version: 2, seed: 1, blocks: [blk('t', 'source.tone', 0, 0), blk('g', 'input.grid', 0, -3)] });
    await p.goto(`${url}/index.html?c=${token}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    await openPanel(p, 'g');
    const a = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, pads = (o.Options as any[]).find(x => x.Type === 'pads'), d = devicePixelRatio;
      return { top: (o.Position.y - o.Size.height / 2) / d, bottom: (o.Position.y + o.Size.height / 2) / d, shown: pads.Shown,
        pads: (pads.Pads as any[]).map(q => ({ cx: (o.Position.x + q.x + q.w / 2) / d, cy: (o.Position.y + q.y + q.h / 2) / d, note: q.note, w: q.w / d, h: q.h / d })) }; });
    await p.screenshot({ path: `${OUT}/grid-phone.png` });
    const cdp = await ctx.newCDPSession(p);
    const g0 = (await state(p)).gateOns;
    const pt = (i: number, id: number) => ({ x: a.pads[i].cx, y: a.pads[i].cy, id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0, 1), pt(4, 2)] });
    await p.waitForTimeout(400);
    const two = await p.evaluate(() => (window as any).__bd_pads()), struck = (await state(p)).gateOns - g0;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [pt(4, 2)] });
    await p.waitForTimeout(200);
    const one = await p.evaluate(() => (window as any).__bd_pads());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(300);
    const none = await p.evaluate(() => (window as any).__bd_pads());
    await ctx.close();
    const pass = a.shown.cols === 6 && a.shown.rows === 5 && a.pads[0].w > 44 && a.pads[0].h > 40 && a.bottom < 844 - 60 && a.top > 100 &&
      two.length === 2 && struck === 2 && one.length === 1 && none.length === 0;
    return [pass, { shown: a.shown, top: a.top, bottom: a.bottom, pad: [a.pads[0].w, a.pads[0].h], two, struck, one, none }];
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
