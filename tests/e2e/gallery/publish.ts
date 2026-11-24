// Publishing to the gallery, what cannot be published, and likes (SPEC-SHARING-GALLERY R1–R4, R8, R13),
// run by tests/e2e/gallery.ts.
import {
  OUT,
  check,
  device,
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

export async function publishAndLike(): Promise<Pick<Cast, 'alice' | 'aliceId' | 'anon' | 'bob'>> {
  // ---- R1: SAVE with ADD TO GALLERY (on by default) publishes ----
  const alice = await device('alice_g');
  await alice.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain'),
  );
  await tab(alice, GALLERY);
  await idle(alice);
  check('R7: an empty gallery says so', (await P(alice)).items.length === 0);
  check('R1: ADD TO GALLERY is on by default', (await P(alice)).on === true);
  const aliceId = await save(alice);
  await tab(alice, GALLERY);
  await idle(alice);
  const a1 = await P(alice);
  check(
    'R1: SAVE published it, with no message to read',
    a1.items.length === 1 &&
      a1.items[0].title === 'Glass Rain' &&
      a1.items[0].by === 'alice_g' &&
      a1.items[0].mine &&
      a1.items[0].id === aliceId &&
      !a1.note,
    a1,
  );

  // ---- R2–R4: what can't be published ----
  const own = await api(alice, 'POST', 'patches', {
    patch: PATCH([
      { id: 'b1', type: 'source.sample', x: 0, y: 0, params: { track: 'file:loop.wav' } },
    ]),
    title: 'Mine',
    turnstile: 'ok',
    gallery: true,
  });
  const rude = await api(alice, 'POST', 'patches', {
    patch: PATCH([{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }]),
    title: 'shit tune',
    turnstile: 'ok',
    gallery: true,
  });
  const anon = await device(null);
  const anonSave = await api(anon, 'POST', 'patches', {
    patch: PATCH([{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }]),
    title: 'Anon',
    turnstile: 'ok',
    gallery: true,
  });
  check(
    "R3: the user's own audio files keep a patch out (saved, not published)",
    own.status === 201 &&
      own.json.gallery.published === false &&
      /audio files/.test(own.json.gallery.reason),
    own.json?.gallery,
  );
  check(
    'R4: a rude title keeps it out',
    rude.status === 201 && rude.json.gallery.published === false,
    rude.json?.gallery,
  );
  check(
    'R2: only signed-in users can publish (owner, 2026-11-15)',
    anonSave.status === 201 &&
      anonSave.json.gallery.published === false &&
      anonSave.json.gallery.reason === 'Only signed-in users can publish to the gallery.',
    anonSave.json?.gallery,
  );
  await tab(anon, 0);
  check(
    'R2: signed out, the switch says so (and SAVE leaves the gallery alone)',
    !(await anon.page.evaluate(() => (window as any).__bd_probe.scene.host.signedIn())),
  );

  // ---- R13: the gallery's rows have the like column, OPEN and INSERT (owner review 2: report with the patch open;
  // review 3: INSERT, and likes from the list too) ----
  await tab(anon, GALLERY);
  await idle(anon);
  const rowControls = await anon.page.evaluate(() =>
    ['greport0', 'gunpub0', 'glike0', 'gopen0', 'gins0'].map((n) =>
      (window as any).__bd_probe.scene.PatchesPanel.centreOf(n),
    ),
  );
  check(
    'R13: a row has the like column, OPEN and INSERT, and nothing else',
    rowControls.slice(0, 2).every((c) => c === null) &&
      rowControls.slice(2).every((c) => !!c) &&
      rowControls[2][0] < rowControls[3][0] &&
      rowControls[3][0] < rowControls[4][0],
    rowControls,
  );

  // ---- R8: likes: the chevron under the credit, or a row's column; signed in only, one per person, no down votes ----
  await press(anon, 'glike0', 1000);
  const anonList = await anon.page.evaluate(() => {
    const s = (window as any).__bd_probe.scene;
    return {
      settings: s.SettingsPanel.Open,
      tab: s.SettingsPanel._OpenTab,
      patches: s.PatchesPanel.Open,
    };
  });
  await anon.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
  await anon.page.waitForTimeout(800);
  await tab(anon, GALLERY);
  await idle(anon);
  await press(anon, 'gopen0', 2500);
  const anonCorners = await anon.page.evaluate(() => (window as any).__bd_probe.corners);
  await anon.page.mouse.click(anonCorners.likeAt[0], anonCorners.likeAt[1]);
  await anon.page.waitForTimeout(1000);
  const anonSettings = await anon.page.evaluate(() => {
    const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
    return { open: settingsPanel.Open, tab: settingsPanel._OpenTab };
  });
  check(
    'R8: a published patch has a like chevron under its credit and in its row; signed out, either opens SIGN IN',
    !!anonCorners.likeAt &&
      anonSettings.open &&
      anonSettings.tab === 4 &&
      anonList.settings &&
      anonList.tab === 4 &&
      !anonList.patches &&
      (await api(anon, 'GET', `patches/${aliceId}`)).json.likes === 0,
    { anonCorners, anonSettings, anonList },
  );
  await anon.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
  await anon.page.waitForTimeout(800);
  const erin = await device('erin_g');
  await tab(erin, GALLERY);
  await idle(erin);
  await press(erin, 'gopen0', 2500);
  const like = async () => {
    const c = await erin.page.evaluate(() => (window as any).__bd_probe.corners);
    await erin.page.mouse.click(c.likeAt[0], c.likeAt[1]);
    await erin.page.waitForTimeout(800);
    return (await api(erin, 'GET', `patches/${aliceId}`)).json;
  };
  const liked = await like(),
    unliked = await like(),
    relike = await like();
  await erin.page.mouse.move(5, 5);
  await erin.page.waitForTimeout(300);
  await erin.page.screenshot({ path: `${OUT}/stage-like.png` });
  const again = await api(erin, 'POST', `gallery/${aliceId}/like`, { on: true });
  check(
    'R8: the chevron likes it, again takes it back; one like per person',
    liked.liked &&
      liked.likes === 1 &&
      !unliked.liked &&
      unliked.likes === 0 &&
      relike.likes === 1 &&
      again.json.likes === 1,
    [liked.likes, unliked.likes, relike.likes, again.json],
  );
  // Bug (owner review 3): a fast double press flipped back and forth as the answers arrived. Now it settles on the
  // last press at once and stays there.
  await erin.page.route('**/api/gallery/*/like', async (r) => {
    await new Promise((res) => setTimeout(res, 400));
    await r.continue();
  });
  const c0 = await erin.page.evaluate(() => (window as any).__bd_probe.corners);
  await erin.page.mouse.click(c0.likeAt[0], c0.likeAt[1]);
  await erin.page.waitForTimeout(60);
  await erin.page.mouse.click(c0.likeAt[0], c0.likeAt[1]);
  const trace: boolean[] = [];
  for (let i = 0; i < 20; i++) {
    trace.push(await erin.page.evaluate(() => (window as any).__bd_probe.corners.credit.liked));
    await erin.page.waitForTimeout(100);
  }
  await erin.page.unroute('**/api/gallery/*/like');
  const settled = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  check(
    'Bug: a double press settles on the last press, without flipping back and forth',
    trace.every((v) => v) && settled.liked && settled.likes === 1,
    { trace, server: { liked: settled.liked, likes: settled.likes } },
  );
  // From the list: the row and the open patch's credit change together.
  await tab(erin, GALLERY);
  await idle(erin);
  const ai = (await P(erin)).items.findIndex((item: { id: string }) => item.id === aliceId);
  await press(erin, `glike${ai}`, 1200);
  const fromList = await erin.page.evaluate((id) => {
    const pp = (window as any).__bd_probe.scene.PatchesPanel;
    const r = pp.GalleryItems.find((x: any) => x.id === id);
    return {
      row: { liked: r.liked, likes: r.likes },
      open: pp.Open,
      credit: (window as any).__bd_probe.corners.credit.liked,
    };
  }, aliceId);
  const fromListServer = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  await erin.page.mouse.move(5, 5);
  await erin.page.waitForTimeout(300);
  await erin.page.screenshot({ path: `${OUT}/gallery-like.png` });
  await press(erin, `glike${ai}`, 1200);
  const relisted = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  check(
    "R8: the row's chevron likes from the list (the panel stays open); the stage credit follows",
    !fromList.row.liked &&
      fromList.row.likes === 0 &&
      fromList.open &&
      !fromList.credit &&
      !fromListServer.liked &&
      relisted.liked &&
      relisted.likes === 1,
    { fromList, server: [fromListServer.liked, relisted.liked] },
  );
  await erin.ctx.close();
  const bob = await device('bob_g');
  return { alice, aliceId, anon, bob };
}
