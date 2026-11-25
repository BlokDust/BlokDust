// The account tests' harness: mock services, the Worker, one browser, devices with virtual passkey
// authenticators, and helpers that drive Settings › ACCOUNT.
import { mkdirSync } from 'node:fs';
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { startLocal } from '../../../tools/server/lib.ts';
import { sineWav, startMockServices } from '../mock-services.ts';
import type { AppSettingsPanel } from '../pageGlobals.shared.ts';
import type { ApiAnswer } from './answers.ts';

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
    // Every test's accounts come from one address (new-account-limit has its own Worker).
    ACCOUNTS_PER_DAY: '100',
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
  await ctx.route('https://cdn.freesound.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: sineWav(440),
    }),
  );
  const page = await ctx.newPage();
  page.on('pageerror', (error) => {
    console.error(`  page error: ${error.message}`);
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
  await device.page.waitForFunction(() => window.__bd_probe);
  if (await device.page.$('#start')) {
    await device.page.click('#start');
    await device.page.waitForFunction(() => window.__bd_probe.state.started, null, {
      timeout: 20000,
    });
  }
  await device.page.waitForTimeout(1500);
}
/** Patches open, and Settings › ACCOUNT's state (accountPage.ts). */
export const pp = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__bd_probe.scene,
      settings = scene.SettingsPanel as AppSettingsPanel,
      account = settings.accountPage;
    return {
      open: scene.PatchesPanel.Open,
      settings: settings.Open,
      tabName: settings.MenuItems.at(4)?.Name,
      view: account.View,
      account: account.Account,
      busy: account.Busy,
      message: account.Message,
      methods: account.Account ? account.methods() : [],
      addLabel: account.addLabel,
      rows: account.Account ? account.methodRows().map((row) => row.label) : [],
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
export async function press(page: Page, name: string, wait = 400): Promise<void> {
  const at = await page.evaluate(
    ([key, inSettings]) => {
      const scene = window.__bd_probe.scene;
      return inSettings
        ? (scene.SettingsPanel as AppSettingsPanel).accountCentre(key)
        : scene.PatchesPanel.centreOf(key);
    },
    [name, ACCOUNT_CONTROLS.has(name)] as const,
  );
  if (!at) throw new Error(`no control ${name}`);
  await page.mouse.move(at[0], at[1]);
  await page.mouse.click(at[0], at[1]);
  await page.waitForTimeout(wait);
}
/** Settings › SIGN IN / ACCOUNT (the corner name and the Google return open it the same way). */
export async function openAccount(page: Page): Promise<void> {
  if ((await pp(page)).open) {
    await page.evaluate(() => {
      window.__bd_probe.scene.PatchesPanel.ClosePanel();
    });
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => {
    (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).openAccount();
  });
  await page.waitForFunction(
    () => {
      const settingsPanel = window.__bd_probe.scene.SettingsPanel as AppSettingsPanel;
      return settingsPanel.OffsetY === 0 && settingsPanel.accountPage.Account !== undefined;
    },
    null,
    { timeout: 10000 },
  );
  await page.waitForTimeout(300);
}
export const settled = (page: Page) =>
  page.waitForFunction(
    () => !(window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.Busy,
    null,
    { timeout: 30000 },
  );
export const corners = (page: Page) => page.evaluate(() => window.__bd_probe.corners);
/** A new Google account `handle` on `device` (the mock's next user `user`). Sign-in starts share a
 * per-minute limit (SAVE_LIMIT 'auth'): refused (429), it waits that out and retries once. */
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
        () =>
          (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).accountPage.View === 'name',
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
/** The API called from `device`'s page (its cookies); `json` is null when the answer isn't JSON. */
export const api = (
  device: Device,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  device.page.evaluate(
    async ([verb, url, payload, extraHeaders]) => {
      const response = await fetch(url, {
        method: verb,
        headers: { 'content-type': 'application/json', ...extraHeaders },
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => null)) as ApiAnswer | null;
      return { status: response.status, json };
    },
    [method, `${base}/api/${path}`, body, headers] as const,
  );
/** SAVE on the Patches › SAVE tab (a new link the first time, then saves over it). Returns the
 * link's id. */
export async function saveLink(page: Page): Promise<string> {
  await press(page, 'tab0', 1100);
  await press(page, 'share', 200);
  await page.waitForFunction(
    () => {
      const link = window.__bd_probe.scene.host.links?.current();
      return !!link && !link.stale && !window.__bd_probe.scene.PatchesPanel.Saving;
    },
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(500);
  const url = await page.evaluate(() => window.__bd_probe.scene.host.links?.current()?.url ?? '');
  const id = /[?&]c=([^&]+)/.exec(url)?.[1];
  if (!id) throw new Error(`no patch id in the saved link ${url}`);
  return id;
}
export async function addBlock(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__bd_probe.scene.host.createBlock('ToneSource', 4, 4);
  });
  await page.waitForTimeout(300);
}

/** Devices and the first patch that later tests take over from passkey-account and
 * second-device. */
export const shared: { a?: Device; b?: Device; firstPatch?: string } = {};
export function sharedDevice(key: 'a' | 'b'): Device {
  const kept = shared[key];
  if (!kept) throw new Error(`device ${key} is made by an earlier test`);
  return kept;
}
