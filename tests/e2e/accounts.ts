// pnpm test:accounts — CHG-0023 acceptance (SPEC-SHARING-ACCOUNTS), black-box through the real app and the Worker:
// `wrangler dev` on web/dist with a local D1, Cloudflare's test Turnstile key, siteverify and Google mocked
// (tests/e2e/mock-services.ts), and Chrome's virtual WebAuthn authenticator standing in for a phone or laptop.
// The app is opened on http://localhost:<port>: passkeys need a domain, not an IP address.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { startLocal } from '../../tools/server/lib.ts';
import { sineWav, startMockServices } from './mock-services.ts';
import { rates } from '../../web/src/account/activity.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const OUT = 'tests/e2e/output/accounts';
mkdirSync(OUT, { recursive: true });
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}

const mocks = await startMockServices();
const server = await startLocal({
  name: 'accounts',
  vars: {
    ACCOUNTS_PER_DAY: '100', // every test's accounts come from one address (new-account-limit has its own Worker)
    TURNSTILE_SECRET: 'test-secret',
    TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
    GOOGLE_CLIENT_ID: 'test-google-client',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    GOOGLE_AUTH_URL: `${mocks.url}/google/auth`,
    GOOGLE_TOKEN_URL: `${mocks.url}/google/token`,
    APPLE_CLIENT_ID: 'test-apple-client',
    APPLE_APP_ID: 'test.app.id',
    APPLE_TEAM_ID: 'test-team',
    APPLE_KEY_ID: 'test-key-id',
    APPLE_PRIVATE_KEY: mocks.appleKey,
    APPLE_AUTH_URL: `${mocks.url}/apple/auth`,
    APPLE_TOKEN_URL: `${mocks.url}/apple/token`,
  },
});
const base = server.url.replace('127.0.0.1', 'localhost');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

/** A device: a browser context with its own cookies and its own (virtual) passkey authenticator. */
interface Device {
  ctx: BrowserContext;
  page: Page;
  cdp: CDPSession;
  authenticator: string;
}
async function device(): Promise<Device> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('https://cdn.freesound.org/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: sineWav(440),
    }),
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    console.error(`  page error: ${e.message}`);
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { ctx, page, cdp, authenticator: authenticatorId };
}
async function openApp(device: Device, query = ''): Promise<void> {
  await device.page.goto(`${base}/${query}`);
  await device.page.waitForFunction(() => (window as any).__bd_probe);
  if (await device.page.$('#start')) {
    await device.page.click('#start');
    await device.page.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
      timeout: 20000,
    });
  }
  await device.page.waitForTimeout(1500);
}
/** Patches open, and Settings › ACCOUNT's state (accountPage.ts). */
const pp = (p: Page) =>
  p.evaluate(() => {
    const s = (window as any).__bd_probe.scene,
      x = s.SettingsPanel.accountPage;
    return {
      open: s.PatchesPanel.Open,
      settings: s.SettingsPanel.Open,
      tabName: s.SettingsPanel.MenuItems[4]?.Name,
      view: x.View,
      account: x.Account,
      busy: x.Busy,
      message: x.Message,
      methods: x.Account ? (x.methods() as string[]) : [],
      addLabel: x.addLabel as string,
      rows: x.Account ? (x.methodRows().map((r: any) => r.label) as string[]) : [],
    };
  });
const ACCOUNT_CONTROLS = new Set([
  'passkey',
  'google',
  'apple',
  'back',
  'submit',
  'addPasskey',
  'signOut',
  'deleteAccount',
  'deleteCancel',
  'deleteOk',
  'methods',
  'addGoogle',
  'addApple',
  'methodsBack',
  'remove0',
  'remove1',
  'remove2',
  'remove3',
  'browser',
  'codeBack',
  'openAgain',
  'website',
  'approveOk',
  'approveCancel',
  'submitCode',
  'approveBack',
  'app0',
  'app1',
]);
async function press(p: Page, name: string, wait = 400): Promise<void> {
  const at = await p.evaluate(
    ([key, inSettings]) => {
      const s = (window as any).__bd_probe.scene;
      return inSettings ? s.SettingsPanel.accountCentre(key) : s.PatchesPanel.centreOf(key);
    },
    [name, ACCOUNT_CONTROLS.has(name)] as const,
  );
  if (!at) throw new Error(`no control ${name}`);
  await p.mouse.move(at[0], at[1]);
  await p.mouse.click(at[0], at[1]);
  await p.waitForTimeout(wait);
}
/** Settings › SIGN IN / ACCOUNT (the corner name and the Google return open it the same way). */
async function openAccount(p: Page): Promise<void> {
  if ((await pp(p)).open) {
    await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await p.waitForTimeout(700);
  }
  await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.openAccount());
  await p.waitForFunction(
    () => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
      return settingsPanel.OffsetY === 0 && settingsPanel.accountPage.Account !== undefined;
    },
    null,
    { timeout: 10000 },
  );
  await p.waitForTimeout(300);
}
const settled = (p: Page) =>
  p.waitForFunction(() => !(window as any).__bd_probe.scene.SettingsPanel.accountPage.Busy, null, {
    timeout: 30000,
  });
const corners = (p: Page) => p.evaluate(() => (window as any).__bd_probe.corners);
/** A new Google account named `handle` on device `d` (the mock's next user `user`). Sign-in starts share a per-minute
 * limit (SAVE_LIMIT 'auth'), which the tests before may have used up: refused (429), wait it out and try again. */
async function googleAccount(device: Device, user: string, handle: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await fetch(`${mocks.url}/google/next?user=${user}`);
    await openApp(device);
    await openAccount(device.page);
    await Promise.all([
      device.page.waitForURL(/account=|auth\/google/, { timeout: 20000 }).catch(() => {}),
      press(device.page, 'google', 0),
    ]);
    await device.page.waitForLoadState('load').catch(() => {});
    if ((await device.page.content()).includes('too many requests')) {
      await new Promise((resolve) => setTimeout(resolve, 61_000));
      continue;
    }
    await device.page
      .waitForFunction(
        () => (window as any).__bd_probe?.scene.SettingsPanel.accountPage.View === 'name',
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await device.page.waitForTimeout(800);
    await device.page.fill('#accountHandleInput', handle);
    await press(device.page, 'submit');
    await settled(device.page);
    return;
  }
  throw new Error('Google sign-in refused twice (rate limit)');
}
const api = (
  device: Device,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  device.page.evaluate(
    async ([m, url, b, h]) => {
      const response = await fetch(url, {
        method: m,
        headers: { 'content-type': 'application/json', ...(h as object) },
        body: b === undefined ? undefined : JSON.stringify(b),
      });
      return { status: response.status, json: await response.json().catch(() => null) };
    },
    [method, `${base}/api/${path}`, body, headers] as const,
  );
/** SAVE on the Patches › SAVE tab (a new link the first time, then saves over it). Returns the link's id. */
async function saveLink(p: Page): Promise<string> {
  await press(p, 'tab0', 1100);
  const before = await p.evaluate(
    () => (window as any).__bd_probe.scene.host.links.current()?.url ?? '',
  );
  await press(p, 'share', 200);
  await p.waitForFunction(
    (prev) => {
      const l = (window as any).__bd_probe.scene.host.links.current();
      return (
        !!l &&
        !l.stale &&
        !(window as any).__bd_probe.scene.PatchesPanel.Saving &&
        (l.url !== prev || true)
      );
    },
    before,
    { timeout: 60000 },
  );
  await p.waitForTimeout(500);
  return /[?&]c=([^&]+)/.exec(
    await p.evaluate(() => (window as any).__bd_probe.scene.host.links.current().url as string),
  )![1];
}
async function addBlock(p: Page): Promise<void> {
  await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('ToneSource', 4, 4));
  await p.waitForTimeout(300);
}

