// Google and Apple sign-in, and linking or removing sign-in methods, run by tests/e2e/accounts.ts.
import {
  OUT,
  check,
  mocks,
  base,
  device,
  openApp,
  pp,
  press,
  openAccount,
  settled,
  corners,
  googleAccount,
  api,
  type AccountTests,
} from './harness.ts';

export const signInMethodTests: AccountTests = {
  /** R2a, R6: Sign in with Google (PKCE S256); a new Google account picks its name; the callback refuses a wrong state. */
  async google() {
    const c = await device();
    await fetch(`${mocks.url}/google/next?user=carol`);
    await openApp(c);
    await openAccount(c.page);
    await Promise.all([
      c.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(c.page, 'google', 0),
    ]);
    await c.page.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 20000 });
    // Back from Google (owner review 2026-11-15): no START and no intro; a new account names itself in Settings at once.
    await c.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
          return (
            settingsPanel.Open &&
            settingsPanel.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'name'
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const auth = mocks.googleAuths.at(-1);
    check(
      'R2a: PKCE S256 with our client id',
      auth?.method === 'S256' && !!auth.challenge && auth.client === 'test-google-client',
      auth,
    );
    check(
      'R2a: back from Google there is no start screen',
      !(await c.page.$('#start')) &&
        !(await c.page.evaluate(() => location.search.includes('account='))),
    );
    check(
      'R6: a new Google account is asked for a name in Settings',
      (await pp(c.page)).view === 'name' && (await pp(c.page)).settings === true,
      await pp(c.page),
    );
    await c.page.fill('#accountHandleInput', 'carol_g');
    await press(c.page, 'submit');
    await settled(c.page);
    check(
      '… and has it',
      (await pp(c.page)).account?.handle === 'carol_g' &&
        (await pp(c.page)).account?.providers.includes('google'),
      await pp(c.page),
    );
    const g = await pp(c.page);
    check(
      "R13: a Google account's ways in read Google, and its button ADD PASSKEY (CHG-0035)",
      g.methods.join(',') === 'Google' && g.addLabel === 'Add Passkey',
      g,
    );
    await press(c.page, 'methods');
    await press(c.page, 'addPasskey');
    await settled(c.page);
    const g2 = await pp(c.page);
    check(
      'R7: ADD PASSKEY adds one to the Google account: no message, the methods line reads Google · 1 passkey, ADD ANOTHER PASSKEY',
      g2.message === '' &&
        g2.methods.join(',') === 'Google,1 passkey' &&
        g2.addLabel === 'Add Another Passkey',
      g2,
    );
    await c.page.screenshot({ path: `${OUT}/account-methods.png` });
    await press(c.page, 'methodsBack');
    // The same Google account again, on another device: the same BlokDust account, straight to the stage.
    const d = await device();
    await openApp(d);
    await openAccount(d.page);
    await Promise.all([
      d.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(d.page, 'google', 0),
    ]);
    await d.page
      .waitForFunction(() => (window as any).__bd_probe?.corners?.me === 'carol_g', null, {
        timeout: 20000,
      })
      .catch(() => {});
    check(
      'R2a: the same Google account signs in to the same account, no panel in the way',
      (await corners(d.page)).me === 'carol_g' &&
        !(await pp(d.page)).settings &&
        !(await pp(d.page)).open,
      { c: await corners(d.page), p: await pp(d.page) },
    );
    const response = await fetch(`${base}/api/auth/google/callback?code=x&state=wrong`, {
      redirect: 'manual',
      headers: { cookie: 'bd_oauth=right.verifier.%2F' },
    });
    check(
      'R2a: a callback whose state does not match is refused',
      response.status === 400,
      response.status,
    );
    // Security review (PR 13): the return path must stay on this site. The URL parser drops tabs and newlines, so
    // "/<TAB>/evil.example" used to pass the "starts with / but not //" check and then resolve to evil.example.
    // One real start (sign-in starts are rate limited); then the callback, which does the redirect, is replayed with
    // each return path in its cookie, as a start that let it through would have stored it.
    const start = await fetch(
      `${base}/api/auth/google/start?return=${encodeURIComponent('/\t/evil.example')}`,
      { redirect: 'manual' },
    );
    const [oauthName, oauthValue] = (
      start.headers
        .getSetCookie()
        .map((s) => s.split(';')[0])
        .find((s) => /^(__Host-)?bd_oauth=/.test(s)) ?? '='
    ).split('=');
    const [state, verifier] = oauthValue.split('.');
    const consent = new URL(
      (await fetch(start.headers.get('location')!, { redirect: 'manual' })).headers.get(
        'location',
      )!,
    );
    const landOf = async (back: string | null): Promise<string> => {
      const cookie =
        back === null
          ? `${oauthName}=${oauthValue}`
          : `${oauthName}=${state}.${verifier}.${encodeURIComponent(back)}`;
      return (
        (await fetch(consent, { redirect: 'manual', headers: { cookie } })).headers.get(
          'location',
        ) ?? ''
      );
    };
    const here = new URL(base).host,
      tricks = [
        null,
        '/\t/evil.example',
        '/\n/evil.example',
        '/\r\n/evil.example',
        '//evil.example',
        '/\\evil.example',
        '/\t\\evil.example',
        'https://evil.example/',
      ];
    const landed = await Promise.all(tricks.map(landOf));
    check(
      'R2a: the return path after sign-in never leaves this site (tab, newline, backslash and // tricks)',
      landed.every((l) => !!l && new URL(l).host === here),
      landed,
    );
    const kept = await landOf('/?c=abcdefghij&t=Song');
    check(
      '… and an ordinary path on this site is kept',
      new URL(kept).host === here &&
        new URL(kept).searchParams.get('c') === 'abcdefghij' &&
        new URL(kept).searchParams.get('t') === 'Song',
      kept,
    );
    await c.ctx.close();
    await d.ctx.close();
  },

  /** R2b: Sign in with Apple (no scopes, query response; client secret signed with the key); a new account picks its name. */
  async apple() {
    const e = await device();
    await fetch(`${mocks.url}/google/next?user=erin`); // the mock's next user, for Apple too
    await openApp(e);
    await openAccount(e.page);
    await Promise.all([
      e.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(e.page, 'apple', 0),
    ]);
    await e.page.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 20000 });
    await e.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
          return (
            settingsPanel.Open &&
            settingsPanel.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'name'
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const auth = mocks.appleAuths.at(-1);
    check(
      'R2b: Apple is asked for no name or email, answering by redirect, with our Services ID',
      auth?.mode === 'query' && !auth.scope && auth.client === 'test-apple-client',
      auth,
    );
    check(
      'R2b: the client secret is an ES256 JWT signed with the key',
      mocks.appleSecrets.length > 0 && mocks.appleSecrets.every(Boolean),
      mocks.appleSecrets,
    );
    check(
      'R2b, R6: a new Apple account is asked for a name in Settings',
      (await pp(e.page)).view === 'name' && (await pp(e.page)).settings === true,
      await pp(e.page),
    );
    await e.page.fill('#accountHandleInput', 'erin_a');
    await press(e.page, 'submit');
    await settled(e.page);
    check(
      '… and has it, with Apple as its way in',
      (await pp(e.page)).account?.handle === 'erin_a' &&
        (await pp(e.page)).account?.providers.includes('apple'),
      await pp(e.page),
    );
    const response = await fetch(`${base}/api/auth/apple/callback?code=x&state=s`, {
      redirect: 'manual',
      headers: { cookie: 'bd_oauth=s.verifier.%2F' },
    });
    check(
      "R2b: a Google sign-in's cookie is no good for Apple's callback",
      response.status === 400,
      response.status,
    );
    await e.ctx.close();
  },

  /** R7a–R7c (CHG-0039, owner 2026-11-19): signed in, SIGN-IN METHODS lists the ways in, adds Google, Apple or a
   * passkey to the same account, and removes one; never the last. A Google or Apple account that already belongs to
   * another BlokDust account is refused, and you stay signed in as you were. */
  async 'link-and-remove-methods'() {
    // Mia's account owns the Google identity "mia" (another device).
    const m = await device();
    await googleAccount(m, 'mia', 'mia_g');
    // Lena: a Google account.
    const l = await device();
    await googleAccount(l, 'lena', 'lena_g');
    await press(l.page, 'methods');
    const one = await pp(l.page);
    const noRemove = await l.page.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.accountCentre('remove0'),
    );
    check(
      'R7a: SIGN-IN METHODS lists Google; the only way in has no REMOVE',
      one.view === 'methods' && one.rows.join(',') === 'Google' && noRemove === null,
      { one, noRemove },
    );
    await l.page.screenshot({ path: `${OUT}/methods-one.png` });
    // ADD APPLE: Apple's "lena_apple" joins Lena's account; back on the methods page, it says so.
    await fetch(`${mocks.url}/google/next?user=lena_apple`);
    await Promise.all([
      l.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(l.page, 'addApple', 0),
    ]);
    await l.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene.SettingsPanel,
            x = settingsPanel?.accountPage;
          return (
            settingsPanel?.OffsetY === 0 &&
            x?.View === 'methods' &&
            x.Account?.providers?.includes('apple')
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await l.page.waitForTimeout(400);
    const two = await pp(l.page);
    check(
      'R7a: ADD APPLE adds Apple to the same account, and says so',
      two.account?.handle === 'lena_g' &&
        two.rows.join(',') === 'Google,Apple' &&
        two.message === 'Apple added.',
      two,
    );
    // ADD GOOGLE with Mia's Google: refused, still Lena, nothing added.
    await fetch(`${mocks.url}/google/next?user=mia`);
    await press(l.page, 'remove0');
    await settled(l.page); // Lena's own Google goes first, so ADD GOOGLE shows
    await Promise.all([
      l.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(l.page, 'addGoogle', 0),
    ]);
    await l.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene.SettingsPanel;
          return (
            settingsPanel?.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'methods' &&
            settingsPanel.accountPage.Account
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await l.page.waitForTimeout(800);
    const taken = await pp(l.page);
    check(
      'R7b: a Google account used by another BlokDust account is refused; still signed in as Lena; nothing added',
      taken.account?.handle === 'lena_g' &&
        taken.rows.join(',') === 'Apple' &&
        /already used by another BlokDust account/.test(taken.message),
      taken,
    );
    const miaStill = await api(m, 'GET', 'me');
    check(
      '… and Mia keeps her Google',
      miaStill.json?.user?.handle === 'mia_g' && miaStill.json?.user?.providers.includes('google'),
      miaStill.json,
    );
    // ADD PASSKEY, then REMOVE it again; then the last way in can't be removed (the page hides REMOVE; the API refuses).
    await press(l.page, 'addPasskey');
    await settled(l.page);
    const withKey = await pp(l.page);
    await l.page.screenshot({ path: `${OUT}/methods-two.png` });
    await press(l.page, 'remove1');
    await settled(l.page);
    const back = await pp(l.page);
    check(
      'R7c: a passkey added and removed',
      withKey.rows.length === 2 &&
        withKey.rows[1].startsWith('Passkey') &&
        back.rows.join(',') === 'Apple',
      { withKey, back },
    );
    const last = await api(l, 'DELETE', 'me/methods', { kind: 'apple' });
    check(
      'R7c: the last way in is never removed (409)',
      last.status === 409 && (await pp(l.page)).rows.join(',') === 'Apple',
      last,
    );
    // Leaving SIGN-IN METHODS (×, another tab) brings the account back on its own page (owner, 2026-11-19).
    await l.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await l.page.waitForTimeout(800);
    await openAccount(l.page);
    const reopened = (await pp(l.page)).view;
    check(
      '… leaving SIGN-IN METHODS and coming back shows the account page',
      reopened === 'main',
      reopened,
    );
    const cross = await fetch(`${base}/api/me/methods`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'apple' }),
    });
    check("R5: removing needs this site's Origin", cross.status === 403, cross.status);
    await m.ctx.close();
    await l.ctx.close();
  },
};
