// The harness the post-2.0 block tests share (tests/e2e/new-blocks.ts and its groups here): the built app served, one
// browser, and helpers to open a patch, its panels and its rows.
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from '../serve.ts';
import { encodePatch } from '../../../web/src/patch/share.ts';
import type { Patch, PatchBlock } from '../../../web/src/patch/loadPatch.ts';

export type Tests = Record<string, (errors: string[]) => Promise<[boolean, unknown]>>;

export const OUT = 'tests/visual/output/new-blocks';
mkdirSync(OUT, { recursive: true });
export const { url, server } = await serveDist();
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

export const blk = (
  id: string,
  type: string,
  x: number,
  y: number,
  params: Record<string, unknown> = {},
): PatchBlock => ({ id, type, x, y, params });
/** A second of a 220 Hz sine as a 16-bit WAV file's bytes. */
export const sineWav = () => {
  const n = 44100,
    b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24);
  b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 44100) * 20000), 44 + i * 2);
  return [...b];
};
export const state = (p: Page) => p.evaluate(() => (window as any).__bd_probe.state);
/** Open the app on `blocks` (a v2 patch in a share link), press START and wait for the engine. */
export async function open(
  b: Browser,
  blocks: PatchBlock[],
  errors: string[],
  extra: Partial<Patch> = {},
  viewport = { width: 1280, height: 800 },
): Promise<Page> {
  const page = await b.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  const token = await encodePatch({
    format: 'blokdust.patch',
    version: 2,
    seed: 1,
    blocks,
    ...extra,
  });
  await page.goto(`${url}/index.html?c=${token}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.snapshots > 10);
  await page.waitForTimeout(1200); // header tweens settle
  return page;
}
/** The engine id of the block with patch id `uid`. */
export const idOf = (p: Page, uid: string) =>
  p.evaluate((u) => (window as any).__bd_probe.idOf(u) as number, uid);
/** Click a block (opens its options panel) and wait for the panel. */
export async function openPanel(p: Page, uid: string): Promise<void> {
  const id = await idOf(p, uid);
  const at = (await p.evaluate((i) => (window as any).__bd_probe.blockPoint(i), id)) as
    [number, number] | null;
  if (!at) throw new Error(`no point on block ${uid}`);
  await p.mouse.move(at[0], at[1]);
  await p.mouse.click(at[0], at[1]);
  await p.waitForFunction(
    (i) => {
      const o = (window as any).__bd_probe.scene.OptionsPanel;
      return o.Scale === 1 && !o.Opening && o.SelectedBlock?.Id === i;
    },
    id,
    { timeout: 5000 },
  );
  await p.waitForTimeout(500);
}
/** The open panel's rows: type, name and whatever a live row says it drew. */
export const rows = (p: Page) =>
  p.evaluate(() =>
    ((window as any).__bd_probe.scene.OptionsPanel.Options as any[]).map((o) => ({
      type: o.Type,
      name: o.Name,
      setting: o.Setting,
      value: o.Value,
      shown: o.Shown,
    })),
  );
/** css px of a point `frac` of the way along the open panel's row `setting` (v1's slider range), at its middle. */
export const rowPoint = (p: Page, setting: string, frac: number) =>
  p.evaluate(
    ([s, f]) => {
      const o = (window as any).__bd_probe.scene.OptionsPanel,
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio,
        r = (o.Options as any[]).find((x) => x.Setting === s);
      return [
        (o.Position.x + o.Margin + o.Range * (f as number)) / pr,
        (o.Position.y + r.Position.y + r.Size.height / 2) / pr,
      ] as [number, number];
    },
    [setting, frac] as const,
  );
/** Menu item names of a header category. */
export const menuItems = (p: Page, category: string) =>
  p.evaluate(
    (c) =>
      ((window as any).__bd_probe.v1App.BlockCreator.MenuJson.categories as any[])
        .find((x) => x.name === c)
        ?.items.map((i: any) => i.name) as string[],
    category,
  );
