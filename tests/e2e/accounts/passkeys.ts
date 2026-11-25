// Passkey accounts on one device and a second (SPEC-SHARING-ACCOUNTS), run by
// tests/e2e/accounts.ts.
import {
  OUT,
  check,
  base,
  device,
  openApp,
  pp,
  press,
  openAccount,
  settled,
  corners,
  api,
  saveLink,
  addBlock,
  shared,
  sharedDevice,
  type AccountTests,
} from './harness.ts';

/** Points from top to bottom, all present. */
function inOrderDown(points: ([number, number] | null)[]): boolean {
  return points.every(
    (point, index) =>
      point !== null && (index === 0 || (points[index - 1]?.[1] ?? Infinity) < point[1]),
  );
}
import type { AppSettingsPanel } from '../pageGlobals.ts';

export const passkeyTests: AccountTests = {
  /** R1, R3, R6, R9, R13: CONTINUE WITH PASSKEY on a device with none asks a name, makes the
   * account and claims the patch saved before; the cookie is HttpOnly; name rules hold. */
  async 'passkey-account'() {
    const a = await device();
    await openApp(a, '?demo');
    await (async () => {
      for (let i = 0; i < 8 && !(await pp(a.page)).open; i++) {
        await a.page.mouse.move(1138, 45);
        await a.page.mouse.click(1138, 45);
        await a.page.waitForTimeout(700);
      }
    })();
    const before = await saveLink(a.page); // anonymous: this browser holds its edit token
    await openAccount(a.page);
    const ways = await a.page.evaluate(() =>
      ['google', 'apple', 'passkey'].map((k) =>
        (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountCentre(k),
      ),
    );
    check(
      'signed out: Settings › SIGN IN offers Google, Apple and a passkey, in that order (owner review 2)',
      (await pp(a.page)).account === null &&
        (await pp(a.page)).tabName === 'SIGN IN' &&
        inOrderDown(ways),
      { p: await pp(a.page), ways },
    );
    const noCreate = await a.page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountCentre('create'),
    );
    await press(a.page, 'passkey');
    await settled(a.page);
    const asked = await pp(a.page);
    check(
      'R1, R13: one CONTINUE WITH PASSKEY, no CREATE ACCOUNT; with no passkey on the device it asks for a name (CHG-0035)',
      noCreate === null &&
        asked.view === 'create' &&
        asked.account === null &&
        asked.message.startsWith('No passkey was chosen'),
      { noCreate, asked },
    );
    await a.page.screenshot({ path: `${OUT}/continue-no-passkey.png` });
    await a.page.fill('#accountHandleInput', 'Admin');
    await press(a.page, 'submit');
    await settled(a.page);
    check(
      'R6: a reserved name is refused',
      (await pp(a.page)).message.includes('reserved'),
      (await pp(a.page)).message,
    );
    await a.page.fill('#accountHandleInput', 'tester_1');
    await press(a.page, 'submit');
    await settled(a.page);
    const st = await pp(a.page);
    check(
      'R1: CREATE WITH PASSKEY makes the account and signs in; the tab reads ACCOUNT',
      st.account?.handle === 'tester_1' && st.view === 'main' && st.tabName === 'ACCOUNT',
      st,
    );
    check(
      'R7, R13: ACCOUNT lists its ways in (1 passkey) and offers ADD ANOTHER PASSKEY (CHG-0035)',
      st.methods.join(',') === '1 passkey' && st.addLabel === 'Add Another Passkey',
      st,
    );
    await a.page.evaluate(() => {
      const scene = window.__bd_probe.scene;
      scene.SettingsPanel.ClosePanel();
      scene.PatchesPanel.ClosePanel();
    });
    await a.page.waitForTimeout(700);
    const signedInCorners = await corners(a.page);
    check(
      'R14: the stage says who is signed in; pressing it opens Settings › ACCOUNT',
      signedInCorners.me === 'tester_1' && !!signedInCorners.meAt,
      signedInCorners,
    );
    const { meAt } = signedInCorners;
    if (!meAt) throw new Error('no signed-in name on the stage');
    await a.page.mouse.click(meAt[0], meAt[1]);
    await a.page.waitForTimeout(900);
    check('… it does', (await pp(a.page)).settings);
    const cookie = (await a.ctx.cookies()).find((each) => each.name === 'bd_session');
    check(
      'R3: the session is an HttpOnly, SameSite=Lax cookie the page cannot read',
      !!cookie &&
        cookie.httpOnly &&
        cookie.sameSite === 'Lax' &&
        !(await a.page.evaluate(() => document.cookie)).includes('bd_session'),
      cookie && { httpOnly: cookie.httpOnly, sameSite: cookie.sameSite },
    );
    const mine = await api(a, 'GET', 'me/patches');
    check(
      "R9: the patch saved before signing up is the account's now",
      mine.status === 200 && (mine.json?.patches?.some((patch) => patch.id === before) ?? false),
      mine.json,
    );
    const taken = await api(a, 'POST', 'auth/passkey/register/options', {
      handle: 'tester_1',
      turnstile: 'ok',
    });
    // Signed in, register/options adds a passkey to this account instead; ask as a signed-out
    // client.
    const anon = await device();
    await anon.page.goto(`${base}/api/config`);
    const sameIgnoringCase = await api(
      anon,
      'POST',
      'auth/passkey/register/options',
      { handle: 'TESTER_1', turnstile: 'ok' },
      { origin: base },
    );
    const rude = await api(
      anon,
      'POST',
      'auth/passkey/register/options',
      { handle: 'b1tch_1', turnstile: 'ok' },
      { origin: base },
    );
    const fine = await api(
      anon,
      'POST',
      'auth/passkey/register/options',
      { handle: 'grape_scunthorpe', turnstile: 'ok' },
      { origin: base },
    );
    const bot = await api(
      anon,
      'POST',
      'auth/passkey/register/options',
      { handle: 'new_one', turnstile: 'fail' },
      { origin: base },
    );
    check(
      'R6: names are unique ignoring case; rude ones refused; innocent ones allowed; R1: the bot check applies',
      taken.status === 200 &&
        sameIgnoringCase.status === 409 &&
        rude.status === 400 &&
        fine.status === 200 &&
        bot.status === 403,
      [taken.status, sameIgnoringCase.status, rude.status, fine.status, bot.status],
    );
    // Can someone claim another's patch knowing only its id? No: a claim needs the patch's edit
    // token (only its hash is stored), and a patch with an owner is never claimed.
    const theirs = await api(
      anon,
      'POST',
      'patches',
      {
        turnstile: 'ok',
        patch: {
          format: 'blokdust.patch',
          version: 2,
          seed: 1,
          blocks: [{ id: 'a', type: 'source.tone', x: 0, y: 0 }],
        },
        title: 'Not yours',
      },
      { origin: base },
    );
    const guess = await api(
      a,
      'POST',
      'me/claim',
      { patches: [{ id: theirs.json?.id, token: 'A'.repeat(32) }] },
      { origin: base },
    );
    const owned = await api(
      a,
      'POST',
      'me/claim',
      { patches: [{ id: before, token: 'A'.repeat(32) }] },
      { origin: base },
    );
    check(
      'R9: an id without its edit token claims nothing',
      theirs.status === 201 &&
        guess.status === 200 &&
        guess.json?.claimed?.length === 0 &&
        owned.status === 200 &&
        owned.json?.claimed?.length === 0,
      { theirs: theirs.status, guess: guess.json, owned: owned.json },
    );
    await anon.ctx.close();
    shared.a = a;
    shared.firstPatch = before;
  },

  /** R2, R4, R8, R9: SIGN OUT, then SIGN IN WITH PASSKEY; a second device with the synced passkey
   * opens the account's patch and SAVEs over the same link without its edit token. */
  async 'second-device'() {
    const a = sharedDevice('a');
    await openAccount(a.page);
    await press(a.page, 'signOut');
    await settled(a.page);
    const out = await api(a, 'GET', 'me');
    check(
      'R4: SIGN OUT ends the session',
      out.json?.user === null && (await pp(a.page)).account === null,
    );
    await press(a.page, 'passkey');
    await settled(a.page);
    await a.page.waitForTimeout(700);
    check(
      'R2: SIGN IN WITH PASSKEY (no name needed), then back to the stage',
      (await pp(a.page)).account?.handle === 'tester_1' && !(await pp(a.page)).settings,
      await pp(a.page),
    );

    // The passkey syncs to another device (iCloud Keychain, Google Password Manager): copy it to
    // device B.
    const b = await device();
    const { credentials } = await a.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: a.authenticator,
    });
    for (const credential of credentials)
      await b.cdp.send('WebAuthn.addCredential', { authenticatorId: b.authenticator, credential });
    await openApp(b);
    await openAccount(b.page);
    await press(b.page, 'passkey');
    await settled(b.page);
    check(
      'R2: the synced passkey signs in on device B',
      (await pp(b.page)).account?.handle === 'tester_1',
    );
    // Signed in, the page is back on the stage (owner review 2026-11-15): open Patches › OPEN.
    for (let i = 0; i < 8 && !(await pp(b.page)).open; i++) {
      await b.page.mouse.move(1138, 45);
      await b.page.mouse.click(1138, 45);
      await b.page.waitForTimeout(700);
    }
    await b.page.waitForTimeout(600);
    await press(b.page, 'tab1', 1500);
    const rows = await b.page.evaluate(() => window.__bd_probe.scene.PatchesPanel.Items);
    const row = rows.findIndex((row) => row.key === `acct:${shared.firstPatch}`);
    check(
      'R8: OPEN lists the account\'s patches first, with when they were saved (no "Your account": owner, 2026-11-18)',
      row === 0 && rows[0].detail.startsWith('Saved'),
      rows.slice(0, 3),
    );
    await press(b.page, 'open0', 2500);
    const opened = await b.page.evaluate(() => ({
      id: window.__bd_probe.v1App.CompositionId,
      url: location.search,
    }));
    await b.page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.ClosePanel();
    });
    await b.page.waitForTimeout(600);
    await addBlock(b.page);
    await (async () => {
      for (let i = 0; i < 8 && !(await pp(b.page)).open; i++) {
        await b.page.mouse.move(1138, 45);
        await b.page.mouse.click(1138, 45);
        await b.page.waitForTimeout(700);
      }
    })();
    const saved = await saveLink(b.page);
    const latest = await api(b, 'GET', `patches/${saved}`);
    check(
      'R9: device B saves over the same link (no edit token there)',
      opened.id === shared.firstPatch && saved === shared.firstPatch && latest.json?.rev === 2,
      { opened, saved, rev: latest.json?.rev },
    );
    shared.b = b;
  },
};
