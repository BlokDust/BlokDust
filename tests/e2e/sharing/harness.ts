// The harness the sharing tests share (tests/e2e/sharing.ts and its groups here): the target, the API, and
// helpers that open the app and drive the Patches panel.
import { mkdirSync } from 'node:fs';
import { chromium, type Browser, type Frame, type Page } from 'playwright';
import { sineWav, type MockServices } from '../mock-services.ts';

export type SharingTests = Record<string, (browser: Browser) => Promise<void>>;

const args = process.argv.slice(2);
export const remote = args.includes('--remote') ? args[args.indexOf('--remote') + 1] : null;
/** Local, with the app under a base path, /blokdust (SHARING-0004; wrangler env `based`). Deployed envs are at the root. */
export const based = args.includes('--base');
export const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
export const results: { name: string; ok: boolean; detail?: unknown }[] = [];
export const created: { id: string; token: string }[] = [];
export let base = '';
export let mocks: MockServices | null = null;

export function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}
export const probe = (p: Page | Frame) => p.evaluate(() => (window as any).__bd_probe.state);
export const renderHash = (p: Page | Frame) =>
  p.evaluate(() => (window as any).__bd_probe.renderHash(4));
export const VIEW = { viewport: { width: 1280, height: 800 } };
export const OUT = 'tests/e2e/output/sharing';
mkdirSync(OUT, { recursive: true });

export async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}
export const PATCH = {
  format: 'blokdust.patch',
  version: 2,
  seed: 1,
  blocks: [
    { id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} },
    { id: 'b2', type: 'power.power', x: -3, y: 0, params: {} },
  ],
};

export async function open(browser: Browser, url: string): Promise<Page> {
  const ctx = await browser.newContext(VIEW);
  // Local runs never touch the network: Freesound's CDN (default sounds) is answered by the mock.
  if (!remote)
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
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__bd_probe);
  // Start audio like a user: the "Click to start" overlay covers the stage until then.
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
    timeout: 20000,
  });
  // A real Chrome (smoke) plays v1's intro after START; the stage takes input once it has gone.
  await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
  return page;
}
/** The Patches panel's SAVE tab (header › PATCHES, CHG-0005; owner 2026-11-10). */
export async function openShare(page: Page): Promise<void> {
  // v1's header slides in for a couple of seconds after load and ignores clicks until then: retry.
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)) break;
    await page.mouse.move(1138, 45);
    await page.waitForTimeout(100);
    await page.mouse.click(1138, 45);
    await page
      .waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.Open, null, {
        timeout: 1000,
      })
      .catch(() => {});
  }
  await page.waitForTimeout(1000);
  const tab = await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
  if (tab !== 0) {
    await press(page, 'tab0');
    await page.waitForTimeout(800);
  } // the page drops in (CHG-0035)
}
export async function press(page: Page, name: string): Promise<void> {
  const [x, y] = await page.evaluate(
    (n) => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n),
    name,
  );
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(300);
}
/** generate: SAVE with no link yet (v1 SAVE_AS). overwrite: SAVE once the patch has changed (v1 SAVE). createNew: SAVE
 * AS (v1 SAVE_AS). Owner, 2026-11-11: SAVE · SAVE AS · DOWNLOAD PATCH. */
export async function shareVia(
  page: Page,
  button: 'generate' | 'overwrite' | 'createNew',
): Promise<string> {
  await openShare(page);
  const before = await page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId ?? '');
  const rev = await page.evaluate(
    () => (document.getElementById('patchUrlText') as HTMLInputElement).value,
  );
  await press(page, button === 'createNew' ? 'saveAs' : 'share');
  // Saved when the panel shows a link that isn't the one before (or, overwriting, the same id once saving is done).
  await page
    .waitForFunction(
      ([prev, old, same]) => {
        const pp = (window as any).__bd_probe.scene.PatchesPanel,
          v = (document.getElementById('patchUrlText') as HTMLInputElement).value;
        const id = /[?&]c=([^&]+)/.exec(v)?.[1];
        return (
          !!id &&
          !pp.Saving &&
          (same
            ? !(window as any).__bd_probe.scene.host.links.current()?.stale
            : id !== prev && v !== old)
        );
      },
      [before, rev, button === 'overwrite'] as const,
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
  return page.evaluate(() =>
    (document.getElementById('patchUrlText') as HTMLInputElement).value.trim(),
  );
}
export const idOf = (url: string) => /[?&]c=([^&]+)/.exec(url)?.[1] ?? '';
export const local = (url: string) => url.replace(/^https?:\/\/[^/]+/, new URL(base).origin); // links carry the base path already
export async function closeShare(page: Page) {
  if (await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)) {
    await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await page.waitForTimeout(800);
  }
}

/** When api-guards used up this client's Freesound limit (60 a minute): later tests that search wait the minute out. */
export let searchLimitedAt = 0;
export function markSearchLimited(): void {
  searchLimitedAt = Date.now();
}
/** The runner points the tests at a Worker (local or --remote) once the mocks are up. */
export function setTarget(url: string, services: MockServices): void {
  base = url;
  mocks = services;
}

/**
 * Remote runs drive the installed Google Chrome over CDP, started without automation flags, because Turnstile refuses
 * automated browsers (error 600010 in Playwright's Chromium) but passes a normal one. This proves the real bot check end to end.
 */
export async function realChrome(): Promise<{ browser: Browser; close(): void }> {
  const { spawn } = await import('node:child_process');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      `--user-data-dir=${mkdtempSync(`${tmpdir()}/bd-smoke-`)}`,
      `--remote-debugging-port=${port}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 60; i++) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      return { browser, close: () => chrome.kill() };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  chrome.kill();
  throw new Error('Google Chrome did not start');
}
