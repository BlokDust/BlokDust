// The Patches panel (CHG-0005), driven the way a user does: its tabs, rows and the share link.
import { type Page } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

/** A preset file, as far as these tests read it. */
interface PresetFile {
  meta: { title: string };
}

/** A Patches panel control's centre in CSS px (PatchesPanel.centreOf). */
export async function patchesAt(page: Page, name: string): Promise<[number, number]> {
  const centre = await page.evaluate(
    (control) => window.__bd_probe.scene.PatchesPanel.centreOf(control),
    name,
  );
  if (!centre) throw new Error(`no Patches control ${name}`);
  return centre;
}
/** Opens Patches on SAVE; it remembers the last tab, and `keep` leaves that to the test. */
export async function openPatches(page: Page, keep = false): Promise<void> {
  if (!keep)
    await page.evaluate(() => {
      try {
        localStorage.removeItem('blokdust.patchesTab');
      } catch {
        /* */
      }
    });
  await page.mouse.move(1138, 45);
  await page.mouse.click(1138, 45);
  await page.waitForTimeout(1500);
}
/** Press a Patches panel control (by name, PatchesPanel.centreOf). */
export async function patchesClick(page: Page, name: string, wait = 700): Promise<void> {
  const [x, y] = await patchesAt(page, name);
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(wait);
}
/** The OPEN tab, after its page has dropped in (CHG-0035). */
export async function openList(page: Page): Promise<void> {
  await openPatches(page);
  await patchesClick(page, 'tab1', 1100);
}
/** The web OPEN lists only the user's own patches, so tests of its rows store the presets as if
 * this browser had saved them, in their file order. */
export async function keepPresets(page: Page): Promise<void> {
  const dir = 'web/src/patch/presets',
    list = readdirSync(dir)
      .filter((file) => file.endsWith('.blokdust'))
      .sort()
      .map((file) => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')) as PresetFile);
  await page.evaluate((presets) => {
    localStorage.setItem(
      'blokdust.myPatches',
      JSON.stringify(
        presets.map((patch, i) => ({
          title: patch.meta.title,
          saved: Date.UTC(2026, 10, 1) - i * 60_000,
          patch,
        })),
      ),
    );
  }, list);
}
/** OPEN or INSERT on the row named `name`, scrolled into view first (OPEN scrolls). */
export async function rowButton(
  page: Page,
  kind: 'open' | 'ins',
  name: string,
  wait = 700,
): Promise<void> {
  const row = await page.evaluate((rowName) => {
    const panel = window.__bd_probe.scene.PatchesPanel,
      index = panel.Items.findIndex((item) => item.name === rowName);
    if (index >= 0) {
      panel.OpenScroll = 0;
      panel.scrollOpen(Math.max(0, index - 2) * 40 * window.__bd_probe.v1App.Unit);
    }
    return index;
  }, name);
  if (row < 0) throw new Error(`no row ${name}`);
  await page.waitForTimeout(150);
  await patchesClick(page, `${kind}${row}`, wait);
}
/** SAVE with no link yet (Patches › SAVE tab): waits for the link field. */
export async function makeLink(page: Page): Promise<string> {
  await openPatches(page);
  await patchesClick(page, 'share', 200);
  await page.waitForFunction(
    () => {
      const input = document.getElementById('patchUrlText') as HTMLInputElement,
        field = document.getElementById('patchUrl');
      return input.value.length > 20 && !!field && getComputedStyle(field).display !== 'none';
    },
    null,
    { timeout: 20000 },
  );
  await page.waitForTimeout(300);
  return page.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value);
}
