// The Patches panel (CHG-0005), driven the way a user does: its tabs, rows and the share link.
import { type Page } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

/** The header's Share slot reads PATCHES and opens the Patches panel (CHG-0005); its control centres, in CSS px. */
export const patchesAt = (p: Page, name: string) =>
  p.evaluate((n) => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name) as Promise<
    [number, number]
  >;
/** Opens Patches on SAVE (it remembers the last tab, owner 2026-11-10; `keep` leaves that to the test). */
export async function openPatches(p: Page, keep = false): Promise<void> {
  if (!keep)
    await p.evaluate(() => {
      try {
        localStorage.removeItem('blokdust.patchesTab');
      } catch {
        /* */
      }
    });
  await p.mouse.move(1138, 45);
  await p.mouse.click(1138, 45);
  await p.waitForTimeout(1500);
}
/** Press a Patches panel control (by name, PatchesPanel.centreOf). */
export async function patchesClick(p: Page, name: string, wait = 700): Promise<void> {
  const [x, y] = await patchesAt(p, name);
  await p.mouse.move(x, y);
  await p.mouse.click(x, y);
  await p.waitForTimeout(wait);
}
/** The OPEN tab. */
export async function openList(p: Page): Promise<void> {
  await openPatches(p);
  await patchesClick(p, 'tab1', 1100);
}
// the page drops in (CHG-0035)
/** Owner review 3 (2026-11-16): the web OPEN lists only the user's own patches (the presets are @blokdust's in the
 * gallery). Tests of OPEN's rows use the presets as if this browser had saved them, in their file order. */
export async function keepPresets(p: Page): Promise<void> {
  const dir = 'web/src/patch/presets',
    list = readdirSync(dir)
      .filter((f) => f.endsWith('.blokdust'))
      .sort()
      .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
  await p.evaluate((l) => {
    localStorage.setItem(
      'blokdust.myPatches',
      JSON.stringify(
        l.map((patch: any, i: number) => ({
          title: patch.meta.title,
          saved: Date.UTC(2026, 10, 1) - i * 60_000,
          patch,
        })),
      ),
    );
  }, list);
}
/** OPEN or INSERT on the row named `name`, scrolled into view first (OPEN is one scrolling list, owner 2026-11-16). */
export async function rowButton(
  p: Page,
  kind: 'open' | 'ins',
  name: string,
  wait = 700,
): Promise<void> {
  const i = await p.evaluate((n) => {
    const pp = (window as any).__bd_probe.scene.PatchesPanel,
      i = pp.Items.findIndex((x: any) => x.name === n);
    if (i >= 0) {
      pp.OpenScroll = 0;
      pp.scrollOpen(Math.max(0, i - 2) * 40 * (window as any).__bd_probe.v1App.Unit);
    }
    return i;
  }, name);
  if (i < 0) throw new Error(`no row ${name}`);
  await p.waitForTimeout(150);
  await patchesClick(p, `${kind}${i}`, wait);
}
/** SAVE with no link yet (Patches › SAVE tab; it was CREATE SHARE LINK): waits for the link field. */
export async function makeLink(p: Page): Promise<string> {
  await openPatches(p);
  await patchesClick(p, 'share', 200);
  await p.waitForFunction(
    () => {
      const input = document.getElementById('patchUrlText') as HTMLInputElement;
      return (
        input.value.length > 20 &&
        getComputedStyle(document.getElementById('patchUrl')!).display !== 'none'
      );
    },
    null,
    { timeout: 20000 },
  );
  await p.waitForTimeout(300);
  return p.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value);
}
