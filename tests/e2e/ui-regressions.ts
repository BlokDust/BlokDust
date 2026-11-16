// Regression tests for bugs found in review (each reproduced first: it failed on the build that had the bug).
//   pnpm test:ui-regressions [--only name,name]
// Real app, real pointer, real AudioWorklet. One check per bug, named after it; a failure prints what was seen.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { THEMES } from '../../web/src/generated/palettes.gen.ts';
import { BLOCKS } from '../../web/src/generated/blocks.gen.ts';
import { drawnPoints, insidePolygon, selectionRing } from '../../web/src/stage/ring.ts';

const OUT = 'tests/visual/output/ui-regressions';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const results: Record<string, unknown> = {};
let ok = true;

type Block = { Id: number; Type: string; Position: { x: number; y: number } };
const comp = (blocks: Block[]) => encodeURIComponent(JSON.stringify({ Composition: blocks, ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, ColorThemeNo: 0 }));
const blk = (Id: number, Type: string, x: number, y: number): Block => ({ Id, Type, Position: { x, y } });
const state = (p: Page) => p.evaluate(() => (window as any).__bd_probe.state);
/** The header's Share slot reads PATCHES and opens the Patches panel (CHG-0005); its control centres, in CSS px. */
const patchesAt = (p: Page, name: string) => p.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name) as Promise<[number, number]>;
/** Opens Patches on SAVE (it remembers the last tab, owner 2026-11-10; `keep` leaves that to the test). */
async function openPatches(p: Page, keep = false): Promise<void> {
  if (!keep) await p.evaluate(() => { try { localStorage.removeItem('blokdust.patchesTab'); } catch { /* */ } });
  await p.mouse.move(1138, 45); await p.mouse.click(1138, 45); await p.waitForTimeout(1500);
}
/** Press a Patches panel control (by name, PatchesPanel.centreOf). */
async function patchesClick(p: Page, name: string, wait = 700): Promise<void> { const [x, y] = await patchesAt(p, name); await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(wait); }
/** The OPEN tab. */
async function openList(p: Page): Promise<void> { await openPatches(p); await patchesClick(p, 'tab1', 600); }
/** OPEN or INSERT on the row named `name` (turning pages as needed: 5 rows a page). */
async function rowButton(p: Page, kind: 'open' | 'ins', name: string, wait = 700): Promise<void> {
  const { i, page } = await p.evaluate(n => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return { i: pp.Items.findIndex((x: any) => x.name === n), page: pp.page }; }, name);
  if (i < 0) throw new Error(`no row ${name}`);
  for (let pg = page; pg !== Math.floor(i / 5) + 1;) { const dir = pg < Math.floor(i / 5) + 1 ? 1 : -1; const [ax, ay] = await p.evaluate(d => { const A = (window as any).__bd_probe.v1App, u = A.Unit, pr = A.Metrics.PixelRatio; return [(A.Width / 2 + d * 285 * u) / pr, A.Height / 2 / pr]; }, dir); await p.mouse.click(ax, ay); await p.waitForTimeout(500); pg += dir; }
  await patchesClick(p, `${kind}${i % 5}`, wait);
}
/** SAVE with no link yet (Patches › SAVE tab; it was CREATE SHARE LINK): waits for the link field. */
async function makeLink(p: Page): Promise<string> {
  await openPatches(p); await patchesClick(p, 'share', 200);
  await p.waitForFunction(() => { const e = document.getElementById('patchUrlText') as HTMLInputElement; return e.value.length > 20 && getComputedStyle(document.getElementById('patchUrl')!).display !== 'none'; }, null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return p.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value);
}
const toCss = (p: Page, x: number, y: number) => p.evaluate(([gx, gy]) => (window as any).__bd_probe.toCss(gx, gy), [x, y]) as Promise<[number, number]>;
/** 1 s, 220 Hz sine, 16-bit mono 44.1 kHz WAV bytes. */
const sineWav = () => {
  const n = 44100, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
  return [...b];
};
/** `seconds` of a decaying 330 Hz sine (asymmetric in time, so a reversed waveform is visibly different). */
const decayWav = (seconds: number) => {
  const n = Math.round(44100 * seconds), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * i) / 44100) * Math.exp(-3 * i / n) * 20000), 44 + i * 2);
  return b;
};
const samplerState = (p: Page) => p.evaluate(() => (window as any).__bd_probe.samples as { id: number; track: string; loaded: boolean; frames: number }[]);
/** The (only) sampler's region as the open options panel shows it and as the patch (→ engine) holds it. */
const regionOf = (p: Page, _id: number) => p.evaluate(() => {
  const s = (window as any).__bd_probe, v = s.scene.OptionsPanel.SelectedBlock, m = s.state.patch.blocks[0];
  const keys = ['startPosition', 'endPosition', 'loopStart', 'loopEnd'];
  return { ui: keys.map(k => v?.Params[k]), patch: keys.map(k => m.params[k]), reverse: [v?.Params.reverse, m.params.reverse], wave: (v?.WaveForm ?? []).slice() as number[] };
});
const near = (a: unknown[], b: unknown[], eps = 0.01) => a.length === b.length && a.every((x, i) => typeof x === 'number' && typeof b[i] === 'number' && Math.abs((x as number) - (b[i] as number)) < eps);

/** Points in the waveform the open options panel draws (its wave option: waveimage / waveregion / waveslider). */
const waveDrawn = (p: Page) => p.evaluate(() => {
  const o = (window as any).__bd_probe.scene.OptionsPanel;
  if (o.Scale !== 1) return -1;
  const w = (o.Options ?? []).find((x: any) => /^wave/.test(x.Type));
  return w ? (w.Waveform ?? []).length : -2;
}) as Promise<number>;
const txt = (() => { const t = THEMES[0], m = t.colors[t.roles.txt].match(/\d+/g)!; return `rgb(${m[0]}, ${m[1]}, ${m[2]})`; })();

/** Freesound's CDN (default sounds, previews) answered locally: a decaying `seconds` sine, after `delayMs`. Requests
 * are recorded (url + Range header) so tests can check what was downloaded. */
const cdn = { seconds: 3, delayMs: 0, requests: [] as { url: string; range: string | undefined }[] };
async function open(b: Browser, blocks: Block[], errors: string[]): Promise<Page> {
  const page = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://cdn.freesound.org/**', async r => {
    cdn.requests.push({ url: r.request().url(), range: r.request().headers()['range'] });
    if (cdn.delayMs) await new Promise(res => setTimeout(res, cdn.delayMs));
    await r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: decayWav(cdn.seconds) });
  });
  await page.goto(`${url}/index.html?v1=${comp(blocks)}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200);  // header/CreateNew tweens settle
  return page;
}
const maxOver = async (p: Page, key: 'rms' | 'particles', ms: number) => {
  let m = 0;
  for (let t = 0; t < ms; t += 50) { m = Math.max(m, (await state(p))[key]); await p.waitForTimeout(50); }
  return m;
};
/** Largest per-channel change between two screenshots of a css-px rect, taken `gapMs` apart. */
async function maxChange(p: Page, clip: { x: number; y: number; width: number; height: number }, gapMs: number) {
  const { PNG } = await import('pngjs');
  const a = PNG.sync.read(await p.screenshot({ clip }));
  await p.waitForTimeout(gapMs);
  const b = PNG.sync.read(await p.screenshot({ clip }));
  let m = 0;
  for (let i = 0; i < a.data.length; i += 4) for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(a.data[i + k] - b.data[i + k]));
  return m;
}

const tests: Record<string, (errors: string[]) => Promise<[boolean, unknown]>> = {
  /** Dragging the empty background pans the stage (v1 StageDragger); it used to send every block to NaN. */
  async 'stage-drag-pans'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const [x0, y0] = await toCss(p, 0, 0);
    await p.mouse.move(300, 600); await p.mouse.down();
    await p.mouse.move(400, 650, { steps: 10 }); await p.mouse.up();
    await p.waitForTimeout(800);
    const [x1, y1] = await toCss(p, 0, 0);
    await p.screenshot({ path: `${OUT}/stage-drag-pans.png` });
    const moved = Number.isFinite(x1) && Number.isFinite(y1) && x1 - x0 > 50 && y1 - y0 > 20;
    if (!moved) { await p.close(); return [false, { before: [x0, y0], after: [x1, y1] }]; }
    // and the block is still drawn where the grid now puts it
    const { PNG } = await import('pngjs');
    const shot = PNG.sync.read(await p.screenshot({ clip: { x: Math.round(x1) - 4, y: Math.round(y1) + 2, width: 8, height: 8 } }));
    const bg = THEMES[0].colors[0].match(/\d+/g)!.map(Number);
    let drawn = 0;
    for (let i = 0; i < shot.data.length; i += 4) if (Math.abs(shot.data[i] - bg[0]) + Math.abs(shot.data[i + 1] - bg[1]) + Math.abs(shot.data[i + 2] - bg[2]) > 30) drawn++;
    await p.close();
    return [moved && drawn > 10, { before: [x0, y0], after: [x1, y1], blockPixels: drawn }];
  },

  /** Particles are drawn under v1's UI layer (v1 MainScene display list: Particles, then ToolTip … SettingsPanel).
   * A silent patch keeps the panels still, so what changes inside an open panel is particles. v1's panels are
   * slightly translucent (the stage shows through faintly), so particles under them change pixels a little; drawn on
   * top they change them by the full particle-vs-panel contrast (~230 levels). */
  async 'particles-under-panels'(errors) {
    const seen: Record<string, number> = {}, flying: Record<string, number> = {};
    for (const [name, at] of [['settings', [1233, 45]], ['patches', [1138, 45]]] as const) {
      const p = await open(browser, [blk(1, 'ParticleEmitter', 0, 8), blk(2, 'Power', -3, 8)], errors);
      await p.mouse.click(...at); await p.mouse.move(5, 795); await p.waitForTimeout(1500);
      flying[name] = await maxOver(p, 'particles', 300);
      await p.screenshot({ path: `${OUT}/particles-under-${name}.png` });
      seen[name] = await maxChange(p, { x: 0, y: 100, width: 1280, height: 620 }, 300);
      await p.close();
    }
    return [flying.settings > 0 && flying.patches > 0 && seen.settings < 40 && seen.patches < 40, { particlesFlying: flying, maxChangeUnderPanel: seen }];
  },

  /** CreateNew (the + icon, then ✓) clears the stage: v1 MainScene.ResetScene deletes every block and resets the view.
   * Owner (2026-11-08, web/mobile/plugin): after ✓ the "CLEAR THE STAGE?" panel stayed open with the icon frozen over
   * the logo. v1 checks CreateNew's state once after deleting them all; checking per block cancelled the close. */
  async 'clear-stage'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, 0)], errors);
    await p.mouse.click(37, 45); await p.waitForTimeout(900);   // icon (IconPos 25·unit, header centre)
    await p.mouse.click(195, 135); await p.waitForTimeout(1200); // ✓ (TickX 130·unit, header row 1.5)
    const s = await state(p);
    const ui = await p.evaluate(() => { const c = (window as any).__bd_probe.scene.CreateNew; return { open: c.Open, selected: c.Selected, panelY: c.PanelOffset.y, iconX: c.IconOffset.x }; });
    await p.screenshot({ path: `${OUT}/clear-stage.png` });
    await p.close();
    const closed = !ui.open && ui.selected === 0 && ui.panelY === -1 && ui.iconX === -1;
    return [s.blocks.length === 0 && s.patch.blocks.length === 0 && closed, { blocks: s.blocks.length, patchBlocks: s.patch.blocks.length, ui }];
  },

  /** Owner (2026-11-08, iPhone/iPad Safari): a hard press raised the magnifier, and swiping could select the whole
   * page. Ported from Funputs (#45): `-webkit-touch-callout: none` + `user-select: none` disarm the callout and
   * selection, and a non-passive `touchstart` on the stage cancels Safari's long-press / double-tap recognisers
   * (preventDefault on pointerdown does not reach them). Text fields keep their defaults. No offline browser runs
   * WebKit's recognisers, so this pins the mechanism; the owner's phone confirms the fix. */
  async 'ios-no-magnifier'(errors) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    const r = await p.evaluate(() => {
      const canvas = document.querySelector('#stage canvas')!, cs = (e: Element) => getComputedStyle(e) as any;
      const touch = (el: Element) => {
        const t = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 300 });
        const ev = new TouchEvent('touchstart', { cancelable: true, bubbles: true, touches: [t], targetTouches: [t], changedTouches: [t] });
        el.dispatchEvent(ev); return ev.defaultPrevented;
      };
      const field = document.createElement('input'); document.body.appendChild(field);
      const out = {
        coarse: matchMedia('(pointer: coarse)').matches,
        callout: [...document.querySelectorAll('style')].some(s => /touch-callout:\s*none/.test(s.textContent ?? '')),  // Chromium drops the WebKit-only property
        select: [document.documentElement, document.body, canvas].map(e => cs(e).userSelect),
        fieldSelect: cs(field).userSelect,
        stageTouchCancelled: touch(canvas), fieldTouchCancelled: touch(field),
      };
      field.remove(); return out;
    });
    await ctx.close();
    const ok = r.coarse && r.select.every(v => v === 'none') && r.fieldSelect !== 'none' && r.stageTouchCancelled && !r.fieldTouchCancelled
      && r.callout;
    return [ok, r];
  },

  /** Owner (2026-11-08): on iOS there was no sound with the silent switch on. Safari's default audio session
   * ("auto") routes the page like a notification sound; `navigator.audioSession.type = 'playback'`, set before the
   * AudioContext exists, is what a music app asks for (Safari 16.4+; Funputs demo-runtime does the same). A
   * Microphone block needs "play-and-record", set before asking for the mic. Chromium has no audioSession, so
   * the test stands one in and records the order. */
  // Owner, 2026-11-14 (iOS): leave the browser, play a video or podcast, stop it, come back: iOS has interrupted the
  // AudioContext, so the engine stood still (no sound, no new connections, lines stretched after dragged blocks).
  // Coming back to the page, or the next press, resumes it; a press also kicks a context that says it runs but renders
  // nothing (suspend, then resume).
  async 'audio-resumes-after-interruption'(errors) {
    const p = await browser.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => {
      const AC = window.AudioContext;
      (window as any).AudioContext = class extends AC { constructor(o?: AudioContextOptions) { super(o); (window as any).__ctx = this; } };
    });
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0), blk(2, 'Power', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 2);
    const snaps = () => p.evaluate(() => (window as any).__bd_probe.state.snapshots as number);
    const interrupt = () => p.evaluate(() => (window as any).__ctx.suspend());
    // Interrupted while away; the page shows again.
    await interrupt(); await p.waitForTimeout(200);
    await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
    await p.waitForTimeout(500);
    const a = await snaps(); await p.waitForTimeout(300);
    const backOnShow = (await snaps()) > a && await p.evaluate(() => (window as any).__ctx.state) === 'running';
    // Interrupted again with no page event: the next press on the stage brings it back.
    await interrupt(); await p.waitForTimeout(300);
    await p.mouse.click(900, 650); await p.waitForTimeout(500);
    const b = await snaps(); await p.waitForTimeout(300);
    const backOnPress = (await snaps()) > b && await p.evaluate(() => (window as any).__ctx.state) === 'running';
    await p.close();
    return [backOnShow && backOnPress, { backOnShow, backOnPress }];
  },
  async 'ios-silent-switch'(errors) {
    const run = async (blocks: Block[]) => {
      const p = await browser.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.addInitScript(() => {
        const log: string[] = ((window as any).__session = []);
        let type = 'auto';
        Object.defineProperty(navigator, 'audioSession', { value: { get type() { return type; }, set type(v: string) { type = v; log.push(`type=${v}`); } } });
        const AC = window.AudioContext;
        (window as any).AudioContext = class extends AC { constructor(o?: AudioContextOptions) { log.push('AudioContext'); super(o); } };
        const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = (c?: MediaStreamConstraints) => { log.push('getUserMedia'); return gum(c); };
      });
      await p.goto(`${url}/index.html?v1=${comp(blocks)}`);
      await p.waitForFunction(() => (window as any).__bd_probe);
      await p.click('#start');
      await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 2);
      await p.waitForTimeout(300);
      const log = await p.evaluate(() => (window as any).__session as string[]);
      await p.close(); return log;
    };
    const plain = await run([blk(1, 'ToneSource', 0, 0)]);
    const mic = await run([blk(1, 'Microphone', 0, 0)]);
    const before = (log: string[], a: string, b: string) => log.includes(a) && log.includes(b) && log.indexOf(a) < log.indexOf(b);
    const ok = before(plain, 'type=playback', 'AudioContext') && !plain.includes('getUserMedia')
      && before(mic, 'type=playback', 'AudioContext') && before(mic, 'type=play-and-record', 'getUserMedia');
    return [ok, { plain, mic }];
  },

  /** Owner (2026-11-08, mobile): after dragging a block onto the trash, tapping another block deleted it too. The
   * trash only noticed where the pointer was on pointermove; a finger lifts and lands elsewhere without one, so the
   * next drag "ended over the trash". Real touches through CDP (Input.dispatchTouchEvent). */
  async 'touch-trash-once'(errors) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
    await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const touch = (type: string, x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const [ax, ay] = await toCss(p, -6, 0), [bx, by] = await toCss(p, 6, 0);
    await touch('touchStart', ax + 4, ay + 4);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', ax + 4 + (1250 - ax) * i / 12, ay + 4 + (770 - ay) * i / 12); await p.waitForTimeout(16); }
    await touch('touchEnd', 0, 0); await p.waitForTimeout(400);
    const afterTrash = (await state(p)).blocks.length;
    await touch('touchStart', bx + 4, by + 4); await p.waitForTimeout(60);
    await touch('touchEnd', 0, 0); await p.waitForTimeout(600);
    const afterTap = (await state(p)).blocks.length;
    await p.screenshot({ path: `${OUT}/touch-trash-once.png` });
    await ctx.close();
    return [afterTrash === 1 && afterTap === 1, { afterTrash, afterTap }];
  },

  /** Share text fields use the theme's text colour (v1 ThemeManager sets #shareUrl/#shareTitle colour); now the Patches
   * panel's name and link fields. */
  async 'share-text-colour'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(p);
    const colours = await p.evaluate(() => ['patchTitleInput', 'patchUrlText'].map(id => getComputedStyle(document.getElementById(id)!).color));
    await p.screenshot({ path: `${OUT}/share-text-colour.png` });
    await p.close();
    return [colours.every(c => c === txt), { want: txt, title: colours[0], url: colours[1] }];
  },

  /** The share link field: one line like the title field, scrollbars hidden (headless Chrome never draws them, so
   * the style is checked too), and a click selects the whole link. */
  async 'share-url-field'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await makeLink(p);
    const el = await p.evaluate(() => {
      const e = document.getElementById('patchUrlText') as HTMLInputElement, r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { tag: e.tagName, len: e.value.length, rect: [r.x, r.y, r.width, r.height], scrollbarX: e.offsetHeight - e.clientHeight, scrollbarY: e.offsetWidth - e.clientWidth,
        overflow: cs.overflow, scrollbarWidth: cs.scrollbarWidth };
    });
    await p.mouse.click(el.rect[0] + el.rect[2] / 2, el.rect[1] + el.rect[3] / 2); await p.waitForTimeout(200);
    const sel = await p.evaluate(() => { const e = document.getElementById('patchUrlText') as HTMLInputElement; return [e.selectionStart, e.selectionEnd, document.activeElement === e]; });
    await p.screenshot({ path: `${OUT}/share-url-field.png` });
    await p.close();
    const pass = el.len > 20 && el.scrollbarX === 0 && el.scrollbarY === 0 && el.scrollbarWidth === 'none' && el.tag === 'INPUT' && sel[0] === 0 && sel[1] === el.len && sel[2] === true;
    return [pass, { ...el, selection: sel }];
  },

  /** v1 Source.MouseDown → AddPower: holding the pointer on a source plays it; release stops it. */
  async 'press-plays-source'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const idle = await maxOver(p, 'rms', 500);
    const [x, y] = await toCss(p, 0, 0.2);
    await p.mouse.move(x, y); await p.mouse.down();
    const held = await maxOver(p, 'rms', 800);
    await p.mouse.up(); await p.waitForTimeout(1500);
    const after = (await state(p)).rms;
    await p.close();
    return [idle < 1e-4 && held > 0.005 && after < 1e-3, { idle, held, afterRelease: after }];
  },

  /** An unpowered emitter fires nothing; holding the pointer on it powers it (v1 ParticleEmitter is a Source). */
  async 'press-fires-emitter'(errors) {
    const p = await open(browser, [blk(1, 'ParticleEmitter', 0, 0)], errors);
    const idle = await maxOver(p, 'particles', 1500);
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.move(x, y); await p.mouse.down();
    const held = await maxOver(p, 'particles', 1500);
    await p.mouse.up();
    await p.close();
    return [idle === 0 && held > 0, { unpoweredParticles: idle, whileHeld: held }];
  },

  // ---- round 2 (2026-11-06) ----

  /** Computer keyboard in Poly mode plays every held key (v1 Source.GetVoice, 9 voices). */
  async 'keyboard-poly'(errors) {
    const p = await open(browser, [{ ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block, blk(2, 'ToneSource', 0, 0)], errors);
    const before = (await state(p)).gateOns;
    for (const k of ['KeyQ', 'KeyE', 'KeyT']) { await p.keyboard.down(k); await p.waitForTimeout(60); }
    await p.waitForTimeout(400);
    const notes = (await state(p)).gateOns - before;
    for (const k of ['KeyQ', 'KeyE', 'KeyT']) await p.keyboard.up(k);
    await p.close();
    return [notes === 3, { noteOnsForThreeKeys: notes }];
  },

  /** Typing in a text field (Share title, sample search) must not play the computer keyboard (v1 TypingManager meant
   * to disable PianoKeyboardManager while typing; its calls were commented out, so v1 played notes too). Found 2026-11-07. */
  async 'typing-plays-no-notes'(errors) {
    const p = await open(browser, [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ToneSource', 0, 0)], errors);
    await openPatches(p);  // Patches › SAVE: its name field takes the focus on click
    const [x, y] = await p.evaluate(() => { const r = document.getElementById('patchTitleInput')!.getBoundingClientRect(); return [r.left + 20, r.top + r.height / 2]; });
    await p.mouse.click(x, y);
    const before = (await state(p)).gateOns;
    await p.keyboard.type('qwerty');
    await p.waitForTimeout(400);
    const notes = (await state(p)).gateOns - before;
    const focused = await p.evaluate(() => document.activeElement?.id);
    await p.close();
    return [focused === 'patchTitleInput' && notes === 0, { focused, noteOnsWhileTyping: notes }];
  },

  /** Alt (Option) + drag duplicates the block with its params and drags the copy (v1 Block.MouseMove). */
  async 'alt-duplicate'(errors) {
    const p = await open(browser, [{ ...blk(1, 'ToneSource', -6, 3), Params: { waveform: 3, transpose: 7 } } as Block], errors);
    const [x, y] = await toCss(p, -6, 3.2);
    await p.keyboard.down('Alt');
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + 100, y + 30, { steps: 5 }); await p.mouse.move(x + 260, y + 90, { steps: 5 });
    await p.mouse.up(); await p.keyboard.up('Alt');
    await p.waitForTimeout(400);
    const blocks = (await state(p)).patch.blocks;
    await p.screenshot({ path: `${OUT}/alt-duplicate.png` });
    await p.close();
    const tones = blocks.filter((b: any) => b.type === 'source.tone');
    const original = tones.find((b: any) => b.x === -6 && b.y === 3), copy = tones.find((b: any) => b !== original);
    return [tones.length === 2 && !!original && !!copy && copy.params.waveform === 3 && copy.params.transpose === 7 && (copy.x !== -6 || copy.y !== 3),
      { blocks: blocks.map((b: any) => [b.type, b.x, b.y, b.params]) }];
  },

  /** The Recorder's red record button (v1 RecorderPanel, beside the block) records the scene; the recording becomes
   * the Recorder's sample: its waveform shows in the options panel and it plays when powered. */
  async 'recorder-records'(errors) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Power', -9, 0), blk(3, 'Recorder', 6, 4)], errors);
    const [bx, by] = await toCss(p, 6, 4), [, gy1] = await toCss(p, 6, 5), grid = gy1 - by;
    const button: [number, number] = [bx, by - 3 * grid];  // v1 RecorderPanel: y − w/2 − h/2, w = h = 3 grid
    await p.mouse.click(...button); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/recorder-recording.png` });
    await p.mouse.click(...button); await p.waitForTimeout(800);
    const [rx, ry] = await toCss(p, 6, 4.5);
    await p.mouse.click(rx, ry); await p.waitForTimeout(1200);  // open its options panel
    const wave = await waveDrawn(p);
    await p.screenshot({ path: `${OUT}/recorder-recorded.png` });
    await p.mouse.click(1233, 480); await p.waitForTimeout(800);  // close the panel (click empty stage)
    // Silence the scene (Power → bin), then hold the Recorder: it plays what it recorded. (Opening the panel moved
    // the stage, v1 Jump: positions are read again.)
    const [px, py] = await toCss(p, -9, 0.2);
    await p.mouse.move(px, py); await p.mouse.down(); await p.mouse.move(900, 650, { steps: 6 }); await p.mouse.move(1232, 754, { steps: 6 });
    await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(1500);
    const quiet = await maxOver(p, 'rms', 300);
    const [hx, hy] = await toCss(p, 6, 4.5);
    await p.mouse.move(hx, hy); await p.mouse.down();
    const playing = await maxOver(p, 'rms', 800);
    await p.mouse.up();
    await p.close();
    return [wave > 0 && quiet < 1e-3 && playing > 0.005, { recordedWaveformPoints: wave, quietBefore: quiet, holdingRecorder: playing }];
  },

  /** Sampler blocks show their audio's waveform in the options panel (v1 waveregion/waveimage options). */
  async 'sampler-waveforms'(errors) {
    const seen: Record<string, number> = {};
    for (const [type, load] of [['Sample', true], ['SampleGen', false], ['Convolver', false], ['Granular', true]] as const) {
      const p = await open(browser, [blk(1, type, 0, 0)], errors);
      if (load) {
        const id = (await state(p)).blocks[0].id;
        await p.evaluate(([i, bytes]) => (window as any).__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer), [id, sineWav()] as const);
      }
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y); await p.waitForTimeout(1500);
      seen[type] = await waveDrawn(p);
      await p.screenshot({ path: `${OUT}/waveform-${type}.png` });
      await p.close();
    }
    return [Object.values(seen).every(n => n > 0), { waveformPoints: seen }];
  },

  /** SampleGen generates its sound (v1's own generator) and plays it while held; the recipe is saved in the patch. */
  async 'samplegen-plays'(errors) {
    const p = await open(browser, [blk(1, 'SampleGen', 0, 0)], errors);
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.move(x, y); await p.mouse.down();
    const held = await maxOver(p, 'rms', 1000);
    await p.mouse.up();
    const seed = (await state(p)).patch.blocks[0].params.seed;
    await p.close();
    return [held > 0.002 && Array.isArray(seed?.waveVoices) && seed.waveVoices.length > 0, { holdingSampleGen: held, savedVoices: seed?.waveVoices?.length }];
  },

  /** Granular with a loaded file plays grains while held (KNOWN from Phase 1 until the grain engine, CHG-0004 3.8). */
  async 'granular-plays'(errors) {
    const p = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
    const id = (await state(p)).blocks[0].id;
    await p.evaluate(([i, bytes]) => (window as any).__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer), [id, sineWav()] as const);
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.move(x, y); await p.mouse.down();
    const held = await maxOver(p, 'rms', 1000);
    await p.mouse.up();
    await p.close();
    return [held > 0.005, { holdingGranular: held }];
  },
};

