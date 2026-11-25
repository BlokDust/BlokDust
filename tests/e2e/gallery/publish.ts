// Publishing to the gallery, what cannot be published, and likes (SPEC-SHARING-GALLERY R1–R4, R8,
// R13), run by tests/e2e/gallery.ts.
import {
  OUT,
  check,
  device,
  panelState,
  save,
  type Cast,
  GALLERY,
  press,
  tab,
  idle,
  api,
  PATCH,
} from './harness.ts';
import type { SettingsTabState } from '../pageGlobals.shared.ts';
import { located } from '../located.ts';

export async function publishAndLike(): Promise<Pick<Cast, 'alice' | 'aliceId' | 'anon' | 'bob'>> {
  // ---- R1: SAVE with ADD TO GALLERY (on by default) publishes ----
  const alice = await device('alice_g');
  await alice.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.setTitle('Glass Rain');
  });
  await tab(alice, GALLERY);
  await idle(alice);
  check('R7: an empty gallery says so', (await panelState(alice)).items.length === 0);
  check('R1: ADD TO GALLERY is on by default', (await panelState(alice)).on);
  const aliceId = await save(alice);
  await tab(alice, GALLERY);
  await idle(alice);
  const a1 = await panelState(alice);
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
      own.json?.gallery?.published === false &&
      (own.json.gallery.reason ?? '').includes('audio files'),
    own.json?.gallery,
  );
  check(
    'R4: a rude title keeps it out',
    rude.status === 201 && rude.json?.gallery?.published === false,
    rude.json?.gallery,
  );
  check(
    'R2: only signed-in users can publish (owner, 2026-11-15)',
    anonSave.status === 201 &&
      anonSave.json?.gallery?.published === false &&
      anonSave.json.gallery.reason === 'Only signed-in users can publish to the gallery.',
    anonSave.json?.gallery,
  );
  await tab(anon, 0);
  check(
    'R2: signed out, the switch says so (and SAVE leaves the gallery alone)',
    !(await anon.page.evaluate(() => window.__bd_probe.scene.host.signedIn())),
  );

  // ---- R13: the gallery's rows have the like column, OPEN and INSERT (owner review 2: report with
  // the patch open; review 3: INSERT, and likes from the list too) ----
  await tab(anon, GALLERY);
  await idle(anon);
  const rowControls = await anon.page.evaluate(() =>
    ['greport0', 'gunpub0', 'glike0', 'gopen0', 'gins0'].map((control) =>
      window.__bd_probe.scene.PatchesPanel.centreOf(control),
    ),
  );
  const [like0, open0, insert0] = rowControls.slice(2);
  check(
    'R13: a row has the like column, OPEN and INSERT, and nothing else',
    rowControls.slice(0, 2).every((control) => control === null) &&
      !!like0 &&
      !!open0 &&
      !!insert0 &&
      like0[0] < open0[0] &&
      open0[0] < insert0[0],
    rowControls,
  );

  // ---- R8: likes: the chevron under the credit, or a row's column; signed in only, one per
  // person, no down votes ----
  await press(anon, 'glike0', 1000);
  const anonList = await anon.page.evaluate(() => {
    const scene = window.__bd_probe.scene;
    return {
      settings: scene.SettingsPanel.Open,
      tab: (scene.SettingsPanel as unknown as SettingsTabState)._OpenTab,
      patches: scene.PatchesPanel.Open,
    };
  });
  await anon.page.evaluate(() => {
    window.__bd_probe.scene.SettingsPanel.ClosePanel();
  });
  await anon.page.waitForTimeout(800);
  await tab(anon, GALLERY);
  await idle(anon);
  await press(anon, 'gopen0', 2500);
  const anonCorners = await anon.page.evaluate(() => window.__bd_probe.corners);
  const anonLikeAt = located(anonCorners.likeAt, 'the like chevron');
  await anon.page.mouse.click(anonLikeAt[0], anonLikeAt[1]);
  await anon.page.waitForTimeout(1000);
  const anonSettings = await anon.page.evaluate(() => {
    const settingsPanel = window.__bd_probe.scene.SettingsPanel as unknown as SettingsTabState;
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
      (await api(anon, 'GET', `patches/${aliceId}`)).json?.likes === 0,
    { anonCorners, anonSettings, anonList },
  );
  await anon.page.evaluate(() => {
    window.__bd_probe.scene.SettingsPanel.ClosePanel();
  });
  await anon.page.waitForTimeout(800);
  const erin = await device('erin_g');
  await tab(erin, GALLERY);
  await idle(erin);
  await press(erin, 'gopen0', 2500);
  const like = async () => {
    const likeAt = located(
      await erin.page.evaluate(() => window.__bd_probe.corners.likeAt),
      'the like chevron',
    );
    await erin.page.mouse.click(likeAt[0], likeAt[1]);
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
    liked?.liked === true &&
      liked.likes === 1 &&
      !unliked?.liked &&
      unliked?.likes === 0 &&
      relike?.likes === 1 &&
      again.json?.likes === 1,
    [liked?.likes, unliked?.likes, relike?.likes, again.json],
  );
  // Bug (owner review 3): a fast double press flipped back and forth as the answers arrived. Now it
  // settles on the last press at once and stays there.
  await erin.page.route('**/api/gallery/*/like', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  const chevron = located(
    await erin.page.evaluate(() => window.__bd_probe.corners.likeAt),
    'the like chevron',
  );
  await erin.page.mouse.click(chevron[0], chevron[1]);
  await erin.page.waitForTimeout(60);
  await erin.page.mouse.click(chevron[0], chevron[1]);
  const trace: boolean[] = [];
  for (let i = 0; i < 20; i++) {
    trace.push(await erin.page.evaluate(() => window.__bd_probe.corners.credit?.liked === true));
    await erin.page.waitForTimeout(100);
  }
  await erin.page.unroute('**/api/gallery/*/like');
  const settled = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  check(
    'Bug: a double press settles on the last press, without flipping back and forth',
    trace.every(Boolean) && settled?.liked === true && settled.likes === 1,
    { trace, server: { liked: settled?.liked, likes: settled?.likes } },
  );
  // From the list: the row and the open patch's credit change together.
  await tab(erin, GALLERY);
  await idle(erin);
  const aliceRow = (await panelState(erin)).items.findIndex((item) => item.id === aliceId);
  await press(erin, `glike${aliceRow}`, 1200);
  const fromList = await erin.page.evaluate((id) => {
    const panel = window.__bd_probe.scene.PatchesPanel;
    const row = panel.GalleryItems.find((item) => item.id === id);
    return {
      row: { liked: row?.liked, likes: row?.likes },
      open: panel.Open,
      credit: window.__bd_probe.corners.credit?.liked,
    };
  }, aliceId);
  const fromListServer = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  await erin.page.mouse.move(5, 5);
  await erin.page.waitForTimeout(300);
  await erin.page.screenshot({ path: `${OUT}/gallery-like.png` });
  await press(erin, `glike${aliceRow}`, 1200);
  const relisted = (await api(erin, 'GET', `patches/${aliceId}`)).json;
  check(
    "R8: the row's chevron likes from the list (the panel stays open); the stage credit follows",
    !fromList.row.liked &&
      fromList.row.likes === 0 &&
      fromList.open &&
      !fromList.credit &&
      !fromListServer?.liked &&
      relisted?.liked === true &&
      relisted.likes === 1,
    { fromList, server: [fromListServer?.liked, relisted?.liked] },
  );
  await erin.ctx.close();
  const bob = await device('bob_g');
  return { alice, aliceId, anon, bob };
}
