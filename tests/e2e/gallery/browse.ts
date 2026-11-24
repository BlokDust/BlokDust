// Search and sort, INSERT, OPEN with credit and views, and remixes (R7, R11, R13–R15), run by
// tests/e2e/gallery.ts.
import {
  OUT,
  check,
  panelState,
  save,
  type Cast,
  GALLERY,
  press,
  tab,
  idle,
  search,
  api,
} from './harness.ts';
import { located } from '../located.ts';

export async function searchOpenAndRemix({
  aliceId,
  bob,
}: Pick<Cast, 'aliceId' | 'bob'>): Promise<void> {
  // ---- R7: search by title, block, name (with or without @); sort ----
  await bob.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.ClosePanel();
  });
  await bob.page.waitForTimeout(600);
  await bob.page.evaluate(() => {
    window.__bd_probe.scene.host.createBlock('Laser', 3, 3);
  });
  await bob.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.setTitle('Bob Lasers');
  });
  await save(bob);
  await tab(bob, GALLERY);
  await idle(bob);
  const byTitle = await search(bob, 'glass'),
    byBlock = await search(bob, 'laser'),
    byAt = await search(bob, '@alice_g'),
    byName = await search(bob, 'alice'),
    none = await search(bob, 'zzzz');
  check(
    'R7: search finds titles, block types and names (with or without @)',
    byTitle.length === 1 &&
      byTitle[0].title === 'Glass Rain' &&
      byBlock.some((row) => row.title === 'Bob Lasers') &&
      byAt.length === 1 &&
      byAt[0].by === 'alice_g' &&
      byName.some((row) => row.by === 'alice_g') &&
      none.length === 0,
    {
      byTitle,
      byBlock: byBlock.map((row) => row.title),
      byAt,
      byName: byName.map((row) => row.by),
      none,
    },
  );
  await search(bob, '');
  const popular = (await panelState(bob)).items.map((item: { title: string }) => item.title);
  await bob.page.mouse.move(5, 5);
  await bob.page.waitForTimeout(300);
  await bob.page.screenshot({ path: `${OUT}/gallery-rows.png` });
  await press(bob, 'sort_new', 300);
  await idle(bob);
  const newest = (await panelState(bob)).items.map((item: { title: string }) => item.title);
  await press(bob, 'sort_top', 300);
  await idle(bob);
  const top = (await panelState(bob)).items.map((item: { title: string }) => item.title);
  check(
    'R7: POPULAR puts the liked patch first; NEW the newest; ALL TIME TOP the most liked (CHG-0035)',
    popular[0] === 'Glass Rain' && newest[0] === 'Bob Lasers' && top[0] === 'Glass Rain',
    { popular, newest, top },
  );

  // ---- R11, R14, R15: OPEN is counted and credited, SAVE makes a remix; R13: INSERT adds a
  // gallery patch's blocks to yours without opening it (no credit, no remix) ----
  const bobBefore = await bob.page.evaluate(() => ({
    n: window.__bd_probe.state.patch.blocks.length,
    id: window.__bd_probe.v1App.CompositionId,
  }));
  const glassAt = (await panelState(bob)).items.findIndex(
    (item: { title: string }) => item.title === 'Glass Rain',
  );
  await press(bob, `gins${glassAt}`, 300);
  await bob.page.mouse.move(300, 600, { steps: 4 });
  await bob.page.mouse.click(300, 600);
  await bob.page.waitForTimeout(800);
  const bobAfter = await bob.page.evaluate(() => ({
    n: window.__bd_probe.state.patch.blocks.length,
    id: window.__bd_probe.v1App.CompositionId,
    credit: window.__bd_probe.corners.credit,
    open: window.__bd_probe.scene.PatchesPanel.Open,
  }));
  check(
    'R13: INSERT puts its blocks into the patch, keeping the patch (no credit)',
    bobAfter.n > bobBefore.n && bobAfter.id === bobBefore.id && !bobAfter.credit && !bobAfter.open,
    { bobBefore, bobAfter },
  );
  await bob.page.keyboard.press('ControlOrMeta+z');
  await bob.page.waitForTimeout(300);
  await tab(bob, GALLERY);
  await idle(bob);
  await press(bob, 'sort_popular', 300);
  await idle(bob); // back to POPULAR: Glass Rain is row 0
  const viewsBefore = (await panelState(bob)).items[0].views;
  await press(bob, 'gopen0', 2500);
  const opened = await bob.page.evaluate(() => ({
    id: window.__bd_probe.v1App.CompositionId,
    corners: window.__bd_probe.corners,
  }));
  check(
    'R15: someone else\'s patch shows "TITLE BY @NAME" on the stage',
    opened.corners.credit?.by === 'alice_g' &&
      opened.corners.credit.title === 'Glass Rain' &&
      !!opened.corners.byAt,
    opened.corners,
  );
  const nameAt = located(opened.corners.byAt, 'the @NAME credit');
  await bob.page.mouse.click(nameAt[0], nameAt[1]);
  await bob.page.waitForTimeout(1200);
  await idle(bob);
  const theirs = await panelState(bob);
  check(
    'R15: pressing @NAME opens the gallery on their patches',
    theirs.open &&
      theirs.items.every((item: { by: string }) => item.by === 'alice_g') &&
      theirs.items.length === 1 &&
      (await bob.page.evaluate(
        () =>
          (document.getElementById('gallerySearchInput') as HTMLInputElement).value === '@alice_g',
      )),
    theirs.items,
  );
  check('R14: opening it counted a view', theirs.items[0].views === viewsBefore + 1, [
    viewsBefore,
    theirs.items[0].views,
  ]);
  await bob.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.ClosePanel();
  });
  await bob.page.waitForTimeout(600);
  await bob.page.evaluate(() => {
    window.__bd_probe.scene.host.createBlock('ToneSource', -5, 5);
  });
  const remix = await save(bob);
  const rp = await api(bob, 'GET', `patches/${remix}`);
  await tab(bob, GALLERY);
  await search(bob, '');
  const glass = (await panelState(bob)).items.find((item: { id: string }) => item.id === aliceId);
  check(
    "R11: SAVE after opening someone's patch makes a remix; the original counts it; the credit goes",
    opened.id === aliceId &&
      remix !== aliceId &&
      rp.json?.parent === aliceId &&
      glass?.remixes === 1 &&
      !(await bob.page.evaluate(() => window.__bd_probe.corners.credit)),
    { remix, parent: rp.json?.parent, remixes: glass?.remixes },
  );
}