// ---- Owner review of Phase 2 (2026-11-07): samples, loading, tutorial ----
Object.assign(tests, {
  /** 1. Looping plays the region the panel shows (start, end, loop start/end); the panel shows all four handles. A newly
   * loaded sample resets the region (v1 Sample.SetBuffers) in the engine as well as the panel. */
  async 'sample-loop-region'(errors: string[]) {
    cdn.seconds = 3;
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 10000 });  // default sound (3 s here)
    const id = (await state(p)).blocks[0].id;
    await p.evaluate(([i, bytes]) => (window as any).__bd_loadSample(i, 'one-second.wav', new Uint8Array(bytes).buffer), [id, [...decayWav(1)]] as const);
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y); await p.waitForTimeout(1200);
    const r = await regionOf(p, id);
    const handles = await p.evaluate(() => { const w = (window as any).__bd_probe.scene.OptionsPanel.Options.find((o: any) => o.Type === 'waveregion'); return { mode: w?.Mode, handles: w?.Handles?.length }; });
    await p.screenshot({ path: `${OUT}/sample-loop-region.png` });
    await p.close();
    return [near(r.ui, [0, 1, 0.5, 1]) && near(r.patch, r.ui) && handles.mode === true && handles.handles === 4, { ui: r.ui, patch: r.patch, ...handles }];
  },

  /** 2 + 3. Reverse acts at once: the waveform flips immediately (v1 SwitchBuffer) and the start/end and loop points are
   * mirrored, so the same stretch of audio stays selected and now plays backwards (owner request; v1 kept the numbers). */
  async 'sample-reverse-mirrors'(errors: string[]) {
    cdn.seconds = 2;
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 10000 });
    const id = (await state(p)).blocks[0].id;
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y); await p.waitForTimeout(1200);
    await p.evaluate(() => { const v = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
      v.SetParam('startPosition', 0.2); v.SetParam('endPosition', 1.6); v.SetParam('loopStart', 0.5); v.SetParam('loopEnd', 0.9); });
    const before = await regionOf(p, id);
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('reverse', true));
    await p.waitForTimeout(100);
    const after = await regionOf(p, id);
    await p.screenshot({ path: `${OUT}/sample-reverse-mirrors.png` });
    await p.close();
    const flipped = after.wave.length > 0 && JSON.stringify(after.wave) === JSON.stringify([...before.wave].reverse());
    return [flipped && near(after.ui, [0.4, 1.8, 1.1, 1.5]) && near(after.patch, after.ui) && after.reverse.every(Boolean),
      { waveformFlippedWithin100ms: flipped, before: before.ui, after: after.ui, patch: after.patch }];
  },

  /** 2 + 6. While a sample downloads or decodes, v1's loading animation (AnimationsLayer: a spinning diamond in a bubble
   * beside the block) shows; the previous sound keeps playing until the new one is ready. */
  async 'sample-loading-indicator'(errors: string[]) {
    cdn.seconds = 1; cdn.delayMs = 6000;  // the default sound starts loading with the page; check while it still is
    try {
      const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const during = await p.evaluate(() => ((window as any).__bd_probe.scene.AnimationsLayer?.ActiveBlocks ?? []).length);
      await p.screenshot({ path: `${OUT}/sample-loading-indicator.png` });
      await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 10000 });
      await p.waitForTimeout(200);
      const after = await p.evaluate(() => ((window as any).__bd_probe.scene.AnimationsLayer?.ActiveBlocks ?? []).length);
      await p.close();
      return [during === 1 && after === 0, { loadingBlocksDuring: during, after }];
    } finally { cdn.delayMs = 0; }
  },

  /** 6. The Convolver only uses the first 2.5 s of an impulse response (engine kMaxImpulseSeconds), so it downloads
   * only the start of a Freesound preview (an HTTP Range request), not the whole file. Audio goes to the browser only. */
  async 'convolver-downloads-only-what-it-uses'(errors: string[]) {
    cdn.seconds = 1; cdn.requests = [];
    const p = await open(browser, [blk(1, 'Convolver', 0, 0)], errors);
    const id = (await state(p)).blocks[0].id;
    await p.evaluate(i => (window as any).__bd_probe.scene.host.loadFreesound(i, { id: 42, name: 'Big Hall IR', username: 'someone', license: 'CC0',
      licenseUrl: '', duration: 12, preview: 'https://cdn.freesound.org/previews/0/42_1-hq.mp3', url: 'https://freesound.org/s/42/' }, { trackName: 'BIG HALL IR', user: 'Someone', permalink: '' }), id);
    await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded && x.track === 'freesound:42'), null, { timeout: 10000 }).catch(() => {});
    await p.close();
    const req = cdn.requests.find(r => r.url.includes('/42_'));
    const end = Number(req?.range?.match(/^bytes=0-(\d+)$/)?.[1] ?? NaN);
    return [Number.isFinite(end) && end < 200_000, { range: req?.range ?? 'none (whole file)' }];
  },

  /** The loading square in an open options panel's waveform spins while the sample loads (v1 RefreshOptionsPanel
   * ("animate") → OptionsPanel.Animating redraws the panel every frame). Owner review 2 of Phase 2, 2026-11-07. */
  async 'sample-region-spinner'(errors: string[]) {
    cdn.seconds = 1; cdn.delayMs = 8000;
    try {
      const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y); await p.waitForTimeout(1000);
      const box = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, w = o.Options.find((q: any) => q.Type === 'waveregion'), pr = devicePixelRatio;
        return { x: (o.Position.x + o.Margin) / pr, y: (o.Position.y + w.Position.y) / pr, width: o.Range / pr, height: w.Size.height / pr }; });
      const change = await maxChange(p, box, 300);
      await p.screenshot({ path: `${OUT}/sample-region-spinner.png` });
      await p.close();
      return [change > 40, { maxPixelChangeIn300ms: change }];
    } finally { cdn.delayMs = 0; }
  },

  /** CHG-0004 / PLUGIN-0004: the MIDI Input panel's own options (v1 option styles): MPE switch beside Mono/Poly,
   * Channel (OMNI/1–16) and, on the web, Device (ALL or an input by name); MPE on adds Pressure and Slide. A Web
   * MIDI message from the chosen device reaches the engine through the block's MPE parser; another device's does not.
   * Owner (2026-11-12, CHG-0010): a quieter panel. MPE on hides Channel (MPE uses every channel of its zone) and there
   * is no Bend row (always ±48, MPE's standard); Poly hides Glide (glide is mono-only). */
  async 'midi-input-options'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      const mk = (id: string, name: string) => ({ id, name, onmidimessage: null as any });
      const inputs = new Map([['a', mk('a', 'Funputs MPE')], ['b', mk('b', 'Other Keys')]]);
      (window as any).__fakeMidi = inputs;
      (navigator as any).requestMIDIAccess = () => Promise.resolve({ inputs, onstatechange: null });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0), blk(2, 'ToneSource', 3, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start'); await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await p.waitForTimeout(800);
    const id = (await state(p)).blocks.find((b: any) => b.type === 'input.midi-controller').id;
    const pt = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(1000);
    const names = () => p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Options.map((o: any) => o.Type === 'switches' ? o.Switches.map((s: any) => s.Name).join('+') : o.Name));
    const before = await names();
    // Choose device 1 (Funputs) and MPE on through the block (the panel's SetParam path), as the sliders/switches do.
    await p.evaluate(() => { const v = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock; v.SetParam('deviceIndex', 1); v.SetParam('mpe', true); });
    await p.waitForTimeout(300);
    const after = await names();
    const params = (await state(p)).patch.blocks.find((b: any) => b.type === 'input.midi-controller').params;
    const send = (dev: string, bytes: number[]) => p.evaluate(([d, b]) => (window as any).__fakeMidi.get(d).onmidimessage({ data: new Uint8Array(b as number[]) }), [dev, bytes] as const);
    const gate0 = (await state(p)).gateOns;
    await send('b', [0x91, 60, 100]); await p.waitForTimeout(300);
    const fromOther = (await state(p)).gateOns - gate0;
    await send('a', [0x91, 64, 100]); await p.waitForTimeout(300);
    const fromChosen = (await state(p)).gateOns - gate0 - fromOther;
    await p.screenshot({ path: `${OUT}/midi-input-options.png` });
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('polyphonic', true));
    await p.waitForTimeout(300);
    const poly = await names();
    await ctx.close();
    const ok = JSON.stringify(before).includes('MPE') && before.includes('Channel') && before.includes('Device') && before.includes('Glide')
      && !after.includes('Bend') && !after.includes('Channel') && after.includes('Device') && JSON.stringify(after).includes('Pressure+Slide')
      && !poly.includes('Glide') && poly.includes('Octave')
      && params.device === 'Funputs MPE' && !!params.mpe && fromOther === 0 && fromChosen === 1;
    return [ok, { before, after, poly, device: params.device, mpe: params.mpe, gateOnsFromOtherDevice: fromOther, fromChosenDevice: fromChosen }];
  },

  /** Owner (2026-11-12, CHG-0010): the MIDI Keyboard's Device is a selector like Settings' colour theme (arrows either
   * side, the name between), not a slider whose text ran off the panel. The arrows step through ALL and the inputs,
   * wrapping round; a long name is cut to fit between them. */
  async 'midi-device-selector'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      const mk = (id: string, name: string) => ({ id, name, onmidimessage: null as any });
      const inputs = new Map([['a', mk('a', 'Funputs MPE')], ['b', mk('b', 'A Very Long MIDI Interface Name That Would Never Fit Port 1')]]);
      (navigator as any).requestMIDIAccess = () => Promise.resolve({ inputs, onstatechange: null });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'MIDIController', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start'); await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await p.waitForTimeout(800);
    const id = (await state(p)).blocks[0].id;
    const pt = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(1000);
    const row = () => p.evaluate(() => {
      const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio, u = (window as any).__bd_probe.v1App.Unit;
      const d = o.Options.find((q: any) => q.Setting === 'deviceIndex'), y = (o.Position.y + d.Position.y + d.Size.height / 2) / pr;
      return { type: d.Type, device: o.SelectedBlock.Params.device || 'ALL', left: [(o.Position.x + o.Margin + 10 * u) / pr, y], right: [(o.Position.x + o.Margin + o.Range - 10 * u) / pr, y],
        textWidth: d.TextWidth, room: o.Range - 80 * u };
    });
    const seen: string[] = [];
    const first = await row();
    seen.push(first.device);
    for (let i = 0; i < 3; i++) { const r = await row(); await p.mouse.click(r.right[0], r.right[1]); await p.waitForTimeout(250); seen.push((await row()).device); }
    const r = await row(); await p.mouse.click(r.left[0], r.left[1]); await p.waitForTimeout(250);
    const back = await row();
    // The long name, drawn: it fits between the arrows.
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('deviceIndex', 2));
    await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.RefreshOptionsPanel());
    const lr = await row(); await p.mouse.move(lr.right[0] - 60, lr.right[1]); await p.mouse.move(lr.right[0] - 80, lr.right[1]);  // a redraw
    await p.waitForTimeout(300);
    const long = await row();
    await p.screenshot({ path: `${OUT}/midi-device-selector.png` });
    await ctx.close();
    const ok = first.type === 'selector' && JSON.stringify(seen) === JSON.stringify(['ALL', 'Funputs MPE', 'A Very Long MIDI Interface Name That Would Never Fit Port 1', 'ALL'])
      && back.device === 'A Very Long MIDI Interface Name That Would Never Fit Port 1' && long.textWidth > 0 && long.textWidth <= long.room;
    return [ok, { type: first.type, seen, back: back.device, textWidth: long.textWidth, room: long.room }];
  },

  /** CHG-0004 3.3 (owner): inside the plugin, Microphone shows as "Audio Input" and MIDI Controller as "MIDI Input"
   * (menus, block names, panel titles); the MIDI Input has no Device option there (the DAW track picks it). The website
   * keeps v1's names. The plugin is simulated with a fake JUCE backend that sends the patch, as the processor does. */
  async 'plugin-labels'(errors: string[]) {
    const patch = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [
      { id: 'mic', type: 'source.microphone', x: -3, y: 0, params: {} }, { id: 'midi', type: 'input.midi-controller', x: 3, y: 0, params: {} }] };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(p => {
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      (window as any).__JUCE__ = { backend: {
        addEventListener: (id: string, fn: (x: unknown) => void) => { (listeners[id] ??= []).push(fn); },
        emitEvent: (id: string) => { if (id === 'bd_hello') setTimeout(() => listeners.bd_patch?.forEach(f => f({ patch: JSON.stringify(p) })), 50); },
      } };
    }, patch);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(1500);
    const menu = await pg.evaluate(() => (window as any).__bd_probe.v1App.BlockCreator.MenuJson.categories.flatMap((c: any) => c.items.map((i: any) => i.name)));
    const names = await pg.evaluate(() => [...(window as any).__bd_probe.v1App.Blocks].map((b: any) => b.BlockName));
    const midi = (await pg.evaluate(() => (window as any).__bd_probe.state.blocks)).find((b: any) => b.type === 'input.midi-controller');
    const pt = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), midi.id);
    await pg.mouse.click(pt[0], pt[1]); await pg.waitForTimeout(1200);
    const panel = await pg.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel; return { title: o.SelectedBlock?.OptionsForm?.name, rows: o.Options.map((x: any) => x.Name) }; });
    await pg.screenshot({ path: `${OUT}/plugin-labels.png` });
    await ctx.close();
    const web = await open(browser, [blk(1, 'Microphone', 0, 0)], errors);
    const webMenu = await web.evaluate(() => (window as any).__bd_probe.v1App.BlockCreator.MenuJson.categories.flatMap((c: any) => c.items.map((i: any) => i.name)));
    await web.close();
    const ok = menu.includes('Audio Input') && menu.includes('MIDI Input') && !menu.includes('Microphone') && names.includes('Audio Input') && names.includes('MIDI Input') &&
      panel.title === 'MIDI Input' && !panel.rows.includes('Device') && panel.rows.includes('Channel') && webMenu.includes('Microphone') && webMenu.includes('MIDI Controller');
    return [ok, { plugin: { names, title: panel.title, rows: panel.rows }, webMenuKeepsV1: webMenu.includes('Microphone') && webMenu.includes('MIDI Controller') }];
  },

  /** CHG-0004 3.5: Emitter and Pulse panels get a Tempo Sync switch (v1 option styles); on, the Emitter shows Division,
   * the Pulse its Length, in musical steps. The patch saves the tempo and the synced params. Owner (2026-11-10): the
   * Stereo Delay syncs too (Delay in place of Delay Time), and the tempo is set once in Settings, not on each block. */
  async 'tempo-sync-options'(errors: string[]) {
    // Owner (Phase 3 review): Angle, then Tempo Sync; synced, Division (with triplets) and Swing replace Fire Rate and
    // P. Speed; the Pulse's Length replaces Pulse length; a synced Laser's Turn replaces Rotate. New Emitters and Pulses
    // from the menu start synced; saved ones without the setting keep v1 timing.
    const p = await open(browser, [blk(1, 'ParticleEmitter', 0, 0), blk(2, 'Pulse', 6, 0), blk(3, 'Laser', -6, 4), blk(4, 'StereoDelay', 6, 6)], errors);
    const names = () => p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Options.map((o: any) => o.Type === 'switches' ? o.Switches.map((s: any) => s.Name).join('+') : o.Name));
    const rows = async (type: string) => {
      const id = (await state(p)).blocks.find((b: any) => b.type === type).id;
      const pt = await p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
      await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(1000);
      return names();
    };
    const set = (k: string, v: unknown) => p.evaluate(([key, val]) => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam(key, val), [k, v] as const);
    const close = async () => { await p.mouse.click(1100, 700); await p.waitForTimeout(600); };
    const emitterOff = await rows('power.emitter');
    await set('sync', true); await set('divisionIndex', 4); await set('swing', 0.5);
    await p.evaluate(() => (window as any).__bd_probe.scene.host.setTempo(90));  // Settings › Tempo (settings-release1)
    await p.waitForTimeout(200);
    const emitterOn = await names();
    await p.mouse.move(700, 300); await p.mouse.move(705, 305); await p.waitForTimeout(300);  // the stage redraws on input
    await p.screenshot({ path: `${OUT}/tempo-sync-emitter.png` });
    await close();
    const pulseOff = await rows('power.pulse');
    await set('sync', true); await set('lengthIndex', 7); await p.waitForTimeout(200);
    const pulseOn = await names();
    await close();
    const laserOff = await rows('power.laser');
    await set('sync', true); await p.waitForTimeout(200);
    await set('turnIndex', 5); await p.waitForTimeout(200);
    const laserOn = await names();
    await p.mouse.move(700, 300); await p.mouse.move(705, 305); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/tempo-sync-laser.png` });
    await close();
    const delayOff = await rows('fx.stereo-delay');
    await set('sync', true); await p.waitForTimeout(200);
    await set('delayIndex', 7); await p.waitForTimeout(200);
    const delayOn = await names();
    await p.mouse.move(700, 300); await p.mouse.move(705, 305); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/tempo-sync-delay.png` });
    await close();
    const patch = (await state(p)).patch;
    // A new Emitter from the menu starts synced.
    const fresh = await p.evaluate(() => { const s = (window as any).__bd_probe.scene; const id = s.host.createBlock('ParticleEmitter', 0, -8); return id; });
    await p.mouse.up(); await p.waitForTimeout(300);
    const freshSync = (await state(p)).patch.blocks.find((b: any) => b.type === 'power.emitter' && b.id !== patch.blocks.find((x: any) => x.type === 'power.emitter').id)?.params?.sync;
    await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('StereoDelay', 8, -8)); await p.mouse.up(); await p.waitForTimeout(300);
    const freshDelay = (await state(p)).patch.blocks.filter((b: any) => b.type === 'fx.stereo-delay').map((b: any) => b.params?.sync);
    await p.close();
    const by = (t: string) => patch.blocks.find((b: any) => b.type === t).params;
    const em = by('power.emitter'), pu = by('power.pulse'), la = by('power.laser'), de = by('fx.stereo-delay');
    const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const ok = eq(emitterOff, ['Angle', 'Tempo Sync', 'Fire Rate', 'Offset', 'P. Speed', 'Range']) && eq(emitterOn, ['Angle', 'Tempo Sync', 'Division', 'Swing', 'Offset', 'Range'])  // Offset: CHG-0014 &&
      eq(pulseOff, ['Tempo Sync', 'Pulse length', 'Pulse On']) && eq(pulseOn, ['Tempo Sync', 'Length', 'Pulse On']) &&
      eq(laserOff, ['Angle', 'Tempo Sync', 'Rotate', 'Range']) && eq(laserOn, ['Angle', 'Tempo Sync', 'Turn', 'Range']) &&
      eq(delayOff, ['Tempo Sync', 'Delay Time', 'Feedback', 'Mix']) && eq(delayOn, ['Tempo Sync', 'Delay', 'Feedback', 'Mix']) &&
      de.sync === 1 && de.delayBeats === 0.75 && eq(freshDelay.slice(1), [true]) &&
      em.sync === 1 && Math.abs(em.division - 1 / 3) < 1e-9 && em.swing === 0.5 && pu.sync === 1 && pu.pulseBeats === 1 && la.sync === 1 && la.turnBeats === -8 &&
      patch.tempo === 90 && fresh != null && (freshSync === true || freshSync === 1);
    return [ok, { emitterOff, emitterOn, pulseOff, pulseOn, laserOff, laserOn, emitter: { sync: em.sync, division: em.division, swing: em.swing },
      pulse: { sync: pu.sync, pulseBeats: pu.pulseBeats }, laser: { sync: la.sync, turnBeats: la.turnBeats }, delayOff, delayOn, delay: { sync: de.sync, delayBeats: de.delayBeats }, freshDelay, tempo: patch.tempo, freshSync }];
  },

  /** CHG-0004 3.6/3.7: in the plugin the processor owns samples (native engine). The page asks for them and shows
   * the processor's reports (spinner while loading; waveform, region and name once loaded); file drops on the editor
   * resolve to the sampler under the pointer or a new Sample there; YOUR FILE opens the native chooser; a Freesound
   * pick goes to the processor. Simulated with a fake JUCE backend recording what the page sends. */
  async 'plugin-samples'(errors: string[]) {
    const patch = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 's', type: 'source.sample', x: 0, y: 0, params: {} }] };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(p => {
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      const sent: { id: string; v: any }[] = [];
      (window as any).__sent = sent;
      (window as any).__fire = (id: string, v: unknown) => listeners[id]?.forEach(f => f(v));
      (window as any).__JUCE__ = { backend: {
        addEventListener: (id: string, fn: (x: unknown) => void) => { (listeners[id] ??= []).push(fn); },
        emitEvent: (id: string, v: unknown) => { sent.push({ id, v }); if (id === 'bd_hello') setTimeout(() => listeners.bd_patch?.forEach(f => f({ patch: JSON.stringify(p) })), 50); },
      } };
    }, patch);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(800);
    const sentIds = () => pg.evaluate(() => (window as any).__sent.map((x: any) => x.id));
    const hello = (await sentIds()).includes('bd_samplesHello');
    const id = (await state(pg)).blocks[0].id;
    await pg.evaluate(i => (window as any).__fire('bd_sampleInfo', { id: i, loading: true, missing: false }), id);
    const spinning = await pg.evaluate(() => (window as any).__bd_probe.scene.AnimationsLayer.ActiveBlocks.length);
    const preview = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 7) * Math.exp(-i / 800));
    await pg.evaluate(([i, pv]) => (window as any).__fire('bd_sampleInfo', { id: i, loading: false, missing: false, duration: 2, sampleRate: 44100, preview: pv, track: 'file:kick.wav',
      ref: { provider: 'file', name: 'kick.wav', path: '/Users/me/kick.wav' },
      params: { track: 'file:kick.wav', trackName: 'kick.wav', user: 'Local file', startPosition: 0, endPosition: 2, loopStart: 1, loopEnd: 2 } }), [id, preview] as const);
    const shown = await pg.evaluate(() => { const s = (window as any).__bd_probe; const v = s.v1App.Blocks[0]; return { spin: s.scene.AnimationsLayer.ActiveBlocks.length, wave: v.WaveForm.length, name: v.Params.trackName, end: v.Params.endPosition, patchTrack: s.state.patch.blocks[0].params.track, ref: s.state.patch.refs?.['file:kick.wav']?.path }; });
    // Drop on the Sample, then on empty stage.
    const [bx, by] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await pg.evaluate(([x, y]) => (window as any).__fire('bd_dropAt', { x, y, token: 1 }), [bx, by] as const);
    await pg.evaluate(() => (window as any).__fire('bd_dropAt', { x: 1000, y: 650, token: 2 }));
    await pg.waitForTimeout(200);
    const drops = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_dropTarget').map((x: any) => x.v));
    const blocksAfter = (await state(pg)).blocks.length;
    // YOUR FILE and a Freesound pick go to the processor.
    await pg.evaluate(i => { const s = (window as any).__bd_probe.scene; s.host.loadSample(i); s.host.loadFreesound(i, { id: 9, name: 'Bell', username: 'u', license: 'CC0', licenseUrl: '', duration: 1, preview: 'https://cdn.freesound.org/x.mp3', url: 'https://freesound.org/s/9/' }, { trackName: 'BELL', user: 'U', permalink: '' }); }, id);
    const last = await pg.evaluate(() => (window as any).__sent.slice(-2));
    await pg.screenshot({ path: `${OUT}/plugin-samples.png` });
    await ctx.close();
    const ok = hello && spinning === 1 && shown.spin === 0 && shown.wave > 0 && shown.name === 'kick.wav' && shown.end === 2 && shown.patchTrack === 'file:kick.wav' &&
      shown.ref === '/Users/me/kick.wav' && drops[0]?.token === 1 && drops[0]?.id === id && drops[1]?.token === 2 && drops[1]?.id !== id && blocksAfter === 2 &&
      last[0]?.id === 'bd_pickFile' && last[0]?.v.id === id && last[1]?.id === 'bd_loadUrl' && last[1]?.v.ref.id === 9;
    return [ok, { hello, spinning, shown, drops, blocksAfter, last: last.map((x: any) => x.id) }];
  },

  /** PLUGIN-0003 / CHG-0004 3.9: in the plugin, right-clicking an options-panel slider opens the Dust menu; DUST n
   * assigns it (bd_automation to the processor), and LEARN MIDI CC asks the processor to bind the next CC; a learned
   * CC is shown. Covers the editor's menu, which had no automated test (CHG-0002 1.12). Fake JUCE backend. */
  async 'dust-menu'(errors: string[]) {
    // A block with sliders (the Filter's became a graph in CHG-0010: filter-dust).
    const patch = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 'f', type: 'fx.distortion', x: 0, y: 0, params: {} }] };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(p => {
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      const sent: { id: string; v: any }[] = [];
      (window as any).__sent = sent;
      (window as any).__fire = (id: string, v: unknown) => listeners[id]?.forEach(f => f(v));
      (window as any).__JUCE__ = { backend: {
        addEventListener: (id: string, fn: (x: unknown) => void) => { (listeners[id] ??= []).push(fn); },
        emitEvent: (id: string, v: unknown) => { sent.push({ id, v }); if (id === 'bd_hello') setTimeout(() => listeners.bd_patch?.forEach(f => f({ patch: JSON.stringify(p) })), 50); },
      } };
    }, patch);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(800);
    const id = (await state(pg)).blocks[0].id;
    const [bx, by] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await pg.mouse.click(bx, by); await pg.waitForTimeout(1200);
    // The first slider's track, right-clicked (css px from the panel's own geometry).
    const [sx, sy] = await pg.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, sl = o.Options.find((q: any) => q.Type === 'slider'), pr = devicePixelRatio;
      return [(o.Position.x + o.Margin + o.Range * 0.5) / pr, (o.Position.y + sl.Position.y + sl.Size.height * 0.5) / pr]; });
    const openMenu = async () => { await pg.mouse.click(sx, sy, { button: 'right' }); await pg.waitForSelector('#dust-menu', { timeout: 3000 }); };
    await openMenu();
    const items = await pg.$$eval('#dust-menu div', d => d.map(x => x.textContent));
    await pg.click('#dust-menu div:text("DUST 3")');
    const assigned = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_automation').pop()?.v);
    await openMenu();
    const learnLabel = await pg.textContent('#dust-menu [data-learn]');
    await pg.click('#dust-menu [data-learn]');
    const learn = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_learnCC').pop()?.v);
    await pg.waitForTimeout(1000);
    await pg.evaluate(() => (window as any).__fire('bd_ccLearned', { slot: 3, cc: 21 }));
    await openMenu();
    const learnedLabel = await pg.textContent('#dust-menu [data-learn]');
    await pg.screenshot({ path: `${OUT}/dust-menu.png` });
    await ctx.close();
    const ok = items.length >= 10 && assigned?.slot === 3 && assigned?.id === id && typeof assigned?.param === 'string' &&
      learnLabel === 'LEARN MIDI CC' && learn?.slot === 3 && learnedLabel === 'CC 21 · LEARN AGAIN';
    return [ok, { items: items.slice(0, 3), assigned, learnLabel, learn, learnedLabel }];
  },

  /** CHG-0010: the Filter's Frequency and Gain sliders became its graph, so in the plugin the graph takes the Dust
   * menu: right-click the graph → Frequency, the handle → Gain, the width bar → Width (the title names it). */
  async 'filter-dust'(errors: string[]) {
    const patch = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 'f', type: 'fx.filter', x: 0, y: 0, params: {} }] };
    const { pg, close } = await openPlugin(patch, errors);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(800);
    const id = (await state(pg)).blocks[0].id;
    const [bx, by] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await pg.mouse.click(bx, by); await pg.waitForTimeout(1200);
    const spots = await pg.evaluate(() => {
      const o = (window as any).__bd_probe.scene.OptionsPanel, g = o.Options.find((q: any) => q.Type === 'parametric'), pr = devicePixelRatio;
      const hx = o.Position.x + o.Margin + g.Handles[1].Position.x, top = o.Position.y + g.Position.y;
      return { graph: [(o.Position.x + o.Margin + o.Range * 0.15) / pr, (top + g.Size.height * 0.3) / pr],
        handle: [hx / pr, (top + g.Size.height * 0.8 - g.Handles[1].Position.y) / pr],
        bar: [(hx + g.SubHandles[1].Position.x * 0.5) / pr, (top + g.Size.height * 0.9) / pr] };
    });
    const r: Record<string, unknown> = {};
    for (const [k, [x, y]] of Object.entries(spots) as [string, number[]][]) {
      await pg.mouse.move(x, y); await pg.waitForTimeout(100);
      await pg.mouse.click(x, y, { button: 'right' });
      await pg.waitForSelector('#dust-menu', { timeout: 3000 });
      const title = await pg.textContent('#dust-menu div');
      await pg.click('#dust-menu div:text("DUST 2")');
      r[k] = { title, param: await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_automation').pop()?.v?.param) };
    }
    await close();
    const ok = JSON.stringify(r) === JSON.stringify({ graph: { title: 'FILTER › FREQUENCY', param: 'frequency' },
      handle: { title: 'FILTER › GAIN', param: 'gain' }, bar: { title: 'FILTER › WIDTH', param: 'Q' } });
    return [ok, r];
  },

  /** Owner (Ableton, 2026-11-12): automating a Dust lane moves the block's slider in the plugin, live, with its panel
   * open; a closed panel opens at the new value. The processor sends `bd_paramValues` (here faked) for what Dust moved;
   * its saved patch follows too (`bd plugin test`, "Dust moves the saved block param"). */
  async 'dust-moves-sliders'(errors: string[]) {
    const patch = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 'd', type: 'fx.distortion', x: 0, y: 0, params: {} },
      { id: 'f', type: 'fx.filter', x: -14, y: 4, params: {} }] };
    const { pg, close } = await openPlugin(patch, errors);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(800);
    const [d, f] = (await state(pg)).blocks.map((b: any) => b.id);
    const panel = () => pg.evaluate(() => {
      const o = (window as any).__bd_probe.scene.OptionsPanel;
      return o.Options.map((q: any) => q.Type === 'slider' ? [q.Setting, +q.Value.toFixed(3)] : q.Type === 'parametric' ? ['gain', +q.Handles[1].YValue.toFixed(3)] : [q.Type]);
    });
    const [bx, by] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), d);
    await pg.mouse.click(bx, by); await pg.waitForTimeout(1200);
    const before = await panel();
    await pg.evaluate(([id]) => (window as any).__fire('bd_paramValues', { values: [{ id, param: 'drive', value: 0.9 }] }), [d]);
    await pg.waitForTimeout(200);
    const live = await panel();
    // The Filter's panel is closed while its gain is automated; opened, it shows the new gain.
    await pg.evaluate(([id]) => (window as any).__fire('bd_paramValues', { values: [{ id, param: 'gain', value: 17.5 }] }), [f]);
    const [fx, fy] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), f);
    for (let i = 0; i < 3 && !(await pg.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Options.some((q: any) => q.Type === 'parametric'))); i++) {
      await pg.mouse.click(fx, fy); await pg.waitForTimeout(1200);  // a click with another panel open first closes it (v1)
    }
    const filter = await panel();
    const saved = await pg.evaluate(() => (window as any).__bd_probe.state.patch.blocks.map((b: any) => b.params));
    await close();
    const drive = (p: any[]) => p.find(x => x[0] === 'drive')?.[1];
    const ok = drive(before) !== 0.9 && drive(live) === 0.9 && filter.find(x => x[0] === 'gain')?.[1] === 17.5 && saved[0].drive === 0.9 && saved[1].gain === 17.5;
    return [ok, { before, live, filter, saved }];
  },

  /** Owner (Logic, 2026-11-12): opening the plugin briefly showed an old patch before its own. The web view keeps
   * localStorage between sessions, and the page drew its autosave until the processor's patch arrived. In the plugin
   * the patch comes only from the processor: nothing is drawn before it, and the page never autosaves. */
  async 'plugin-no-stale-patch'(errors: string[]) {
    const stale = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 'old', type: 'source.tone', x: 0, y: 0, params: {} },
      { id: 'old2', type: 'fx.reverb', x: 3, y: 0, params: {} }] };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([old]) => {
      try { localStorage.setItem('blokdust2.autosave', JSON.stringify(old)); } catch { /* */ }
      const listeners: Record<string, ((x: unknown) => void)[]> = {};
      const w = window as any;
      w.__seenBeforePatch = 0; w.__patched = false;
      const watch = () => { if (w.__patched) return; w.__seenBeforePatch = Math.max(w.__seenBeforePatch, w.__bd_probe?.state.blocks.length ?? 0); requestAnimationFrame(watch); };
      requestAnimationFrame(watch);
      w.__JUCE__ = { backend: {
        addEventListener: (id: string, fn: (x: unknown) => void) => { (listeners[id] ??= []).push(fn); },
        emitEvent: (id: string) => {
          if (id === 'bd_hello') setTimeout(() => { w.__patched = true; listeners.bd_patch?.forEach(f => f({ patch: JSON.stringify({ format: 'blokdust.patch', version: 2, seed: 1, blocks: [] }) })); }, 700);
        },
      } };
    }, [stale] as const);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(`${url}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
    await pg.waitForTimeout(800);
    const r = await pg.evaluate(() => ({ seenBeforePatch: (window as any).__seenBeforePatch, blocksAfter: (window as any).__bd_probe.state.blocks.length,
      autosave: JSON.parse(localStorage.getItem('blokdust2.autosave') ?? 'null')?.blocks?.length ?? null }));
    await ctx.close();
    return [r.seenBeforePatch === 0 && r.blocksAfter === 0 && r.autosave === 2, r];
  },

  /** Owner (2026-11-12): the multi-select ring cut through the MIDI Keyboard (v1's hit outline leaves out a corner it
   * draws). Every block's ring encloses everything it draws as a polygon. */
  async 'select-ring-encloses-block'() {
    const misses = BLOCKS.flatMap(def => drawnPoints(def).filter(p => !insidePolygon(p, selectionRing(def))).map(p => `${def.id} (${p})`));
    return [misses.length === 0, { misses }];
  },

  /** Owner (2026-11-08, CHG-0005): the Tour is hidden for Release 1 (v1's tutorial is not ported; built-in presets
   * may replace it). Owner (2026-11-10): its row is now the patch Tempo (web), set once for every synced block:
   * pressing where "Launch Tutorial" was sets the tempo, and the panel stays open. */
  async 'tour-hidden'(errors: string[]) {
    const p = await open(browser, [], errors);
    for (let i = 0; i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open)); i++) { await p.mouse.click(1233, 45); await p.waitForTimeout(700); }
    await p.waitForTimeout(1200);
    const names = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Options.filter((o: any) => o.Type !== 'hidden').map((o: any) => o.Name));
    const tempo = () => p.evaluate(() => (window as any).__bd_probe.scene.host.tempo());
    const before = await tempo();
    await p.mouse.move(700, 452); await p.mouse.down(); await p.mouse.move(800, 452, { steps: 5 }); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/tour-hidden.png` });
    await p.mouse.up(); await p.waitForTimeout(600);
    const after = await tempo(), saved = (await state(p)).patch.tempo;
    const still = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open);
    await p.close();
    const ok = !names.includes('Tour') && JSON.stringify(names) === JSON.stringify(['Color Theme', 'Master Volume', 'DB Meter', 'Tempo']) && still
      && before === 120 && after > 120 && after <= 240 && Number.isInteger(after) && saved === after;
    return [ok, { names, settingsStillOpen: still, before, after, saved }];
  },

  /** Owner (2026-11-10): Settings loses its Connect tab (dated share buttons; the guide site is lost) and the "Chrome
   * Recommended" footer; About has the owner's text (no Web Audio API / Tone.js); the footer links the code on GitHub,
   * (where the licences are too; owner 2026-11-11), underlined on hover, opening in a new window; the build carries
   * NOTICE.txt (v1's MIT notice) and LICENSE.txt. */
  async 'settings-release1'(errors: string[]) {
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
      (window as any).__opened = []; window.open = (u?: string | URL) => { (window as any).__opened.push(String(u)); return null; };
    });
    for (let i = 0; i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open)); i++) { await p.mouse.click(1233, 45); await p.waitForTimeout(700); }
    await p.waitForTimeout(1200);
    const sp = () => p.evaluate(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return { names: s.MenuItems.map((m: any) => m.Name), tab: s._OpenTab }; });
    const tabs = await sp();
    const about = await p.evaluate(() => { const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[2], pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio; return [m.Position.x / pr, 30]; });
    await p.mouse.move(about[0], about[1]); await p.mouse.click(about[0], about[1]); await p.waitForTimeout(1200);
    const aboutTab = (await sp()).tab;
    const links = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.footerLinks()) as { label: string; x: number; y: number }[];
    const link = [links[0].x, links[0].y];
    await p.mouse.move(link[0] - 300, link[1]); await p.waitForTimeout(300);
    const clip = { x: link[0] - 90, y: link[1] - 15, width: 180, height: 30 };
    const idle = await p.screenshot({ clip });
    await p.mouse.move(link[0], link[1]); await p.waitForTimeout(300);
    const hover = await p.screenshot({ clip });
    await p.screenshot({ path: `${OUT}/settings-about.png` });
    for (const l of links) { await p.mouse.move(l.x, l.y); await p.mouse.click(l.x, l.y); await p.waitForTimeout(300); }
    // Every build carries the licences (task 11): v1's MIT notice, and the AGPL.
    const notice = await (await fetch(`${url}/NOTICE.txt`)).text(), licence = await (await fetch(`${url}/LICENSE.txt`)).text();
    const shipped = notice.includes('BlokDust v1') && notice.includes('MIT License') && licence.includes('GNU AFFERO GENERAL PUBLIC LICENSE');
    // (v1 still draws the Connect page, clipped away above the panel: its tab can't be opened, so it never shows.)
    const r = await p.evaluate(() => { const t: string[] = (window as any).__texts, s = (window as any).__bd_probe.scene.SettingsPanel; return { chrome: t.includes('Chrome Recommended'), connect: t.includes('CONNECT'), connectAway: s.MenuItems[1].YOffset === -s.DrawTo.Height,
      about: t.some(x => /This rebuild was released in 2026/.test(x)), toneJs: t.some(x => /Tone\.js/.test(x)), source: t.includes('View the code on GitHub'), opened: (window as any).__opened }; });
    await p.close();
    const ok = JSON.stringify(tabs.names) === JSON.stringify(['SETTINGS', '', 'ABOUT', 'DOWNLOAD']) && aboutTab === 2 && !r.chrome && !r.connect && r.connectAway && r.about && !r.toneJs
      && r.source && !idle.equals(hover) && shipped
      && JSON.stringify(links.map(l => l.label)) === JSON.stringify(['View the code on GitHub'])
      && JSON.stringify(r.opened) === JSON.stringify(['https://github.com/lukephills/blokdust-v2']);
    return [ok, { tabs, aboutTab, ...r, links, shipped, hoverUnderlines: !idle.equals(hover) }];
  },

  /** CHG-0005 task 12 (owner, 2026-11-11: a DOWNLOAD tab, not in About): Settings on the web has SETTINGS · ABOUT ·
   * DOWNLOAD. Before a release is published both buttons are off and say "Coming soon."; once published they open
   * the installers (macOS .pkg, Windows .zip) with ?source=download-page; the version shows. CHG-0010 (owner, 2026-11-12):
   * the intro's second sentence starts its own line, and the SmartScreen note is gone (it is in the zip's README.txt). */
  async 'settings-download'(errors: string[]) {
    const p = await open(browser, [], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
      (window as any).__opened = []; window.open = (u?: string | URL) => { (window as any).__opened.push(String(u)); return null; };
    });
    for (let i = 0; i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open)); i++) { await p.mouse.click(1233, 45); await p.waitForTimeout(700); }
    await p.waitForTimeout(1200);
    const names = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.MenuItems.map((m: any) => m.Name));
    const tab = await p.evaluate(() => { const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[3], pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio; return [m.Position.x / pr, 30]; });
    await p.mouse.move(tab[0], tab[1]); await p.mouse.click(tab[0], tab[1]); await p.waitForTimeout(1200);
    const openTab = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel._OpenTab);
    const texts = () => p.evaluate(() => { const t = (window as any).__texts as string[]; const r = [...new Set(t)]; t.length = 0; return r; });
    // Before any release (2.0.0 is in web/src/releases.json now, so it is set back to none here).
    await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.setRelease({ version: null, macos: null, windows: null }));
    await texts();
    await p.mouse.move(640, 650); await p.waitForTimeout(300);
    const before = await texts();
    let buttons = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.downloadButtons());
    await p.mouse.click(buttons[0].x, buttons[0].y); await p.waitForTimeout(200);
    const openedBefore = await p.evaluate(() => (window as any).__opened.length);
    await p.screenshot({ path: `${OUT}/settings-download-soon.png` });
    // As published (the shape `bd release publish` writes).
    await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.setRelease({ version: '2.0.0',
      macos: { file: 'BlokDust-2.0.0-Mac.pkg', url: 'https://downloads.funputs.com/releases/blokdust/2.0.0/BlokDust-2.0.0-Mac.pkg', sha256: 'x', bytes: 1 },
      windows: { file: 'BlokDust-2.0.0-Windows.zip', url: 'https://downloads.funputs.com/releases/blokdust/2.0.0/BlokDust-2.0.0-Windows.zip', sha256: 'x', bytes: 1 } }));
    buttons = await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.downloadButtons());
    await p.mouse.move(buttons[0].x, buttons[0].y); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/settings-download.png` });
    const after = await texts();
    for (const b of buttons) { await p.mouse.move(b.x, b.y); await p.mouse.click(b.x, b.y); await p.waitForTimeout(200); }
    const opened = await p.evaluate(() => (window as any).__opened);
    await p.close();
    const ok = JSON.stringify(names) === JSON.stringify(['SETTINGS', '', 'ABOUT', 'DOWNLOAD']) && openTab === 3
      && before.includes('Coming soon.') && openedBefore === 0
      && before.includes('Download the standalone app or VST3/AU plugins to use in your DAW.')
      && before.includes('BlokDust can be used as both an instrument and an effect.')
      && after.includes('MACOS') && after.includes('WINDOWS') && after.includes('Version 2.0.0') && !after.some(t => /More info|isn't signed/.test(t))
      && JSON.stringify(opened) === JSON.stringify(buttons.map((b: any) => `${b.url}?source=download-page`));
    return [ok, { names, openTab, before, after, opened }];
  },
} as Record<string, (errors: string[]) => Promise<[boolean, unknown]>>);

/** The plugin page with a fake JUCE backend: the processor sends `patch`; what the page sends is recorded (__sent). */
async function openPlugin(patch: unknown, errors: string[], ids?: Record<string, number>, standalone = false): Promise<{ pg: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([p, ids, standalone]) => {
    const listeners: Record<string, ((x: unknown) => void)[]> = {};
    const sent: { id: string; v: any }[] = [];
    (window as any).__sent = sent;
    (window as any).__fire = (id: string, v: unknown) => listeners[id]?.forEach(f => f(v));
    (window as any).__JUCE__ = { backend: {
      addEventListener: (id: string, fn: (x: unknown) => void) => { (listeners[id] ??= []).push(fn); },
      emitEvent: (id: string, v: unknown) => { sent.push({ id, v }); if (id === 'bd_hello') setTimeout(() => listeners.bd_patch?.forEach(f => f({ patch: JSON.stringify(p), ...(ids ? { ids } : {}), ...(standalone ? { standalone } : {}) })), 50); },
    } };
  }, [patch, ids, standalone] as const);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(`${url}/index.html`);
  await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, { timeout: 15000 });
  await pg.waitForTimeout(1500);
  return { pg, close: () => ctx.close() };
}
const plugPatch = (blocks: { id: string; type: string; x: number; y: number; params?: Record<string, unknown> }[]) =>
  ({ format: 'blokdust.patch', version: 2, seed: 1, blocks: blocks.map(b => ({ params: {}, ...b })) });
/** The open panel's wave option box in css px (for pixel checks). */
const waveBox = (p: Page) => p.evaluate(() => {
  const o = (window as any).__bd_probe.scene.OptionsPanel, w = o.Options.find((q: any) => /^wave/.test(q.Type)), pr = devicePixelRatio;
  return { x: (o.Position.x + o.Margin) / pr, y: (o.Position.y + w.Position.y) / pr, width: o.Range / pr, height: w.Size.height / pr };
});

// ---- Owner review of Phase 3 (2026-11-07): web + plugin in Logic ----
Object.assign(tests, {
  /** Holding a note key and switching tab (or app) must not leave the note stuck: held keys are released when the
   * page loses focus (it never sees their key-up). */
  async 'keys-release-on-blur'(errors: string[]) {
    const p = await open(browser, [{ ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block, blk(2, 'ToneSource', 0, 0)], errors);
    await p.keyboard.down('KeyZ');
    const held = await maxOver(p, 'rms', 400);
    await p.evaluate(() => { window.dispatchEvent(new Event('blur')); });
    await p.waitForTimeout(2500);
    const after = (await state(p)).rms;
    await p.keyboard.up('KeyZ');
    await p.close();
    return [held > 0.005 && after < 0.0005, { held, afterBlur: after }];
  },

  /** Granular shows v1's loading animation while its sound downloads, like Sample and Convolver: the bubble by the
   * block, and the spinning square in its open panel's waveform. */
  async 'granular-loading-spinner'(errors: string[]) {
    cdn.seconds = 2; cdn.delayMs = 0;
    try {
      const p = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
      await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 10000 });
      const [x, y] = await toCss(p, 0, 0.5);
      await p.mouse.click(x, y); await p.waitForTimeout(1200);
      cdn.delayMs = 8000;  // a sound picked in the panel's search (v1 LoadTrack) takes a while to arrive
      await p.evaluate(() => { const v = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock;
        v.LoadTrack({ TitleShort: 'PAD', UserShort: 'SOMEONE', Permalink: '', Sound: { id: 77, name: 'Pad', username: 'someone', license: 'CC0', licenseUrl: '',
          duration: 4, preview: 'https://cdn.freesound.org/previews/0/77_1-hq.mp3', url: 'https://freesound.org/s/77/' } }); });
      await p.waitForTimeout(300);
      const bubble = await p.evaluate(() => (window as any).__bd_probe.scene.AnimationsLayer.ActiveBlocks.length);
      const change = await maxChange(p, await waveBox(p), 300);
      await p.screenshot({ path: `${OUT}/granular-loading-spinner.png` });
      await p.close();
      return [bubble === 1 && change > 40, { bubble, panelPixelChangeIn300ms: change }];
    } finally { cdn.delayMs = 0; }
  },

  /** Granular's LOCATION waveform (v1 WaveSlider): the spawn line and the spread lines show as soon as a sound is
   * loaded (the slider knows the file's length); Spread widens the lines; dragging on the waveform moves the spawn
   * point (the region param the grains play from). */
  async 'granular-waveslider'(errors: string[]) {
    cdn.seconds = 2;
    const p = await open(browser, [blk(1, 'Granular', 0, 0)], errors);
    await p.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 10000 });
    const [x, y] = await toCss(p, 0, 0.5);
    await p.mouse.click(x, y); await p.waitForTimeout(1200);
    const slider = () => p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, w = o.Options.find((q: any) => q.Type === 'waveslider');
      return { max: w?.Max, value: w?.Value, spread: w?.Spread, wave: w?.Waveform?.length ?? 0, region: o.SelectedBlock?.Params.region }; });
    const start = await slider();
    // Drag the Spread slider's handle right by a quarter of its range (+1 s of the 0–4 range).
    const handle = await p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel, w = o.Options.find((q: any) => q.Name === 'Spread'), pr = devicePixelRatio;
      return { x: (o.Position.x + o.Margin + w.Position.x) / pr, y: (o.Position.y + w.Position.y + w.Size.height / 2) / pr, range: o.Range / pr }; });
    await p.mouse.move(handle.x, handle.y); await p.mouse.down();
    await p.mouse.move(handle.x + handle.range * 0.25, handle.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
    const spreadUi = (await slider()).spread;
    const box = await waveBox(p);
    await p.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2); await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 5 }); await p.waitForTimeout(100);
    await p.screenshot({ path: `${OUT}/granular-waveslider.png` });
    await p.mouse.up(); await p.waitForTimeout(100);
    const dragged = await slider();
    const patchRegion = (await state(p)).patch.blocks[0].params.region;
    await p.close();
    const ok = start.max > 1.9 && start.wave > 0 && Math.abs(start.value - 1) < 0.05 && Math.abs(spreadUi - 2.5) < 0.1 &&
      Math.abs(dragged.region - 0.5) < 0.1 && Math.abs(patchRegion - dragged.region) < 1e-6;
    return [ok, { start, spreadUi, dragged, patchRegion }];
  },

  /** CHG-0005: the header's Share slot reads PATCHES (plugin and web) and opens the Patches panel. In the plugin the
   * files live in ~/Music/BlokDust/Patches: the page asks the editor (bd_patchList / Save / Read / Pick / Apply / Reveal)
   * and the processor merges Open / Insert itself. SAVE TO COMPUTER goes through the editor's save dialog (it replies
   * once the user has chosen); FROM YOUR COMPUTER's file comes back unrequested and the panel asks Open or Insert.
   * Native replies are faked here; `bd plugin test` checks the native side. */
  async 'plugin-patches'(errors: string[]) {
    const spy = () => {
      const seen: string[] = [];
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
      (window as any).__texts = seen;
      (window as any).__bd_probe.scene.Header.Draw();
    };
    const { pg, close } = await openPlugin(plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]), errors);
    const saved = { format: 'blokdust.patch', version: 2, meta: { title: 'My Keys' }, blocks: [{ id: 'k', type: 'input.computer-keyboard', x: 0, y: 0 }, { id: 'o', type: 'source.tone', x: 3, y: 0 }] };
    await pg.evaluate(saved => {
      const be = (window as any).__JUCE__.backend, emit = be.emitEvent, fire = (window as any).__fire;
      be.emitEvent = (id: string, v: any) => {
        emit(id, v);
        if (id === 'bd_patchList') setTimeout(() => fire('bd_patchList', { req: v.req, items: [{ name: 'My Keys', path: '/m/My Keys.blokdust', modified: Date.UTC(2026, 10, 8, 12) }] }), 20);
        if (id === 'bd_patchSave') setTimeout(() => fire('bd_patchSaved', { req: v.req, ok: true }), 300);  // the user picks a place
        if (id === 'bd_patchRead') setTimeout(() => fire('bd_patchFile', { req: v.req, text: JSON.stringify(saved), name: 'My Keys', mode: 'open' }), 20);
        if (id === 'bd_patchDelete') setTimeout(() => fire('bd_patchDeleted', { req: v.req, ok: true }), 20);
        if (id === 'bd_patchPick') setTimeout(() => fire('bd_patchFile', { text: JSON.stringify(saved), name: 'My Keys', file: 'My Keys.blokdust', mode: 'choose' }), 20);
      };
    }, saved);
    await pg.evaluate(spy); await pg.waitForTimeout(300);
    const label = await pg.evaluate(() => ({ patches: (window as any).__texts.includes('PATCHES'), share: (window as any).__texts.includes('SHARE') }));
    await openPatches(pg);
    const tab = await pg.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    await patchesClick(pg, 'save', 600);
    const flash = await pg.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.flashing('save'));
    // CREATE SHARE LINK (owner, 2026-11-10: in place of SHOW FOLDER; SAVE TO COMPUTER first): opens the patch on the site.
    const order = await pg.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return pp.centreOf('save')[0] < pp.centreOf('share')[0]; });
    await patchesClick(pg, 'share', 400);
    const opened = await pg.evaluate(() => (window as any).__sent.find((e: any) => e.id === 'bd_openUrl')?.v.url as string | undefined);
    await patchesClick(pg, 'tab1', 600);
    const panel = await pg.evaluate(() => { const s = (window as any).__bd_probe.scene; return { patches: s.PatchesPanel.Open, share: s.SharePanel.Open, items: s.PatchesPanel.Items.map((i: any) => `${i.name} | ${i.detail}`) }; });
    await pg.screenshot({ path: `${OUT}/plugin-patches.png` });
    const sent = () => pg.evaluate(() => (window as any).__sent.filter((e: any) => e.id.startsWith('bd_patch')).map((e: any) => ({ id: e.id, v: e.v })));
    await patchesClick(pg, 'ins1', 900);  // the first preset: Insert (no confirm; the processor merges it)
    const [bx, by] = await toCss(pg, 0, 0.2), [bx2, by2] = await toCss(pg, 4, 0.2);  // a change since the save
    await pg.mouse.move(bx, by); await pg.mouse.down(); await pg.mouse.move(bx2, by2, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(300);
    await openList(pg); await patchesClick(pg, 'open0', 600);  // the saved file: Open → asked first
    const asked = await pg.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    await patchesClick(pg, 'openAnyway', 900);
    await openList(pg); await patchesClick(pg, 'bin0', 400); await patchesClick(pg, 'removeOk', 600);  // the saved file's bin
    await openList(pg); await patchesClick(pg, 'file', 600);  // OPEN FROM YOUR DEVICE
    const choice = await pg.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return { view: pp.View, picked: pp.Picked }; });
    await patchesClick(pg, 'fileBack', 400);
    const log = await sent();
    await close();
    const save = log.find((e: any) => e.id === 'bd_patchSave'), apply = log.filter((e: any) => e.id === 'bd_patchApply');
    const ins = apply[0] && JSON.parse(apply[0].v.patch), open = apply[1] && JSON.parse(apply[1].v.patch);
    const ok = label.patches && !label.share && panel.patches && !panel.share && tab === 0
      && panel.items[0] === 'My Keys | Saved 8 Nov 2026' && panel.items.some((i: string) => i.endsWith('| Preset'))
      && !!save?.v.title && flash === true
      && apply[0]?.v.mode === 'insert' && ins.blocks.length === 6 && !ins.blocks.some((b: any) => b.id === 't')
      && asked === 'confirm'
      && log.some((e: any) => e.id === 'bd_patchRead' && e.v.path === '/m/My Keys.blokdust')
      && apply[1]?.v.mode === 'open' && open.blocks.map((b: any) => b.id).join() === 'k,o'
      && choice.view === 'file' && choice.picked?.title === 'My Keys' && choice.picked?.fileName === 'My Keys.blokdust'
      && log.some((e: any) => e.id === 'bd_patchPick') && order
      && /^https:\/\/[^?]+\/\?c=p[\w-]+&t=[^&]+&share=1$/.test(opened ?? '')
      && log.some((e: any) => e.id === 'bd_patchDelete' && e.v.path === '/m/My Keys.blokdust');
    return [ok, { label, tab, panel, flash, asked, choice, order, opened, sent: log.map((e: any) => e.id), insertIds: ins?.blocks.map((b: any) => b.id), openIds: open?.blocks.map((b: any) => b.id) }];
  },

  /** Owner (2026-11-08): a missing file (a patch from another machine) can be relinked by dropping a file on the block
   * or with a button that opens the file picker. While the sample is missing, v1's LOAD NEW SAMPLE reads LOCATE FILE
   * and opens the picker (the plugin's native one, or the browser's) instead of the sample search. */
  async 'locate-missing-file'(errors: string[]) {
    const p = await open(browser, [], errors);
    await openList(p);
    const chooser = p.waitForEvent('filechooser');
    await patchesClick(p, 'file', 0);
    await (await chooser).setFiles({ name: 'beat.blokdust', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
      format: 'blokdust.patch', version: 2, blocks: [{ id: 's', type: 'source.sample', x: 0, y: 0, params: { track: 'file:kick.wav', trackName: 'KICK' } }],
      refs: { 'file:kick.wav': { provider: 'file', name: 'kick.wav', bytes: 1000, durationSec: 1, hash: 'sha256:none' } } })) });
    await p.waitForTimeout(600);
    await patchesClick(p, 'fileOpen', 1200);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
      const host = (window as any).__bd_probe.scene.host;
      (window as any).__picked = [];
      host.loadSample = (id: number) => (window as any).__picked.push(id);
    });
    await p.mouse.click(640, 402); await p.waitForTimeout(1000);  // the block: its options panel
    await p.mouse.move(941, 443); await p.mouse.click(941, 443); await p.waitForTimeout(800);  // v1's LOAD NEW SAMPLE button
    const r = await p.evaluate(() => ({ texts: (window as any).__texts.filter((t: string) => /LOCATE|LOAD NEW|MISSING/.test(t)).slice(0, 4),
      picked: (window as any).__picked, search: (window as any).__bd_probe.scene.SoundcloudPanel.Open }));
    await p.screenshot({ path: `${OUT}/locate-missing-file.png` });
    await p.close();
    return [r.texts.includes('LOCATE FILE') && !r.texts.includes('LOAD NEW SAMPLE') && r.picked.length === 1 && !r.search, r];
  },

  /** CHG-0005: every built-in preset opens with all its blocks, and the self-playing ones (Rotating Sequencer, Step
   * Sequencer: Power blocks run their laser and emitters) are heard without touching anything. Keys and Microphone presets wait for the player. */
  async 'presets-load'(errors: string[]) {
    const p = await open(browser, [], errors);
    await openList(p);
    const items: string[] = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name));
    const want: Record<string, number> = { 'Computer Keys + 2 Tones': 6, 'MIDI Keys + 2 Tones': 6, 'Microphone + Recorder': 5, 'Rotating Sequencer': 10, 'Step Sequencer': 21, 'Self Playing Scene': 29 };
    const selfPlaying = new Set(['Rotating Sequencer', 'Step Sequencer', 'Self Playing Scene']);
    const got: Record<string, unknown> = {};
    for (let i = 0; i < items.length; i++) {
      if (i) await openList(p);
      await rowButton(p, 'open', items[i], 400);  // a preset just opened is saved: no confirm
      const pb = (await state(p)).patch.blocks, blocks = pb.length;
      // Owner (PR #1 review, 2026-11-12): lasers and emitters are never self-powered; a Power block next to each runs it.
      if (pb.some((b: any) => /laser|emitter/.test(b.type) && b.params?.selfPoweredMode)) got[`${items[i]}: self-powered`] = true;
      // CHG-0013: the owner's Self Playing Scene opens with its two Toggles opposite (they flip together: the chords take turns).
      const toggles = pb.filter((b: any) => b.type === 'power.toggle').map((b: any) => !!b.params?.logic);
      const plays = selfPlaying.has(items[i]) ? await maxOver(p, 'rms', 3000) : null;
      got[items[i]] = { blocks, ...(plays !== null ? { rms: plays } : {}), ...(toggles.length ? { toggles } : {}) };
    }
    await p.close();
    const ok = Object.entries(want).every(([n, k]) => (got[n] as any)?.blocks === k) && !Object.keys(got).some(k => k.endsWith('self-powered'))
      && [...selfPlaying].every(n => (got[n] as any)?.rms > 0.001) && (got['Self Playing Scene'] as any)?.toggles?.length === 2 && (got['Self Playing Scene'] as any).toggles[0] !== (got['Self Playing Scene'] as any).toggles[1];
    return [ok, got];
  },

  /** CHG-0005 (web; SAVE / OPEN tabs, owner 2026-11-10): OPEN lists the presets with OPEN and INSERT on each row.
   * INSERT hands the blocks to the pointer (half transparent) until a click puts them down, where the pointer is;
   * Cmd/Ctrl+Z takes them out again. SAVE TO COMPUTER downloads a `.blokdust` file where the browser has no save dialog.
   * FROM YOUR COMPUTER and a dropped file ask Open or Insert. */
  async 'patches-web'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => { delete (window as any).showSaveFilePicker; });  // a browser without a save dialog
    const count = async () => (await state(p)).patch.blocks.length;
    const centre = async (from: number) => p.evaluate(n => { const b = (window as any).__bd_probe.state.patch.blocks.slice(n); const xs = b.map((q: any) => q.x), ys = b.map((q: any) => q.y);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; }, from) as Promise<[number, number]>;
    await openPatches(p);
    const tab = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    const title = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    await patchesClick(p, 'tab1', 600);
    const items = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name));
    await p.screenshot({ path: `${OUT}/patches-web.png` });
    // INSERT: the blocks follow the pointer, drawn like a pressed block, until a click.
    await patchesClick(p, 'ins0', 100);
    await p.mouse.move(400, 600, { steps: 8 }); await p.waitForTimeout(300);
    const placing = await p.evaluate(() => (window as any).__bd_placing());
    await p.screenshot({ path: `${OUT}/patches-web-placing.png` });
    await p.mouse.click(400, 600); await p.waitForTimeout(300);
    const placed = { count: await count(), centre: await centre(1), placing: await p.evaluate(() => (window as any).__bd_placing()) };
    const [cx, cy] = await toCss(p, placed.centre[0], placed.centre[1]);
    await p.keyboard.press('ControlOrMeta+z'); await p.waitForTimeout(300);
    const undone = await count();
    // Esc while placing puts nothing down.
    await openList(p); await patchesClick(p, 'ins0', 100); await p.mouse.move(500, 300, { steps: 4 });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const escaped = await count();
    // SAVE TO COMPUTER (download)
    await openPatches(p);
    const dl = p.waitForEvent('download');
    await patchesClick(p, 'save');
    const d = await dl, file = JSON.parse(readFileSync(await d.path(), 'utf8'));
    const saved = { name: d.suggestedFilename(), title: file.meta?.title, blocks: file.blocks?.length, format: file.format };
    // The saved patch is listed first, above the presets (this browser only); OPEN a preset: just saved, so no question.
    await openList(p);
    const mine = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items[0]);
    await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const afterOpen = await count();
    await openList(p); await rowButton(p, 'open', title);  // the saved one (nothing changed since the preset opened: no question)
    const reopened = { blocks: await count(), title: await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title) };
    await openList(p); await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const openTitle = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title);
    // FROM YOUR COMPUTER → Insert
    await openList(p);
    const chooser = p.waitForEvent('filechooser');
    await patchesClick(p, 'file', 0);
    await (await chooser).setFiles({ name: 'two.blokdust', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'blokdust.patch', version: 2, meta: { title: 'Two' }, blocks: [{ id: 'a', type: 'source.noise', x: 0, y: 0 }, { id: 'b', type: 'fx.reverb', x: 3, y: 0 }] })) });
    await p.waitForTimeout(600);
    const choice = await p.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return { view: pp.View, picked: pp.Picked }; });
    await p.screenshot({ path: `${OUT}/patches-web-file.png` });
    await patchesClick(p, 'fileInsert', 100); await p.mouse.move(900, 600, { steps: 4 }); await p.mouse.click(900, 600); await p.waitForTimeout(300);
    const afterFile = await count();
    // A dropped file: the same question
    await p.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([JSON.stringify({ format: 'blokdust.patch', version: 2, blocks: [{ id: 'z', type: 'fx.filter', x: 0, y: 0 }] })], 'one.blokdust', { type: 'application/json' }));
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: 300, clientY: 600, bubbles: true, cancelable: true }));
    });
    await p.waitForTimeout(1200);
    const dropView = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    await patchesClick(p, 'fileInsert', 100); await p.mouse.move(300, 650, { steps: 4 }); await p.mouse.click(300, 650); await p.waitForTimeout(300);
    const afterDrop = await count();
    await p.screenshot({ path: `${OUT}/patches-web-after.png` });
    await p.close();
    const ok = tab === 0 && items.includes('MIDI Keys + 2 Tones') && items.length === 6 && !!title
      && mine?.name === title && /^Saved \d/.test(mine?.detail) && reopened.blocks === 1 && reopened.title === title
      && placing?.ids.length === 6 && placed.count === 7 && !placed.placing && Math.hypot(cx - 400, cy - 600) < 40
      && undone === 1 && escaped === 1
      && saved.name === `${title}.blokdust` && saved.title === title && saved.blocks === 1 && saved.format === 'blokdust.patch'
      && afterOpen === 6 && openTitle === 'Computer Keys + 2 Tones'
      && choice.view === 'file' && choice.picked?.title === 'Two' && afterFile === 8 && dropView === 'file' && afterDrop === 9;
    return [ok, { tab, items, title, mine, reopened, placing, placed, droppedAt: [cx, cy], undone, escaped, saved, afterOpen, openTitle, choice, afterFile, dropView, afterDrop }];
  },

  /** Owner (2026-11-10): Open over unsaved changes asks first (CANCEL · SAVE FIRST · OPEN ANYWAY); an unchanged patch
   * opens straight away, and Insert never asks. SAVE FIRST saves, then opens. */
  async 'open-confirms-unsaved'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => { delete (window as any).showSaveFilePicker; });
    const count = async () => (await state(p)).patch.blocks.length;
    /** Drag the patch's first block 4 cells right: a change. */
    const change = async () => {
      const b = (await state(p)).patch.blocks[0], [x, y] = await toCss(p, b.x, b.y + 0.2), [x2, y2] = await toCss(p, b.x + 4, b.y + 0.2);
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x2, y2, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
    };
    const view = () => p.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return pp.Open ? pp.View : 'closed'; });
    // Unchanged (opened from a link): no question.
    await openList(p); await rowButton(p, 'open', 'Rotating Sequencer');
    const unchanged = { view: await view(), blocks: await count() };
    // Changed: asked; CANCEL keeps the work.
    await change();
    await openList(p); await rowButton(p, 'open', 'Computer Keys + 2 Tones');
    const asked = await view();
    await p.screenshot({ path: `${OUT}/open-confirms-unsaved.png` });
    await patchesClick(p, 'cancel');
    const cancelled = { view: await view(), blocks: await count() };
    // INSERT never asks.
    await rowButton(p, 'ins', 'Microphone + Recorder', 100); await p.mouse.click(300, 600); await p.waitForTimeout(300);
    const inserted = { view: await view(), blocks: await count() };
    // SAVE FIRST: the file is saved, then the patch opens.
    await openList(p); await rowButton(p, 'open', 'Computer Keys + 2 Tones', 300);
    const dl = p.waitForEvent('download');
    await patchesClick(p, 'saveFirst', 0);
    const d = await dl, savedBlocks = JSON.parse(readFileSync(await d.path(), 'utf8')).blocks.length;
    await p.waitForTimeout(800);
    const afterSaveFirst = { view: await view(), blocks: await count() };
    // OPEN ANYWAY
    await change();
    await openList(p); await rowButton(p, 'open', 'Step Sequencer');
    const asked2 = await view();
    await patchesClick(p, 'openAnyway', 600);
    const anyway = { view: await view(), blocks: await count() };
    await p.close();
    // Rotating Sequencer has 10 blocks, Step Sequencer 21 (the owner's presets, 2026-11-12).
    const ok = unchanged.view === 'closed' && unchanged.blocks === 10 && asked === 'confirm' && cancelled.view === 'list' && cancelled.blocks === 10
      && inserted.view === 'closed' && inserted.blocks === 15 && savedBlocks === 15 && afterSaveFirst.view === 'closed' && afterSaveFirst.blocks === 6
      && asked2 === 'confirm' && anyway.view === 'closed' && anyway.blocks === 21;
    return [ok, { unchanged, asked, cancelled, inserted, savedBlocks, afterSaveFirst, asked2, anyway }];
  },

  /** Owner (2026-11-10): the user's own saved patches have a bin (a small v1 trash can) right of INSERT; it asks first,
   * then takes the patch off this browser's list. Presets have none. */
  async 'patch-delete'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => { delete (window as any).showSaveFilePicker; });
    await openPatches(p);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells'));
    const dl = p.waitForEvent('download'); await patchesClick(p, 'save', 600); await dl;
    await openList(p);
    const listed = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => `${i.name}${i.removable ? ' [bin]' : ''}`));
    const [bx, by] = await patchesAt(p, 'bin0'); await p.mouse.move(bx, by); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/patch-delete.png` });
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
    });
    await p.mouse.click(bx, by); await p.waitForTimeout(400);
    const asked = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    // Owner's wording (2026-11-10): "Delete <name>?", then what is and isn't touched.
    const words = await p.evaluate(() => { const t: string[] = (window as any).__texts; return { title: t.includes('DELETE BASS + BELLS?'), line: t.join(' ').includes('This patch will be removed from the patches list. Your local downloaded') }; });
    await p.screenshot({ path: `${OUT}/patch-delete-confirm.png` });
    await patchesClick(p, 'removeCancel', 400);
    const kept = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items[0]?.name);
    await patchesClick(p, 'bin0', 400); await patchesClick(p, 'removeOk', 800);
    const after = await p.evaluate(() => ({ items: (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: any) => i.name), stored: JSON.parse(localStorage.getItem('blokdust.myPatches') ?? '[]').length }));
    // A preset row has no bin: clicking there does nothing.
    await patchesClick(p, 'bin0', 400);
    const presetView = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View);
    await p.close();
    const ok = listed[0] === 'Bass + Bells [bin]' && listed.slice(1).every((n: string) => !n.endsWith('[bin]')) && asked === 'remove' && kept === 'Bass + Bells' && words.title && words.line
      && after.items.length === 6 && !after.items.includes('Bass + Bells') && after.stored === 0 && presetView === 'list';
    return [ok, { listed, asked, kept, words, after, presetView }];
  },

  /** The plugin's CREATE SHARE LINK opens the patch on the site (`?c=p…&t=…&share=1`). Owner (2026-11-13, CHG-0013):
   * it opened the Patches panel at once, whose title showed over the start screen, and after START the panel was
   * still in the way, one more click from the link. Now the site makes the link as it loads (the user asked for it in
   * the app) and the address bar shows it (here, with no backend, the self-contained link); the start screen is the
   * start screen alone, START shows the scene, and Patches › SAVE has the link and the name. */
  async 'share-from-plugin'(errors: string[]) {
    const { deflateRawSync } = await import('node:zlib');
    const patch = { format: 'blokdust.patch', version: 2, blocks: [{ id: 'a', type: 'source.tone', x: 0, y: 0, params: {} }, { id: 'b', type: 'power.emitter', x: -60, y: 0, params: {} }] };
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(patch))).toString('base64url');
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?splash=1&c=${token}&t=${encodeURIComponent('Bass + Bells')}&share=1`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.waitForTimeout(1500);
    const before = await p.evaluate(() => ({ panel: (window as any).__bd_probe.scene.PatchesPanel.Open, link: !!(window as any).__bd_probe.scene.host.links.current() }));
    await p.screenshot({ path: `${OUT}/share-from-plugin-start.png` });
    await p.mouse.click(640, 400);
    await p.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel, link = (window as any).__bd_probe.scene.host.links.current();
      return { open: pp.Open, title: pp.Title, blocks: (window as any).__bd_probe.state.blocks.length, search: location.search, link: link?.url ?? null, stale: link?.stale, state: pp.shareState() };
    });
    await p.screenshot({ path: `${OUT}/share-from-plugin.png` });
    await p.close();
    const ok = !before.panel && !r.open && r.title === 'Bass + Bells' && r.blocks === 2 && !/share=/.test(r.search) && r.search.includes('c=p')
      && !!r.link && r.link.endsWith(r.search) && r.stale === false && r.state.save !== 'make';
    return [ok, { before, ...r, link: r.link?.slice(0, 60) }];
  },

  /** Owner (2026-11-10): Patches opens on the tab last chosen, also after a reload; OPEN FROM YOUR DEVICE is the OPEN
   * tab's main button, filled in v1's SAVE colour (MenuOrder[3]) like the old GUIDE button. */
  async 'patches-tab-remembered'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const tab = () => p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
    await openPatches(p); const first = await tab();
    await patchesClick(p, 'tab1', 600); await patchesClick(p, 'close', 800);
    await openPatches(p, true); const reopened = await tab();
    const fill = await p.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel, app = (window as any).__bd_probe.v1App, [x, y] = pp.centreOf('file');
      const c = document.querySelector('canvas') as HTMLCanvasElement, pr = app.Metrics.PixelRatio;
      const probe = document.createElement('canvas'); probe.width = c.width; probe.height = c.height;
      const g = probe.getContext('2d')!; g.drawImage(c, 0, 0);
      const px = Array.from(g.getImageData(Math.round((x - 190) * pr), Math.round((y - 12) * pr), 1, 1).data.slice(0, 3));
      const w = document.createElement('canvas').getContext('2d')!; w.fillStyle = app.Palette[app.ThemeManager.MenuOrder[3]]; w.fillRect(0, 0, 1, 1);
      return { px, want: Array.from(w.getImageData(0, 0, 1, 1).data.slice(0, 3)) };
    });
    await p.screenshot({ path: `${OUT}/patches-open-tab.png` });
    await p.reload(); await p.waitForFunction(() => (window as any).__bd_probe);
    await p.click('#start'); await p.waitForTimeout(2000);
    await openPatches(p, true); const reloaded = await tab();
    await patchesClick(p, 'tab0', 600); await patchesClick(p, 'close', 800);
    await openPatches(p, true); const back = await tab();
    await p.close();
    const filled = fill.px.every((v: number, i: number) => Math.abs(v - fill.want[i]) <= 3);
    const ok = first === 0 && reopened === 1 && reloaded === 1 && back === 0 && filled;
    return [ok, { first, reopened, reloaded, back, fill }];
  },

  /** Owner (2026-11-10): the sample panel's file button reads UPLOAD FILE with the upload mark, and text buttons like it
   * (and OPEN FROM YOUR DEVICE) are underlined on hover, so they read as buttons. */
  async 'upload-file-button'(errors: string[]) {
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    await p.mouse.click(640, 402); await p.waitForTimeout(1000);  // the Sample: its options panel
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
    });
    await p.mouse.move(941, 443); await p.mouse.click(941, 443); await p.waitForTimeout(1200);  // LOAD NEW SAMPLE → the search panel
    const r = await p.evaluate(() => { const s = (window as any).__bd_probe.scene, x = s.fileButtonRect(), pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio; return { x: x.x / pr, y: x.y / pr, w: x.w / pr, h: x.h / pr, open: s.SoundcloudPanel.Open }; });
    const clip = { x: r.x - 10, y: r.y, width: r.w + 20, height: r.h };
    await p.mouse.move(r.x - 200, r.y - 100); await p.waitForTimeout(300);
    const idle = await p.screenshot({ clip });
    await p.mouse.move(r.x + r.w / 2, r.y + 20); await p.waitForTimeout(300);
    const hover = await p.screenshot({ clip });
    await p.screenshot({ path: `${OUT}/upload-file-button.png` });
    const texts = await p.evaluate(() => (window as any).__texts.filter((t: string) => /FILE/.test(t)).slice(0, 3));
    await p.close();
    const ok = r.open && texts.includes('UPLOAD FILE') && !texts.includes('YOUR FILE') && !idle.equals(hover);
    return [ok, { open: r.open, texts, hoverChangesIt: !idle.equals(hover) }];
  },

  /** Owner (2026-11-10): SAVE TO COMPUTER lets the user pick where. Where the browser has a save dialog it is used,
   * starting in Music (browsers can't open a sub-folder that the page hasn't been given) and remembering the folder
   * last used for patches (`id`). */
  async 'save-picker'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await p.evaluate(() => {
      (window as any).__written = [];
      (window as any).showSaveFilePicker = async (o: any) => { (window as any).__opts = o; return { createWritable: async () => ({ write: async (t: string) => (window as any).__written.push(t), close: async () => {} }) }; };
    });
    await openPatches(p);
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bass + Bells'));
    await patchesClick(p, 'save', 600);
    const r = await p.evaluate(() => ({ opts: (window as any).__opts, file: JSON.parse((window as any).__written[0] ?? '{}'), saved: (window as any).__bd_probe.scene.PatchesPanel.flashing('save') }));
    // Cancelling the dialog saves nothing and says nothing.
    await p.evaluate(() => { (window as any).showSaveFilePicker = async () => { throw new DOMException('cancelled', 'AbortError'); }; });
    await p.waitForTimeout(1800);
    await patchesClick(p, 'save', 400);
    const cancelled = await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.flashing('save'));
    await p.close();
    const ok = r.opts?.startIn === 'music' && r.opts?.id === 'blokdust-patches' && r.opts?.suggestedName === 'Bass + Bells.blokdust'
      && r.file.meta?.title === 'Bass + Bells' && r.file.blocks?.length === 1 && r.saved === true && cancelled === false;
    return [ok, { opts: r.opts, title: r.file.meta?.title, saved: r.saved, cancelled }];
  },

  /** Owner (2026-11-11): the web SAVE tab is three buttons, SAVE · SAVE AS · DOWNLOAD PATCH, with no help lines; the
   * link shows with "Share your creation with this unique URL:" and a click on it copies it. SAVE makes the link, then
   * is off until the patch changes; a link this browser can't save over (here: no backend, a self-contained link)
   * gets a new one. SAVE / SAVE AS on a stored link are checked by test:sharing. */
  async 'share-link-inline'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
    });
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start'); await p.waitForTimeout(2500);
    const link = () => p.evaluate(() => (window as any).__bd_probe.scene.host.links.current());
    const state = () => p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.shareState());
    const texts = () => p.evaluate(() => { const t = (window as any).__texts as string[]; const r = [...new Set(t)]; t.length = 0; return r; });
    await texts(); await openPatches(p); await p.waitForTimeout(300);
    const before = await texts(), xs = await p.evaluate(() => ['share', 'saveAs', 'save'].map(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n)[0]));
    await p.screenshot({ path: `${OUT}/save-tab.png` });
    await patchesClick(p, 'close', 900);
    const first = await makeLink(p);
    const fresh = await link(), freshState = await state();
    await texts(); await p.waitForTimeout(300); const withLink = await texts();
    await p.click('#patchUrlText'); await p.waitForTimeout(300);
    const copied = { line: (await texts()).includes('Link copied.'), clip: await p.evaluate(() => navigator.clipboard.readText()) };
    await p.screenshot({ path: `${OUT}/share-link-inline.png` });
    await patchesClick(p, 'close', 900);
    const [x, y] = await toCss(p, 0, 0.2);
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 120, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
    await openPatches(p);
    const stale = await link(), staleState = await state();
    await p.screenshot({ path: `${OUT}/share-link-stale.png` });
    await patchesClick(p, 'share', 200);  // SAVE: can't save over this link → a new one
    await p.waitForFunction(prev => (document.getElementById('patchUrlText') as HTMLInputElement).value !== prev, first, { timeout: 20000 });
    const second = await link();
    await ctx.close();
    const gone = ["Save your changes to your link.", "Your latest changes aren't in this link yet:", 'Your link is ready to share.', 'Save as a new link, and keep this one as it is.'];
    const labels = ['SAVE', 'SAVE AS', 'DOWNLOAD PATCH'];
    const ok = labels.every(l => before.includes(l)) && xs[0] < xs[1] && xs[1] < xs[2] && !before.some(t => /blokdust patch file|shareable link/i.test(t))
      && /[?&]c=/.test(first) && fresh?.url === first && !fresh.stale && freshState.save === null && freshState.saveAs === false
      && withLink.includes('Share your creation with this unique URL:') && !withLink.some(t => gone.includes(t))
      && copied.line && copied.clip === first
      && stale?.stale === true && staleState.save === 'new' && staleState.saveAs === true && second?.url !== first && !second?.stale;
    return [ok, { before, xs, first: first.slice(0, 60), fresh, freshState, withLink, copied, stale, staleState, second }];
  },

  /** Owner (2026-11-11): DOWNLOAD PATCH has black text on v1's third options colour (Mode Stereo's green, the
   * Particle Emitter's Division), or the palette's options colour most readable with black where that one is too dark:
   * readable (WCAG 4.5:1) in every palette. Crops: download-theme<n>.png. */
  async 'download-colour'(errors: string[]) {
    const { PNG } = await import('pngjs');
    const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rows: unknown[] = [];
    let ok = true;
    for (const t of THEMES) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(`${url}/index.html?theme=${t.index}&v1=${comp([blk(1, 'ToneSource', 0, 0)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start'); await p.waitForTimeout(1500);
      await openPatches(p); await p.mouse.move(640, 700); await p.waitForTimeout(400);
      const [cx, cy] = await patchesAt(p, 'save');
      const png = PNG.sync.read(await p.screenshot({ clip: { x: cx - 85, y: cy - 16, width: 1, height: 1 } }));
      const fill = [png.data[0], png.data[1], png.data[2]];
      const contrast = (lum(fill) + 0.05) / 0.05;
      await p.screenshot({ path: `${OUT}/download-theme${t.index}.png`, clip: { x: cx - 330, y: cy - 30, width: 440, height: 60 } });
      await p.close();
      const want = t.index === 0 ? [39, 213, 120] : null;
      const good = contrast >= 4.5 && (!want || want.every((v, i) => Math.abs(v - fill[i]) < 3));
      ok &&= good;
      rows.push({ theme: t.name, fill, contrast: Math.round(contrast * 10) / 10, good });
    }
    return [ok, rows];
  },

  /** Owner (2026-11-10): on a touch screen an Insert lands in the middle of the view; a finger drags it (from wherever
   * it lands, without jumping) and lifting the finger puts it down. */
  async 'insert-touch'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -6, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const touch = (type: string, x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const tap = async (x: number, y: number) => { await touch('touchStart', x, y); await p.waitForTimeout(40); await touch('touchEnd', 0, 0); await p.waitForTimeout(700); };
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(1)); await p.waitForTimeout(1200);
    const [ix, iy] = await patchesAt(p, 'ins0'); await tap(ix, iy);
    const blocks = () => p.evaluate(() => (window as any).__bd_probe.state.patch.blocks.slice(1).map((b: any) => [b.x, b.y]));
    const atStart = await blocks(), placing = await p.evaluate(() => (window as any).__bd_placing());
    await touch('touchStart', 900, 700);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', 900 - 30 * i, 700 - 30 * i); await p.waitForTimeout(16); }
    const moving = await p.evaluate(() => !!(window as any).__bd_placing());
    await touch('touchEnd', 0, 0); await p.waitForTimeout(400);
    const after = await blocks(), done = await p.evaluate(() => (window as any).__bd_placing());
    const selected = await p.evaluate(() => (window as any).__bd_selection());  // owner, 2026-11-11: an Insert is not selected
    await p.screenshot({ path: `${OUT}/insert-touch.png` });
    await ctx.close();
    const [gx0, gy0] = atStart[0] ?? [0, 0], [gx1, gy1] = after[0] ?? [0, 0];
    const ok = placing?.touch === true && atStart.length === 6 && moving && !done && after.length === 6 && gx1 < gx0 && gy1 < gy0
      && selected.length === 0;
    return [ok, { placing, atStart, after, selected }];
  },


  /** CHG-0005 task 9 (owner): multi-select. Shift+click adds/removes blocks, Shift+drag on the stage boxes them, a
   * finger held still on the stage then dragged boxes them; dragging one selected block moves them all, Alt+drag copies
   * them all, Cmd/Ctrl+D duplicates, Delete deletes, dropping them on the trash deletes them all; Esc or a tap on the
   * stage clears. A plain click on a selected block is v1's click (options panel) and lets the group go. */
  async 'multi-select'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 0), blk(2, 'ToneSource', -4, 0), blk(3, 'Filter', 4, 0), blk(4, 'Power', 12, 0)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await p.waitForTimeout(1200);
    const eid: number[] = await p.evaluate(() => (window as any).__bd_probe.state.blocks.map((b: any) => b.id));
    const sel = () => p.evaluate(() => (window as any).__bd_selection().sort((a: number, b: number) => a - b)) as Promise<number[]>;
    const pos = () => p.evaluate(() => (window as any).__bd_probe.state.blocks.map((b: any) => [b.id, b.x, b.y])) as Promise<[number, number, number][]>;
    const at = (id: number) => p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const count = async () => (await pos()).length;
    const drag = async (from: [number, number], to: [number, number], steps = 10) => {
      await p.mouse.move(from[0], from[1]); await p.mouse.down();
      for (let i = 1; i <= steps; i++) await p.mouse.move(from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps);
      await p.mouse.up(); await p.waitForTimeout(300);
    };
    const r: Record<string, unknown> = {};
    // Shift+click two blocks; drag one: both move.
    await p.keyboard.down('Shift');
    for (const id of [eid[0], eid[1]]) { const [x, y] = await at(id); await p.mouse.click(x, y); await p.waitForTimeout(150); }
    await p.keyboard.up('Shift');
    r.shiftClick = await sel();
    await p.screenshot({ path: `${OUT}/multi-select.png` });
    const before = await pos(), a0 = await at(eid[0]);
    await drag(a0, [a0[0] + 60, a0[1] + 90]);
    const after = await pos(), find = (l: [number, number, number][], id: number) => l.find(q => q[0] === id)!;
    const delta = (i: number) => [find(after, eid[i])[1] - find(before, eid[i])[1], find(after, eid[i])[2] - find(before, eid[i])[2]];
    r.groupMove = [delta(0), delta(1), delta(2)];
    const groupMoved = delta(0)[1] > 0 && JSON.stringify(delta(0)) === JSON.stringify(delta(1)) && delta(2)[0] === 0 && delta(2)[1] === 0;
    // A tap on the stage clears.
    await p.mouse.click(300, 650); await p.waitForTimeout(300);  // (not the power switch, bottom centre)
    r.afterTap = await sel();
    // Shift+drag a box over the Filter and the Power.
    const [fx, fy] = await at(eid[2]), [qx, qy] = await at(eid[3]);
    await p.keyboard.down('Shift'); await drag([fx - 40, fy - 70], [qx + 40, qy + 70]); await p.keyboard.up('Shift');
    r.box = await sel();
    // Alt+drag one of them: both copied, the copies selected and moved; the originals stay.
    const n0 = await count(), f0 = await at(eid[2]);
    await p.keyboard.down('Alt'); await drag(f0, [f0[0], f0[1] - 150]); await p.keyboard.up('Alt');
    const copies = await sel(), posAlt = await pos();
    r.altCopy = { n0, n: posAlt.length, copies };
    const altOk = posAlt.length === n0 + 2 && copies.length === 2 && !copies.includes(eid[2]) && !copies.includes(eid[3])
      && find(posAlt, eid[2])[2] === find(before, eid[2])[2];
    // Cmd/Ctrl+D duplicates the selection; Delete deletes it.
    await p.keyboard.press('ControlOrMeta+d'); await p.waitForTimeout(300);
    const nd = await count(), dup = await sel();
    await p.keyboard.press('Delete'); await p.waitForTimeout(300);
    r.dupDelete = { afterDup: nd, dupSelected: dup.length, afterDelete: await count(), sel: await sel() };
    const dupOk = nd === n0 + 4 && dup.length === 2 && (await count()) === n0 + 2;
    // Esc clears.
    await p.keyboard.down('Shift'); { const [x, y] = await at(eid[0]); await p.mouse.click(x, y); } await p.keyboard.up('Shift');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    r.esc = await sel();
    // Touch: hold a finger still on the stage, then drag a box over the two tones.
    const cdp = await ctx.newCDPSession(p);
    const touch = (type: string, x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const [t1x, t1y] = await at(eid[0]), [t2x, t2y] = await at(eid[1]);
    const view0 = await p.evaluate(() => ({ ...(window as any).__bd_probe.v1App.DragOffset }));
    await touch('touchStart', Math.min(t1x, t2x) - 50, Math.min(t1y, t2y) - 80); await p.waitForTimeout(650);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', Math.min(t1x, t2x) - 50 + (Math.max(t1x, t2x) - Math.min(t1x, t2x) + 100) * i / 8, Math.min(t1y, t2y) - 80 + (Math.abs(t2y - t1y) + 160) * i / 8); await p.waitForTimeout(16); }
    await p.screenshot({ path: `${OUT}/multi-select-box.png` });
    await touch('touchEnd', 0, 0); await p.waitForTimeout(300);
    const view1 = await p.evaluate(() => ({ ...(window as any).__bd_probe.v1App.DragOffset }));
    r.touchBox = { sel: await sel(), viewStill: view0.x === view1.x && view0.y === view1.y };
    // Drag the selection onto the trash: both deleted.
    const nt = await count(), g = await at(eid[0]);
    await drag(g, [1250, 770], 14);
    r.trash = { before: nt, after: await count() };
    await ctx.close();
    const ok = JSON.stringify(r.shiftClick) === JSON.stringify([eid[0], eid[1]].sort((a, b) => a - b)) && groupMoved && (r.afterTap as number[]).length === 0
      && JSON.stringify(r.box) === JSON.stringify([eid[2], eid[3]].sort((a, b) => a - b)) && altOk && dupOk && (r.esc as number[]).length === 0
      && JSON.stringify((r.touchBox as any).sel) === JSON.stringify([eid[0], eid[1]].sort((a, b) => a - b)) && (r.touchBox as any).viewStill
      && (r.trash as any).after === nt - 2;
    return [ok, r];
  },

  /** Owner (2026-11-11): the start screen is v1's Splash, ported: its play button (Palette[7] triangle on Palette[0],
   * v1 showed it on iOS) with START under it in v1's header type; START plays v1's intro (panels sliding to
   * BLOKDUST), then the stage shows and takes input. `splash=1`: automated browsers skip it otherwise. */
  async 'start-button'(errors: string[]) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
    });
    await p.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.waitForTimeout(1200);
    const { PNG } = await import('pngjs');
    const pixel = async (x: number, y: number) => { const b = await p.screenshot({ clip: { x, y, width: 1, height: 1 } }); const png = PNG.sync.read(b); return [png.data[0], png.data[1], png.data[2]]; };
    const green = THEMES[0].colors[7].match(/\d+/g)!.slice(0, 3).map(Number);
    const triangle = await pixel(630, 400), start = await p.evaluate(() => (window as any).__texts.includes('START'));
    await p.screenshot({ path: `${OUT}/start-button.png` });
    await p.evaluate(() => { const g: number[] = ((window as any).__gaps = []); let last = performance.now(); const t0 = last;
      const sp = () => (window as any).__bd_probe.scene.splash;
      const f = (t: number) => { g.push(t - last); last = t; if (sp().ButtonOffset > 0 && !(window as any).__moved) (window as any).__moved = g.length; if (t - t0 < 1500) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.mouse.click(640, 400);
    await p.waitForTimeout(1500);
    const worstFrameMs = await p.evaluate(() => Math.round(Math.max(...(window as any).__gaps)));
    const worstMovingMs = await p.evaluate(() => Math.round(Math.max(...(window as any).__gaps.slice((window as any).__moved ?? 0))));
    const gapsAt = await p.evaluate(() => { let t = 0; return (window as any).__gaps.map((g: number) => [Math.round(t += g), Math.round(g)]).filter((x: number[]) => x[1] > 25); });
    const during = await p.evaluate(() => ({ held: !!document.getElementById('start'), title: (window as any).__texts.includes('BLOKDUST 2') }));  // the app's name (owner, 2026-11-14)
    await p.screenshot({ path: `${OUT}/start-intro.png` });
    await p.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 });
    await p.waitForTimeout(1000);
    const after = await p.evaluate(() => ({ started: (window as any).__bd_probe.state.started, rms: (window as any).__bd_probe.state.rms }));
    await p.screenshot({ path: `${OUT}/start-after.png` });
    const stageShows = (await pixel(640, 400)).join() !== '10,10,10';
    await p.close();
    const r = { triangle, green, start, during, after, stageShows, worstFrameMs, worstMovingMs, gapsAt };
    const ok = triangle.every((c, i) => Math.abs(c - green[i]) < 3) && start && during.held && during.title && after.started && after.rms > 0.01 && stageShows && worstMovingMs < 50;
    return [ok, r];
  },

  /** Owner (2026-11-12): START felt slow, seconds between the press and the intro. The intro starts on the press
   * (v1 Splash.MouseDown), not the release, and does not wait for the engine: the AudioContext, worklet and WASM are
   * prepared while the start screen shows. Holding the button down, the intro has begun within 100 ms; on release the
   * sound starts and the stage takes input as before. */
  async 'start-on-press'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.waitForTimeout(1000);
    await p.mouse.move(640, 400);
    await p.evaluate(() => { (window as any).__downAt = 0; addEventListener('pointerdown', () => { (window as any).__downAt = performance.now(); }, { capture: true, once: true }); });
    await p.mouse.down();
    const begun = await p.waitForFunction(() => { const s = (window as any).__bd_probe.scene.splash; return s && !s.IOSPause ? performance.now() - (window as any).__downAt : 0; }, null, { timeout: 5000 })
      .then(h => h.jsonValue() as Promise<number>).catch(() => -1);
    await p.waitForTimeout(500);  // v1 holds the button still for 300 ms, then slides it away
    const stillDown = await p.evaluate(() => (window as any).__bd_probe.scene.splash?.ButtonOffset ?? 0);
    await p.mouse.up();
    await p.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({ held: !!document.getElementById('start'), started: (window as any).__bd_probe.state.started, rms: (window as any).__bd_probe.state.rms }));
    await ctx.close();
    const r = { pressToIntroMs: Math.round(begun), buttonMovingWhileHeld: stillDown > 0, ...after };
    return [begun >= 0 && begun < 100 && r.buttonMovingWhileHeld && !after.held && after.started && after.rms > 0.01, r];
  },

  /** Owner (PR #1 review, 2026-11-12): a click or a touch while the intro plays skips it: the tweens stop, the splash
   * is cleared and the stage takes input at once (the full intro is ~3.5 s). Mouse: a click mid-intro. Touch: a tap
   * straight after START, which may land before the intro has begun (the engine is still starting): it skips too. */
  async 'splash-skip'(errors: string[]) {
    const run = async (touch: boolean) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: touch });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(`${url}/index.html?splash=1&v1=${comp([blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe); await p.waitForTimeout(1000);
      const t0 = Date.now();
      if (touch) { await p.touchscreen.tap(640, 400); await p.waitForTimeout(50); await p.touchscreen.tap(300, 200); }
      else { await p.mouse.click(640, 400); await p.waitForTimeout(700); await p.mouse.click(300, 200); }
      await p.waitForFunction(() => !document.getElementById('start'), null, { timeout: 10000 }).catch(() => {});
      const ms = Date.now() - t0;
      const st = await p.evaluate(() => { const sc = (window as any).__bd_probe.scene; return { drawing: sc.splashDrawing, splashing: sc.splashing,
        held: !!document.getElementById('start'), started: (window as any).__bd_probe.state.started, blocks: (window as any).__bd_probe.state.patch.blocks.length }; });
      await p.screenshot({ path: `${OUT}/splash-skip-${touch ? 'touch' : 'mouse'}.png` });
      await ctx.close();
      return { ms, ...st };
    };
    const mouse = await run(false), touch = await run(true);
    const good = (r: typeof mouse) => r.ms < 2000 && !r.drawing && !r.splashing && !r.held && r.started && r.blocks === 2;
    return [good(mouse) && good(touch), { mouse, touch }];
  },

  /** Owner (2026-11-11): deleting is undoable. Cmd/Ctrl+Z brings back a block deleted with Backspace, one dragged to
   * the trash, and a whole selection deleted at once: same type, place, id and settings, still connected (the tone
   * sounds again when its Power comes back). */
  async 'undo-delete'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3), blk(3, 'Filter', 8, -4), blk(4, 'Noise', 14, -4)], errors);
    const patch = () => p.evaluate(() => (window as any).__bd_probe.state.patch.blocks.map((b: any) => JSON.stringify([b.id, b.type, b.x, b.y, b.params])).sort()) as Promise<string[]>;
    const engineIds = () => p.evaluate(() => (window as any).__bd_probe.state.blocks.map((b: any) => [b.id, b.type])) as Promise<[number, string][]>;
    const idOf = async (type: string) => (await engineIds()).find(q => q[1] === type)![0];
    const at = (id: number) => p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const level = async () => { await p.waitForTimeout(1200); return p.evaluate(() => (window as any).__bd_probe.state.rms); };
    const undo = async () => { await p.mouse.move(640, 120); await p.keyboard.press('ControlOrMeta+z'); await p.waitForTimeout(300); };
    // A setting that must come back: the Filter's frequency.
    await p.evaluate(() => { const pr = (window as any).__bd_probe; const id = pr.state.blocks.find((b: any) => b.type === 'fx.filter').id; pr.scene.host.setParam(id, 'frequency', 1234); });
    const p0 = await patch(), sounding = await level();
    const r: Record<string, unknown> = { sounding };
    // 1. Click the Power, Backspace: gone, silent. Undo: back, sounding.
    { const [x, y] = await at(await idOf('power.power')); await p.mouse.click(x, y); await p.waitForTimeout(300); }
    await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
    r.backspace = { n: (await patch()).length, level: await level() };
    await undo();
    r.backspaceUndo = { same: JSON.stringify(await patch()) === JSON.stringify(p0), level: await level() };
    // 2. Drag the Filter to the trash. Undo.
    { const [x, y] = await at(await idOf('fx.filter')); await p.mouse.move(x, y); await p.mouse.down();
      for (let i = 1; i <= 14; i++) await p.mouse.move(x + (1250 - x) * i / 14, y + (770 - y) * i / 14);
      await p.mouse.up(); await p.waitForTimeout(300); }
    r.trash = (await patch()).length;
    await undo();
    r.trashUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // 3. Shift+click the Filter and the Noise, Delete: both gone. Undo: both back in one step.
    await p.keyboard.down('Shift');
    for (const t of ['fx.filter', 'source.noise']) { const [x, y] = await at(await idOf(t)); await p.mouse.click(x, y); await p.waitForTimeout(150); }
    await p.keyboard.up('Shift');
    await p.keyboard.press('Delete'); await p.waitForTimeout(300);
    r.group = (await patch()).length;
    await undo();
    r.groupUndo = JSON.stringify(await patch()) === JSON.stringify(p0);
    // Nothing left to undo: Cmd+Z does nothing.
    await undo();
    r.extra = (await patch()).length;
    await p.close();
    const ok = sounding > 0.01 && (r.backspace as any).n === 3 && (r.backspace as any).level < 0.001 && (r.backspaceUndo as any).same && (r.backspaceUndo as any).level > 0.01
      && r.trash === 3 && r.trashUndo && r.group === 2 && r.groupUndo && r.extra === 4;
    return [ok, r];
  },

  /** Owner (2026-11-12, CHG-0010): undo and redo for moving, duplicating (Cmd/Ctrl+D and Alt-drag) and deleting
   * blocks. Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z redoes; a new action clears what could be redone. */
  async 'undo-redo'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 2)], errors);
    const tones = () => p.evaluate(() => (window as any).__bd_probe.state.patch.blocks.filter((b: any) => b.type === 'source.tone').map((b: any) => [b.x, b.y]).sort()) as Promise<number[][]>;
    const firstId = () => p.evaluate(() => (window as any).__bd_probe.state.blocks.find((b: any) => b.type === 'source.tone').id) as Promise<number>;
    const at = (id: number) => p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const key = async (k: string) => { await p.mouse.move(640, 120); await p.keyboard.press(k); await p.waitForTimeout(300); };
    const r: Record<string, unknown> = {};
    // Move: drag the tone 6 cells right.
    { const [x, y] = await at(await firstId()), [x2] = await p.evaluate(() => (window as any).__bd_probe.toCss(0, 2));
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x2, y, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300); }
    r.moved = await tones();
    await key('ControlOrMeta+z'); r.moveUndo = await tones();
    await key('ControlOrMeta+Shift+z'); r.moveRedo = await tones();
    // Duplicate with Cmd/Ctrl+D (select it first).
    await p.keyboard.down('Shift'); { const [x, y] = await at(await firstId()); await p.mouse.click(x, y); } await p.keyboard.up('Shift');
    await p.waitForTimeout(200);
    await key('ControlOrMeta+d'); r.dup = (await tones()).length;
    await key('ControlOrMeta+z'); r.dupUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z'); r.dupRedo = (await tones()).length;
    await key('Escape');
    // Alt-drag a copy of the first tone.
    { const [x, y] = await at(await firstId());
      await p.keyboard.down('Alt'); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y + 150, { steps: 10 }); await p.mouse.up(); await p.keyboard.up('Alt'); await p.waitForTimeout(300); }
    r.alt = (await tones()).length;
    await key('ControlOrMeta+z'); r.altUndo = (await tones()).length;
    // Delete, undo, redo.
    { const [x, y] = await at(await firstId()); await p.mouse.click(x, y); await p.waitForTimeout(200); }
    await key('Backspace'); r.del = (await tones()).length;
    await key('ControlOrMeta+z'); r.delUndo = (await tones()).length;
    await key('ControlOrMeta+Shift+z'); r.delRedo = (await tones()).length;
    // A new action clears redo: undo the delete, move something, then redo does nothing.
    await key('ControlOrMeta+z');
    const before = await tones();
    { const [x, y] = await at(await firstId()); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300); }
    const afterMove = await tones();
    await key('ControlOrMeta+Shift+z'); r.redoCleared = JSON.stringify(await tones()) === JSON.stringify(afterMove) && JSON.stringify(afterMove) !== JSON.stringify(before);
    await p.close();
    const ok = JSON.stringify(r.moved) === '[[0,2]]' && JSON.stringify(r.moveUndo) === '[[-6,2]]' && JSON.stringify(r.moveRedo) === '[[0,2]]'
      && r.dup === 2 && r.dupUndo === 1 && r.dupRedo === 2 && r.alt === 3 && r.altUndo === 2
      && r.del === 1 && r.delUndo === 2 && r.delRedo === 1 && r.redoCleared === true;
    return [ok, r];
  },

  /** Owner (2026-11-12, CHG-0010): a patch keeps the view it was saved at (zoom and position, SPEC-PATCH-FORMAT-V2
   * R2 `view`), and opening it shows that view: links, files, the autosave and presets (the sequencers open zoomed
   * out). In the plugin the processor keeps the view with the DAW project. */
  async 'patch-view'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    const view = () => p.evaluate(() => { const a = (window as any).__bd_probe.v1App; return { zoom: +a.ZoomLevel.toFixed(3), x: +a.DragOffset.x.toFixed(3), y: +a.DragOffset.y.toFixed(3) }; });
    await p.evaluate(() => { const s = (window as any).__bd_probe.scene; s.pinchView(0.5, { x: 3, y: -2 }); s.host.setZoom(0.5); s.host.setDrag({ x: 3, y: -2 }); s.pinchEnd(); });
    await p.waitForTimeout(300);
    const saved = await p.evaluate(() => (window as any).__bd_probe.state.patch);
    // Reopened (as the autosave, a link or a file would be).
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(pt => { localStorage.setItem('blokdust2.autosave', pt); }, JSON.stringify(saved));
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
    await q.goto(`${url}/index.html`); await q.waitForFunction(() => (window as any).__bd_probe); await q.click('#start'); await q.waitForTimeout(1500);
    const reopened = await q.evaluate(() => { const a = (window as any).__bd_probe.v1App; return { zoom: +a.ZoomLevel.toFixed(3), x: +a.DragOffset.x.toFixed(3), y: +a.DragOffset.y.toFixed(3) }; });
    await ctx.close();
    // A preset with a view: Step Sequencer opens zoomed out.
    await openList(p); await rowButton(p, 'open', 'Step Sequencer', 300);
    if (await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View) === 'confirm') await patchesClick(p, 'openAnyway', 600);
    await p.waitForTimeout(800);
    const preset = await view();
    await p.close();
    // Plugin: the processor's patch carries a view; the page shows it, and reports a new view back (bd_view).
    const { pg, close } = await openPlugin({ format: 'blokdust.patch', version: 2, seed: 1, view: { x: -4, y: 1, zoom: 0.75 }, blocks: [{ id: 't', type: 'source.tone', x: 0, y: 0, params: {} }] }, errors);
    const plugin = await pg.evaluate(() => { const a = (window as any).__bd_probe.v1App; return { zoom: +a.ZoomLevel.toFixed(3), x: +a.DragOffset.x.toFixed(3), y: +a.DragOffset.y.toFixed(3) }; });
    await pg.evaluate(() => { const s = (window as any).__bd_probe.scene; s.pinchView(2, { x: 1, y: 1 }); s.host.setZoom(2); s.host.setDrag({ x: 1, y: 1 }); s.pinchEnd(); });
    await pg.waitForTimeout(1500);
    const reported = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_view').pop()?.v);
    await close();
    const ok = JSON.stringify(saved.view) === JSON.stringify({ x: 3, y: -2, zoom: 0.5 }) && JSON.stringify(reopened) === JSON.stringify({ zoom: 0.5, x: 3, y: -2 })
      && preset.zoom === 0.6 && JSON.stringify(plugin) === JSON.stringify({ zoom: 0.75, x: -4, y: 1 })
      && JSON.stringify(reported) === JSON.stringify({ x: 1, y: 1, zoom: 2 });
    return [ok, { saved: saved.view, reopened, preset, plugin, reported }];
  },

  /** Owner (2026-11-11): the power switch, bottom centre (v1's off/on switch). Off: nothing in the world powers
   * anything (a Power block's tone stops, particles vanish) and it reads POWER OFF on red; a held block still plays;
   * Space switches it back (web). */
  async 'power-switch'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -3, 3), blk(2, 'Power', -6, 3), blk(3, 'ParticleEmitter', 6, -4)], errors);
    await p.evaluate(() => {
      const seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
    });
    const level = async () => { await p.waitForTimeout(1200); return p.evaluate(() => (window as any).__bd_probe.state.rms); };
    const where = await p.evaluate(() => { const a = (window as any).__bd_probe.v1App, pr = a.Metrics.PixelRatio; return [a.Width / 2 / pr, (a.Height - 47 * a.Unit) / pr]; });
    const before = await level();
    await p.screenshot({ path: `${OUT}/power-on.png` });
    await p.mouse.move(where[0], where[1]); await p.mouse.click(where[0], where[1]);
    const off = await level(), particles = await p.evaluate(() => (window as any).__bd_probe.state.particles);
    const label = await p.evaluate(() => (window as any).__texts.includes('POWER OFF'));
    await p.screenshot({ path: `${OUT}/power-off.png` });
    const pt = await p.evaluate(() => (window as any).__bd_probe.blockPoint(1));
    await p.mouse.move(pt[0], pt[1]); await p.mouse.down(); const held = await level(); await p.mouse.up();
    await p.mouse.move(640, 200);
    await p.keyboard.press('Space');
    const back = await level(), on = await p.evaluate(() => (window as any).__bd_probe.scene.worldPower);
    await p.close();
    const ok = before > 0.01 && off < 0.001 && particles === 0 && label && held > 0.01 && back > 0.01 && on === true;
    return [ok, { before, off, particles, label, held, back, on }];
  },

  /** Owner (2026-11-13, CHG-0013): POWER OFF sat high in its red box. The letters are centred in it: the red above
   * and below them differs by at most one device pixel (at 1× and 2×). */
  async 'power-off-label-centred'(errors: string[]) {
    const { PNG } = await import('pngjs');
    const measure = async (dpr: number) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
      const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -3, 3)])}`);
      await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start'); await p.waitForTimeout(1500);
      await p.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
      const want = await p.evaluate(() => { const a = (window as any).__bd_probe.v1App, w = document.createElement('canvas').getContext('2d')!; w.fillStyle = a.Palette[a.ThemeManager.MenuOrder[3]]; w.fillRect(0, 0, 1, 1); return [...w.getImageData(0, 0, 1, 1).data.slice(0, 3)]; });
      await p.mouse.move(640, 300); await p.waitForTimeout(500);
      const png = PNG.sync.read(await p.screenshot({ clip: { x: 560, y: 690, width: 160, height: 60 } }));
      await p.screenshot({ path: `${OUT}/power-off-label-${dpr}x.png`, clip: { x: 560, y: 690, width: 160, height: 60 } });
      await ctx.close();
      // The red box: rows whose middle column is the box's red; the text: non-red pixels inside the box's columns.
      const px = (x: number, y: number) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
      const isRed = (c: number[]) => c.every((v, i) => Math.abs(v - want[i]) < 4);
      let left = -1, right = -1, top = -1, bottom = -1;
      for (let y = 0; y < png.height && top < 0; y++) for (let x = 0; x < png.width; x++) if (isRed(px(x, y))) { top = y; break; }
      if (top < 0) return null;
      for (let x = 0; x < png.width; x++) if (isRed(px(x, top))) { if (left < 0) left = x; right = x; }
      bottom = top; while (bottom + 1 < png.height && isRed(px(left, bottom + 1))) bottom++;
      let tTop = -1, tBottom = -1;
      // Text: the letters' solid pixels (cream: high green), not their anti-aliased edges.
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) if (px(x, y)[1] > 150) { if (tTop < 0) tTop = y; tBottom = y; break; }
      return { box: [top, bottom], text: [tTop, tBottom], above: tTop - top, below: bottom - tBottom };
    };
    const r1 = await measure(1), r2 = await measure(2);
    const ok = !!r1 && !!r2 && Math.abs(r1.above - r1.below) <= 1 && Math.abs(r2.above - r2.below) <= 1;
    return [ok, { '1x': r1, '2x': r2 }];
  },

  /** Owner (2026-11-13, CHG-0013): a scene with two Toggles set opposite (one on, one off), saved as a share link,
   * reopened with both the same. The engine flips a Toggle when a particle hits it, but the page's patch never heard,
   * so it saved whatever was set by hand. Now the patch follows the engine (as v1's Toggle kept Params.logic): it
   * changes with each hit, the autosave keeps it, and it doesn't count as an unsaved change. */
  async 'toggle-state-saved'(errors: string[]) {
    const patch = { format: 'blokdust.patch', version: 2, seed: 7, blocks: [
      { id: 'e1', type: 'power.emitter', x: -10, y: 0, params: { angle: 0, selfPoweredMode: true, rate: 60 } },
      { id: 'on', type: 'power.toggle', x: 0, y: 0, params: { logic: true } },
      { id: 'pad', type: 'source.tone', x: 0, y: 5, params: { waveform: 3, transpose: -12 } },
      { id: 'off', type: 'power.toggle', x: 0, y: -12, params: {} } ] };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(pt => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('blokdust2.autosave', pt); } }, JSON.stringify(patch));
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(`${url}/index.html`); await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start');
    const logic = (id: string) => p.evaluate(i => (window as any).__bd_probe.state.patch.blocks.find((b: any) => b.id === i).params.logic, id);
    const seen = new Set<string>();
    for (let t = 0; t < 6000 && seen.size < 2; t += 100) { seen.add(String(!!(await logic('on')))); await p.waitForTimeout(100); }
    // Freeze the world, then the patch, the panel's switch, the autosave and a reload all agree.
    await p.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
    await p.waitForTimeout(1600);
    const now = !!(await logic('on')), other = !!(await logic('off'));
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('blokdust2.autosave')!).blocks.find((b: any) => b.id === 'on').params.logic);
    await p.reload(); await p.waitForFunction(() => (window as any).__bd_probe?.state.patch);
    const reopened = !!(await logic('on'));  // before START: as saved
    await ctx.close();
    // Opened from a link (counted as saved), the flips are not unsaved changes.
    const { deflateRawSync } = await import('node:zlib');
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(patch))).toString('base64url');
    const q = await browser.newPage({ viewport: { width: 1280, height: 800 } }); q.on('pageerror', e => errors.push(e.message));
    await q.goto(`${url}/index.html?c=${token}`); await q.waitForFunction(() => (window as any).__bd_probe); await q.click('#start');
    await q.waitForFunction(() => !(window as any).__bd_probe.state.patch.blocks.find((b: any) => b.id === 'on').params.logic, null, { timeout: 6000 }).catch(() => {});
    const dirty = await q.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.host.isDirty());
    await q.close();
    const r = { seen: [...seen], now, other, saved, reopened, dirty };
    return [seen.size === 2 && !!saved === now && reopened === now && other === false && dirty === false, r];
  },

  /** Owner (2026-11-11): a trackpad pinch zooms smoothly about the pointer, as a pinch on a touch screen does. Chrome
   * and Firefox send it as wheel events with ctrlKey (CDP modifiers 2); Safari as gesture events. (A plain wheel zooms
   * too since CHG-0010: mouse-wheel-zoom.) */
  async 'trackpad-pinch'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const cdp = await p.context().newCDPSession(p);
    const zoom = () => p.evaluate(() => (window as any).__bd_probe.v1App.ZoomLevel) as Promise<number>;
    const cx = 900, cy = 300;
    // The grid point under the pointer: found from two grid points' css positions.
    const gridAt = async () => { const [ax, ay] = await toCss(p, 0, 0), [bx, by] = await toCss(p, 1, 1); return [(cx - ax) / (bx - ax), (cy - ay) / (by - ay)]; };
    const g0 = await gridAt(), z0 = await zoom();
    const pinchStep = (deltaY: number) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY, modifiers: 2 });
    for (let i = 0; i < 12; i++) { await pinchStep(-6); await p.waitForTimeout(16); }
    await p.waitForTimeout(100);
    const z1 = await zoom(), g1 = await gridAt();
    for (let i = 0; i < 30; i++) { await pinchStep(8); await p.waitForTimeout(16); }
    await p.waitForTimeout(400);
    const z2 = await zoom();
    const z3 = await zoom();
    // Safari (macOS): gesture events, no touches.
    await p.mouse.move(cx, cy);
    const z4a = await zoom();
    await p.evaluate(([x, y]) => {
      const st = document.getElementById('stage')!;
      const ev = (type: string, scale: number) => { const e = new Event(type, { bubbles: true, cancelable: true }) as any; e.scale = scale; e.clientX = x; e.clientY = y; st.dispatchEvent(e); };
      ev('gesturestart', 1); ev('gesturechange', 1.2); ev('gesturechange', 1.5); ev('gestureend', 1.5);
    }, [cx, cy]);
    await p.waitForTimeout(100);
    const z4 = await zoom();
    await p.close();
    const r = { z0, z1, anchor: [g0, g1], z2, z3, z4a, z4 };
    const ok = z1 > z0 * 1.3 && Math.abs(g0[0] - g1[0]) < 0.05 && Math.abs(g0[1] - g1[1]) < 0.05 && ![0.25, 0.5, 1, 2, 4].includes(z1)
      && z2 < z1 && z3 === z2 && Math.abs(z4 / z4a - 1.5) < 0.01;
    return [ok, r];
  },

  /** CHG-0010 (owner, 2026-11-12): the mouse wheel zooms like a pinch, smoothly about the pointer (the grid point under
   * it stays put), within v1's 0.25×–4×. A wheel over an open panel (Settings) leaves the stage's zoom alone. Owner
   * (2026-11-12): half a pinch's sensitivity, so one notch (deltaY 100, clamped to 25) is ×e^0.125 ≈ 1.13. */
  async 'mouse-wheel-zoom'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', -6, 0), blk(2, 'Filter', 6, 0)], errors);
    const zoom = () => p.evaluate(() => (window as any).__bd_probe.v1App.ZoomLevel) as Promise<number>;
    const cx = 900, cy = 300;
    const gridAt = async () => { const [ax, ay] = await toCss(p, 0, 0), [bx, by] = await toCss(p, 1, 1); return [(cx - ax) / (bx - ax), (cy - ay) / (by - ay)]; };
    await p.mouse.move(cx, cy);
    const g0 = await gridAt(), z0 = await zoom();
    await p.mouse.wheel(0, -100); await p.waitForTimeout(100);  // one notch towards you: in
    const zNotch = await zoom();
    for (let i = 0; i < 2; i++) { await p.mouse.wheel(0, -100); await p.waitForTimeout(30); }
    await p.waitForTimeout(100);
    const z1 = await zoom(), g1 = await gridAt();
    for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(10); }  // far out: stops at 0.25
    await p.waitForTimeout(400);
    const z2 = await zoom();
    // Settings open: the wheel is the panel's.
    for (let i = 0; i < 6 && !(await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open)); i++) { await p.mouse.click(1233, 45); await p.waitForTimeout(700); }
    await p.mouse.move(640, 400); await p.mouse.wheel(0, -100); await p.waitForTimeout(400);
    const z3 = await zoom();
    await p.close();
    const ok = Math.abs(zNotch / z0 - Math.exp(0.125)) < 0.01 && z1 > z0 * 1.3 && Math.abs(g0[0] - g1[0]) < 0.05 && Math.abs(g0[1] - g1[1]) < 0.05
      && Math.abs(z2 - 0.25) < 1e-6 && z3 === z2;
    return [ok, { z0, zNotch, z1, anchor: [g0, g1], z2, z3 }];
  },

  /** CHG-0010 (owner, 2026-11-12, "option B"): the Filter's panel is the EQ's graph with one handle and a TYPE row
   * (Peak, Low pass, High pass, Band pass). Choosing Low pass and dragging the handle to the left darkens a powered
   * Tone; the graph falls towards 20 kHz; the width bar shows for Peak and Band pass only. */
  async 'filter-types'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0), blk(2, 'Power', -3, 0), blk(3, 'Filter', 3, -1)], errors);
    const [fx, fy] = await toCss(p, 3, -1);
    await p.mouse.click(fx, fy); await p.waitForTimeout(1500);
    const panel = () => p.evaluate(() => {
      const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      const g = o.Options.find((x: any) => x.Type === 'parametric'), t = o.Options.find((x: any) => x.Type === 'buttons');
      const h = g?.Handles[1];
      return { types: o.Options.map((x: any) => x.Type), params: { ...o.SelectedBlock?.Params },
        buttons: t?.Buttons.map((b: any) => [(o.Position.x + o.Margin + b.Position.x + b.Size.width / 2) / pr, (o.Position.y + t.Position.y + t.Size.height / 2) / pr]),
        handle: h && [(o.Position.x + o.Margin + h.Position.x) / pr, (o.Position.y + g.Position.y + g.Size.height * 0.8 - h.Position.y) / pr],
        graphLeft: (o.Position.x + o.Margin) / pr, curve: g ? [g.LineGain[0], g.LineGain[g.Smoothness - 1]] : null,
        bar: g ? g.SubHandles[1].Draw.toString().length > 10 : null };
    });
    const peak = await panel();
    const before = await maxOver(p, 'rms', 600);
    await p.mouse.click(peak.buttons[1][0], peak.buttons[1][1]); await p.waitForTimeout(300);
    const lp = await panel();
    await p.mouse.move(lp.handle[0], lp.handle[1]); await p.mouse.down();
    await p.mouse.move(lp.graphLeft + 15, lp.handle[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(800);
    const dark = await panel(), after = await maxOver(p, 'rms', 600);
    await p.mouse.click(peak.buttons[3][0], peak.buttons[3][1]); await p.waitForTimeout(300);
    const bp = await panel();
    await p.screenshot({ path: `${OUT}/filter-types.png` });
    await p.close();
    const r = { types: peak.types, peakBar: peak.bar, lp: { type: lp.params.type, bar: lp.bar }, freq: dark.params.frequency, curve: dark.curve, before, after, bp: { type: bp.params.type, bar: bp.bar } };
    const ok = JSON.stringify(peak.types) === JSON.stringify(['parametric', 'buttons']) && peak.bar === true
      && lp.params.type === 1 && lp.bar === false && dark.params.frequency < 60 && dark.curve![1] < dark.curve![0]
      && after < before * 0.2 && bp.params.type === 3 && bp.bar === true;
    return [ok, r];
  },

  /** SPEC-CONNECTIONS-PROXIMITY R4a (owner, 2026-11-12): a source's effects run in the order they connected, as in
   * v1. Bit Crusher in first, then Stereo Delay: tone → crusher → delay. Crusher out: tone → delay. Crusher back in:
   * tone → delay → crusher. The patch saves that order (`connectionOrder`), and reopening it keeps it. */
  async 'effect-order'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0), blk(2, 'BitCrusher', 14, -8), blk(3, 'StereoDelay', -14, -8)], errors);
    const dragTo = async (gx: number, gy: number, tx: number, ty: number) => {
      const [x, y] = await toCss(p, gx, gy), [x2, y2] = await toCss(p, tx, ty);
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x2, y2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
    };
    const order = async () => {
      const s = await p.evaluate(() => { const st = (window as any).__bd_probe.state; return { order: st.patch.connectionOrder ?? [], types: Object.fromEntries(st.patch.blocks.map((b: any) => [b.id, b.type])) }; });
      return (s.order as [string, string][]).map(pr => pr.map(id => s.types[id].replace(/^(source|fx)\./, '')).join('+'));
    };
    await dragTo(14, -8, 3, 0);    // crusher in
    await dragTo(-14, -8, -3, 0);  // then delay
    const first = await order();
    await dragTo(3, 0, 14, 10);    // crusher out
    const out = await order();
    await dragTo(14, 10, 3, 0);    // and back
    const back = await order();
    const saved = await p.evaluate(() => (window as any).__bd_probe.state.patch);
    await p.close();
    // Reopen the saved patch in a new visit (the autosave): the engine replays the order.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(pt => { localStorage.setItem('blokdust2.autosave', pt); }, JSON.stringify(saved));
    const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
    await q.goto(`${url}/index.html`);
    await q.waitForFunction(() => (window as any).__bd_probe); await q.click('#start');
    await q.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await q.waitForTimeout(500);
    const reopened = await q.evaluate(() => (window as any).__bd_probe.state.patch.connectionOrder);  // from the engine's snapshots
    await ctx.close();
    const ok = JSON.stringify(first) === JSON.stringify(['tone+bit-crusher', 'tone+stereo-delay'])
      && JSON.stringify(out) === JSON.stringify(['tone+stereo-delay'])
      && JSON.stringify(back) === JSON.stringify(['tone+stereo-delay', 'tone+bit-crusher'])
      && JSON.stringify(reopened) === JSON.stringify(saved.connectionOrder);
    return [ok, { first, out, back, saved: saved.connectionOrder, reopened }];
  },

  /** CHG-0005 task 8 (owner): multi-touch. Each finger drags its own block (powered while held, drawn pressed); two
   * fingers on the stage pinch-zoom about their midpoint (which stays over the same spot) within v1's 0.25×–4×;
   * two fingers on two sliders of the open options panel move each its own. One finger behaves as before. */
  async 'multitouch'(errors: string[]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    // Distortion: an effect with two sliders (the Filter's became a graph in CHG-0010).
    await p.goto(`${url}/index.html?v1=${comp([blk(1, 'ToneSource', -12, 6), blk(2, 'ToneSource', 12, 6), blk(3, 'Distortion', 0, -4)])}`);
    await p.waitForFunction(() => (window as any).__bd_probe); await p.click('#start');
    await p.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10); await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const down = new Map<number, { x: number; y: number }>();
    const send = (type: string) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...down.entries()].map(([id, q]) => ({ id, x: q.x, y: q.y })) });
    const start = async (id: number, x: number, y: number) => { down.set(id, { x, y }); await send('touchStart'); await p.waitForTimeout(30); };
    const move = async (moves: [number, number, number][], steps = 8) => {
      const from = moves.map(([id]) => ({ ...down.get(id)! }));
      for (let i = 1; i <= steps; i++) { moves.forEach(([id, x, y], k) => down.set(id, { x: from[k].x + (x - from[k].x) * i / steps, y: from[k].y + (y - from[k].y) * i / steps })); await send('touchMove'); await p.waitForTimeout(16); }
    };
    const end = async (id: number) => { down.delete(id); await send(down.size ? 'touchMove' : 'touchEnd'); await p.waitForTimeout(60); };
    const endAll = async () => { down.clear(); await send('touchEnd'); await p.waitForTimeout(300); };
    const pos = () => p.evaluate(() => Object.fromEntries((window as any).__bd_probe.state.patch.blocks.map((b: any) => [b.id, [b.x, b.y]])));
    const at = (id: number) => p.evaluate(i => (window as any).__bd_probe.blockPoint(i), id) as Promise<[number, number]>;
    const view = () => p.evaluate(() => { const a = (window as any).__bd_probe.v1App; return { zoom: a.ZoomLevel, drag: { x: a.DragOffset.x, y: a.DragOffset.y } }; });
    const ids = Object.keys(await pos());  // tone, tone, distortion (patch ids)
    const eid = await p.evaluate(() => (window as any).__bd_probe.state.blocks.map((b: any) => b.id));  // engine ids, same order

    // 1. Two fingers, two blocks.
    const before = await pos();
    const [ax, ay] = await at(eid[0]), [bx, by] = await at(eid[1]);
    await start(1, ax, ay); await start(2, bx, by);
    const held = await p.evaluate(() => (window as any).__bd_touch());
    await move([[1, ax - 120, ay - 60], [2, bx + 120, by - 60]]);
    await endAll();
    const after = await pos();
    const moved = (id: string, dx: number) => Math.sign(after[id][0] - before[id][0]) === dx && after[id][1] < before[id][1];
    const twoBlocks = moved(ids[0], -1) && moved(ids[1], 1) && held.primaryRole === 'block' && held.extras[0]?.[1]?.kind === 'block';

    // 2. Pinch on the empty stage: spread to twice the distance → 2×, the midpoint keeps the same stage point.
    const v0 = await view(), probeAt = (x: number, y: number) => p.evaluate(([x, y]) => (window as any).__bd_probe.cssToGrid?.(x, y) ?? null, [x, y]);
    const mid0 = await probeAt(640, 560);
    await start(1, 590, 560); await start(2, 690, 560);
    await move([[1, 540, 560], [2, 740, 560]], 10);
    const pinched = await p.evaluate(() => (window as any).__bd_touch());
    await endAll();
    const v1 = await view(), mid1 = await probeAt(640, 560);
    await p.screenshot({ path: `${OUT}/multitouch-pinch.png` });
    await start(1, 440, 560); await start(2, 840, 560);
    await move([[1, 630, 560], [2, 650, 560]], 10);  // pinch right in: stops at 0.25×
    await endAll();
    const v2 = await view();
    const pinch = pinched.pinch && Math.abs(v1.zoom - 2 * v0.zoom) < 0.05 && (!mid0 || (Math.abs(mid0[0] - mid1[0]) < 0.2 && Math.abs(mid0[1] - mid1[1]) < 0.2)) && v2.zoom === 0.25;
    await p.evaluate(() => { const s = (window as any).__bd_probe.scene; s.pinchView(1, { x: 0, y: 0 }); s.host.setZoom(1); s.host.setDrag({ x: 0, y: 0 }); });
    await p.waitForTimeout(300);

    // 3. The Distortion's options panel: one finger on each of two sliders.
    const [fx, fy] = await at(eid[2]);
    await start(1, fx, fy); await end(1); await p.waitForTimeout(900);
    const rows = await p.evaluate(() => {
      const o = (window as any).__bd_probe.scene.OptionsPanel, pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return o.Options.map((opt: any, i: number) => ({ i, type: opt.Type, setting: opt.Setting, y: (o.Position.y + opt.Position.y + opt.Size.height / 2) / pr,
        x0: (o.Position.x + o.Margin) / pr, w: o.Range / pr, value: opt.Value })).filter((r: any) => r.type === 'slider');
    });
    const [r1, r2] = rows;
    await start(1, r1.x0 + r1.w * 0.5, r1.y); await start(2, r2.x0 + r2.w * 0.5, r2.y);
    await move([[1, r1.x0 + r1.w * 0.1, r1.y], [2, r2.x0 + r2.w * 0.9, r2.y]]);
    const sliders = await p.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Options.filter((o: any) => o.Type === 'slider').map((o: any) => o.Position.x / (window as any).__bd_probe.scene.OptionsPanel.Range));
    await p.screenshot({ path: `${OUT}/multitouch-sliders.png` });
    await endAll();
    const twoSliders = rows.length >= 2 && Math.abs(sliders[0] - 0.1) < 0.03 && Math.abs(sliders[1] - 0.9) < 0.03;
    await ctx.close();
    return [twoBlocks && pinch && twoSliders, { twoBlocks: { before, after, held }, pinch: { v0, v1, v2, mid0, mid1, pinched }, sliders: { rows: rows.map((r: any) => r.setting), sliders } }];
  },

  /** Owner (2026-11-10): a patch name keeps "+" and other symbols (v1's title field stripped punctuation, because the
   * title went into the link unescaped; the presets themselves are named "… + …"). */
  async 'patch-title-plus'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ToneSource', 0, 0)], errors);
    await openPatches(p);
    await p.evaluate(() => { const i = document.getElementById('patchTitleInput') as HTMLInputElement; i.value = ''; });
    await p.click('#patchTitleInput');
    await p.keyboard.type('Bass + Bells (2) & co.');
    const r = await p.evaluate(() => ({ field: (document.getElementById('patchTitleInput') as HTMLInputElement).value, title: (window as any).__bd_probe.scene.PatchesPanel.Title }));
    await p.close();
    return [r.field === 'Bass + Bells (2) & co.' && r.title === r.field, r];
  },

  /** Plugin: with a Computer Keyboard in the patch, its note keys are BlokDust's while the editor has the keys (not
   * passed on to the DAW, whose shortcuts would fire); without one, keys go on to the DAW (e.g. Logic's Musical
   * Typing for a MIDI Input). */
  async 'plugin-keys-capture'(errors: string[]) {
    const probe = (pg: Page) => pg.evaluate(() => {
      const e = new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z', bubbles: true, cancelable: true }));
      return e.defaultPrevented;
    });
    const a = await openPlugin(plugPatch([{ id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 }, { id: 't', type: 'source.tone', x: 0, y: 0 }]), errors);
    const withKeyboard = await probe(a.pg);
    await a.close();
    const b = await openPlugin(plugPatch([{ id: 'm', type: 'input.midi-controller', x: -3, y: 0 }, { id: 't', type: 'source.tone', x: 0, y: 0 }]), errors);
    const without = await probe(b.pg);
    await b.close();
    return [withKeyboard && !without, { preventedWithKeyboard: withKeyboard, preventedWithout: without }];
  },

  /** Owner (2026-11-13, CHG-0013): holding a key in the standalone app made macOS's "no one took that key" sound over
   * and over. The web view passes on every key the page doesn't cancel, and the page let key repeats through. Now a
   * note key's repeats are the page's too, and in the standalone app (no DAW to pass keys to) every plain key outside
   * a text field is; Cmd/Ctrl shortcuts still reach the menus. In a DAW, keys BlokDust doesn't use still reach it. */
  async 'plugin-key-repeat-no-beep'(errors: string[]) {
    const press = (pg: Page, code: string, key: string, more: KeyboardEventInit = {}) => pg.evaluate(([c, k, m]) => {
      const e = new KeyboardEvent('keydown', { code: c, key: k, bubbles: true, cancelable: true, ...m });
      document.body.dispatchEvent(e);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: k, bubbles: true, cancelable: true }));
      return e.defaultPrevented;
    }, [code, key, more] as const);
    const kb = [{ id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 }, { id: 't', type: 'source.tone', x: 0, y: 0 }];
    const daw = await openPlugin(plugPatch(kb), errors);
    const dawRepeat = await press(daw.pg, 'KeyZ', 'z', { repeat: true });
    await daw.close();
    const dawBare = await openPlugin(plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]), errors);
    const dawOther = await press(dawBare.pg, 'KeyA', 'a');
    await dawBare.close();
    const app = await openPlugin(plugPatch([{ id: 't', type: 'source.tone', x: 0, y: 0 }]), errors, undefined, true);
    const appLetter = await press(app.pg, 'KeyA', 'a'), appRepeat = await press(app.pg, 'KeyA', 'a', { repeat: true });
    const appArrow = await press(app.pg, 'ArrowUp', 'ArrowUp', { repeat: true }), appCmd = await press(app.pg, 'KeyQ', 'q', { metaKey: true });
    await app.close();
    const r = { dawRepeat, dawOther, appLetter, appRepeat, appArrow, appCmd };
    return [dawRepeat && !dawOther && appLetter && appRepeat && appArrow && !appCmd, r];
  },

  /** Plugin (Logic): the Convolver's panel waveform shows the spinning square while the processor loads its sound. */
  async 'plugin-convolver-spinner'(errors: string[]) {
    const { pg, close } = await openPlugin(plugPatch([{ id: 'c', type: 'fx.convolver', x: 0, y: 0 }]), errors);
    const id = (await state(pg)).blocks[0].id;
    const preview = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 5) * Math.exp(-i / 500));
    await pg.evaluate(([i, pv]) => (window as any).__fire('bd_sampleInfo', { id: i, loading: false, missing: false, duration: 2, preview: pv, track: 'freesound:1' }), [id, preview] as const);
    const [x, y] = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
    await pg.mouse.click(x, y); await pg.waitForTimeout(1200);
    await pg.evaluate(i => (window as any).__fire('bd_sampleInfo', { id: i, loading: true, missing: false }), id);
    await pg.waitForTimeout(200);
    const change = await maxChange(pg, await waveBox(pg), 300);
    await pg.screenshot({ path: `${OUT}/plugin-convolver-spinner.png` });
    await close();
    return [change > 40, { panelPixelChangeIn300ms: change }];
  },

  /** A Particle Emitter fires only while powered (Power, a Toggle that is on, a press, a key on a connected
   * keyboard); the demo's emitters are powered by Power blocks, not v1's hidden self-powered mode (owner). */
  async 'emitter-only-when-powered'(errors: string[]) {
    const alone = await open(browser, [blk(1, 'ParticleEmitter', 0, 0)], errors);
    const unpowered = await maxOver(alone, 'particles', 2500);
    await alone.close();
    const powered = await open(browser, [blk(1, 'ParticleEmitter', 0, 0), blk(2, 'Power', -3, 0)], errors);
    const withPower = await maxOver(powered, 'particles', 2500);
    await powered.close();
    const demo = JSON.parse(readFileSync('web/src/demo/demo.patch.json', 'utf8'));
    const selfPowered = demo.blocks.filter((b: any) => b.params?.selfPoweredMode).map((b: any) => b.id);
    return [unpowered === 0 && withPower > 0 && selfPowered.length === 0, { unpowered, withPower, demoSelfPowered: selfPowered }];
  },

  /** Owner (new in v2): while a sampler's options are open, its waveform shows where it is playing: a line per
   * sounding voice (Sample) and one per grain (Granular), moving as it plays. */
  async 'waveform-playheads'(errors: string[]) {
    cdn.seconds = 3;
    const p = await open(browser, [{ ...blk(1, 'Sample', 0, 0), Params: { loop: true } } as Block, blk(2, 'Power', -3, 0),
      blk(3, 'Granular', 12, 0), blk(4, 'Power', 9, 0)], errors);
    await p.waitForFunction(() => (window as any).__bd_probe.samples.filter((x: any) => x.loaded).length === 2, null, { timeout: 10000 });
    const lines = () => p.evaluate(() => (window as any).__bd_probe.scene.playheadLines()?.xs ?? null);
    const look = async (gx: number, shot: string) => {
      const [x, y] = await toCss(p, gx, 0.5);
      await p.mouse.click(x, y); await p.waitForTimeout(1200);
      const a = await lines(); await p.waitForTimeout(300); const b = await lines();
      await p.screenshot({ path: `${OUT}/${shot}.png` });
      await p.mouse.click(1100, 720); await p.waitForTimeout(700);
      return { a, b };
    };
    const sample = await look(0, 'waveform-playheads-sample');
    const granular = await look(12, 'waveform-playheads-granular');
    await p.close();
    const moved = (r: { a: number[] | null; b: number[] | null }) => !!r.a && !!r.b && JSON.stringify(r.a) !== JSON.stringify(r.b);
    const ok = sample.a?.length === 1 && moved(sample) && (granular.a?.length ?? 0) >= 1 && moved(granular);
    return [ok, { sample, granular }];
  },

  /** Plugin (Logic): the Recorder's button records in the processor (the page has no audio there), and stopping
   * hands the take over; SampleGen's generated sound goes to the processor (which saves it as a file), and a SampleGen
   * whose sound is already a file is not generated again. */
  async 'plugin-recorder-samplegen'(errors: string[]) {
    const { pg, close } = await openPlugin(plugPatch([{ id: 'r', type: 'source.recorder', x: 6, y: 4 },
      { id: 'g', type: 'source.sample-gen', x: -6, y: 0 }, { id: 'h', type: 'source.sample-gen', x: -6, y: 6, params: { track: 'file:BlokDust SampleGen.wav' } }]), errors);
    await pg.waitForTimeout(500);
    const ids = (await state(pg)).blocks.map((b: any) => b.id);
    const [bx, by] = await toCss(pg, 6, 4), [, gy1] = await toCss(pg, 6, 5), grid = gy1 - by;
    await pg.mouse.click(bx, by - 3 * grid); await pg.waitForTimeout(600);
    await pg.mouse.click(bx, by - 3 * grid); await pg.waitForTimeout(300);
    const sent = await pg.evaluate(() => (window as any).__sent.map((x: any) => ({ id: x.id, v: x.id === 'bd_sampleData' ? { id: x.v.id, n: x.v.data.length, sr: x.v.sampleRate } : x.v })));
    await close();
    const rec = sent.filter((x: any) => x.id === 'bd_record').map((x: any) => x.v);
    const gen = sent.filter((x: any) => x.id === 'bd_sampleData').map((x: any) => x.v);
    const ok = rec.length === 2 && rec[0].on === true && rec[1].on === false && rec[0].id === ids[0] &&
      gen.length === 1 && gen[0].id === ids[1] && gen[0].n > 1000 && gen[0].sr > 8000;
    return [ok, { record: rec, generated: gen }];
  },
} as Record<string, (errors: string[]) => Promise<[boolean, unknown]>>);

