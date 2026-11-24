// Deleting an account takes its gallery entries; signed out, SAVE asks to sign in (CHG-0035), run by
// tests/e2e/gallery.ts.
import { OUT, check, device, type Cast, type GalleryExample, press, tab, api } from './harness.ts';

export async function deletionAndSignIn(
  { alice, anon, bob, carol }: Pick<Cast, 'alice' | 'anon' | 'bob' | 'carol'>,
  ex: GalleryExample[],
): Promise<void> {
  // ---- account deletion takes its gallery entries and likes ----
  // Bob and Carol like one example (Alice's patch left the gallery at R6); Carol likes another one alone.
  const [likedEx, otherEx] = [ex[1].id, ex[2].id];
  await api(carol, 'POST', `gallery/${likedEx}/like`, { on: true });
  await api(carol, 'POST', `gallery/${otherEx}/like`, { on: true });
  const likedByBob = await api(bob, 'POST', `gallery/${likedEx}/like`, { on: true });
  const exLikes = async () =>
    new Map(
      (
        (await api(anon, 'GET', 'gallery?sort=examples')).json.items as {
          id: string;
          likes: number;
        }[]
      ).map((r) => [r.id, r.likes]),
    );
  const exBefore = await exLikes();
  const bobDel = await api(bob, 'DELETE', 'me');
  const afterDel = (await api(anon, 'GET', 'gallery?q=%40bob_g')).json.items;
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

  // ---- CHG-0035 (owner, 2026-11-17): signed out, SAVE / SHARE has SIGN IN; signed in from there, SAVE opens again ----
  const newbie = await device(null);
  await newbie.page.evaluate(() => {
    (window as any).__bd_probe.scene.host.createBlock('ToneSource', 2, 2);
  });
  await newbie.page.mouse.click(5, 400);
  await newbie.page.waitForTimeout(300);
  await tab(newbie, 0);
  await newbie.page.evaluate(() =>
    (window as any).__bd_probe.scene.PatchesPanel.setTitle('Newbie Song'),
  );
  await newbie.page.mouse.move(5, 5);
  await newbie.page.waitForTimeout(300);
  await newbie.page.screenshot({ path: `${OUT}/save-sign-in.png` });
  await press(newbie, 'signIn', 1200);
  const asked = await newbie.page.evaluate(() => {
    const s = (window as any).__bd_probe.scene;
    return {
      settings: s.SettingsPanel.Open,
      tab: s.SettingsPanel._OpenTab,
      patches: s.PatchesPanel.Open,
    };
  });
  const at = async (n: string) => {
    const c = await newbie.page.evaluate(
      (k) => (window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      n,
    );
    await newbie.page.mouse.click(c[0], c[1]);
    await newbie.page.waitForTimeout(400);
  };
  await newbie.page.waitForFunction(
    () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account !== undefined,
    null,
    { timeout: 10000 },
  );
  await at('passkey');
  await newbie.page.waitForFunction(
    () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'create',
    null,
    { timeout: 10000 },
  );
  await newbie.page.fill('#accountHandleInput', 'newbie_g');
  await at('submit');
  await newbie.page
    .waitForFunction(
      () => {
        const s = (window as any).__bd_probe.scene;
        return s.PatchesPanel.Open && s.PatchesPanel.Tab === 0;
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await newbie.page.waitForTimeout(800);
  const back = await newbie.page.evaluate(() => {
    const s = (window as any).__bd_probe.scene;
    return {
      patches: s.PatchesPanel.Open,
      tab: s.PatchesPanel.Tab,
      settings: s.SettingsPanel.Open,
      gallery: s.PatchesPanel.GalleryOn,
      signedIn: s.host.signedIn(),
      title: s.PatchesPanel.Title,
      signIn: s.PatchesPanel.centreOf('signIn'),
    };
  });
  check(
    'Signed out, SAVE / SHARE has SIGN IN; it opens Settings › SIGN IN, and once signed in SAVE opens again with ADD TO GALLERY on and the name kept (CHG-0035)',
    !!asked.settings &&
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
