// CHG-0002 acceptance: build a patch with v1's UI and hear it (real pointer and AudioWorklet): Tone
// and Power from the menus sound; a slider sets a param; autosave, share links, local files work.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { serveDist } from './serve.ts';
import { steadySineWav } from './steadySine.ts';

const { url, server } = await serveDist();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const checks: Record<string, unknown> = {};
const failed: string[] = [];
const check = (name: string, pass: boolean, detail: unknown = '') => {
  checks[name] = pass ? (detail === '' ? true : detail) : `FAIL ${JSON.stringify(detail)}`;
  if (!pass) failed.push(name);
};
const state = (page: Page) => page.evaluate(() => window.__bd_probe.state);
const empty = encodeURIComponent(
  JSON.stringify({ Composition: [], ZoomLevel: 1, DragOffset: { x: 0, y: 0 }, ColorThemeNo: 0 }),
);
/** Where the open category's item `name` is drawn, in css px (menus page when they are full). */
const itemAt = (page: Page, name: string) =>
  page.evaluate((itemName) => {
    const probe = window.__bd_probe,
      pixelRatio = probe.v1App.Metrics.PixelRatio;
    for (const category of probe.scene.Header.MenuItems)
      for (const item of category.Items)
        if (item.Name.toLowerCase() === itemName.toLowerCase())
          return [item.Position.x / pixelRatio, 180] as [number, number];
    return null;
  }, name);
const dragOut = async (
  page: Page,
  category: [number, number],
  name: string,
  to: [number, number],
) => {
  await page.mouse.click(...category);
  await page.waitForTimeout(700);
  let item = await itemAt(page, name);
  // The menus page: turn pages with the right arrow until the item shows.
  for (let i = 0; i < 6 && item && item[0] > 1280 - 60; i++) {
    await page.mouse.click(1265, 180);
    await page.waitForTimeout(800);
    item = await itemAt(page, name);
  }
  if (!item) throw new Error(`no menu item ${name}`);
  await page.mouse.move(...item);
  await page.mouse.down();
  await page.mouse.move(item[0], 400, { steps: 6 });
  await page.mouse.move(...to, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(500);
};
/** The loudest level over `ms` milliseconds. */
const rmsOver = async (page: Page, ms: number) => {
  let max = 0;
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    max = Math.max(max, (await state(page)).rms);
    await page.waitForTimeout(100);
  }
  return max;
};

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}/index.html?v1=${empty}`);
  await page.waitForFunction(() => window.__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
  check(
    'starts silent and empty',
    (await state(page)).blocks.length === 0 && (await rmsOver(page, 400)) < 1e-4,
  );

  // SOURCE › Tone, then POWER › Power, 3 cells left of the Tone.
  await dragOut(page, [421, 45], 'Tone', [640, 450]);
  await dragOut(page, [692, 45], 'Power', [572, 450]);
  const built = await state(page);
  check(
    'menus created Tone and Power',
    built.patch.blocks
      .map((block) => block.type)
      .sort()
      .join() === 'power.power,source.tone',
    built.patch.blocks.map((block) => block.type),
  );
  check(
    'Power next to Tone connects',
    built.connections.length / 2 >= 1,
    built.connections.length / 2,
  );
  const loud = await rmsOver(page, 800);
  check('powered Tone is heard', loud > 0.005, +loud.toFixed(4));

  // Options panel: click the Tone, drag the Note slider to the right → transpose rises.
  const tone = built.patch.blocks.find((block) => block.type === 'source.tone');
  if (!tone) throw new Error('no Tone in the patch');
  const [tx, ty] = await page.evaluate(
    ([x, y]) => window.__bd_probe.toCss(x, y),
    [tone.x ?? 0, (tone.y ?? 0) + 0.2],
  );
  await page.mouse.click(tx, ty);
  await page.waitForTimeout(1200);
  const panelOpen = await page.evaluate(() => window.__bd_probe.scene.OptionsPanel.Scale === 1);
  check('options panel opens', panelOpen);
  await page.mouse.move(780, 407);
  await page.mouse.down();
  await page.mouse.move(905, 407, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const transpose = (await state(page)).patch.blocks.find((block) => block.type === 'source.tone')
    ?.params?.transpose;
  check('slider sets the param', typeof transpose === 'number' && transpose > 0, transpose);
  mkdirSync('tests/visual/output', { recursive: true });
  await page.screenshot({ path: 'tests/visual/output/build-and-hear.png' });

  // Reload: autosave restores the patch.
  const before = JSON.stringify((await state(page)).patch.blocks);
  await page.waitForTimeout(500);
  await page.goto(`${url}/index.html`);
  await page.waitForFunction(() => window.__bd_probe);
  check(
    'reload restores the patch (autosave)',
    JSON.stringify((await state(page)).patch.blocks) === before,
  );
  await page.click('#start');
  await page.waitForTimeout(500);

  // Share (CHG-0005): header › PATCHES › CREATE SHARE LINK puts ?c=<patch> in its link field; a
  // fresh browser opens the same patch.
  await page.mouse.click(1138, 45);
  await page.waitForTimeout(1500);
  const shareCentre = await page.evaluate(() =>
    window.__bd_probe.scene.PatchesPanel.centreOf('share'),
  );
  if (!shareCentre) throw new Error('no share button in Patches');
  const [sx, sy] = shareCentre;
  await page.mouse.move(sx, sy);
  await page.mouse.click(sx, sy);
  await page.waitForTimeout(2500);
  const shareUrl = await page.evaluate(() =>
    (document.getElementById('patchUrlText') as HTMLInputElement).value.trim(),
  );
  check('share panel shows a link', /[?&]c=p/.test(shareUrl), shareUrl.slice(0, 60));
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const other = await fresh.newPage();
  await other.goto(shareUrl.replace(/^https?:\/\/[^/]+/, url));
  await other.waitForFunction(() => window.__bd_probe);
  check(
    'share link opens the same patch elsewhere',
    JSON.stringify((await state(other)).patch.blocks) === before,
  );
  await fresh.close();

  // Sample from a local file (generated WAV), next to a Power block.
  const page2 = await ctx.newPage();
  page2.on('pageerror', (error) => errors.push(error.message));
  const comp = encodeURIComponent(
    JSON.stringify({
      Composition: [
        { Id: 1, Type: 'Sample', Position: { x: 0, y: 0 } },
        { Id: 2, Type: 'Power', Position: { x: -3, y: 0 } },
      ],
    }),
  );
  await page2.goto(`${url}/index.html?v1=${comp}`);
  await page2.waitForFunction(() => window.__bd_probe);
  await page2.click('#start');
  await page2.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
  const wav = steadySineWav();
  const sample = (await state(page2)).blocks.find((block) => block.type === 'source.sample');
  if (!sample) throw new Error('no Sample block');
  const id = sample.id;
  await page2.evaluate(
    ([sampleId, bytes]) =>
      window.__bd_loadSample(sampleId, 'sine.wav', new Uint8Array(bytes).buffer),
    [id, wav] as const,
  );
  const sampleRms = await rmsOver(page2, 800);
  check('a local file plays in a powered Sample', sampleRms > 0.005, +sampleRms.toFixed(4));
  check('no page errors', errors.length === 0, errors);
} finally {
  await browser.close();
  server.close();
}
writeFileSync('tests/visual/output/build-and-hear.json', JSON.stringify(checks, null, 2));
console.log(JSON.stringify(checks));
if (failed.length) process.exit(1);
