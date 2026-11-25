// Reports hide a patch and the site owner reviews them with bd gallery (R9, R10), run by
// tests/e2e/gallery.ts.
import {
  OUT,
  check,
  device,
  panelState,
  type Cast,
  GALLERY,
  press,
  tab,
  search,
  api,
  bd,
  galleryItems,
} from './harness.ts';
import type { MessageBarState, SettingsTabState } from '../pageGlobals.ts';
import { located } from '../located.ts';

export async function reportAndReview({
  aliceId,
  anon,
  bob,
}: Pick<Cast, 'aliceId' | 'anon' | 'bob'>): Promise<Pick<Cast, 'carol' | 'dave' | 'fay' | 'gus'>> {
  // ---- R9, R10: Settings › FEEDBACK › REPORT A PATCH reports the patch on the stage (CHG-0041);
  // five reports hide it; the site owner reviews them with bd gallery ----
  const carol = await device('carol_g'),
    dave = await device('dave_g');
  for (const device of [bob, carol, dave]) {
    await tab(device, GALLERY);
    await search(device, '');
    const i = (await panelState(device)).items.findIndex((item) => item.id === aliceId);
    await press(device, `gopen${i}`, 2500);
    if (device === bob) {
      // Blocks on screen, not just in the patch (a right-click's press used to begin a pan that
      // never ended).
      const onScreen = () =>
        device.page.evaluate(() => {
          const probe = window.__bd_probe;
          return probe.state.blocks.filter((block) => {
            const at = probe.blockPoint(block.id);
            return at && at[0] > 0 && at[0] < innerWidth && at[1] > 90 && at[1] < innerHeight - 90;
          }).length;
        });
      const creditAt = located(
        await device.page.evaluate(() => window.__bd_probe.corners.creditAt),
        'the credit',
      );
      const before = await onScreen();
      await device.page.mouse.click(creditAt[0], creditAt[1], { button: 'right' });
      await device.page.waitForTimeout(900);
      await device.page.mouse.move(400, 500, { steps: 6 });
      await device.page.waitForTimeout(300);
      const after = await onScreen(),
        opened = await device.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Open);
      check(
        'CHG-0041: a right-click on the credit does nothing (no report; the stage stays put)',
        before > 0 && after === before && !opened,
        { before, after, opened },
      );
    }
    await device.page.evaluate(() => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel;
      (settingsPanel as unknown as SettingsTabState)._OpenTab = 1;
      settingsPanel.MenuItems.forEach((item, index) => {
        item.Selected = index === 1 ? 1 : 0;
        item.YOffset = index === 1 ? 0 : -(settingsPanel.DrawTo as { Height: number }).Height;
      });
      settingsPanel.OpenPanel();
    });
    await device.page.waitForTimeout(900);
    await device.page.getByRole('radio', { name: 'Report a patch' }).click();
    await device.page.waitForTimeout(300);
    if (device === bob) {
      const intro = await device.page.evaluate(
        () => document.getElementById('feedback-intro')?.textContent,
      );
      await device.page.mouse.move(5, 5);
      await device.page.waitForTimeout(300);
      await device.page.screenshot({ path: `${OUT}/report-feedback.png` });
      check(
        'CHG-0041: FEEDBACK › REPORT A PATCH names the patch on the stage and its maker, without saying how many reports hide it',
        /GLASS RAIN/i.test(intro ?? '') &&
          (intro ?? '').includes('@alice_g') &&
          !/three|five|hidden/i.test(intro ?? ''),
        intro,
      );
      await device.page.locator('#feedback-message').fill('Painfully loud');
    }
    await device.page.click('#feedback-send');
    await device.page
      .getByRole('status')
      .filter({ hasText: 'reported' })
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    if (device === bob) {
      const bar = await device.page.evaluate(() => {
        const messagePanel = window.__bd_probe.scene.MessagePanel as unknown as MessageBarState;
        return { open: messagePanel.Open, text: messagePanel._Value?.string };
      });
      check(
        'R9: REPORT sends it; the message bar thanks you',
        bar.open && /reported/i.test(bar.text ?? ''),
        bar,
      );
    }
    await device.page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.ClosePanel();
    });
    await device.page.waitForTimeout(600);
  }
  const atThree = await galleryItems(anon, 'sort=new');
  check(
    'R9 (security review, PR 13): three reports no longer hide it',
    atThree.some((item) => item.id === aliceId),
    atThree.map((item) => item.title),
  );
  const fay = await device('fay_g'),
    gus = await device('gus_g');
  const lastReports = [
    await api(fay, 'POST', `gallery/${aliceId}/report`, { reason: '' }),
    await api(gus, 'POST', `gallery/${aliceId}/report`, { reason: '' }),
  ];
  const after = await galleryItems(anon, 'sort=new');
  check(
    'R9: reported by five people, it is hidden',
    lastReports.every((lastReport) => lastReport.status === 200) &&
      !after.some((item) => item.id === aliceId),
    after.map((item) => item.title),
  );
  const listed = bd('reports');
  check(
    'R10: bd gallery reports lists it with its reports',
    (listed.reported ?? []).some(
      (row) => row.id === aliceId && row.reports === 5 && row.hidden === 1,
    ),
    listed,
  );
  bd('keep', aliceId);
  const kept = await galleryItems(anon, 'sort=new');
  bd('hide', aliceId);
  const hidden = await galleryItems(anon, 'sort=new');
  bd('keep', aliceId);
  check(
    'R10: keep shows it again; hide takes it out',
    kept.some((item) => item.id === aliceId) && !hidden.some((item) => item.id === aliceId),
  );
  return { carol, dave, fay, gus };
}