const tests: Record<string, () => Promise<void>> = {
  /** R1, R3, R6, R9, R13: a patch saved before signing up; CONTINUE WITH PASSKEY on a device with none asks for a
   * name and makes the account with a passkey; the account claims it; the session cookie is HttpOnly; the name rules hold. */
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
        (window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    check(
      'signed out: Settings › SIGN IN offers Google, Apple and a passkey, in that order (owner review 2)',
      (await pp(a.page)).account === null &&
        (await pp(a.page)).tabName === 'SIGN IN' &&
        ways.every(Boolean) &&
        ways[0][1] < ways[1][1] &&
        ways[1][1] < ways[2][1],
      { p: await pp(a.page), ways },
    );
    const noCreate = await a.page.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.accountCentre('create'),
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
      const s = (window as any).__bd_probe.scene;
      s.SettingsPanel.ClosePanel();
      s.PatchesPanel.ClosePanel();
    });
    await a.page.waitForTimeout(700);
    const c1 = await corners(a.page);
    check(
      'R14: the stage says who is signed in; pressing it opens Settings › ACCOUNT',
      c1.me === 'tester_1' && !!c1.meAt,
      c1,
    );
    await a.page.mouse.click(c1.meAt![0], c1.meAt![1]);
    await a.page.waitForTimeout(900);
    check('… it does', (await pp(a.page)).settings === true);
    const cookie = (await a.ctx.cookies()).find((c) => c.name === 'bd_session');
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
      mine.status === 200 &&
        mine.json.patches.some((patche: { id: string }) => patche.id === before),
      mine.json,
    );
    const taken = await api(a, 'POST', 'auth/passkey/register/options', {
      handle: 'tester_1',
      turnstile: 'ok',
    });
    // Signed in, register/options adds a passkey to this account instead; ask as a signed-out client.
    const anon = await device();
    await anon.page.goto(`${base}/api/config`);
    const t2 = await api(
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
        t2.status === 409 &&
        rude.status === 400 &&
        fine.status === 200 &&
        bot.status === 403,
      [taken.status, t2.status, rude.status, fine.status, bot.status],
    );
    // Owner (PR review, 2026-11-19): can someone claim another person's patch knowing only its id? No: a claim needs
    // the patch's edit token (only its hash is stored), and a patch with an owner is never claimed.
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

  /** R2, R4, R8, R9: SIGN OUT, then SIGN IN WITH PASSKEY; a second device with the same (synced) passkey sees the
   * account's patches, opens one, changes it and SAVEs over the same link without its edit token. */
  async 'second-device'() {
    const a = shared.a!;
    await openAccount(a.page);
    await press(a.page, 'signOut');
    await settled(a.page);
    const out = await api(a, 'GET', 'me');
    check(
      'R4: SIGN OUT ends the session',
      out.json.user === null && (await pp(a.page)).account === null,
    );
    await press(a.page, 'passkey');
    await settled(a.page);
    await a.page.waitForTimeout(700);
    check(
      'R2: SIGN IN WITH PASSKEY (no name needed), then back to the stage',
      (await pp(a.page)).account?.handle === 'tester_1' && (await pp(a.page)).settings === false,
      await pp(a.page),
    );

    // The passkey syncs to another device (iCloud Keychain, Google Password Manager): copy it to device B.
    const b = await device();
    const { credentials } = await a.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: a.authenticator,
    });
    for (const c of credentials)
      await b.cdp.send('WebAuthn.addCredential', {
        authenticatorId: b.authenticator,
        credential: c,
      });
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
    const rows = await b.page.evaluate(
      () =>
        (window as any).__bd_probe.scene.PatchesPanel.Items as {
          name: string;
          detail: string;
          key: string;
        }[],
    );
    const row = rows.findIndex((row) => row.key === `acct:${shared.firstPatch}`);
    check(
      'R8: OPEN lists the account\'s patches first, with when they were saved (no "Your account": owner, 2026-11-18)',
      row === 0 && rows[0].detail.startsWith('Saved'),
      rows.slice(0, 3),
    );
    await press(b.page, 'open0', 2500);
    const opened = await b.page.evaluate(() => ({
      id: (window as any).__bd_probe.v1App.CompositionId,
      url: location.search,
    }));
    await b.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
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
      opened.id === shared.firstPatch && saved === shared.firstPatch && latest.json.rev === 2,
      { opened, saved, rev: latest.json?.rev },
    );
    shared.b = b;
  },

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
  /** SHARING-0011 (CHG-0039): a plugin signs in with a device code approved on the website, then uses its own key:
   * it reads the account and saves to it (no bot check); it can't delete the account, change its sign-in methods,
   * approve another device or list the others. The website lists it and can sign it out; it can sign itself out. */
  async 'plugin-device-code'() {
    const J = 'juce://juce.backend';
    const plug = async (method: string, path: string, body?: unknown, key?: string) => {
      const response = await fetch(`${base}/api/${path}`, {
        method,
        headers: {
          origin: J,
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: response.status,
        json: (await response.json().catch(() => null)) as any,
        acao: response.headers.get('access-control-allow-origin'),
      };
    };
    // Nora: a website account (Google).
    const n = await device();
    await googleAccount(n, 'nora', 'nora_g');
    const start = await plug('POST', 'device/start', { name: 'BlokDust on Mac (Logic)\u0007' });
    const code: string = start.json?.userCode ?? '';
    check(
      'SHARING-0011: a plugin gets a code (XXXX-XXXX, no vowels), where to enter it, and its poll interval',
      start.status === 200 &&
        /^[B-DF-HJ-NP-TV-XZ2-9]{4}-[B-DF-HJ-NP-TV-XZ2-9]{4}$/.test(code) &&
        /\/link\?code=/.test(start.json.verifyUrl) &&
        start.json.interval === 5 &&
        start.acao === J,
      start.json,
    );
    const p1 = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const p2 = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    check(
      '… pending until approved; polling faster than the interval is refused',
      p1.status === 202 &&
        p1.json.status === 'pending' &&
        p2.status === 429 &&
        p2.json.status === 'slow_down',
      [p1, p2],
    );
    const anon = await fetch(`${base}/api/device/code?code=${code}`);
    const info = await api(n, 'GET', `device/code?code=${code.toLowerCase().replace('-', '')}`);
    check(
      '… the website shows what asks (signed in only; the code read loosely)',
      anon.status === 401 && info.status === 200 && info.json.name === 'BlokDust on Mac (Logic)',
      { anon: anon.status, info },
    );
    const cross = await fetch(`${base}/api/device/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, approve: true }),
    });
    const ok = await api(n, 'POST', 'device/approve', { code, approve: true });
    check(
      "… approving needs this site's Origin; signed in, it approves",
      cross.status === 403 && ok.status === 200 && ok.json.approved === true,
      { cross: cross.status, ok },
    );
    await new Promise((resolve) => setTimeout(resolve, 4200));
    const got = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const again = await plug('POST', 'device/poll', { deviceCode: start.json.deviceCode });
    const key: string = got.json?.key ?? '';
    check(
      '… the next poll takes the key, once',
      got.status === 200 &&
        /^bdk_[A-Za-z0-9_-]{40,}$/.test(key) &&
        got.json.user.handle === 'nora_g' &&
        again.status === 410,
      { got: { ...got.json, key: key.slice(0, 6) }, again },
    );
    // The key: the account, its patches, saving (no bot check), opening as its owner.
    const me = await plug('GET', 'me?stats=1', undefined, key);
    const saved = await plug(
      'POST',
      'patches',
      {
        patch: {
          format: 'blokdust.patch',
          version: 2,
          seed: 1,
          blocks: [{ id: 'a', type: 'source.tone', x: 0, y: 0 }],
        },
        title: 'From Logic',
      },
      key,
    );
    const mine = await plug('GET', 'me/patches', undefined, key);
    const over = await plug(
      'PUT',
      `patches/${saved.json?.id}`,
      {
        patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks: [] },
        title: 'From Logic 2',
      },
      key,
    );
    const opened = await plug('GET', `patches/${saved.json?.id}`, undefined, key);
    check(
      'SHARING-0011: with its key a plugin reads the account and saves to it (no bot check) and over it',
      me.status === 200 &&
        me.json.user?.handle === 'nora_g' &&
        !!me.json.user.stats &&
        saved.status === 201 &&
        mine.json?.patches?.some((x: any) => x.id === saved.json.id) &&
        over.status === 200 &&
        opened.json?.mine === true,
      { me: me.status, saved: saved.status, over: over.status, mine: opened.json?.mine },
    );
    const noBot = await plug(
      'POST',
      'patches',
      { patch: { format: 'blokdust.patch', version: 2, seed: 1, blocks: [] }, title: 'x' },
      'bdk_' + 'A'.repeat(43),
    );
    check(
      '… a wrong key gets no free pass (the bot check is asked for)',
      noBot.status === 400 || noBot.status === 403,
      noBot,
    );
    const del = await plug('DELETE', 'me', undefined, key),
      meth = await plug('DELETE', 'me/methods', { kind: 'google' }, key);
    const apps = await plug('GET', 'me/apps', undefined, key),
      appr = await plug('POST', 'device/approve', { code: 'BCDF-GHJK', approve: true }, key);
    check(
      "SHARING-0011: a key can't delete the account, change sign-in methods, list apps or approve a device",
      [del, meth, apps, appr].every((r) => r.status === 401 || r.status === 403) &&
        (await plug('GET', 'me', undefined, key)).json?.user?.handle === 'nora_g',
      [del.status, meth.status, apps.status, appr.status],
    );
    // The website lists it, and signs it out.
    const listed = await api(n, 'GET', 'me/apps');
    const app = listed.json?.apps?.find((x: any) => x.name === 'BlokDust on Mac (Logic)');
    check(
      'SHARING-0011: the website lists the plugin (its name cleaned)',
      listed.status === 200 && !!app && !!app.lastUsed,
      listed.json,
    );
    const out = await api(n, 'DELETE', 'me/apps', { id: app?.id });
    const after = await plug('GET', 'me', undefined, key);
    check(
      '… and signs it out: the key reads nobody',
      out.status === 200 && after.status === 200 && after.json.user === null,
      { out, after: after.json },
    );
    // A second plugin signs itself out; a third is turned away; an expired code.
    const s2 = await plug('POST', 'device/start', { name: 'BlokDust on iPad' });
    await api(n, 'POST', 'device/approve', { code: s2.json.userCode, approve: true });
    const k2 = (await plug('POST', 'device/poll', { deviceCode: s2.json.deviceCode })).json?.key;
    const so = await plug('POST', 'auth/logout', {}, k2);
    check(
      'SHARING-0011: a plugin signs itself out (its key goes)',
      !!k2 && so.status === 200 && (await plug('GET', 'me', undefined, k2)).json.user === null,
      so,
    );
    const s3 = await plug('POST', 'device/start', { name: 'Someone else' });
    await api(n, 'POST', 'device/approve', { code: s3.json.userCode, approve: false });
    const denied = await plug('POST', 'device/poll', { deviceCode: s3.json.deviceCode });
    const s4 = await plug('POST', 'device/start', { name: 'Late' });
    await server.sql('UPDATE device_codes SET expires = 0');
    const late = await plug('POST', 'device/poll', { deviceCode: s4.json.deviceCode });
    const lateApprove = await api(n, 'POST', 'device/approve', {
      code: s4.json.userCode,
      approve: true,
    });
    check(
      '… CANCEL turns a plugin away; a code expires after 10 minutes',
      denied.status === 403 && late.status === 410 && lateApprove.status === 404,
      { denied, late, lateApprove },
    );
    const link = await fetch(`${base}/link?code=${code}`, { redirect: 'manual' });
    check(
      'SHARING-0011: /link?code= opens the app at the code',
      link.status === 302 &&
        new URL(link.headers.get('location')!).searchParams.get('link') === code,
      link.headers.get('location'),
    );
    await n.ctx.close();
  },
  /** SHARING-0011 (CHG-0039) through the apps: the plugin's SIGN IN shows a code and opens the website at it; signed
   * in there, the website asks and APPROVE signs the plugin in; the plugin keeps its key, lists the account's patches
   * in OPEN and saves to the account; the website lists it under SIGN-IN METHODS; SIGN OUT drops the key. */
  async 'plugin-sign-in'() {
    const w = await device();
    await googleAccount(w, 'pia', 'pia_g');
    // The plugin's page (a fake JUCE backend; its server is this one).
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Record<string, ((x: unknown) => void)[]> = {},
          sent: { id: string; v: any }[] = [];
        (window as any).__sent = sent;
        (window as any).__bd_pluginSite = site;
        (window as any).__JUCE__ = {
          backend: {
            addEventListener: (id: string, fn: (x: unknown) => void) => {
              (listeners[id] ??= []).push(fn);
            },
            emitEvent: (id: string, v: unknown) => {
              sent.push({ id, v });
              // The patch files' folder: empty (the real plugin answers with its files).
              if (id === 'bd_patchList')
                setTimeout(() => {
                  listeners.bd_patchList?.forEach((f) => {
                    f({ req: (v as { req: number }).req, items: [] });
                  });
                }, 10);
              if (id === 'bd_hello')
                setTimeout(() => {
                  listeners.bd_patch?.forEach((f) => {
                    f({
                      patch: JSON.stringify({
                        format: 'blokdust.patch',
                        version: 2,
                        seed: 1,
                        blocks: [{ id: 't', type: 'source.tone', x: 0, y: 0, params: {} }],
                      }),
                      ids: { t: 1 },
                    });
                  });
                  listeners.bd_account?.forEach((f) => {
                    f({ name: 'BlokDust on Mac (Logic Pro)', browser: true });
                  });
                }, 50);
            },
          },
        };
      },
      [`${base}/`] as const,
    );
    const pg = await pctx.newPage();
    pg.on('pageerror', (e) => {
      console.error(`  plugin page error: ${e.message}`);
    });
    await pg.goto(`${base}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, {
      timeout: 20000,
    });
    await pg.waitForTimeout(1200);
    await openAccount(pg);
    const ways = await pg.evaluate(() =>
      ['browser', 'passkey', 'google'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    const tab = await pg.evaluate(
      () => (window as any).__bd_probe.scene.SettingsPanel.MenuItems[3]?.Name,
    );
    check(
      "SHARING-0011: the plugin's Settings has SIGN IN (after ABOUT), with SIGN IN WITH YOUR BROWSER only",
      JSON.stringify(ways) === '[true,false,false]' && /sign in/i.test(tab ?? ''),
      { ways, tab },
    );
    await press(pg, 'browser', 800);
    await pg
      .waitForFunction(
        () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'code',
        null,
        { timeout: 10000 },
      )
      .catch(() => {});
    const opened = await pg.evaluate(
      () =>
        ((window as any).__sent as { id: string; v: any }[])
          .filter((e) => e.id === 'bd_openUrl')
          .map((e) => e.v.url)
          .pop() as string | undefined,
    );
    const shown = await pg.evaluate(
      () =>
        (window as any).__bd_probe.scene.SettingsPanel.accountPage.Device?.userCode as
          string | undefined,
    );
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/plugin-code.png` });
    check(
      '… it shows a code and a QR code, and opens the website at it',
      !!shown && !!opened && opened.includes(`/link?code=${shown}`),
      { shown, opened },
    );
    // The website at that address: signed in, it asks.
    await w.page.goto(opened!.replace('127.0.0.1', 'localhost'));
    await w.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene.SettingsPanel;
          return (
            settingsPanel?.OffsetY === 0 &&
            settingsPanel.accountPage.View === 'approve' &&
            !!settingsPanel.accountPage.ApproveName
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await w.page.waitForTimeout(500);
    const asks = await w.page.evaluate(() => {
      const x = (window as any).__bd_probe.scene.SettingsPanel.accountPage;
      return { view: x.View, code: x.ApproveCode, name: x.ApproveName };
    });
    await w.page.mouse.move(5, 5);
    await w.page.waitForTimeout(200);
    await w.page.screenshot({ path: `${OUT}/website-approve.png` });
    check(
      '… the website asks: which device, the same code, CANCEL · APPROVE',
      asks.view === 'approve' &&
        asks.code?.toUpperCase() === shown &&
        asks.name === 'BlokDust on Mac (Logic Pro)',
      asks,
    );
    await press(w.page, 'approveOk');
    await settled(w.page);
    const said = (await pp(w.page)).message;
    await pg
      .waitForFunction(
        () =>
          (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle === 'pia_g',
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    const kept = await pg.evaluate(() =>
      ((window as any).__sent as { id: string; v: any }[])
        .filter((e) => e.id === 'bd_accountSave')
        .map((e) => e.v)
        .pop(),
    );
    await pg.waitForTimeout(900);
    const inPlugin = await pg.evaluate(() => {
      const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel,
        x = settingsPanel.accountPage;
      return {
        handle: x.Account?.handle,
        view: x.View,
        message: x.Message,
        settings: settingsPanel.Open,
        me: (window as any).__bd_probe.corners?.me,
      };
    });
    await pg.waitForTimeout(600);
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/plugin-signed-in.png` });
    check(
      '… APPROVE signs the plugin in: it keeps its key (bd_accountSave) and goes back to the stage, no message (owner, 2026-11-19)',
      /is signed in/.test(said) &&
        inPlugin.handle === 'pia_g' &&
        !inPlugin.settings &&
        inPlugin.message === '' &&
        inPlugin.me === 'pia_g' &&
        (kept?.key ?? '').startsWith('bdk_') &&
        kept?.handle === 'pia_g',
      { said, inPlugin, kept: kept && { ...kept, key: String(kept.key).slice(0, 6) } },
    );
    await openAccount(pg);
    const pluginControls = await pg.evaluate(() =>
      ['signOut', 'deleteAccount', 'methods', 'website'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    check(
      '… signed in, the plugin has SIGN OUT only (no SIGN-IN METHODS, DELETE ACCOUNT or ON THE WEBSITE)',
      JSON.stringify(pluginControls) === '[true,false,false,false]',
      pluginControls,
    );
    // SAVE in the plugin saves to the account (no bot check), and OPEN lists the account's patches.
    await pg.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await pg.waitForTimeout(800);
    await pg.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.OpenPanel(0));
    await pg.waitForTimeout(1200);
    const id = await saveLink(pg);
    const theirs = await api(w, 'GET', 'me/patches');
    const listed = await pg.evaluate(async () =>
      ((await (window as any).__bd_probe.scene.host.listPatches()) as { key: string }[]).map(
        (i) => i.key,
      ),
    );
    check(
      "… SAVE in the plugin saves to the account, and OPEN lists the account's patches",
      theirs.json?.patches?.some((x: any) => x.id === id) && listed.includes(`acct:${id}`),
      { id, listed: listed.slice(0, 4) },
    );
    // The website lists it under SIGN-IN METHODS; SIGN OUT in the plugin drops its key.
    await w.page.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.accountPage.showMethods(''),
    );
    await w.page.waitForTimeout(800);
    const apps = await w.page.evaluate(() =>
      ((window as any).__bd_probe.scene.SettingsPanel.accountPage.Apps as { name: string }[]).map(
        (a) => a.name,
      ),
    );
    await w.page.mouse.move(5, 5);
    await w.page.waitForTimeout(200);
    await w.page.screenshot({ path: `${OUT}/website-apps.png` });
    check(
      'SHARING-0011: SIGN-IN METHODS lists the plugin signed in',
      apps.includes('BlokDust on Mac (Logic Pro)'),
      apps,
    );
    await openAccount(pg);
    await press(pg, 'signOut');
    await pg.waitForTimeout(1000);
    const cleared = await pg.evaluate(() =>
      ((window as any).__sent as { id: string }[]).some((e) => e.id === 'bd_accountClear'),
    );
    const after = (await fetch(`${base}/api/me`, {
      headers: { authorization: `Bearer ${kept?.key}` },
    }).then((response) => response.json())) as any;
    check(
      '… SIGN OUT in the plugin forgets its key here and on the server',
      cleared &&
        after.user === null &&
        (await pg.evaluate(
          () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account,
        )) === null,
      { cleared, after: after.user },
    );
    await pctx.close();
    await w.ctx.close();
  },
  /** SHARING-0011: the iPad app signs in natively. Sign in with Apple: a nonce from the server, Apple's code exchanged
   * with the app's id, the token's nonce checked, once; the same Apple account as on the website. Passkeys: the site's
   * passkey answers a challenge kept by id (no cookie). Either way the app gets a key. The site publishes its
   * apple-app-site-association for the app. */
  async 'ipad-native'() {
    const J = 'juce://juce.backend';
    const app = async (path: string, body?: unknown, key?: string, method = 'POST') => {
      const response = await fetch(`${base}/api/${path}`, {
        method,
        headers: {
          origin: J,
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, json: (await response.json().catch(() => null)) as any };
    };
    const aasa = await fetch(`${base}/.well-known/apple-app-site-association`).then(
      async (response) => ({
        status: response.status,
        type: response.headers.get('content-type'),
        json: await response.json().catch(() => null),
      }),
    );
    check(
      'SHARING-0011: the site publishes apple-app-site-association for the app (webcredentials)',
      aasa.status === 200 &&
        (aasa.type ?? '').includes('json') &&
        aasa.json?.webcredentials?.apps?.[0] === 'test-team.test.app.id',
      aasa,
    );
    const n1 = await app('app/apple/nonce');
    const a1 = await app('app/apple', {
      id: n1.json.id,
      code: `ivy~${n1.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    const named = await app('me/handle', { handle: 'ivy_a' }, a1.json?.key, 'PUT');
    const again = await app('app/apple', {
      id: n1.json.id,
      code: `ivy~${n1.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    const n2 = await app('app/apple/nonce');
    const wrong = await app('app/apple', { id: n2.json.id, code: 'ivy~not-the-nonce', name: 'x' });
    const n3 = await app('app/apple/nonce');
    const a3 = await app('app/apple', {
      id: n3.json.id,
      code: `ivy~${n3.json.nonce}`,
      name: 'BlokDust on iPad',
    });
    check(
      'SHARING-0011: Sign in with Apple in the app makes the account and a key; it names itself there; a nonce works once and must match',
      a1.status === 200 &&
        (a1.json?.key ?? '').startsWith('bdk_') &&
        a1.json.fresh === true &&
        named.status === 200 &&
        again.status === 400 &&
        wrong.status === 401 &&
        a3.status === 200 &&
        a3.json.fresh === false &&
        a3.json.user.handle === 'ivy_a',
      {
        a1: a1.status,
        fresh: a1.json?.fresh,
        named: named.status,
        again: again.status,
        wrong: wrong.status,
        a3: a3.json && { ...a3.json, key: undefined },
      },
    );
    // The same Apple account on the website: the same BlokDust account.
    const web = await device();
    await fetch(`${mocks.url}/google/next?user=ivy`);
    await openApp(web);
    await openAccount(web.page);
    await Promise.all([
      web.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}),
      press(web.page, 'apple', 0),
    ]);
    await web.page
      .waitForFunction(() => (window as any).__bd_probe?.corners?.me === 'ivy_a', null, {
        timeout: 20000,
      })
      .catch(() => {});
    check(
      "… and the website's Apple sign-in reaches the same account",
      (await corners(web.page)).me === 'ivy_a',
      await corners(web.page),
    );
    await web.ctx.close();
    // Passkeys: a website account's passkey answers the app's challenge.
    const k = await device();
    await openApp(k);
    await openAccount(k.page);
    await press(k.page, 'passkey');
    await k.page.waitForFunction(
      () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'create',
      null,
      { timeout: 10000 },
    );
    await k.page.fill('#accountHandleInput', 'kit_p');
    await press(k.page, 'submit');
    await settled(k.page);
    const viaPasskey = await k.page.evaluate(async (b) => {
      const post = (path: string, body: unknown) =>
        fetch(`${b}/api/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).then(async (response) => ({ status: response.status, json: await response.json() }));
      const o = await post('app/passkey/options', {});
      const dec = (s: string) =>
        Uint8Array.from(
          atob(
            s
              .replace(/-/g, '+')
              .replace(/_/g, '/')
              .padEnd(Math.ceil(s.length / 4) * 4, '='),
          ),
          (c) => c.charCodeAt(0),
        );
      const enc = (buf: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: dec(o.json.options.challenge),
          rpId: o.json.rpId,
          userVerification: 'preferred',
        },
      })) as PublicKeyCredential;
      const r = cred.response as AuthenticatorAssertionResponse;
      const response = {
        id: cred.id,
        rawId: enc(cred.rawId),
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: enc(r.clientDataJSON),
          authenticatorData: enc(r.authenticatorData),
          signature: enc(r.signature),
          userHandle: r.userHandle ? enc(r.userHandle) : undefined,
        },
      };
      const done = await post('app/passkey', { id: o.json.id, response, name: 'BlokDust on iPad' });
      const replay = await post('app/passkey', {
        id: o.json.id,
        response,
        name: 'BlokDust on iPad',
      });
      return {
        rp: o.json.rpId,
        status: done.status,
        key: String(done.json.key ?? '').slice(0, 4),
        handle: done.json.user?.handle,
        replay: replay.status,
      };
    }, base);
    check(
      "SHARING-0011: a passkey answers the app's challenge (kept by id, once) and the app gets a key",
      viaPasskey.status === 200 &&
        viaPasskey.key === 'bdk_' &&
        viaPasskey.handle === 'kit_p' &&
        viaPasskey.replay === 400,
      viaPasskey,
    );
    await k.ctx.close();
  },
  /** SHARING-0011: the iPad app's SIGN IN offers Apple and a passkey natively (and the code); Apple's answer (here
   * the fake system sheet's) becomes the app's key, and a new account names itself in the app. */
  async 'ipad-app-sign-in'() {
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pctx.addInitScript(
      ([site]) => {
        const listeners: Record<string, ((x: unknown) => void)[]> = {},
          sent: { id: string; v: any }[] = [];
        (window as any).__sent = sent;
        (window as any).__bd_pluginSite = site;
        const fire = (id: string, v: unknown) =>
          setTimeout(() => {
            listeners[id]?.forEach((f) => {
              f(v);
            });
          }, 20);
        (window as any).__JUCE__ = {
          backend: {
            addEventListener: (id: string, fn: (x: unknown) => void) => {
              (listeners[id] ??= []).push(fn);
            },
            emitEvent: (id: string, v: any) => {
              sent.push({ id, v });
              if (id === 'bd_patchList') fire('bd_patchList', { req: v.req, items: [] });
              // The system's Apple sheet: Apple's code (the mock reads the user and the nonce from it).
              if (id === 'bd_nativeApple') fire('bd_nativeAppleDone', { code: `zed~${v.nonce}` });
              if (id === 'bd_hello') {
                fire('bd_patch', {
                  patch: JSON.stringify({
                    format: 'blokdust.patch',
                    version: 2,
                    seed: 1,
                    blocks: [],
                  }),
                  ids: {},
                  ios: true,
                  standalone: true,
                });
                fire('bd_account', { name: 'BlokDust on iPad', browser: true, native: true });
              }
            },
          },
        };
      },
      [`${base}/`] as const,
    );
    const pg = await pctx.newPage();
    pg.on('pageerror', (e) => {
      console.error(`  ipad page error: ${e.message}`);
    });
    await pg.goto(`${base}/index.html`);
    await pg.waitForFunction(() => (window as any).__bd_probe?.state.started, null, {
      timeout: 20000,
    });
    await pg.waitForTimeout(1200);
    await openAccount(pg);
    const ways = await pg.evaluate(() =>
      ['apple', 'passkey', 'browser', 'google'].map(
        (k) => !!(window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
      ),
    );
    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${OUT}/ipad-sign-in.png` });
    // The app's sign-in shares a per-minute limit with the plugins' codes (the tests before used it): refused, wait it out.
    for (let attempt = 0; attempt < 2; attempt++) {
      await press(pg, 'apple', 300);
      await pg
        .waitForFunction(
          () => {
            const x = (window as any).__bd_probe.scene.SettingsPanel.accountPage;
            return x.View === 'name' || (!x.Busy && !!x.Message);
          },
          null,
          { timeout: 15000 },
        )
        .catch(() => {});
      if (
        !/too many requests/.test(
          await pg.evaluate(
            () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Message,
          ),
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 61_000));
    }
    const kept = await pg.evaluate(() =>
      ((window as any).__sent as { id: string; v: any }[])
        .filter((e) => e.id === 'bd_accountSave')
        .map((e) => e.v)
        .pop(),
    );
    await pg.waitForTimeout(800);
    await pg.fill('#accountHandleInput', 'zed_a');
    await press(pg, 'submit');
    await settled(pg);
    const after = await pg.evaluate(
      () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle,
    );
    check(
      'SHARING-0011: the iPad app offers SIGN IN WITH APPLE, SIGN IN WITH PASSKEY and the code; Apple gives it a key and a new account names itself there',
      JSON.stringify(ways) === '[true,true,true,false]' &&
        (kept?.key ?? '').startsWith('bdk_') &&
        after === 'zed_a',
      { ways, kept: kept && String(kept.key).slice(0, 4), after },
    );
    await pctx.close();
  },
  /** R1b (CHG-0035): a network makes ACCOUNTS_PER_DAY new accounts a day (a second local Worker, 2 a day); the next
   * is refused, by passkey and by Google; known accounts still sign in; back from Google the app says why. */
  async 'new-account-limit'() {
    const vars = {
      TURNSTILE_SECRET: 'test-secret',
      TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
      ACCOUNTS_PER_DAY: '2',
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      GOOGLE_AUTH_URL: `${mocks.url}/google/auth`,
      GOOGLE_TOKEN_URL: `${mocks.url}/google/token`,
    };
    const lim = await startLocal({ name: 'accounts-limit', vars });
    try {
      // Google sign-in by hand: start (its cookie), the mock's consent, the callback; where it lands.
      const googleAs = async (user: string): Promise<string> => {
        await fetch(`${mocks.url}/google/next?user=${user}`);
        const start = await fetch(`${lim.url}/api/auth/google/start?return=%2F`, {
          redirect: 'manual',
        });
        const jar = start.headers
          .getSetCookie()
          .map((x) => x.split(';')[0])
          .join('; ');
        const callback = (
          await fetch(start.headers.get('location')!, { redirect: 'manual' })
        ).headers.get('location')!;
        return (
          new URL(
            (await fetch(callback, { redirect: 'manual', headers: { cookie: jar } })).headers.get(
              'location',
            ) ?? '',
            lim.url,
          ).searchParams.get('account') ?? ''
        );
      };
      const landed = [await googleAs('lim_1'), await googleAs('lim_2'), await googleAs('lim_3')];
      const known = await googleAs('lim_1');
      const passkey = await fetch(`${lim.url}/api/auth/passkey/register/options`, {
        method: 'POST',
        headers: { origin: lim.url, 'content-type': 'application/json' },
        body: JSON.stringify({ handle: 'lim_four', turnstile: 'ok' }),
      });
      const why = (await passkey.json()) as { error?: string };
      check(
        'R1b: two new accounts, then the third is refused (Google); a known account still signs in',
        landed.join(',') === 'new,new,limit' && known === 'in',
        { landed, known },
      );
      check(
        'R1b: a new passkey account is refused before the device makes a passkey, saying why',
        passkey.status === 429 &&
          /^Cannot create any more new accounts today\.$/.test(why.error ?? ''),
        { status: passkey.status, why },
      );
    } finally {
      await lim.stop();
    }
    // Back from Google refused: Settings › SIGN IN, saying why.
    const f = await device();
    await f.page.goto(`${base}/?account=limit`);
    await f.page
      .waitForFunction(
        () => {
          const settingsPanel = (window as any).__bd_probe?.scene?.SettingsPanel;
          return (
            settingsPanel?.Open &&
            settingsPanel.OffsetY === 0 &&
            settingsPanel.accountPage.Account !== undefined
          );
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await f.page.waitForTimeout(400);
    const st = await pp(f.page);
    check(
      'R1b: back from Google refused, Settings › SIGN IN says why',
      st.settings &&
        st.account === null &&
        st.message === 'Cannot create any more new accounts today.',
      st,
    );
    await f.page.screenshot({ path: `${OUT}/new-account-limit.png` });
    await f.ctx.close();
  },

  /** R5: cookie-authenticated changes only from this site. */
  async 'cross-site'() {
    const a = shared.a!;
    const cookie = (await a.ctx.cookies()).find((c) => c.name === 'bd_session')!;
    const evil = await fetch(`${server.url}/api/auth/logout`, {
      method: 'POST',
      headers: {
        cookie: `bd_session=${cookie.value}`,
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    const none = await fetch(`${server.url}/api/me`, {
      method: 'DELETE',
      headers: { cookie: `bd_session=${cookie.value}` },
    });
    const still = await api(a, 'GET', 'me');
    check(
      'R5: another site (or no Origin) cannot sign out or delete with the cookie',
      evil.status === 403 && none.status === 403 && still.json.user?.handle === 'tester_1',
      [evil.status, none.status],
    );
  },

  /** R15 (CHG-0027): Settings › ACCOUNT shows the account's stats from the one `/api/me?stats=1` it already asks;
   * favourite blocks come from the tally kept on each save (and patches saved before it are counted on the way). */
  async stats() {
    const a = shared.a!;
    const patch = (types: string[]) => ({
      format: 'blokdust.patch',
      version: 2,
      blocks: types.map((type, i) => ({ id: `b${i}`, type, x: i * 4, y: 0 })),
    });
    const save = (device: Device, body: Record<string, unknown>) =>
      api(device, 'POST', 'patches', { turnstile: 'ok', ...body }, { origin: base });
    // Someone else (signed out) remixes the account's first patch, twice; the account remixes theirs once.
    const anon = await device();
    await anon.page.goto(`${base}/api/config`);
    const theirs = await save(anon, {
      patch: patch(['source.noise']),
      title: 'Theirs',
      parent: shared.firstPatch,
    });
    await save(anon, {
      patch: patch(['source.noise']),
      title: 'Theirs 2',
      parent: shared.firstPatch,
    });
    const mine1 = await save(a, {
      patch: patch(['source.tone', 'source.tone', 'power.emitter', 'power.laser']),
      title: 'Lasers',
      parent: theirs.json.id,
    });
    await save(a, { patch: patch(['source.tone', 'power.emitter', 'fx.reverb']), title: 'Tones' });
    // A patch from before migration 0006 (blocks not counted yet): counted when the tab next asks.
    await server.sql(`UPDATE patches SET blocks = '' WHERE id = '${mine1.json.id}'`);
    const requests: string[] = [];
    // Account requests only: usage analytics flushes on its own 60 s timer (SPEC-SHARING-USAGE-ANALYTICS), whenever.
    a.page.on('request', (r) => {
      if (r.url().includes('/api/') && !r.url().includes('/api/events'))
        requests.push(new URL(r.url()).pathname + new URL(r.url()).search);
    });
    await openAccount(a.page);
    await a.page.waitForFunction(
      () => !!(window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.stats,
      null,
      { timeout: 10000 },
    );
    await a.page.waitForTimeout(400);
    const st = (await pp(a.page)).account?.stats;
    check(
      'R15: opening ACCOUNT asks once, for who is signed in and the stats together',
      requests.filter((request) => request.startsWith('/api/')).length === 1 &&
        requests[0] === '/api/me?stats=1',
      requests,
    );
    check(
      'R15: patches, remixes made, remixes of the account’s patches, the most remixed',
      st?.patches === 3 &&
        st.remixes === 1 &&
        st.remixed === 2 &&
        st.mostRemixed?.id === shared.firstPatch &&
        st.mostRemixed.n === 2,
      st,
    );
    const favs = st?.favourites.map(
      (favourite: { type: string; patches: number; count: number }) =>
        `${favourite.type}:${favourite.patches}:${favourite.count}`,
    );
    // The demo patch (the first save, with a Tone added on device B) has Tones and an Emitter: Tone is in 3 patches only
    // if the older one was counted.
    check(
      'R15: favourite blocks, in the most patches first, then the most of them (an older patch counted on the way)',
      /^source\.tone:3:\d+$/.test(favs?.[0] ?? '') &&
        favs?.[1].startsWith('power.emitter:3:') &&
        favs.length === 6 &&
        !favs
          .slice(0, 5)
          .some((f: string) =>
            f.startsWith('power.laser'),
          ) /* six: a phone shows two rows of three */,
      favs,
    );
    const plain = await api(a, 'GET', 'me');
    check(
      'R15: /api/me without ?stats=1 does no stats work (loading the page)',
      plain.json.user && !('stats' in plain.json.user),
      plain.json.user,
    );
    await a.page.screenshot({ path: `${OUT}/account-stats.png` });
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.waitForTimeout(800);
    await a.page.screenshot({ path: `${OUT}/account-stats-phone.png` });
    await a.page.setViewportSize({ width: 1280, height: 800 });
    await a.page.waitForTimeout(500);
    await a.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await a.page.waitForTimeout(700);
    await anon.ctx.close();
  },

  /** R16 (CHG-0027): running totals estimated in the page, credited with a save, and sent once when the page closes;
   * ACTIVITY_BEACON=off stops that request. */
  async activity() {
    // The estimates (owner: rough is fine): Emitter Rate is v1 frames per particle, synced it is one per Division;
    // Laser Rotate is hundredths of a degree per v1 frame, only while powered; synced, one turn per Turn Beats.
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    const r = [
      rates({ type: 'power.emitter', params: { rate: 80 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { sync: true, division: 1 } }, true, 120).particles,
      rates({ type: 'power.emitter', params: { rate: 80 } }, false, 120).particles,
      rates({ type: 'power.laser', params: { rotate: 100 } }, true, 120).turns,
      rates({ type: 'power.laser', params: { rotate: 100 } }, false, 120).turns,
      rates({ type: 'power.laser', params: { sync: true, turnBeats: 4 } }, true, 120).turns,
    ];
    check(
      'R16: particles and turns per second from the params',
      near(r[0], 0.75) &&
        near(r[1], 2) &&
        r[2] === 0 &&
        near(r[3], 1 / 6) &&
        r[4] === 0 &&
        near(r[5], 0.5),
      r,
    );

    const a = shared.a!;
    const stats = async () =>
      (await api(a, 'GET', 'me?stats=1')).json.user.stats as {
        blocksAdded: number;
        particles: number;
        playMs: number;
        laserTurns: number;
      };
    const pending = () =>
      a.page.evaluate(
        () =>
          (window as any).__bd_probe.activity as {
            playMs: number;
            blocks: number;
            particles: number;
            laserTurns: number;
          },
      );
    await openApp(a);
    await a.page.evaluate(() => {
      localStorage.removeItem('bd_activity');
    });
    const before = await stats();
    // A self-powered Emitter (a new one starts synced: 2 a second at 120 BPM), added from the menu.
    await a.page.evaluate(() => {
      const h = (window as any).__bd_probe.scene.host,
        id = h.createBlock('ParticleEmitter', 6, 6);
      h.setParam(id, 'selfPoweredMode', 1);
    });
    await a.page.waitForTimeout(3000);
    const p1 = await pending();
    check(
      'R16: the page counts time played, the block added and the particles',
      p1.blocks >= 1 && p1.playMs >= 2000 && p1.particles >= 3,
      p1,
    );
    // Bug (owner, 2026-11-16): the particle count was estimated from each Emitter's Rate while powered, so it didn't
    // match what was fired (presses, laser hits, keys). Now every particle the engine emits counts, exactly: an
    // unpowered Emitter held for 2 s, its particles slow enough (10 s of life) that none are gone when it is let go,
    // so the particles on the stage are all it fired.
    await a.page.evaluate(() => (window as any).__bd_probe.scene.host.resetScene());
    const held = await a.page.evaluate(() => {
      const h = (window as any).__bd_probe.scene.host,
        id = h.createBlock('ParticleEmitter', 0, 0);
      h.setParam(id, 'sync', 0);
      h.setParam(id, 'rate', 10);
      h.setParam(id, 'speed', 1);
      return id as number;
    });
    await a.page.mouse.click(40, 400);
    // A block made from the menu is held until the pointer is let go (and a held Emitter fires): let go on the empty
    // stage. Particles already flying go on until their range runs out: wait for an empty stage.
    await a.page
      .waitForFunction(() => (window as any).__bd_probe.state.particles === 0, null, {
        timeout: 20000,
      })
      .catch(() => {});
    const pt = (await a.page.evaluate((id) => (window as any).__bd_probe.blockPoint(id), held)) as [
      number,
      number,
    ];
    const emptyBefore = await a.page.evaluate(
      () => (window as any).__bd_probe.state.particles as number,
    );
    const beforeHold = (await pending()).particles;
    await a.page.mouse.move(pt[0], pt[1]);
    await a.page.mouse.down();
    await a.page.waitForTimeout(2000);
    await a.page.mouse.up();
    await a.page.waitForTimeout(500);
    const onStage = await a.page.evaluate(
      () => (window as any).__bd_probe.state.particles as number,
    );
    const counted = (await pending()).particles - beforeHold;
    check(
      'R16: every particle fired counts, exactly (an Emitter held, not powered)',
      emptyBefore === 0 && onStage > 3 && counted === onStage,
      { emptyBefore, onStage, counted },
    );
    await (async () => {
      for (let i = 0; i < 8 && !(await pp(a.page)).open; i++) {
        await a.page.mouse.move(1138, 45);
        await a.page.mouse.click(1138, 45);
        await a.page.waitForTimeout(700);
      }
    })();
    await saveLink(a.page);
    const after = await stats(),
      p2 = await pending();
    check(
      'R16: a save carries them to the account, and they stop waiting here',
      after.blocksAdded >= before.blocksAdded + 1 &&
        after.particles >= before.particles + 3 &&
        after.playMs >= before.playMs + 2000 &&
        p2.blocks === 0 &&
        p2.particles < p1.particles,
      {
        before: [before.blocksAdded, before.particles, before.playMs],
        after: [after.blocksAdded, after.particles, after.playMs],
        p2,
      },
    );
    // One more block, then the page closes: one request takes it.
    await a.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await a.page.waitForTimeout(600);
    await a.page.evaluate(() =>
      (window as any).__bd_probe.scene.host.createBlock('ToneSource', 10, 6),
    );
    await a.page.waitForTimeout(500);
    await a.page.goto('about:blank');
    await new Promise((res) => setTimeout(res, 1500));
    await a.page.goto(`${base}/api/config`); // back on the site (its cookie) to ask
    const closed = await stats();
    // (Playwright doesn't see a keepalive request from a page being unloaded: the account's total is the evidence.)
    check(
      'R16: closing the page sends what it counted (credited once)',
      closed.blocksAdded === after.blocksAdded + 1,
      { after: after.blocksAdded, closed: closed.blocksAdded },
    );
    // The switch: ACTIVITY_BEACON=off (a second local Worker).
    const off = await startLocal({
      name: 'accounts-beacon-off',
      vars: {
        TURNSTILE_SECRET: 'test-secret',
        TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
        ACTIVITY_BEACON: 'off',
      },
    });
    try {
      const cfg = (await (await fetch(`${off.url}/api/config`)).json()) as {
        activityBeacon: boolean;
      };
      const post = await fetch(`${off.url}/api/me/activity`, {
        method: 'POST',
        headers: { origin: off.url, 'content-type': 'application/json' },
        body: JSON.stringify({ blocks: 1 }),
      });
      const onCfg = (await (await fetch(`${server.url}/api/config`)).json()) as {
        activityBeacon: boolean;
      };
      check(
        'R16: ACTIVITY_BEACON=off: the page is told not to send, and the request writes nothing',
        !cfg.activityBeacon &&
          onCfg.activityBeacon &&
          post.status === 200 &&
          (await post.json()).added === false,
        { cfg, onCfg },
      );
    } finally {
      await off.stop();
    }
    await openApp(a);
  },

  /** R8, R8a (owner, 2026-11-18): signed in, OPEN lists each of the account's patches once (this browser's copies of
   * them aren't listed again), each with a bin; deleting one really deletes it: its link answers 410 and the patch on
   * the stage is no longer linked to it. */
  async 'open-list-delete'() {
    const a = shared.a!;
    await openApp(a);
    await a.page.evaluate(() => {
      const s = (window as any).__bd_probe.scene;
      s.host.resetScene();
      s.host.createBlock('ToneSource', 2, 2);
      s.PatchesPanel.setTitle('Doomed song');
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
    const rows = await a.page.evaluate(
      () =>
        (window as any).__bd_probe.scene.PatchesPanel.Items as {
          name: string;
          key: string;
          removable?: boolean;
          link?: string;
        }[],
    );
    const acctIds = new Set(
      rows.filter((row) => row.key.startsWith('acct:')).map((r) => r.key.slice(5)),
    );
    const twice = rows.filter(
      (row) => row.key.startsWith('mine:') && row.link && acctIds.has(row.link),
    );
    const n = rows.findIndex((row) => row.key === `acct:${id}`);
    check(
      'R8: signed in, OPEN lists each account patch once, each with a bin (no second copy from this browser)',
      n >= 0 &&
        !twice.length &&
        rows.filter((row) => row.key.startsWith('acct:')).every((r) => r.removable),
      { rows: rows.map((row) => row.key), twice },
    );
    await a.page.evaluate((i) => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel;
      pp.OpenScroll = 0;
      pp.scrollOpen(Math.max(0, i - 2) * 40 * (window as any).__bd_probe.v1App.Unit);
    }, n);
    await a.page.waitForTimeout(200);
    await press(a.page, `bin${n}`, 500);
    const line = await a.page.evaluate(() => {
      const pp = (window as any).__bd_probe.scene.PatchesPanel;
      return pp.host.removeLine(pp.removing);
    });
    await a.page.screenshot({ path: `${OUT}/delete-asks.png` });
    await press(a.page, 'removeOk', 1500);
    const gone = await api(a, 'GET', `patches/${id}`);
    const after = await a.page.evaluate(() => ({
      keys: ((window as any).__bd_probe.scene.PatchesPanel.Items as { key: string }[]).map(
        (r) => r.key,
      ),
      comp: (window as any).__bd_probe.v1App.CompositionId,
      url: location.search,
    }));
    check(
      'R8a: DELETE asks first, saying the link and gallery stop working; then the link answers 410 and the stage patch is unlinked',
      /no longer be able to open this save\. If it.s published, it will also be removed from the gallery\./.test(
        line,
      ) &&
        gone.status === 410 &&
        !after.keys.includes(`acct:${id}`) &&
        !after.keys.some((k) => k === 'mine:Doomed song') &&
        after.comp === null &&
        !after.url.includes(id),
      { line, status: gone.status, after },
    );
    await a.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await a.page.waitForTimeout(700);
  },

  /** R4, R10: SIGN OUT EVERYWHERE ends device B's session too; DELETE ACCOUNT removes the account and its patches. */
  async 'sign-out-everywhere-and-delete'() {
    const a = shared.a!,
      b = shared.b!;
    await api(a, 'POST', 'auth/logout', { everywhere: true }, { origin: base });
    const bMe = await api(b, 'GET', 'me');
    await openAccount(a.page);
    check(
      'R4: signing out everywhere (the API) ends every session',
      bMe.json.user === null && (await pp(a.page)).account === null,
    );
    // The passkey manager syncs B's use back to A (its signature counter moved on there): copy it back. Without this
    // the server rightly refuses A's older counter as a possibly cloned key.
    const { credentials } = await b.cdp.send('WebAuthn.getCredentials', {
      authenticatorId: b.authenticator,
    });
    await a.cdp.send('WebAuthn.clearCredentials', { authenticatorId: a.authenticator });
    for (const c of credentials)
      await a.cdp.send('WebAuthn.addCredential', {
        authenticatorId: a.authenticator,
        credential: c,
      });
    await press(a.page, 'passkey');
    await settled(a.page);
    const signedIn = await pp(a.page);
    await a.page
      .waitForFunction(() => !(window as any).__bd_probe.scene.SettingsPanel.Open, null, {
        timeout: 5000,
      })
      .catch(() => {});
    await a.page.waitForTimeout(600); // its slide away ends (v1's panel tween)
    await openAccount(a.page); // signing in went back to the stage
    await press(a.page, 'deleteAccount', 500);
    // Owner (2026-11-18): closing Settings (×) while it asks is CANCEL: it opens on the account next time.
    await a.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
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
      me.json.user === null && gone.status === 410 && again.status === 200,
      [me.json, gone.status],
    );
    await a.ctx.close();
    await b.ctx.close();
  },
};
const shared: { a?: Device; b?: Device; firstPatch?: string } = {};

try {
  for (const [name, value] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    try {
      await value();
    } catch (error) {
      check(name, false, String((error as Error).stack ?? error).slice(0, 600));
    }
  }
} finally {
  await browser.close();
  await server.stop();
  mocks.close();
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
const ok = results.length > 0 && results.every((result) => result.ok);
console.log(
  JSON.stringify({
    ok,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).map((r) => r.name),
  }),
);
process.exit(ok ? 0 : 1);
