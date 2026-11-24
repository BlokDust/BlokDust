// A share link opened in a new tab of the same browser shows the same scene, run by
// tests/e2e/sharing.ts.
import { sineWav } from '../mock-services.ts';
import {
  type SharingTests,
  remote,
  created,
  base,
  check,
  probe,
  VIEW,
  shareVia,
  idOf,
  local,
  editTokenOf,
} from './harness.ts';
import { located } from '../located.ts';
import type { PatchBlock } from '../../../web/src/patch/loadPatch.ts';

export const newTabTests: SharingTests = {
  /** Owner review 2026-11-07, bug 5: blocks added from the menus and moved, then Generate: the link
   * opens that scene in a new tab of the same browser (not the default stage). */
  'share-new-tab': async (browser) => {
    const ctx = await browser.newContext(VIEW);
    if (!remote)
      await ctx.route('https://cdn.freesound.org/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'audio/wav',
          headers: { 'access-control-allow-origin': '*' },
          body: sineWav(440),
        }),
      );
    const a = await ctx.newPage();
    await a.goto(`${base}/`);
    await a.waitForFunction(() => window.__bd_probe);
    await a.click('#start');
    await a.waitForFunction(() => window.__bd_probe.state.started);
    await a.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
    await a.waitForTimeout(2000);
    const dragOut = async (
      menu: [number, number],
      item: [number, number],
      to: [number, number],
    ) => {
      await a.mouse.move(...menu);
      await a.waitForTimeout(150);
      await a.mouse.click(...menu);
      await a.waitForTimeout(900);
      await a.mouse.move(...item);
      await a.mouse.down();
      await a.mouse.move(item[0], item[1] + 60, { steps: 5 });
      await a.mouse.move(...to, { steps: 10 });
      await a.mouse.up();
      await a.waitForTimeout(700);
    };
    const before0 = (await probe(a)).patch.blocks.length;
    await dragOut([421, 45], [182, 180], [700, 600]); // SOURCE → Tone
    await dragOut([692, 45], [365, 180], [630, 600]); // POWER → Power (second item of a paged menu)
    const first = (await probe(a)).blocks[0];
    const p0 = located(
      await a.evaluate((id) => window.__bd_probe.blockPoint(id), first.id),
      'the first block',
    );
    await a.mouse.move(p0[0], p0[1]);
    await a.mouse.down();
    await a.mouse.move(p0[0] + 150, p0[1] + 80, { steps: 8 });
    await a.mouse.up();
    await a.waitForTimeout(800);
    const scene = (await probe(a)).patch.blocks;
    const url = await shareVia(a, 'generate');
    const tok = await editTokenOf(a, idOf(url));
    if (tok) created.push({ id: idOf(url), token: tok });
    const b = await ctx.newPage();
    await b.goto(local(url));
    await b.waitForFunction(() => window.__bd_probe);
    await b.waitForTimeout(1000);
    const opened = (await probe(b)).patch.blocks;
    const key = (blocks: PatchBlock[]) =>
      JSON.stringify(blocks.map((block) => [block.type, block.x, block.y]));
    check(
      'edited scene (2 blocks added from menus, 1 moved) → Generate → new tab opens that scene',
      scene.length === before0 + 2 && key(opened) === key(scene),
      { added: scene.length - before0, same: key(opened) === key(scene) },
    );
    await ctx.close();
  },
};
