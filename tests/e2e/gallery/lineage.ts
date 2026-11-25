// Saved patches list the patches inserted into them (SPEC-PATCH-FORMAT-V2 R11); reports never hide
// EXAMPLES (R9), run by tests/e2e/gallery.ts.
import {
  check,
  type Device,
  device,
  save,
  type Cast,
  type GalleryExample,
  GALLERY,
  press,
  tab,
  idle,
  api,
  bd,
  galleryItems,
} from './harness.ts';
import type { GalleryRow } from '../../../web/src/v1ui/patches/hosts.ts';

export async function insertedPatches({
  alice,
  anon,
  bob,
  carol,
  dave,
  fay,
  gus,
}: Omit<Cast, 'aliceId'>): Promise<GalleryExample[]> {
  // ---- SPEC-PATCH-FORMAT-V2 R11: a saved patch lists the saved patches inserted into it, and
  // inserting it carries them along, so how patches were combined can be followed back ----
  const place = async (device: Device, x: number) => {
    await device.page.waitForFunction(() => !window.__bd_probe.scene.PatchesPanel.Opening, null, {
      timeout: 15000,
    });
    await device.page.mouse.move(x, 650, { steps: 4 });
    await device.page.mouse.click(x, 650);
    await device.page.waitForTimeout(800);
  };
  await tab(carol, GALLERY);
  await idle(carol);
  await press(carol, 'gins0', 300);
  await place(carol, 250);
  await tab(carol, GALLERY);
  await idle(carol);
  await press(carol, 'gins3', 300);
  await place(carol, 1000);
  const combined = await save(carol);
  const cj = (await api(carol, 'GET', `patches/${combined}`)).json;
  const ex = await galleryItems(anon, 'sort=examples');
  const idOf = (title: string) => ex.find((row) => row.title === title)?.id;
  const srcs = cj?.patch?.sources ?? [];
  check(
    'PATCH-V2 R11: the saved patch lists each saved patch inserted into it, with its blocks',
    srcs.some(
      (x) =>
        x.id === idOf('Computer Keys + 2 Tones') && x.by === 'blokdust' && x.blocks.length === 6,
    ) &&
      srcs.some((x) => x.id === idOf('Rotating Sequencer') && x.blocks.length === 10) &&
      cj?.parent === idOf('MIDI Keys + 2 Tones'),
    { sources: srcs, parent: cj?.parent },
  );
  await dave.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.ClosePanel();
  });
  await dave.page.waitForTimeout(500);
  await dave.page.evaluate(
    (id) => window.__bd_probe.scene.host.gallery?.open({ id } as GalleryRow, 'insert'),
    combined,
  );
  await place(dave, 600);
  const daveSaved = await save(dave);
  const dsrc = (await api(dave, 'GET', `patches/${daveSaved}`)).json?.patch?.sources ?? [];
  const ids = new Set(
    await dave.page.evaluate(() => window.__bd_probe.state.patch.blocks.map((block) => block.id)),
  );
  check(
    'PATCH-V2 R11: inserting a combined patch carries its sources along, under the new block ids',
    dsrc.some((x) => x.id === combined) &&
      dsrc.some((x) => x.id === idOf('Computer Keys + 2 Tones')) &&
      dsrc.some((x) => x.id === idOf('Rotating Sequencer')) &&
      dsrc.every((x) => x.blocks.every((b) => ids.has(b))),
    dsrc.map((x) => `${x.id}:${x.blocks.length}`),
  );
  await tab(carol, 1);
  await carol.page.waitForTimeout(800);
  const carolOpen = await carol.page.evaluate(() =>
    window.__bd_probe.scene.PatchesPanel.Items.map(
      (i: { name: string; detail: string }) => `${i.name} | ${i.detail}`,
    ),
  );
  check(
    "R16: the web OPEN lists only the user's own patches (no presets)",
    !carolOpen.some((i: string) => /Preset|Computer Keys/.test(i)),
    carolOpen,
  );
  const taken = await api(dave, 'PUT', 'me/handle', { handle: 'BlokDust' });
  // An account made for the site's own patches: once handed over, signing in that way is signing in
  // as @blokdust.
  const zed = await device('zed_g');
  await zed.page.evaluate(() => {
    window.__bd_probe.scene.host.createBlock('ToneSource', 0, 0);
    window.__bd_probe.scene.PatchesPanel.setTitle('Zed Tones');
  });
  const zedId = await save(zed);
  const merged = bd('official', 'zed_g');
  const zedMe = (await api(zed, 'GET', 'me')).json as { user?: { handle: string } | null } | null;
  const zedNow = (await galleryItems(anon, 'sort=examples')).map(
    (item) => `${item.id} @${item.by}`,
  );
  check(
    "R16: nobody can choose the name; bd gallery official hands an account's sign-ins and patches to @blokdust",
    taken.status === 400 &&
      merged.into === 'blokdust' &&
      zedMe?.user?.handle === 'blokdust' &&
      zedNow.includes(`${zedId} @blokdust`),
    { taken: taken.json, merged, me: zedMe?.user, zedNow },
  );
  await zed.ctx.close();

  // ---- R9 (security review, PR 13): reports never hide @blokdust's EXAMPLES and TUTORIALS; they
  // are still recorded ----
  const example = ex[0].id;
  const exReports = await Promise.all(
    [alice, bob, carol, dave, fay, gus].map((device) =>
      api(device, 'POST', `gallery/${example}/report`, { reason: '' }),
    ),
  );
  const exStill = await galleryItems(anon, 'sort=examples');
  const exListed = bd('reports');
  check(
    'R9: six reports leave an @blokdust example listed; bd gallery reports still shows them',
    exReports.every((exReport) => exReport.status === 200) &&
      exStill.some((row) => row.id === example) &&
      (exListed.reported ?? []).some(
        (row) => row.id === example && row.reports === 6 && row.hidden === 0,
      ),
    { exStill: exStill.length, exListed },
  );
  return ex;
}
