// Reports hide a patch and the site owner reviews them with bd gallery (R9, R10), run by tests/e2e/gallery.ts.
import {
  OUT,
  check,
  device,
  P,
  type Cast,
  GALLERY,
  press,
  tab,
  search,
  api,
  bd,
} from './harness.ts';

export async function reportAndReview({
  aliceId,
  anon,
  bob,
}: Pick<Cast, 'aliceId' | 'anon' | 'bob'>): Promise<Pick<Cast, 'carol' | 'dave' | 'fay' | 'gus'>> {
  // ---- R9, R10: Settings › FEEDBACK › REPORT A PATCH reports the patch on the stage (CHG-0041: the right-click on the
  // credit is gone); five reports hide it; the site owner reviews with bd gallery ----
  const carol = await device('carol_g'),
    dave = await device('dave_g');
  for (const device of [bob, carol, dave]) {
    await tab(device, GALLERY);
    await search(device, '');
    const i = (await P(device)).items.findIndex((item: { id: string }) => item.id === aliceId);
    await press(device, `gopen${i}`, 2500);
    if (device === bob) {
      // Blocks on screen, not just in the patch (a right-click's press used to begin a pan that never ended).
      const onScreen = () =>
        device.page.evaluate(() => {
          const s = (window as any).__bd_probe;
          return s.state.blocks.filter((b: any) => {
            const p = s.blockPoint(b.id);
            return p && p[0] > 0 && p[0] < innerWidth && p[1] > 90 && p[1] < innerHeight - 90;
          }).length;
        });
      const c = await device.page.evaluate(() => (window as any).__bd_probe.corners);
      const before = await onScreen();
      await device.page.mouse.click(c.creditAt[0], c.creditAt[1], { button: 'right' });
      await device.page.waitForTimeout(900);
      await device.page.mouse.move(400, 500, { steps: 6 });
      await device.page.waitForTimeout(300);
      const after = await onScreen(),
        opened = await device.page.evaluate(
          () => (window as any).__bd_probe.scene.PatchesPanel.Open,
        );
      check(
        'CHG-0041: a right-click on the credit does nothing (no report; the stage stays put)',
        before > 0 && after === before && !opened,
        { before, after, opened },
      );
    }
    await device.page.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
      settingsPanel._OpenTab = 1;
      (settingsPanel.MenuItems as any[]).forEach((m, k) => {
        m.Selected = k === 1 ? 1 : 0;
        m.YOffset = k === 1 ? 0 : -settingsPanel.DrawTo.Height;
      });
      settingsPanel.OpenPanel();
    });
    await device.page.waitForTimeout(900);
    await device.page.getByRole('radio', { name: 'Report a patch' }).click();
    await device.page.waitForTimeout(300);
    if (device === bob) {
      const intro = await device.page.evaluate(
        () => document.getElementById('feedback-intro')!.textContent,
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
        const messagePanel = (window as any).__bd_probe.scene.MessagePanel;
        return { open: messagePanel.Open, text: messagePanel._Value?.string };
      });
      check(
        'R9: REPORT sends it; the message bar thanks you',
        bar.open && /reported/i.test(bar.text ?? ''),
        bar,
      );
    }
    await device.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await device.page.waitForTimeout(600);
  }
  const atThree = await api(anon, 'GET', 'gallery?sort=new');
  check(
    'R9 (security review, PR 13): three reports no longer hide it',
    atThree.json.items.some((item: { id: string }) => item.id === aliceId),
    atThree.json.items.map((item: { title: string }) => item.title),
  );
  const fay = await device('fay_g'),
    gus = await device('gus_g');
  const lastReports = [
    await api(fay, 'POST', `gallery/${aliceId}/report`, { reason: '' }),
    await api(gus, 'POST', `gallery/${aliceId}/report`, { reason: '' }),
  ];
  const after = await api(anon, 'GET', 'gallery?sort=new');
  check(
    'R9: reported by five people, it is hidden',
    lastReports.every((lastReport) => lastReport.status === 200) &&
      !after.json.items.some((item: { id: string }) => item.id === aliceId),
    after.json.items.map((item: { title: string }) => item.title),
  );
  const listed = bd('reports');
  check(
    'R10: bd gallery reports lists it with its reports',
    listed.reported.some(
      (r: { id: string; reports: number; hidden: number }) =>
        r.id === aliceId && r.reports === 5 && r.hidden === 1,
    ),
    listed,
  );
  bd('keep', aliceId);
  const kept = await api(anon, 'GET', 'gallery?sort=new');
  bd('hide', aliceId);
  const hidden = await api(anon, 'GET', 'gallery?sort=new');
  bd('keep', aliceId);
  check(
    'R10: keep shows it again; hide takes it out',
    kept.json.items.some((item: { id: string }) => item.id === aliceId) &&
      !hidden.json.items.some((item: { id: string }) => item.id === aliceId),
  );
  return { carol, dave, fay, gus };
}
