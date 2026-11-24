// Saving updates a published patch, MAKE VIDEO after SAVE, and the list that loads as it scrolls (R5, R7a),
// run by tests/e2e/gallery.ts.
import {
  OUT,
  check,
  P,
  save,
  type Cast,
  GALLERY,
  press,
  tab,
  idle,
  api,
  PATCH,
} from './harness.ts';

export async function saveVideoAndScroll({
  alice,
  aliceId,
  anon,
  carol,
}: Pick<Cast, 'alice' | 'aliceId' | 'anon' | 'carol'>): Promise<void> {
  // ---- R5: saving a published patch updates it ----
  await alice.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain II'),
  );
  await alice.page.evaluate(() => {
    (window as any).__bd_probe.scene.host.createBlock('ToneSource', 6, -5);
  });
  await save(alice);
  const renamed = (await api(anon, 'GET', 'gallery?q=glass')).json.items;
  check(
    'R5: SAVE updates the published title',
    renamed.find((r: { id: string }) => r.id === aliceId)?.title === 'Glass Rain II',
    renamed,
  );

  // ---- Option A (owner review 2): one main button; MAKE VIDEO on goes from SAVE on to the video ----
  await tab(alice, 0);
  const pp = () =>
    alice.page.evaluate(() => {
      const x = (window as any).__bd_probe.scene.PatchesPanel;
      return {
        view: x.View,
        video: x.VideoState,
        on: x.videoOn,
        main: x.mainAction(),
        saving: x.Saving,
        saveAs: !!x.centreOf('saveAs'),
        download: !!x.centreOf('save'),
      };
    });
  const quiet = await pp();
  await press(alice, 'videoSwitch', 300);
  const nothing = await pp();
  await alice.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain III'),
  );
  await alice.page.evaluate(() => {
    (window as any).__bd_probe.scene.host.createBlock('ToneSource', -6, -5);
  });
  await alice.page.waitForTimeout(300);
  const toSave = await pp();
  await press(alice, 'share', 200);
  await alice.page
    .waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.View === 'video', null, {
      timeout: 60000,
    })
    .catch(() => {});
  const afterSave = await pp();
  await alice.page.mouse.move(5, 5);
  await alice.page.waitForTimeout(400);
  await alice.page.screenshot({ path: `${OUT}/save-then-video.png` });
  await press(alice, 'videoBack', 400);
  await press(alice, 'videoSwitch', 300);
  check(
    'Option A: SAVE is the main button, SAVE AS and DOWNLOAD PATCH sit below; MAKE VIDEO (off on desktop) turns it into MAKE VIDEO when there is nothing to save, and SAVE then goes on to the video',
    quiet.on === false &&
      quiet.main.label === 'Save' &&
      quiet.main.off &&
      quiet.saveAs &&
      quiet.download &&
      nothing.on &&
      nothing.main.label === 'Make Video' &&
      !nothing.main.off &&
      toSave.main.label === 'Save' &&
      afterSave.view === 'video' &&
      afterSave.video !== 'idle',
    { quiet, nothing, toSave, afterSave },
  );

  await tab(alice, 0);
  await press(alice, 'gallerySwitch', 300);
  const switched = await P(alice);
  const st = await alice.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.shareState(),
  );
  await press(alice, 'share', 200);
  await alice.page.waitForFunction(
    () => !(window as any).__bd_probe.scene.PatchesPanel.Saving,
    null,
    { timeout: 60000 },
  );
  await alice.page.waitForTimeout(500);
  const gone = (await api(anon, 'GET', 'gallery?q=%40alice_g')).json.items;
  check(
    'R6: switching ADD TO GALLERY off makes SAVE available, and SAVE unpublishes',
    switched.on === false &&
      st.save === 'save' &&
      gone.length === 0 &&
      (await api(anon, 'GET', `patches/${aliceId}`)).status === 200,
    { st, gone },
  );

  // ---- R7a: one list that scrolls and loads the next page as it nears its end (owner review 2) ----
  for (let i = 0, tries = 0; i < 22; i++) {
    const r = await api(alice, 'POST', 'patches', {
      patch: PATCH([{ id: 'b1', type: 'source.tone', x: i, y: 0, params: {} }]),
      title: `Pad ${i}`,
      turnstile: 'ok',
      gallery: true,
    });
    // Saves are rate-limited per address (SPEC-SHARING-BACKEND): wait out the minute.
    if (r.status === 429 && tries++ < 2) {
      await new Promise((res) => setTimeout(res, 61_000));
      i--;
      continue;
    }
    if (r.status !== 201 || !r.json.gallery.published) {
      check('R7a: made 22 patches', false, r);
      break;
    }
  }
  // CHG-0035 (owner, 2026-11-17): at the end of a page with more to come, SHOW MORE fetches them.
  await tab(carol, GALLERY);
  await carol.page.fill('#gallerySearchInput', 'pad');
  await press(carol, 'search');
  await idle(carol);
  const page1 = (await P(carol)).items.length;
  await carol.page.evaluate(() => {
    const pp = (window as any).__bd_probe.scene.PatchesPanel;
    pp.GalleryScroll = pp.galleryMaxScroll();
  });
  await carol.page.mouse.move(5, 5);
  await carol.page.waitForTimeout(300);
  await carol.page.screenshot({ path: `${OUT}/gallery-show-more.png` });
  await press(carol, 'showMore', 300);
  await idle(carol);
  const shown = (await P(carol)).items.length;
  check(
    'R13: SHOW MORE after the 20th row fetches the next page (CHG-0035)',
    page1 === 20 && shown === 22,
    { page1, shown },
  );
  await press(carol, 'search');
  await idle(carol);
  const first = await P(carol);
  const list = await carol.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.centreOf('list'),
  );
  for (let i = 0; i < 12; i++) {
    await carol.page.mouse.move(list[0], list[1]);
    await carol.page.mouse.wheel(0, 400);
    await carol.page.waitForTimeout(150);
  }
  await idle(carol);
  await carol.page.waitForTimeout(300);
  const more = await P(carol);
  const scrolled = await carol.page.evaluate(
    () => (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll,
  );
  check(
    'R7a: 20 a page; scrolling to the end loads the rest onto the same list, each once',
    first.items.length === 20 &&
      more.items.length === 22 &&
      new Set(more.items.map((item: { id: string }) => item.id)).size === 22 &&
      scrolled > 0,
    { first: first.items.length, more: more.items.length, scrolled },
  );
  // A drag scrolls and doesn't open the row it started on.
  const before = await carol.page.evaluate(
      () => (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll,
    ),
    compBefore = await carol.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
  await carol.page.mouse.move(list[0] + 100, list[1]);
  await carol.page.mouse.down();
  for (let k = 1; k <= 6; k++) {
    await carol.page.mouse.move(list[0] + 100, list[1] + k * 20);
    await carol.page.waitForTimeout(30);
  }
  await carol.page.mouse.up();
  await carol.page.waitForTimeout(600);
  const dragged = await carol.page.evaluate(() => ({
    scroll: (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll,
    open: (window as any).__bd_probe.scene.PatchesPanel.Open,
    comp: (window as any).__bd_probe.v1App.CompositionId,
  }));
  check(
    'R7a: dragging the list scrolls it and opens nothing',
    dragged.scroll < before && dragged.open && dragged.comp === compBefore,
    { before, dragged },
  );
}
