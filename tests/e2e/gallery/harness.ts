// The harness the gallery tests share (tests/e2e/gallery.ts and its steps here): mock services, the Worker,
// one browser, devices signed in with virtual passkeys, and helpers that drive the GALLERY tab.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { startLocal } from '../../../tools/server/lib.ts';
import { sineWav, startMockServices } from '../mock-services.ts';

export const OUT = 'tests/e2e/output/gallery';
mkdirSync(OUT, { recursive: true });
export const results: { name: string; ok: boolean; detail?: unknown }[] = [];
export function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}
export const mocks = await startMockServices();
export const STATE = 'gallery';
export const server = await startLocal({
  name: STATE,
  vars: {
    TURNSTILE_SECRET: 'test-secret',
    TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
    ACCOUNTS_PER_DAY: '100',
  },
}); // nine accounts from one address
export const base = server.url.replace('127.0.0.1', 'localhost');
export const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

export interface Device {
  ctx: BrowserContext;
  page: Page;
}
export async function device(name: string | null, query = '?demo&video=1'): Promise<Device> {
  // video=1: MAKE VIDEO is hidden by default (CHG-0035)
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
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto(`${base}/${query}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
    timeout: 20000,
  });
  await page.waitForTimeout(1200);
  const d = { ctx, page };
  if (name) {
    // an account, made in Settings › SIGN IN
    await page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.openAccount());
    await page.waitForFunction(
      () => {
        const settingsPanel = (window as any).__bd_probe.scene.SettingsPanel;
        return settingsPanel.OffsetY === 0 && settingsPanel.accountPage.Account !== undefined;
      },
      null,
      { timeout: 10000 },
    );
    const at = async (n: string) => {
      const c = await page.evaluate(
        (k) => (window as any).__bd_probe.scene.SettingsPanel.accountCentre(k),
        n,
      );
      await page.mouse.click(c[0], c[1]);
      await page.waitForTimeout(400);
    };
    await at('passkey'); // none on this device: CONTINUE WITH PASSKEY asks for a name (CHG-0035)
    await page.waitForFunction(
      () => (window as any).__bd_probe.scene.SettingsPanel.accountPage.View === 'create',
      null,
      { timeout: 10000 },
    );
    await page.fill('#accountHandleInput', name);
    await at('submit');
    await page.waitForFunction(
      () => !!(window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle,
      null,
      { timeout: 20000 },
    );
    await page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel());
    await page.waitForTimeout(800);
  }
  return d;
}
export const P = (device: Device) =>
  device.page.evaluate(() => {
    const x = (window as any).__bd_probe.scene.PatchesPanel;
    return {
      open: x.Open,
      items: x.GalleryItems,
      message: x.GalleryMessage,
      view: x.GalleryView,
      loading: x.GalleryLoading,
      sort: x.GallerySort,
      on: x.GalleryOn,
      note: x.GalleryNote,
    };
  });
/** SAVE on Patches › SAVE / SHARE (a new link the first time, then saves over it); resolves once saved. */
export async function save(device: Device): Promise<string> {
  await tab(device, 0);
  await press(device, 'share', 200);
  await device.page.waitForFunction(
    () => {
      const s = (window as any).__bd_probe;
      const l = s.scene.host.links.current();
      return !!l && !l.stale && !s.scene.PatchesPanel.Saving;
    },
    null,
    { timeout: 60000 },
  );
  await device.page.waitForTimeout(400);
  return device.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
}
/** The accounts the steps share, made as the run goes, and the first patch published. */
export interface Cast {
  alice: Device;
  aliceId: string;
  anon: Device;
  bob: Device;
  carol: Device;
  dave: Device;
  fay: Device;
  gus: Device;
}
/** A patch in @blokdust's EXAMPLES. */
export interface GalleryExample {
  id: string;
  title: string;
}
export const GALLERY = 2;
export async function press(device: Device, name: string, wait = 400): Promise<void> {
  const at = await device.page.evaluate(
    (n) => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n),
    name,
  );
  if (!at) throw new Error(`no control ${name}`);
  await device.page.mouse.move(at[0], at[1]);
  await device.page.mouse.click(at[0], at[1]);
  await device.page.waitForTimeout(wait);
}
export async function tab(device: Device, id: number): Promise<void> {
  for (let i = 0; i < 8 && !(await P(device)).open; i++) {
    await device.page.mouse.move(1138, 45);
    await device.page.mouse.click(1138, 45);
    await device.page.waitForTimeout(700);
  }
  await device.page
    .waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.OffsetY === 0, null, {
      timeout: 5000,
    })
    .catch(() => {});
  await press(device, `tab${id}`, 1100); // the page drops in (CHG-0035)
}
export const idle = (device: Device) =>
  device.page.waitForFunction(
    () => !(window as any).__bd_probe.scene.PatchesPanel.GalleryLoading,
    null,
    { timeout: 60000 },
  );
export async function search(device: Device, q: string): Promise<{ title: string; by: string }[]> {
  await device.page.fill('#gallerySearchInput', q);
  await press(device, 'search');
  await idle(device);
  return (await P(device)).items;
}
export const api = (device: Device, method: string, path: string, body?: unknown) =>
  device.page.evaluate(
    async ([m, url, b]) => {
      const response = await fetch(url, {
        method: m,
        headers: { 'content-type': 'application/json' },
        body: b === undefined ? undefined : JSON.stringify(b),
      });
      return { status: response.status, json: await response.json().catch(() => null) };
    },
    [method, `${base}/api/${path}`, body] as const,
  );
export const PATCH = (
  blocks: { id: string; type: string; x: number; y: number; params: Record<string, unknown> }[],
) => ({ format: 'blokdust.patch', version: 2, seed: 1, blocks });
export const bd = (...a: string[]) =>
  JSON.parse(
    execFileSync('node', ['tools/bd.ts', 'gallery', ...a, '--local', STATE], { encoding: 'utf8' }),
  );