// ---- Owner review 2 of Phase 3 (2026-11-08): Ableton ----
Object.assign(tests, {
  /** Audio Input (plugin label of v1's Microphone) and Audio In have one Gain row (dB, −40 = off, up to +6); v1's
   * Microphone had no options. The param is a ratio (1 = unity, a true bypass in the plugins). */
  async 'input-gain-option'(errors: string[]) {
    const { pg, close } = await openPlugin(plugPatch([{ id: 'in', type: 'source.audio-in', x: 0, y: 0 }, { id: 'mic', type: 'source.microphone', x: 8, y: 0 }]), errors);
    const out: Record<string, unknown> = {};
    for (const type of ['source.audio-in', 'source.microphone']) {
      const id = (await state(pg)).blocks.find((b: any) => b.type === type).id;
      const pt = await pg.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
      await pg.mouse.click(pt[0], pt[1]); await pg.waitForTimeout(1000);
      const panel = await pg.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel;
        return { open: o.Scale > 0, name: o.Name ?? o.SelectedBlock?.OptionsForm?.name, rows: o.Options.map((q: any) => q.Name) }; });
      await pg.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('gainDb', -6));
      await pg.waitForTimeout(200);
      const gain = (await state(pg)).patch.blocks.find((b: any) => b.type === type).params.gain;
      const sentGain = await pg.evaluate(([i]) => (window as any).__sent.filter((x: any) => x.id === 'bd_commands').flatMap((x: any) => x.v.commands)
        .some((c: any) => c.id === i && c.param === 0 && Math.abs(c.value - 0.501) < 0.001), [id]);
      out[type] = { ...panel, gain, sentGain };
      await pg.mouse.click(1100, 700); await pg.waitForTimeout(600);
    }
    await close();
    const ok = Object.values(out).every((o: any) => o.open && o.rows.length === 1 && o.rows[0] === 'Gain' && Math.abs(o.gain - 0.501) < 0.001 && o.sentGain);
    return [ok, out];
  },

  /** Ableton: holding a computer key and clicking into the DAW left the note stuck (the web view never saw the key-up
   * and, in a plugin window, no blur either). The editor tells the page when its window loses the keys (bd_keysLost)
   * and the page ends every held note. */
  async 'plugin-keys-lost'(errors: string[]) {
    const { pg, close } = await openPlugin(plugPatch([{ id: 'k', type: 'input.computer-keyboard', x: -3, y: 0 }, { id: 't', type: 'source.tone', x: 0, y: 0 }]), errors);
    await pg.mouse.click(1100, 700); await pg.waitForTimeout(300);
    await pg.keyboard.down('KeyZ'); await pg.waitForTimeout(200);
    await pg.evaluate(() => (window as any).__fire('bd_keysLost', {}));
    await pg.waitForTimeout(200);
    const notes = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_commands').flatMap((x: any) => x.v.commands)
      .filter((c: any) => c.type === 4 || c.type === 5).map((c: any) => `${c.type === 4 ? 'on' : 'off'}:${c.param}`));
    await pg.keyboard.up('KeyZ'); await pg.waitForTimeout(100);
    await close();
    return [notes.length === 2 && notes[0] === 'on:48' && notes[1] === 'off:48', { notes }];
  },

  /** Ableton: an FX instance lost its connection lines for good (reload didn't help). After blocks are deleted the
   * processor's engine ids are no longer 1..N, but a reopened (or reloaded) editor numbered the patch's blocks 1..N:
   * the engine's connections then named the wrong blocks, and the page's commands moved the wrong ones. The editor
   * now sends the engine's ids with the patch and the page uses them. */
  async 'plugin-reopen-keeps-ids'(errors: string[]) {
    const patch = plugPatch([{ id: 'kb', type: 'input.midi-controller', x: 8, y: 0 }, { id: 'tone', type: 'source.tone', x: 11, y: 0 }]);
    const { pg, close } = await openPlugin(patch, errors, { kb: 4, tone: 7 });
    const ids = (await state(pg)).blocks.map((b: any) => b.id).sort();
    await pg.evaluate(() => (window as any).__fire('bd_snapshot', { particles: [], connections: [4, 7], powered: [], beams: [], playheads: [] }));
    await pg.waitForTimeout(300);
    const fresh = await pg.evaluate(() => { const s = (window as any).__bd_probe.scene; return s.host.createBlock('ToneSource', 0, -8); });
    await pg.mouse.up(); await pg.waitForTimeout(300);
    const added = await pg.evaluate(() => (window as any).__sent.filter((x: any) => x.id === 'bd_commands').flatMap((x: any) => x.v.commands).filter((c: any) => c.type === 0).map((c: any) => c.id));
    await close();
    return [ids.join() === '4,7' && added.length === 1 && added[0] === 8, { ids, added, fresh }];
  },

  /** Owner idea: keyboards connect to Emitters and Lasers; a held key powers them, its note aims them (C = 12 o'clock). */
  async 'keyboard-powers-emitter'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ParticleEmitter', 0, 0)], errors);
    await p.waitForTimeout(500);
    const linked = (await state(p)).connections as number[];
    const before = await maxOver(p, 'particles', 600);
    await p.keyboard.down('KeyC');  // E3: 4 o'clock
    const held = await maxOver(p, 'particles', 800);
    await p.keyboard.up('KeyC');
    await p.waitForTimeout(3000);
    const after = await maxOver(p, 'particles', 1500);
    await p.close();
    return [linked.length === 2 && before === 0 && held > 0 && after === 0, { linked, before, held, after }];
  },
  // Owner (CHG-0009): holding one key and pressing another (legato) fired no particle; every key pressed fires one.
  async 'keyboard-legato-fires-emitter'(errors: string[]) {
    const p = await open(browser, [blk(1, 'ComputerKeyboard', -3, 0), blk(2, 'ParticleEmitter', 0, 0)], errors);
    await p.waitForTimeout(500);
    await p.keyboard.down('KeyZ');  // C3: 12 o'clock
    await p.waitForTimeout(400);
    const first = (await state(p)).particles;
    await p.keyboard.down('KeyC');  // E3 with C3 still held
    await p.waitForTimeout(400);
    const second = (await state(p)).particles;
    await p.keyboard.up('KeyC'); await p.keyboard.up('KeyZ');
    await p.close();
    return [first === 1 && second === 2, { first, second }];
  },
  // Owner (CHG-0009): a polyphonic keyboard's chord fires one particle per key, together.
  async 'keyboard-poly-chord-fires-emitter'(errors: string[]) {
    const p = await open(browser, [{ ...blk(1, 'ComputerKeyboard', -3, 0), Params: { isPolyphonic: true } } as Block, blk(2, 'ParticleEmitter', 0, 0)], errors);
    await p.waitForTimeout(500);
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.down(k);  // C3, E3, G3
    await p.waitForTimeout(400);
    const chord = (await state(p)).particles;
    for (const k of ['KeyZ', 'KeyC', 'KeyB']) await p.keyboard.up(k);
    await p.close();
    return [chord === 3, { chord }];
  },
  // Owner (2026-11-14): every block menu category lists its blocks alphabetically (v1's and the new ones mixed).
  async 'menus-alphabetical'(errors: string[]) {
    const p = await open(browser, [], errors);
    const cats = await p.evaluate(() => ((window as any).__bd_probe.scene.Header.MenuItems as any[]).map(c => (c.Items as any[]).map(i => String(i.Name))));
    await p.close();
    const sorted = cats.map(c => [...c].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    return [cats.length >= 4 && cats.every((c, i) => c.length > 1 && c.join() === sorted[i].join()), { cats }];
  },
  // Owner (2026-11-14): the Freesound results show each sound's length after its author ("By User · 1:05").
  async 'freesound-results-show-length'(errors: string[]) {
    const p = await open(browser, [blk(1, 'Sample', 0, 0)], errors);
    const [x, y] = await toCss(p, 0, 0);
    await p.mouse.click(x + 8, y + 8); await p.waitForTimeout(1000);  // the block: its options panel
    await p.evaluate(() => {
      const s = (window as any).__bd_probe.scene, seen: string[] = ((window as any).__texts = []);
      const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); };
      const sound = (id: number, name: string, username: string, duration: number) => ({ provider: 'freesound', id, name, username, duration, license: 'CC0',
        licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/', preview: `https://cdn.freesound.org/previews/${id}.mp3`, url: `https://freesound.org/s/${id}/` });
      s.host.searchSamples = () => Promise.resolve([sound(1, 'Short hit', 'alice', 0.4), sound(2, 'Long pad', 'bob', 65.2)]);
      s.OptionsPanel.SelectedBlock.SearchString = 'pad';
      s.SoundcloudPanel.OpenPanel();
      s.SoundcloudPanel.Submit();
    });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ open: (window as any).__bd_probe.scene.SoundcloudPanel.Open, texts: [...new Set(((window as any).__texts as string[]).filter(t => /^By /.test(t)))] }));
    await p.screenshot({ path: `${OUT}/freesound-results-show-length.png` });
    await p.close();
    return [r.open && r.texts.includes('By Alice · 0:01') && r.texts.includes('By Bob · 1:05'), r];
  },
  // Owner (2026-11-14): Looping off still showed the loop markers on a Sample's waveform, and on again a Recorder's
  // showed only Start and End: the panel was not drawn again when the switch changed (v1 Sample.SetParam('loop') is).
  async 'looping-switch-redraws-waveform'(errors: string[]) {
    const r: Record<string, unknown> = {};
    for (const type of ['Sample', 'Recorder']) {
      const p = await open(browser, [blk(1, type, 0, 0)], errors);
      const [x, y] = await toCss(p, 0, 0);
      await p.mouse.click(x + 8, y + 8); await p.waitForTimeout(1000);
      const mode = () => p.evaluate(() => { const o = (window as any).__bd_probe.scene.OptionsPanel; return { loop: !!o.SelectedBlock.Params.loop, mode: !!(o.Options as any[]).find(x => x.Type === 'waveregion')?.Mode }; });
      const seen = [await mode()];
      for (const v of [false, true, false]) { await p.evaluate(on => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock.SetParam('loop', on), v); await p.waitForTimeout(200); seen.push(await mode()); }
      await p.close();
      r[type] = seen;
    }
    const ok = (seen: any[]) => seen.every(s => s.loop === s.mode) && seen.map(s => s.loop).join() === [seen[0].loop, false, true, false].join();
    return [ok(r.Sample as any[]) && ok(r.Recorder as any[]), r];
  },
} as Record<string, (errors: string[]) => Promise<[boolean, unknown]>>);

/** Bugs captured but not fixed yet: reported as KNOWN (not failing CI) with the reason; a pass says to remove it. */
const KNOWN: Record<string, string> = {
};

try {
  for (const [name, run] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    const errors: string[] = [];
    let pass = false, detail: unknown;
    try { [pass, detail] = await run(errors); } catch (e) { detail = String(e); }
    if (errors.length) { pass = false; detail = { detail, pageErrors: errors }; }
    const known = KNOWN[name];
    results[name] = pass ? (known ? 'PASS (known failure now passes: remove it from KNOWN)' : true) : known ? `KNOWN ${known}` : `FAIL ${JSON.stringify(detail)}`;
    ok &&= pass || !!known;
    console.error(`${pass ? 'pass' : known ? 'KNOWN' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
  }
} finally {
  await browser.close(); server.close();
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (!ok) process.exit(1);
