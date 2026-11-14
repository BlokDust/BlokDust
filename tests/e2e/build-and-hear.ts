// CHG-0002 acceptance: build a patch with v1's own UI and hear it, as a user would (real pointer, real AudioWorklet).
// Empty stage → Source menu → drag Tone out → Power menu → drag Power next to it → sound; options panel slider →
// param changes; reload → autosave restores; Share panel link → fresh browser → same patch; a local file → Sample.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { serveDist } from './serve.ts';

const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const checks: Record<string, unknown> = {};
let ok = true;
const check = (name: string, pass: boolean, detail: unknown = '') => { checks[name] = pass ? (detail === '' ? true : detail) : `FAIL ${JSON.stringify(detail)}`; ok &&= pass; };
const state = (p: Page) => p.evaluate(() => (window as any).__bd_probe.state);
const empty = encodeURIComponent(JSON.stringify({ Composition: [], ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, ColorThemeNo: 0 }));
/** Where the open category's item `name` is drawn, in css px (the menus page once they hold enough blocks). */
const itemAt = (p: Page, name: string) => p.evaluate(n => {
  const P = (window as any).__bd_probe, pr = P.v1App.Metrics.PixelRatio;
  for (const cat of P.scene.Header.MenuItems) for (const it of cat.Items) if (String(it.Name).toLowerCase() === n.toLowerCase()) return [it.Position.x / pr, 180] as [number, number];
  return null;
}, name);
const dragOut = async (p: Page, category: [number, number], name: string, to: [number, number]) => {
  await p.mouse.click(...category); await p.waitForTimeout(700);
  const item = await itemAt(p, name);
  if (!item) throw new Error(`no menu item ${name}`);
  await p.mouse.move(...item); await p.mouse.down();
  await p.mouse.move(item[0], 400, { steps: 6 }); await p.mouse.move(...to, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(500);
};
const rmsOver = async (p: Page, ms: number) => {
  let max = 0;
  for (let t = 0; t < ms; t += 100) { max = Math.max(max, (await state(p)).rms); await p.waitForTimeout(100); }
  return max;
};

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${url}/index.html?v1=${empty}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  check('starts silent and empty', (await state(page)).blocks.length === 0 && (await rmsOver(page, 400)) < 1e-4);

  await dragOut(page, [421, 45], 'Tone', [640, 450]);   // SOURCE → Tone
  await dragOut(page, [692, 45], 'Power', [572, 450]);   // POWER → Power, 3 cells left of the Tone
  const s1 = await state(page);
  check('menus created Tone and Power', s1.patch.blocks.map((b: any) => b.type).sort().join() === 'power.power,source.tone', s1.patch.blocks.map((b: any) => b.type));
  check('Power next to Tone connects', s1.connections.length / 2 >= 1, s1.connections.length / 2);
  const loud = await rmsOver(page, 800);
  check('powered Tone is heard', loud > 0.005, +loud.toFixed(4));

  // Options panel: click the Tone, drag the Note slider to the right → transpose rises.
  const tone = s1.patch.blocks.find((b: any) => b.type === 'source.tone');
  const [tx, ty] = await page.evaluate(([x, y]) => (window as any).__bd_probe.toCss(x, y), [tone.x, tone.y + 0.2]);
  await page.mouse.click(tx, ty); await page.waitForTimeout(1200);
  const panelOpen = await page.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.Scale === 1);
  check('options panel opens', panelOpen);
  await page.mouse.move(780, 407); await page.mouse.down(); await page.mouse.move(905, 407, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(500);
  const transpose = (await state(page)).patch.blocks.find((b: any) => b.type === 'source.tone').params.transpose;
  check('slider sets the param', typeof transpose === 'number' && transpose > 0, transpose);
  mkdirSync('tests/visual/output', { recursive: true });
  await page.screenshot({ path: 'tests/visual/output/build-and-hear.png' });

  // Reload: autosave restores the patch.
  const before = JSON.stringify((await state(page)).patch.blocks);
  await page.waitForTimeout(500);
  await page.goto(`${url}/index.html`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  check('reload restores the patch (autosave)', JSON.stringify((await state(page)).patch.blocks) === before);
  await page.click('#start'); await page.waitForTimeout(500);

  // Share: header › PATCHES › CREATE SHARE LINK (CHG-0005) → its link field holds ?c=<patch> → a fresh browser opens
  // the same patch.
  await page.mouse.click(1138, 45); await page.waitForTimeout(1500);
  const [sx, sy] = await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.centreOf('share'));
  await page.mouse.move(sx, sy); await page.mouse.click(sx, sy); await page.waitForTimeout(2500);
  const shareUrl = await page.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value.trim());
  check('share panel shows a link', /[?&]c=p/.test(shareUrl), shareUrl.slice(0, 60));
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const other = await fresh.newPage();
  await other.goto(shareUrl.replace(/^https?:\/\/[^/]+/, url));
  await other.waitForFunction(() => (window as any).__bd_probe);
  check('share link opens the same patch elsewhere', JSON.stringify((await state(other)).patch.blocks) === before);
  await fresh.close();

  // Sample from a local file (generated WAV), next to a Power block.
  const page2 = await ctx.newPage();
  page2.on('pageerror', e => errors.push(e.message));
  const comp = encodeURIComponent(JSON.stringify({ Composition: [{ Id: 1, Type: 'Sample', Position: { x: 0, y: 0 } }, { Id: 2, Type: 'Power', Position: { x: -3, y: 0 } }] }));
  await page2.goto(`${url}/index.html?v1=${comp}`);
  await page2.waitForFunction(() => (window as any).__bd_probe);
  await page2.click('#start');
  await page2.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  const wav = (() => {  // 1 s, 220 Hz sine, 16-bit mono 44.1 kHz
    const n = 44100, b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
    return [...b];
  })();
  const id = (await state(page2)).blocks.find((b: any) => b.type === 'source.sample').id;
  await page2.evaluate(([i, bytes]) => (window as any).__bd_loadSample(i, 'sine.wav', new Uint8Array(bytes).buffer), [id, wav] as const);
  const sampleRms = await rmsOver(page2, 800);
  check('a local file plays in a powered Sample', sampleRms > 0.005, +sampleRms.toFixed(4));
  check('no page errors', errors.length === 0, errors);
} finally {
  await browser.close(); server.close();
}
writeFileSync('tests/visual/output/build-and-hear.json', JSON.stringify(checks, null, 2));
console.log(JSON.stringify(checks));
if (!ok) process.exit(1);
