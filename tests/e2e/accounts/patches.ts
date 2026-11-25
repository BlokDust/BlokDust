// The account's patches listed and deleted, sign out everywhere and delete the account, run by
// tests/e2e/accounts.ts.
import {
  OUT,
  check,
  base,
  openApp,
  pp,
  press,
  openAccount,
  settled,
  api,
  saveLink,
  shared,
  sharedDevice,
  type AccountTests,
} from './harness.ts';
import type { PatchesPanelState } from '../pageGlobals.shared.ts';

export const patchTests: AccountTests = {
  /** R8, R8a: signed in, OPEN lists each account patch once, each with a bin; deleting one makes
   * its link answer 410 and unlinks the stage from it. */
  async 'open-list-delete'() {
    const a = sharedDevice('a');
    await openApp(a);
    await a.page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      scene.host.resetScene();
      scene.host.createBlock('ToneSource', 2, 2);
      scene.PatchesPanel.setTitle('Doomed song');
    });
    await a.page.waitForTimeout(400);
    await (async () => {
      for (let i = 0; i < 8 && !(await pp(a.page)).open; i++) {
        await a.page.mouse.move(1138, 45);
        await a.page.mouse.click(1138, 45);
        await a.page.waitForTimeout(700);
      }
    })();
    const id = await saveLink(a.page);
    await press(a.page, 'tab1', 1500);
    const rows = await a.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Items);
    const acctIds = new Set(
      rows.filter((row) => row.key.startsWith('acct:')).map((row) => row.key.slice(5)),
    );
    const twice = rows.filter(
      (row) => row.key.startsWith('mine:') && row.link && acctIds.has(row.link),
    );
    const rowIndex = rows.findIndex((row) => row.key === `acct:${id}`);
    check(
      'R8: signed in, OPEN lists each account patch once, each with a bin (no second copy from this browser)',
      rowIndex >= 0 &&
        !twice.length &&
        rows.filter((row) => row.key.startsWith('acct:')).every((row) => row.removable),
      { rows: rows.map((row) => row.key), twice },
    );
    await a.page.evaluate((index) => {
      const panel = window.__bd_probe.scene.PatchesPanel;
      panel.OpenScroll = 0;
      panel.scrollOpen(Math.max(0, index - 2) * 40 * window.__bd_probe.v1App.Unit);
    }, rowIndex);
    await a.page.waitForTimeout(200);
    await press(a.page, `bin${rowIndex}`, 500);
    const line = await a.page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      const { removing } = scene.PatchesPanel as unknown as PatchesPanelState;
      return removing ? scene.host.removeLine(removing) : '';
    });
    await a.page.screenshot({ path: `${OUT}/delete-asks.png` });
    await press(a.page, 'removeOk', 1500);
    const gone = await api(a, 'GET', `patches/${id}`);
    const after = await a.page.evaluate(() => ({
      keys: window.__bd_probe.scene.PatchesPanel.Items.map((row) => row.key),
      comp: window.__bd_probe.v1App.CompositionId,
      url: location.search,
    }));
    check(
      'R8a: DELETE asks first, saying the link and gallery stop working; then the link answers 410 and the stage patch is unlinked',
      /no longer be able to open this save\. If it.s published, it will also be removed from the gallery\./.test(
        line,
      ) &&
        gone.status === 410 &&
        !after.keys.includes(`acct:${id}`) &&
        !after.keys.includes('mine:Doomed song') &&
        after.comp === null &&
        !after.url.includes(id),
      { line, status: gone.status, after },
    );
    await a.page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.ClosePanel();
    });
    await a.page.waitForTimeout(700);
  },

  /** R4, R10: SIGN OUT EVERYWHERE ends device B's session too; DELETE ACCOUNT removes the
   * account and its patches. */
  async 'sign-out-everywhere-and-delete'() {
    const a = sharedDevice('a'),
      b = sharedDevice('b');
    await api(a, 'POST', 'auth/logout', { everywhere: true }, { origin: base });
    const bMe = await api(b, 'GET', 'me');
    await openAccount(a.page);
    check(
      'R4: signing out everywhere (the API) ends every session',
      bMe.json?.user === null && (await pp(a.page)).account === null,
    );
    // The passkey manager syncs B's use back to A (its signature counter moved on there): copy it
    // back. Without this the server rightly refuses A's older counter as a possibly cloned key.
    const { credentials } = await b.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: b.authenticator,
    });
    await a.cdp.send('WebAuthn.clearCredentials', { authenticatorId: a.authenticator });
    for (const credential of credentials)
      await a.cdp.send('WebAuthn.addCredential', { authenticatorId: a.authenticator, credential });
    await press(a.page, 'passkey');
    await settled(a.page);
    const signedIn = await pp(a.page);
    await a.page
      .waitForFunction(() => !window.__bd_probe.scene.SettingsPanel.Open, null, {
        timeout: 5000,
      })
      .catch(() => {});
    await a.page.waitForTimeout(600); // its slide away ends (v1's panel tween)
    await openAccount(a.page); // signing in went back to the stage
    await press(a.page, 'deleteAccount', 500);
    // Owner (2026-11-18): closing Settings (×) while it asks is CANCEL: it opens on the account
    // next time.
    await a.page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.ClosePanel();
    });
    await a.page.waitForTimeout(700);
    await openAccount(a.page);
    const reopened = (await pp(a.page)).view;
    await press(a.page, 'deleteAccount', 500);
    check(
      'DELETE ACCOUNT asks first; closing Settings while it asks is CANCEL',
      (await pp(a.page)).view === 'delete' && reopened === 'main',
      { signedIn, reopened, now: await pp(a.page) },
    );
    await press(a.page, 'deleteOk');
    await settled(a.page);
    const gone = await api(a, 'GET', `patches/${shared.firstPatch}`),
      me = await api(a, 'GET', 'me');
    const again = await api(a, 'POST', 'auth/passkey/login/options', {}, { origin: base });
    check(
      'R10: the account and its patches are gone (their links answer 410: deleted)',
      me.json?.user === null && gone.status === 410 && again.status === 200,
      [me.json, gone.status],
    );
    await a.ctx.close();
    await b.ctx.close();
  },
};
