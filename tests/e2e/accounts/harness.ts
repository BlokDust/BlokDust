// The harness the account tests share (tests/e2e/accounts.ts and its groups here): mock services, the Worker,
// one browser, devices with virtual passkey authenticators, and helpers that drive Settings › ACCOUNT.
import { mkdirSync } from 'node:fs';
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { startLocal } from '../../../tools/server/lib.ts';
import { sineWav, startMockServices } from '../mock-services.ts';

export type AccountTests = Record<string, () => Promise<void>>;

const args = process.argv.slice(2);
export const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
export const OUT = 'tests/e2e/output/accounts';
mkdirSync(OUT, { recursive: true });
export const results: { name: string; ok: boolean; detail?: unknown }[] = [];
export function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}

export const mocks = await startMockServices();
export const server = await startLocal({
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
export const base = server.url.replace('127.0.0.1', 'localhost');
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** A device: a browser context with its own cookies and its own (virtual) passkey authenticator. */
export interface Device {
  ctx: BrowserContext;
  page: Page;
  cdp: CDPSession;
  authenticator: string;
}
export async function device(): Promise<Device> {
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
export async function openApp(device: Device, query = ''): Promise<void> {
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
export const pp = (p: Page) =>
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
export const ACCOUNT_CONTROLS = new Set([
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
export async function press(p: Page, name: string, wait = 400): Promise<void> {
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
export async function openAccount(p: Page): Promise<void> {
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
export const settled = (p: Page) =>
  p.waitForFunction(() => !(window as any).__bd_probe.scene.SettingsPanel.accountPage.Busy, null, {
    timeout: 30000,
  });
export const corners = (p: Page) => p.evaluate(() => (window as any).__bd_probe.corners);
/** A new Google account named `handle` on device `d` (the mock's next user `user`). Sign-in starts share a per-minute
 * limit (SAVE_LIMIT 'auth'), which the tests before may have used up: refused (429), wait it out and try again. */
export async function googleAccount(device: Device, user: string, handle: string): Promise<void> {
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
export const api = (
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
export async function saveLink(p: Page): Promise<string> {
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
export async function addBlock(p: Page): Promise<void> {
  await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('ToneSource', 4, 4));
  await p.waitForTimeout(300);
}

export const shared: { a?: Device; b?: Device; firstPatch?: string } = {};
