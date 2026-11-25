// Deleting an account takes its gallery entries; signed out, SAVE asks to sign in (CHG-0035), run
// by tests/e2e/gallery.ts.
import {
  OUT,
  check,
  device,
  type Cast,
  type GalleryExample,
  press,
  tab,
  api,
  galleryItems,
} from './harness.ts';
import type { AppSettingsPanel, SettingsTabState } from '../pageGlobals.shared.ts';
import { located } from '../located.ts';

export async function deletionAndSignIn(
  { alice, anon, bob, carol }: Pick<Cast, 'alice' | 'anon' | 'bob' | 'carol'>,
  ex: GalleryExample[],
): Promise<void> {
  // ---- account deletion takes its gallery entries and likes ---- Bob and Carol like one example
  // (Alice's patch left the gallery at R6); Carol likes another one alone.
  const [likedEx, otherEx] = [ex[1].id, ex[2].id];
  await api(carol, 'POST', `gallery/${likedEx}/like`, { on: true });
  await api(carol, 'POST', `gallery/${otherEx}/like`, { on: true });
  const likedByBob = await api(bob, 'POST', `gallery/${likedEx}/like`, { on: true });
  const exLikes = async () =>
    new Map((await galleryItems(anon, 'sort=examples')).map((row) => [row.id, row.likes]));
  const exBefore = await exLikes();
  const bobDel = await api(bob, 'DELETE', 'me');
  const afterDel = await galleryItems(anon, 'q=%40bob_g');
  check(
    'Deleting an account removes its gallery entries',
    bobDel.status === 200 && afterDel.length === 0,
    afterDel,
  );
  const exAfter = await exLikes();
  check(
    "Deleting an account takes its likes off what it liked, and leaves other patches' likes alone (security review, PR 13)",
    likedByBob.json?.likes === 2 &&
      exAfter.get(likedEx) === 1 &&
      exBefore.get(otherEx) === 1 &&
      [...exBefore].every(([id, value]) => id === likedEx || exAfter.get(id) === value),
    { before: [...exBefore], after: [...exAfter] },
  );
  await tab(alice, 0);
  await alice.page.mouse.move(5, 5);
  await alice.page.waitForTimeout(300);
  await alice.page.screenshot({ path: `${OUT}/save-share.png` });

  // ---- CHG-0035 (owner, 2026-11-17): signed out, SAVE / SHARE has SIGN IN; signed in from there,
  // SAVE opens again ----
  const newbie = await device(null);
  await newbie.page.evaluate(() => {
    window.__bd_probe.scene.host.createBlock('ToneSource', 2, 2);
  });
  await newbie.page.mouse.click(5, 400);
  await newbie.page.waitForTimeout(300);
  await tab(newbie, 0);
  await newbie.page.evaluate(() => {
    window.__bd_probe.scene.PatchesPanel.setTitle('Newbie Song');
  });
  await newbie.page.mouse.move(5, 5);
  await newbie.page.waitForTimeout(300);
  await newbie.page.screenshot({ path: `${OUT}/save-sign-in.png` });
  await press(newbie, 'signIn', 1200);
  const asked = await newbie.page.evaluate(() => {
    const scene = window.__bd_probe.scene;
    return {
      settings: scene.SettingsPanel.Open,
      tab: (scene.SettingsPanel as unknown as SettingsTabState)._OpenTab,
      patches: scene.PatchesPanel.Open,
    };
  });
  const at = async (control: string) => {
    const [x, y] = located(
      await newbie.page.evaluate(
        (key) => (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountCentre(key),
        control,
      ),
      `the account's ${control}`,
    );
    await newbie.page.mouse.click(x, y);
    await newbie.page.waitForTimeout(400);
  };
  await newbie.page.waitForFunction(
    () =>
      (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.Account !== undefined,
    null,
    { timeout: 10000 },
  );
  await at('passkey');
  await newbie.page.waitForFunction(
    () => (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.View === 'create',
    null,
    { timeout: 10000 },
  );
  await newbie.page.fill('#accountHandleInput', 'newbie_g');
  await at('submit');
  await newbie.page
    .waitForFunction(
      () => {
        const panel = window.__bd_probe.scene.PatchesPanel;
        return panel.Open && panel.Tab === 0;
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await newbie.page.waitForTimeout(800);
  const back = await newbie.page.evaluate(() => {
    const scene = window.__bd_probe.scene;
    return {
      patches: scene.PatchesPanel.Open,
      tab: scene.PatchesPanel.Tab,
      settings: scene.SettingsPanel.Open,
      gallery: scene.PatchesPanel.GalleryOn,
      signedIn: scene.host.signedIn(),
      title: scene.PatchesPanel.Title,
      signIn: scene.PatchesPanel.centreOf('signIn'),
    };
  });
  check(
    'Signed out, SAVE / SHARE has SIGN IN; it opens Settings › SIGN IN, and once signed in SAVE opens again with ADD TO GALLERY on and the name kept (CHG-0035)',
    asked.settings &&
      asked.tab === 4 &&
      !asked.patches &&
      back.patches &&
      back.tab === 0 &&
      !back.settings &&
      back.gallery &&
      back.signedIn &&
      back.title === 'Newbie Song' &&
      back.signIn === null,
    { asked, back },
  );
}
