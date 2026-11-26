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
import { locationOf } from '../located.ts';
import type { AppSettingsPanel } from '../pageGlobals.ts';

export const signInMethodTests: AccountTests = {
  /** R2a, R6: Sign in with Google (PKCE S256); a new Google account picks its name; the callback
   * refuses a wrong state. */
  async google() {
    const carol = await device();
    await fetch(`${mocks.url}/google/next?user=carol`);
    await openApp(carol);
    await openAccount(carol.page);
    await Promise.all([
      carol.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(carol.page, 'google', 0),
    ]);
    await carol.page.waitForFunction(() => window.__bd_probe, null, { timeout: 20000 });
    // Back from Google (owner review 2026-11-15): no START and no intro; a new account names itself
    // in Settings at once.
    await carol.page
      .waitForFunction(
        () => {
          const settingsPanel = window.__bd_probe.scene.SettingsPanel as AppSettingsPanel;
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
      !(await carol.page.$('#start')) &&
        !(await carol.page.evaluate(() => location.search.includes('account='))),
    );
    check(
      'R6: a new Google account is asked for a name in Settings',
      (await pp(carol.page)).view === 'name' && (await pp(carol.page)).settings,
      await pp(carol.page),
    );
    await carol.page.fill('#accountHandleInput', 'carol_g');
    await press(carol.page, 'submit');
    await settled(carol.page);
    check(
      '… and has it',
      (await pp(carol.page)).account?.handle === 'carol_g' &&
        (await pp(carol.page)).account?.providers.includes('google') === true,
      await pp(carol.page),
    );
    const googleState = await pp(carol.page);
    check(
      "R13: a Google account's ways in read Google, and its button ADD PASSKEY (CHG-0035)",
      googleState.methods.join(',') === 'Google' && googleState.addLabel === 'Add Passkey',
      googleState,
    );
    await press(carol.page, 'methods');
    await press(carol.page, 'addPasskey');
    await settled(carol.page);
    const g2 = await pp(carol.page);
    check(
      'R7: ADD PASSKEY adds one to the Google account: no message, the methods line reads Google · 1 passkey, ADD ANOTHER PASSKEY',
      g2.message === '' &&
        g2.methods.join(',') === 'Google,1 passkey' &&
        g2.addLabel === 'Add Another Passkey',
      g2,
    );
    await carol.page.screenshot({ path: `${OUT}/account-methods.png` });
    await press(carol.page, 'methodsBack');
    // The same Google account again, on another device: the same BlokDust account, straight to the
    // stage.
    const carolElsewhere = await device();
    await openApp(carolElsewhere);
    await openAccount(carolElsewhere.page);
    await Promise.all([
      carolElsewhere.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(carolElsewhere.page, 'google', 0),
    ]);
    await carolElsewhere.page
      .waitForFunction(
        () => '__bd_probe' in window && window.__bd_probe.corners.me === 'carol_g',
        null,
        {
          timeout: 20000,
        },
      )
      .catch(() => {});
    check(
      'R2a: the same Google account signs in to the same account, no panel in the way',
      (await corners(carolElsewhere.page)).me === 'carol_g' &&
        !(await pp(carolElsewhere.page)).settings &&
        !(await pp(carolElsewhere.page)).open,
      { c: await corners(carolElsewhere.page), p: await pp(carolElsewhere.page) },
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
    // Security review (PR 13): the URL parser drops tabs and newlines, so "/<TAB>/evil.example"
    // passed the "/ but not //" check. The callback is replayed with each return path.
    const start = await fetch(
      `${base}/api/auth/google/start?return=${encodeURIComponent('/\t/evil.example')}`,
      { redirect: 'manual' },
    );
    const [oauthName, oauthValue] = (
      start.headers
        .getSetCookie()
        .map((setCookie) => setCookie.split(';')[0])
        .find((cookie) => /^(__Host-)?bd_oauth=/.test(cookie)) ?? '='
    ).split('=');
    const [state, verifier] = oauthValue.split('.');
    const consent = new URL(locationOf(await fetch(locationOf(start), { redirect: 'manual' })));
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
      landed.every((land) => !!land && new URL(land).host === here),
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
    await carol.ctx.close();
    await carolElsewhere.ctx.close();
  },

  /** R2b: Sign in with Apple (no scopes, query response; client secret signed with the key); a
   * new account picks its name. */
  async apple() {
    const erin = await device();
    await fetch(`${mocks.url}/google/next?user=erin`); // the mock's next user, for Apple too
    await openApp(erin);
    await openAccount(erin.page);
    await Promise.all([
      erin.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(erin.page, 'apple', 0),
    ]);
    await erin.page.waitForFunction(() => window.__bd_probe, null, { timeout: 20000 });
    await erin.page
      .waitForFunction(
        () => {
          const settingsPanel = window.__bd_probe.scene.SettingsPanel as AppSettingsPanel;
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
      (await pp(erin.page)).view === 'name' && (await pp(erin.page)).settings,
      await pp(erin.page),
    );
    await erin.page.fill('#accountHandleInput', 'erin_a');
    await press(erin.page, 'submit');
    await settled(erin.page);
    check(
      '… and has it, with Apple as its way in',
      (await pp(erin.page)).account?.handle === 'erin_a' &&
        (await pp(erin.page)).account?.providers.includes('apple') === true,
      await pp(erin.page),
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
    await erin.ctx.close();
  },

  /** R7a–R7c (CHG-0039): SIGN-IN METHODS adds Google, Apple or a passkey and removes one, never the
   * last; a Google or Apple identity of another account is refused and you stay signed in. */
  async 'link-and-remove-methods'() {
    // Mia's account owns the Google identity "mia" (another device).
    const mia = await device();
    await googleAccount(mia, 'mia', 'mia_g');
    // Lena: a Google account.
    const lena = await device();
    await googleAccount(lena, 'lena', 'lena_g');
    await press(lena.page, 'methods');
    const one = await pp(lena.page);
    const noRemove = await lena.page.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountCentre('remove0'),
    );
    check(
      'R7a: SIGN-IN METHODS lists Google; the only way in has no REMOVE',
      one.view === 'methods' && one.rows.join(',') === 'Google' && noRemove === null,
      { one, noRemove },
    );
    await lena.page.screenshot({ path: `${OUT}/methods-one.png` });
    // ADD APPLE: Apple's "lena_apple" joins Lena's account; back on the methods page, it says so.
    await fetch(`${mocks.url}/google/next?user=lena_apple`);
    await Promise.all([
      lena.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(lena.page, 'addApple', 0),
    ]);
    await lena.page
      .waitForFunction(
        () => {
          if (!('__bd_probe' in window)) return false;
          const settingsPanel = window.__bd_probe.scene.SettingsPanel as AppSettingsPanel,
            account = settingsPanel.accountPage;
          return (
            settingsPanel.OffsetY === 0 &&
            account.View === 'methods' &&
            (account.Account?.providers.includes('apple') ?? false)
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await lena.page.waitForTimeout(400);
    const two = await pp(lena.page);
    check(
      'R7a: ADD APPLE adds Apple to the same account, and says so',
      two.account?.handle === 'lena_g' &&
        two.rows.join(',') === 'Google,Apple' &&
        two.message === 'Apple added.',
      two,
    );
    // ADD GOOGLE with Mia's Google: refused, still Lena, nothing added.
    await fetch(`${mocks.url}/google/next?user=mia`);
    await press(lena.page, 'remove0');
    await settled(lena.page); // Lena's own Google goes first, so ADD GOOGLE shows
    await Promise.all([
      lena.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(lena.page, 'addGoogle', 0),
    ]);
    await lena.page
      .waitForFunction(
        () => {
          if (!('__bd_probe' in window)) return false;
          const settingsPanel = window.__bd_probe.scene.SettingsPanel as AppSettingsPanel;
          return (
            settingsPanel.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'methods' &&
            !!settingsPanel.accountPage.Account
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await lena.page.waitForTimeout(800);
    const taken = await pp(lena.page);
    check(
      'R7b: a Google account used by another BlokDust account is refused; still signed in as Lena; nothing added',
      taken.account?.handle === 'lena_g' &&
        taken.rows.join(',') === 'Apple' &&
        taken.message.includes('already used by another BlokDust account'),
      taken,
    );
    const miaStill = await api(mia, 'GET', 'me');
    check(
      '… and Mia keeps her Google',
      miaStill.json?.user?.handle === 'mia_g' && miaStill.json.user.providers.includes('google'),
      miaStill.json,
    );
    // ADD PASSKEY, then REMOVE it again; then the last way in can't be removed (the page hides
    // REMOVE; the API refuses).
    await press(lena.page, 'addPasskey');
    await settled(lena.page);
    const withKey = await pp(lena.page);
    await lena.page.screenshot({ path: `${OUT}/methods-two.png` });
    await press(lena.page, 'remove1');
    await settled(lena.page);
    const back = await pp(lena.page);
    check(
      'R7c: a passkey added and removed',
      withKey.rows.length === 2 &&
        withKey.rows[1].startsWith('Passkey') &&
        back.rows.join(',') === 'Apple',
      { withKey, back },
    );
    const last = await api(lena, 'DELETE', 'me/methods', { kind: 'apple' });
    check(
      'R7c: the last way in is never removed (409)',
      last.status === 409 && (await pp(lena.page)).rows.join(',') === 'Apple',
      last,
    );
    // Leaving SIGN-IN METHODS (×, another tab) brings the account back on its own page (owner,
    // 2026-11-19).
    await lena.page.evaluate(() => {
      window.__bd_probe.scene.SettingsPanel.ClosePanel();
    });
    await lena.page.waitForTimeout(800);
    await openAccount(lena.page);
    const reopened = (await pp(lena.page)).view;
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
    await mia.ctx.close();
    await lena.ctx.close();
  },
};
