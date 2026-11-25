// The post-2.0 block tests' harness: the built app served, one browser, and helpers to open a
// patch, its panels and its rows.
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { serveDist } from '../serve.ts';
import { encodePatch } from '../../../web/src/patch/share.ts';
import type { Patch, PatchBlock } from '../../../web/src/patch/loadPatch.ts';
import type { OptionRow, OptionsBlock, RowShown } from '../pageGlobals.ts';

export type Tests = Record<string, (errors: string[]) => Promise<[boolean, unknown]>>;

export const OUT = 'tests/visual/output/new-blocks';
mkdirSync(OUT, { recursive: true });
export const { url, server } = await serveDist();
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** A block of a v2 patch. */
export const blk = (
  id: string,
  type: string,
  x: number,
  y: number,
  params: Record<string, unknown> = {},
): PatchBlock => ({ id, type, x, y, params });
export const state = (page: Page) => page.evaluate(() => window.__bd_probe.state);
/** The saved params of the block with patch id `uid`. */
export async function savedParams(page: Page, uid: string): Promise<Record<string, unknown>> {
  const block = (await state(page)).patch.blocks.find((each) => each.id === uid);
  if (!block) throw new Error(`no block ${uid} in the patch`);
  return block.params ?? {};
}
/** Open the app on `blocks` (a v2 patch in a share link), press START and wait for the engine. */
export async function open(
  b: Browser,
  blocks: PatchBlock[],
  errors: string[],
  extra: Partial<Patch> = {},
  viewport = { width: 1280, height: 800 },
): Promise<Page> {
  const page = await b.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  const token = await encodePatch({
    format: 'blokdust.patch',
    version: 2,
    seed: 1,
    blocks,
    ...extra,
  });
  await page.goto(`${url}/index.html?c=${token}`);
  await page.waitForFunction(() => window.__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => window.__bd_probe.state.snapshots > 10);
  // Header tweens settle.
  await page.waitForTimeout(1200);
  return page;
}
/** The engine id of the block with patch id `uid`. */
export async function idOf(page: Page, uid: string): Promise<number> {
  const id = await page.evaluate((patchId) => window.__bd_probe.idOf(patchId), uid);
  if (id === undefined) throw new Error(`no block ${uid} on the stage`);
  return id;
}
/** Click a block (opens its options panel) and wait for the panel. */
export async function openPanel(page: Page, uid: string): Promise<void> {
  const id = await idOf(page, uid);
  const at = await page.evaluate((blockId) => window.__bd_probe.blockPoint(blockId), id);
  if (!at) throw new Error(`no point on block ${uid}`);
  await page.mouse.move(at[0], at[1]);
  await page.mouse.click(at[0], at[1]);
  await page.waitForFunction(
    (blockId) => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel;
      const selected = optionsPanel.SelectedBlock as { Id: number } | null;
      return optionsPanel.Scale === 1 && !optionsPanel.Opening && selected?.Id === blockId;
    },
    id,
    { timeout: 5000 },
  );
  await page.waitForTimeout(500);
}
/** The open panel's rows: type, name and whatever a live row says it drew. */
export const rows = (page: Page) =>
  page.evaluate(() =>
    (window.__bd_probe.scene.OptionsPanel.Options as OptionRow[]).map((row) => ({
      type: String(row.Type),
      name: row.Name,
      setting: row.Setting,
      value: row.Value,
      shown: row.Shown,
    })),
  );
/** What the open panel's first live row last drew. */
export const liveShown = async (page: Page): Promise<RowShown | undefined> =>
  (await rows(page)).find((row) => row.type === 'live')?.shown;
/** Set a param of the block whose panel is open, as its slider or switch would. */
export const setParam = (page: Page, key: string, value: number | boolean) =>
  page.evaluate(
    ([setting, to]) => {
      (window.__bd_probe.scene.OptionsPanel.SelectedBlock as OptionsBlock).SetParam(setting, to);
    },
    [key, value] as const,
  );
/** css px of a point `frac` of the way along the open panel's row `setting` (v1's slider range),
 * at its middle. */
export const rowPoint = (page: Page, setting: string, frac: number) =>
  page.evaluate(
    ([key, value]): [number, number] => {
      const optionsPanel = window.__bd_probe.scene.OptionsPanel,
        pixelRatio = window.__bd_probe.v1App.Metrics.PixelRatio,
        row = optionsPanel.Options.find((option) => option.Setting === key);
      if (!row) throw new Error(`no row ${key}`);
      return [
        (optionsPanel.Position.x + optionsPanel.Margin + optionsPanel.Range * value) / pixelRatio,
        (optionsPanel.Position.y + row.Position.y + row.Size.height / 2) / pixelRatio,
      ];
    },
    [setting, frac] as const,
  );
/** Menu item names of a header category. */
export const menuItems = (page: Page, category: string) =>
  page.evaluate((name) => {
    const menu = window.__bd_probe.v1App.BlockCreator.MenuJson as {
      categories: { name: string; items: { name: string }[] }[];
    };
    return menu.categories.find((each) => each.name === name)?.items.map((item) => item.name) ?? [];
  }, category);
/** css px of the block with patch id `uid` on the stage. */
export async function pointOf(page: Page, uid: string): Promise<[number, number]> {
  const id = await idOf(page, uid);
  const at = await page.evaluate((blockId) => window.__bd_probe.blockPoint(blockId), id);
  if (!at) throw new Error(`no point on block ${uid}`);
  return at;
}
