// pnpm test:sharing — CHG-0003 acceptance (SPEC-SHARING-BACKEND), black-box through the real app and the Worker:
//   local (default): `wrangler dev` on web/dist with a local D1, Cloudflare's test Turnstile key, and mocked Freesound +
//   siteverify (tests/e2e/mock-services.ts), so every run is the same.
//   --remote <url>: the same flow against a deployed Worker (`pnpm bd server smoke`): real Turnstile and Freesound;
//   checks that need the mocks are skipped there, and patches it creates are deleted at the end.
import { inflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Frame, type Page } from 'playwright';
import { startLocal, type LocalServer } from '../../tools/server/lib.ts';
import { MOCK_SOUNDS, sineWav, startMockServices, type MockServices } from './mock-services.ts';

const args = process.argv.slice(2);
const remote = args.includes('--remote') ? args[args.indexOf('--remote') + 1] : null;
/** Local, with the app under a base path, /blokdust (SHARING-0004; wrangler env `based`). Deployed envs are at the root. */
const based = args.includes('--base');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
const created: { id: string; token: string }[] = [];
let base = '';
let mocks: MockServices | null = null;

function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`);
}
const probe = (p: Page | Frame) => p.evaluate(() => (window as any).__bd_probe.state);
const renderHash = (p: Page | Frame) => p.evaluate(() => (window as any).__bd_probe.renderHash(4));
const VIEW = { viewport: { width: 1280, height: 800 } };
const OUT = 'tests/e2e/output/sharing';
mkdirSync(OUT, { recursive: true });

async function api(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; json: any }> {
  const r = await fetch(`${base}/api/${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const PATCH = { format: 'blokdust.patch', version: 2, seed: 1, blocks: [{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }, { id: 'b2', type: 'power.power', x: -3, y: 0, params: {} }] };

async function open(browser: Browser, url: string): Promise<Page> {
  const ctx = await browser.newContext(VIEW);
  // Local runs never touch the network: Freesound's CDN (default sounds) is answered by the mock.
  if (!remote) await ctx.route('https://cdn.freesound.org/**', r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: sineWav(440) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`  page error: ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => (window as any).__bd_probe);
  // Start audio like a user: the "Click to start" overlay covers the stage until then.
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
  // A real Chrome (smoke) plays v1's intro after START; the stage takes input once it has gone.
  await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
  return page;
}
/** The Patches panel's SAVE tab (header › PATCHES, CHG-0005; owner 2026-11-10). */
async function openShare(page: Page): Promise<void> {
  // v1's header slides in for a couple of seconds after load and ignores clicks until then: retry.
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)) break;
    await page.mouse.move(1138, 45); await page.waitForTimeout(100); await page.mouse.click(1138, 45);
    await page.waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.Open, null, { timeout: 1000 }).catch(() => {});
  }
  await page.waitForTimeout(1000);
  const tab = await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Tab);
  if (tab !== 0) { await press(page, 'tab0'); await page.waitForTimeout(800); }  // the page drops in (CHG-0035)
}
async function press(page: Page, name: string): Promise<void> {
  const [x, y] = await page.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name);
  await page.mouse.move(x, y); await page.mouse.click(x, y); await page.waitForTimeout(300);
}
/** generate: SAVE with no link yet (v1 SAVE_AS). overwrite: SAVE once the patch has changed (v1 SAVE). createNew: SAVE
 * AS (v1 SAVE_AS). Owner, 2026-11-11: SAVE · SAVE AS · DOWNLOAD PATCH. */
async function shareVia(page: Page, button: 'generate' | 'overwrite' | 'createNew'): Promise<string> {
  await openShare(page);
  const before = await page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId ?? '');
  const rev = await page.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value);
  await press(page, button === 'createNew' ? 'saveAs' : 'share');
  // Saved when the panel shows a link that isn't the one before (or, overwriting, the same id once saving is done).
  await page.waitForFunction(([prev, old, same]) => {
    const pp = (window as any).__bd_probe.scene.PatchesPanel, v = (document.getElementById('patchUrlText') as HTMLInputElement).value;
    const id = v.match(/[?&]c=([^&]+)/)?.[1];
    return !!id && !pp.Saving && (same ? !(window as any).__bd_probe.scene.host.links.current()?.stale : id !== prev && v !== old);
  }, [before, rev, button === 'overwrite'] as const, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  return page.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value.trim());
}
const idOf = (url: string) => url.match(/[?&]c=([^&]+)/)?.[1] ?? '';
const local = (url: string) => url.replace(/^https?:\/\/[^/]+/, new URL(base).origin);  // links carry the base path already
async function closeShare(page: Page) {
  if (await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)) {
    await page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
    await page.waitForTimeout(800);
  }
}

/** When api-guards used up this client's Freesound limit (60 a minute): later tests that search wait the minute out. */
let searchLimitedAt = 0;
const tests: Record<string, (browser: Browser) => Promise<void>> = {
  /** SPEC-SHARING-BACKEND R3–R6: the API refuses what it must (needs the siteverify mock for the failing token). */
  /** CHG-0005 task 10: under a base path (`--base`, or a deployed /blokdust): the build's files are there, the bare
   * base redirects to base/, links from before the move (root `/?c=`, `/embed/`) redirect into it, and the API also
   * answers at the root (plugin builds that call it there). */
  async 'base-path'() {
    const u = new URL(base), b = u.pathname.replace(/\/+$/, '');
    if (!b) return;  // served at the root: nothing to check
    const get = (path: string) => fetch(`${u.origin}${path}`, { redirect: 'manual' });
    const page = await get(`${b}/`), html = await page.text();
    check('base/: the app, its links under the base', page.status === 200 && html.includes(`content="${base}"`), page.status);
    const asset = (html.match(/src="\.\/(assets\/[^"]+\.js)"/) ?? [])[1];
    check('base/: the build\'s files under the base', !!asset && (await get(`${b}/${asset}`)).status === 200, asset);
    const bare = await get(b);
    check('bare base → base/', bare.status === 301 && new URL(bare.headers.get('location')!, u).pathname === `${b}/`, bare.headers.get('location'));
    const old = await get('/?c=A000000000&t=x');
    check('an old root link → the same link under the base', old.status === 301 && (old.headers.get('location') ?? '').endsWith(`${b}/?c=A000000000&t=x`), old.headers.get('location'));
    const oldEmbed = await get('/embed/A000000000');
    check('an old embed link → under the base', oldEmbed.status === 301 && (oldEmbed.headers.get('location') ?? '').endsWith(`${b}/embed/A000000000`), oldEmbed.headers.get('location'));
    check('the API also answers at the root', (await get('/api/config')).status === 200 && (await get(`${b}/api/config`)).status === 200);
    check('nothing else outside the base', (await get('/nope.js')).status === 404);
  },

  /** SHARING-0004/0005: a Worker whose public address is on another host, under a base path
   * sends its pages there; the API stays answerable where it is. Local `--base` runs only (a second Worker). */
  async 'canonical-host'() {
    if (remote || !based) return;
    const s = await startLocal({ name: 'canon', env: 'based', vars: { TURNSTILE_SECRET: 'test-secret', PUBLIC_BASE_URL: 'https://funputs.example/blokdust' } });
    try {
      const loc = async (path: string) => { const r = await fetch(`${s.url}${path}`, { redirect: 'manual' }); return [r.status, r.headers.get('location')] as const; };
      const page = await loc('/blokdust/?c=A000000000&t=x'), root = await loc('/?c=A000000000'), embed = await loc('/blokdust/embed/A000000000');
      check('pages on another host → the public address', page[0] === 301 && page[1] === 'https://funputs.example/blokdust/?c=A000000000&t=x'
        && root[1] === 'https://funputs.example/blokdust/?c=A000000000' && embed[1] === 'https://funputs.example/blokdust/embed/A000000000', { page, root, embed });
      check('… the API stays answerable there', (await fetch(`${s.url}/blokdust/api/config`)).status === 200 && (await fetch(`${s.url}/api/config`)).status === 200);
      check('… and the build\'s files too', (await fetch(`${s.url}/blokdust/favicon.ico`)).status === 200);
    } finally { await s.stop(); }
  },

  /** SHARING-0006: the public site is at a root (blokdust.funputs.com). The former base path /blokdust, where
   * funputs.com/blokdust lands, sends its pages there with a 302 (a landing page may replace it later) and answers the
   * API in place. Other hosts (production's workers.dev) send their pages to the public site. Local: a second Worker
   * with production's settings; remote (smoke): the legacy path on the deployed host. */
  async 'legacy-path'() {
    if (based) return;
    const loc = async (url: string, method = 'GET') => { const r = await fetch(url, { method, redirect: 'manual' }); return [r.status, r.headers.get('location')] as const; };
    if (remote) {
      const u = new URL(base);
      if (u.pathname.replace(/\/+$/, '')) return;  // a deployment under a prefix has no legacy path
      const page = await loc(`${u.origin}/blokdust/?c=A000000000&t=x`);
      check('/blokdust/ → 302 to the same page at the root', page[0] === 302 && page[1] === `${u.origin}/?c=A000000000&t=x`, page);
      check('/blokdust/api answers in place', (await fetch(`${u.origin}/blokdust/api/config`)).status === 200);
      return;
    }
    const pub = 'https://blokdust.example';
    const s = await startLocal({ name: 'legacy', vars: { TURNSTILE_SECRET: 'test-secret', PUBLIC_BASE_URL: pub, LEGACY_BASE_PATH: '/blokdust' } });
    try {
      const [page, bare, idx, embed, root, rootEmbed] = await Promise.all(['/blokdust/?c=A000000000&t=x', '/blokdust', '/blokdust/index.html',
        '/blokdust/embed/A000000000', '/?c=A000000000', '/embed/A000000000'].map(p => loc(s.url + p)));
      check('legacy pages → 302 to the same page on the public site', page[0] === 302 && page[1] === `${pub}/?c=A000000000&t=x`
        && bare[0] === 302 && bare[1] === `${pub}/` && idx[1] === `${pub}/` && embed[0] === 302 && embed[1] === `${pub}/embed/A000000000`, { page, bare, idx, embed });
      check('… other files under it too', (await loc(`${s.url}/blokdust/favicon.ico`))[1] === `${pub}/favicon.ico`);
      check('… the API answers in place', (await fetch(`${s.url}/blokdust/api/config`)).status === 200);
      check('… other methods there: 404', (await loc(`${s.url}/blokdust/`, 'POST'))[0] === 404);
      check('pages on another host → the public site (301)', root[0] === 301 && root[1] === `${pub}/?c=A000000000`
        && rootEmbed[0] === 301 && rootEmbed[1] === `${pub}/embed/A000000000`, { root, rootEmbed });
      check('… its API and the build\'s files answer there', (await fetch(`${s.url}/api/config`)).status === 200 && (await fetch(`${s.url}/favicon.ico`)).status === 200);
    } finally { await s.stop(); }
  },

  async 'api-guards'() {
    check('no bot-check token → 403', (await api('POST', 'patches', { patch: PATCH })).status === 403);
    if (!remote) check('failed bot check → 403', (await api('POST', 'patches', { patch: PATCH, turnstile: 'fail' })).status === 403);
    check('not a v2 patch → 400', (await api('POST', 'patches', { patch: { blocks: 'x' }, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' })).status === 400);
    const big = { ...PATCH, blocks: [...PATCH.blocks, { id: 'pad', type: 'source.tone', x: 9, y: 9, params: { note: 'x'.repeat(70000) } }] };
    check('patch over 64 KB → 413', (await api('POST', 'patches', { patch: big, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' })).status === 413);
    check('thumb not a PNG → 400', (await api('POST', 'patches', { patch: PATCH, thumb: btoa('GIF89a'), turnstile: 'XXXX.DUMMY.TOKEN.XXXX' })).status === 400);
    check('unknown id → 404', (await api('GET', 'patches/A000000000')).status === 404);
    check('malformed id → 404', (await api('GET', 'patches/..%2Fx')).status === 404);
    if (!remote) {
      // R5a: per-IP limits. Freesound lookups share one key (2000/day): the 61st in a minute is refused.
      let codes: number[] = [];
      for (let i = 0; i < 62; i++) codes.push((await fetch(`${base}/api/freesound/sounds/101`)).status);
      searchLimitedAt = Date.now();
      check('Freesound lookups are rate limited per client (429 after 60/min)', codes.slice(0, 60).every(c => c === 200) && codes.at(-1) === 429, { first: codes[0], last: codes.at(-1) });
      codes = [];
    }
    if (remote) return;  // creating needs a real Turnstile token remotely
    const c = await api('POST', 'patches', { patch: PATCH, title: 'Guard', turnstile: 'XXXX.DUMMY.TOKEN.XXXX' });
    check('create → 201 with id and edit token', c.status === 201 && /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(c.json?.id) && !!c.json?.editToken, c.json);
    created.push({ id: c.json.id, token: c.json.editToken });
    check('overwrite without token → 403', (await api('PUT', `patches/${c.json.id}`, { patch: PATCH, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' })).status === 403);
    check('overwrite with a wrong token → 403', (await api('PUT', `patches/${c.json.id}`, { patch: PATCH, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' }, 'nope')).status === 403);
    const s = await api('PUT', `patches/${c.json.id}`, { patch: { ...PATCH, seed: 2 }, title: 'Guard 2', turnstile: 'XXXX.DUMMY.TOKEN.XXXX' }, c.json.editToken);
    const g = await api('GET', `patches/${c.json.id}`);
    check('overwrite with its token → same id, rev 2, new content', s.status === 200 && g.json?.rev === 2 && g.json?.patch?.seed === 2 && g.json?.title === 'Guard 2', g.json);
    const a = await api('POST', 'patches', { patch: PATCH, parent: c.json.id, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' });
    check('save-as records the parent', a.status === 201 && a.json?.parent === c.json.id, a.json);
    created.push({ id: a.json.id, token: a.json.editToken });
    check('delete without token → 403', (await api('DELETE', `patches/${a.json.id}`)).status === 403);
    check('delete with token → 204, then 410 (deleted)', (await api('DELETE', `patches/${a.json.id}`, undefined, a.json.editToken)).status === 204 && (await api('GET', `patches/${a.json.id}`)).status === 410);
  },

  /** Acceptance: Share → open in a fresh browser → identical render hash; Overwrite / Create new as v1. */
  /** CHG-0033 (owner, 2026-11-17), R18–R20: Cmd/Ctrl+S and the corner's UNSAVED/SAVE save over your own link (same
   * id and title, no gallery field, no panel) and v1's message bar says SAVED; the corner names the patch and marks
   * unsaved changes, which survive a reload; a failed save says so and changes nothing. */
  /** Owner (2026-11-18): a link to no patch opened this browser's last stage (a made-up id) or an empty one, with no
   * word. Now the message bar says why and the stage starts blank; the bad link leaves the address bar; this browser's
   * autosave is kept. Deleted patches answer 410 (SPEC-SHARING-BACKEND R4b). */
  async 'missing-links'(browser) {
    if (remote) return;
    const made = await api('POST', 'patches', { patch: PATCH, turnstile: 'XXXX.DUMMY.TOKEN.XXXX', title: 'Soon gone' });
    const del = await api('DELETE', `patches/${made.json.id}`, undefined, made.json.editToken);
    const gone = await api('GET', `patches/${made.json.id}`);
    check('a deleted patch answers 410; one that never was, 404', del.status === 204 && gone.status === 410 && (await api('GET', 'patches/A000000000')).status === 404, [del.status, gone.status]);
    const page = await open(browser, `${base}/?demo`);
    // This browser's last stage (its autosave), as a visit without a link would restore it.
    const autosave = await page.evaluate(p => { localStorage.setItem('blokdust2.autosave', JSON.stringify(p)); return localStorage.getItem('blokdust2.autosave'); }, PATCH);
    const cases: [string, RegExp][] = [['madeUpId', /doesn.t lead to a patch/i], ['A000000000', /doesn.t lead to a patch/i], [made.json.id, /has been deleted/i]];
    const seen: unknown[] = [];
    let ok = !!autosave;
    for (const [id, want] of cases) {
      await page.goto(`${base}/?c=${id}&t=Whatever`);
      await page.waitForFunction(() => (window as any).__bd_probe);
      if (await page.$('#start')) await page.click('#start');
      await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
      await page.waitForFunction(() => (window as any).__bd_probe.scene.MessagePanel.Open, null, { timeout: 8000 }).catch(() => {});
      const r = await page.evaluate(() => { const w = window as any; return { text: String(w.__bd_probe.scene.MessagePanel._Value?.string ?? ''), blocks: w.__bd_probe.scene.host.hasBlocks(), url: location.search, autosave: localStorage.getItem('blokdust2.autosave') }; });
      seen.push({ id, ...r, autosave: r.autosave === autosave });
      ok &&= want.test(r.text) && !r.blocks && !r.url.includes('c=') && r.autosave === autosave;
    }
    await page.context().close();
    check('a bad, unknown or deleted link: the message bar says which, a blank stage, the link leaves the address bar, the autosave is kept', ok, seen);
  },

  async 'quick-save'(browser) {
    const a = await open(browser, `${base}/?demo`);
    await a.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
    const corner = () => a.evaluate(() => (window as any).__bd_probe.corners as { own: { title: string; dirty: boolean; saving: boolean; hover: boolean } | null; saveAt: [number, number] | null });
    const msg = () => a.evaluate(() => { const m = (window as any).__bd_probe.scene.MessagePanel; return { open: m.Open, shown: m._Alpha > 0, text: m._Value?.string }; });
    const puts: { url: string; body: any }[] = [];
    a.on('request', r => { if (/\/api\/patches/.test(r.url()) && r.method() !== 'GET') puts.push({ url: `${r.method()} ${r.url().replace(/^.*\/api\//, '')}`, body: JSON.parse(r.postData() ?? '{}') }); });
    const transpose = (v: number) => a.evaluate(n => { const s = (window as any).__bd_probe; const t = s.state.blocks.find((x: any) => x.type === 'source.tone'); s.scene.host.setParam(t.id, 'transpose', n); }, v);
    const key = async () => { await a.keyboard.press('ControlOrMeta+s'); };
    const settled = () => a.waitForFunction(() => { const o = (window as any).__bd_probe.corners.own; return o && !o.saving && !o.dirty; }, null, { timeout: 30000 }).catch(() => {});

    // Never saved: the key opens Patches › SAVE (R18) and saves nothing.
    await key(); await a.waitForTimeout(1200);
    check('R18: no link of your own: Cmd/Ctrl+S opens Patches › SAVE, saves nothing', await a.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; return pp.Open && pp.Tab === 0; }) && puts.length === 0 && (await corner()).own === null);
    const title = await a.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Title.trim());
    const url = await shareVia(a, 'generate'), id = idOf(url);
    const token = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], id);
    if (id && token) created.push({ id, token });
    await closeShare(a);
    const c0 = await corner();
    await a.screenshot({ path: `${OUT}/quick-save-clean.png` });
    check('R19: your saved link: the corner names it, nothing unsaved', c0.own?.title === title && !c0.own?.dirty && !c0.saveAt, c0);

    await transpose(5); await a.waitForTimeout(800);
    const c1 = await corner();
    await a.mouse.move(640, 600); await a.waitForTimeout(200);
    await a.screenshot({ path: `${OUT}/quick-save-unsaved.png` });
    check('R19: a change marks it UNSAVED', !!c1.own?.dirty && !!c1.saveAt, c1);
    await a.mouse.move(c1.saveAt![0], c1.saveAt![1]); await a.waitForTimeout(300);
    const hover = await corner();
    await a.screenshot({ path: `${OUT}/quick-save-hover.png` });
    check('R19: under the mouse it reads SAVE', !!hover.own?.hover, hover.own);
    await a.mouse.move(640, 600); await a.waitForTimeout(200);

    puts.length = 0;
    await key(); await settled(); await a.waitForTimeout(300);
    const m1 = await msg(), g1 = await api('GET', `patches/${id}`);
    await a.screenshot({ path: `${OUT}/quick-save-saved.png` });
    check('R18: Cmd/Ctrl+S saves over the same link (no panel, no gallery change)', puts.length === 1 && puts[0].url === `PUT patches/${id}` && !('gallery' in puts[0].body) && puts[0].body.title === title
      && g1.json?.rev === 2 && g1.json?.title === title && g1.json?.patch?.blocks?.some((x: any) => x.params?.transpose === 5) && idOf(a.url()) === id
      && !(await a.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)), { puts: puts.map(p => p.url), rev: g1.json?.rev, title: g1.json?.title, at: a.url() });
    check('R18: v1 message bar says SAVED; the corner is clean again', m1.open && m1.shown && m1.text === 'Saved' && (await corner()).own?.dirty === false, m1);

    // Nothing changed: SAVED again, no request.
    puts.length = 0; await a.waitForTimeout(3500);
    await key(); await a.waitForTimeout(600);
    check('R18: no changes: SAVED shows, nothing is sent', puts.length === 0 && (await msg()).open, puts);

    // The corner's SAVE saves too.
    await transpose(3); await a.waitForTimeout(800);
    const c2 = await corner();
    await a.mouse.move(c2.saveAt![0], c2.saveAt![1]); await a.mouse.click(c2.saveAt![0], c2.saveAt![1]); await settled();
    const g2 = await api('GET', `patches/${id}`);
    check('R19: pressing SAVE in the corner saves over the link', g2.json?.rev === 3 && g2.json?.patch?.blocks?.some((x: any) => x.params?.transpose === 3), g2.json?.rev);

    // A failed save says so, keeps the link and the unsaved mark (R18: never a new self-contained link).
    await transpose(4); await a.waitForTimeout(800);
    await a.route('**/api/patches/**', r => r.request().method() === 'PUT' ? r.fulfill({ status: 500, body: '{}' }) : r.continue());
    await a.waitForTimeout(3500);
    await key();
    await a.waitForFunction(() => !(window as any).__bd_probe.corners.own?.saving, null, { timeout: 30000 }).catch(() => {});
    const m3 = await msg(), c3 = await corner();
    check('R18: a failed save says so; same link, still UNSAVED', m3.open && /failed/i.test(m3.text ?? '') && !!c3.own?.dirty && idOf(a.url()) === id && (await api('GET', `patches/${id}`)).json?.rev === 3, { m3, own: c3.own, at: a.url() });
    await a.unroute('**/api/patches/**');

    // R20: unsaved edits survive a reload and still show as UNSAVED.
    await a.reload(); await a.waitForFunction(() => (window as any).__bd_probe);
    await a.click('#start'); await a.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
    await a.waitForTimeout(1500);
    const c4 = await corner(), kept = (await probe(a)).patch.blocks.some((x: any) => x.params?.transpose === 4);
    check('R20: after a reload the unsaved edit is back and marked UNSAVED', kept && c4.own?.title === title && !!c4.own?.dirty, { kept, own: c4.own });
    await a.context().close();
  },

  /** CHG-0013 (owner, 2026-11-13): the plugin's CREATE SHARE LINK opens `?c=p…&t=…&share=1` here; the page makes the
   * link at once and the address bar shows the short server link, which opens the same patch. */
  async 'share-from-app'(browser) {
    const { deflateRawSync } = await import('node:zlib');
    const token = 'p' + deflateRawSync(Buffer.from(JSON.stringify(PATCH))).toString('base64url');
    const a = await open(browser, `${base}/?c=${token}&t=${encodeURIComponent('From the app')}&share=1`);
    await a.waitForFunction(() => /[?&]c=(?!p)[0-9A-Za-z]{10}(&|$)/.test(location.search), null, { timeout: 30000 }).catch(() => {});
    const url = a.url(), id = idOf(url);
    check('share=1 → the address bar shows a server link', /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(id) && !/share=/.test(url) && /t=From/.test(url), url);
    check('… with the Patches panel closed', !(await a.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Open)));
    const edit = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], id);
    if (id && edit) created.push({ id, token: edit });
    const got = await api('GET', `patches/${id}`);
    check('… which holds the patch and its title', got.status === 200 && JSON.stringify(got.json?.patch?.blocks) === JSON.stringify(PATCH.blocks) && got.json?.title === 'From the app', got.json?.title);
  },
  async 'share-and-load'(browser) {
    const a = await open(browser, `${base}/?demo`);
    await a.waitForTimeout(1000);
    // The demo's Toggles flip as it plays, and a link keeps them as they are (CHG-0013): the power switch holds them
    // still, so the patch shared is the one rendered here.
    await a.evaluate(() => (window as any).__bd_probe.scene.setWorldPower(false));
    await a.waitForTimeout(500);
    const hashA = await renderHash(a);
    // The share card uses the sharer's colour theme (SPEC-SHARING-BACKEND R9): share from a non-default one.
    const themeBg = await a.evaluate(() => { const s = (window as any).__bd_probe; s.scene.host.setTheme(3); return s.scene.host.themes()[3].colors[0] as string; });
    const url = await shareVia(a, 'generate');
    const id = idOf(url);
    check('generate link → a server id (not a patch token)', /^[0-9A-Za-oq-z][0-9A-Za-z]{9}$/.test(id), url);
    check('the address bar shows the saved link (v1 AddressBarManager)', a.url().includes(`c=${id}`), a.url());
    const token = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], id);
    if (id && token) created.push({ id, token });
    // As opened, before START (playing, its Toggles flip too).
    const b = await (await browser.newContext(VIEW)).newPage();
    if (!remote) await b.context().route('https://cdn.freesound.org/**', r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: sineWav(440) }));
    await b.goto(local(url)); await b.waitForFunction(() => (window as any).__bd_probe?.state.patch);
    const [pa, pb] = [await probe(a), await probe(b)];
    check('a fresh browser opens the same patch', JSON.stringify(pa.patch.blocks) === JSON.stringify(pb.patch.blocks) && pb.patch.blocks.length > 0, pb.patch.blocks.length);
    const hashB = await renderHash(b);
    await b.click('#start');
    await b.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
    await b.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
    check('… and renders it identically (offline render hash)', hashA.hash === hashB.hash && hashA.peak > 0.001, { a: hashA, b: hashB });
    check("the recipient can't overwrite (no edit token: v1 first-session panel)", await b.evaluate(() => !(window as any).__bd_probe.v1App.SessionId));

    // Overwrite: change a param in A (the demo's first tone is already at 7, so 5), save over the same id.
    await closeShare(a);
    await a.evaluate(() => { const s = (window as any).__bd_probe; const t = s.state.blocks.find((x: any) => x.type === 'source.tone'); s.scene.host.setParam(t.id, 'transpose', 5); });
    const url2 = await shareVia(a, 'overwrite');
    check('overwrite keeps the id', idOf(url2) === id, url2);
    const g = await api('GET', `patches/${id}`);
    check('… and stores a new revision with the change', g.json?.rev === 2 && g.json?.patch?.blocks?.some((x: any) => x.params?.transpose === 5), g.json?.rev);
    await b.reload(); await b.waitForFunction(() => (window as any).__bd_probe);
    check("the recipient's link shows the overwrite", (await probe(b)).patch.blocks.some((x: any) => x.params?.transpose === 5));

    // Create new (offered once the patch has changed since the link): a new id whose parent is the first.
    await closeShare(a);
    await a.evaluate(() => { const s = (window as any).__bd_probe; const t = s.state.blocks.find((x: any) => x.type === 'source.tone'); s.scene.host.setParam(t.id, 'transpose', 9); });
    const saveAsBefore = await a.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel; pp.OpenPanel(); const [x, y] = pp.centreOf('saveAs'); const pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio; pp.HitTests({ x: x * pr, y: y * pr }); const r = pp.roll.saveAs && pp.shareState().saveAs; pp.ClosePanel(); return r; });
    check('SAVE AS is offered once the patch has changed since its link (owner, 2026-11-10)', saveAsBefore === true);
    const url3 = await shareVia(a, 'createNew');
    const id3 = idOf(url3);
    check('create new → a new id', !!id3 && id3 !== id, url3);
    // The same patch again can't be saved as yet another link: SAVE AS is gone until something changes.
    const again = await a.evaluate(() => { const pp = (window as any).__bd_probe.scene.PatchesPanel, [x, y] = pp.centreOf('saveAs'), pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio; pp.HitTests({ x: x * pr, y: y * pr }); return { offered: pp.shareState().saveAs, save: pp.shareState().save }; });
    await press(a, 'saveAs'); await a.waitForTimeout(1500);
    const url3b = await a.evaluate(() => (document.getElementById('patchUrlText') as HTMLInputElement).value.trim());
    check('… and then SAVE AS goes until the patch changes again (no repeat links)', again.offered === false && again.save === null && url3b === url3, { again, same: url3b === url3 });
    const g3 = await api('GET', `patches/${id3}`);
    check('… with parent = the original', g3.json?.parent === id, g3.json?.parent);
    const t3 = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], id3);
    if (id3 && t3) created.push({ id: id3, token: t3 });

    // The recipient remixes: their first save is a new id with the shared one as parent.
    await closeShare(b);
    const url4 = await shareVia(b, 'generate');
    const g4 = await api('GET', `patches/${idOf(url4)}`);
    check("a recipient's save makes a remix (new id, parent set)", idOf(url4) !== id && g4.json?.parent === id, { id: idOf(url4), parent: g4.json?.parent });
    const t4 = await b.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], idOf(url4));
    if (t4) created.push({ id: idOf(url4), token: t4 });

    // Unsaved edits survive a reload of the creator's own link (autosave wins over the saved version).
    await closeShare(a);
    await a.goto(`${base}/?c=${id}`); await a.waitForFunction(() => (window as any).__bd_probe);
    await a.evaluate(() => { const s = (window as any).__bd_probe; const t = s.state.blocks.find((x: any) => x.type === 'source.tone'); s.scene.host.setParam(t.id, 'transpose', -5); });
    await a.waitForTimeout(800);
    await a.reload(); await a.waitForFunction(() => (window as any).__bd_probe);
    check("reloading the creator's link keeps unsaved edits", (await probe(a)).patch.blocks.some((x: any) => x.params?.transpose === -5));
    check('… and keeps the right to overwrite', await a.evaluate(() => !!(window as any).__bd_probe.v1App.SessionId));
    await a.context().close(); await b.context().close();

    // Link previews for that id.
    const html = await (await fetch(`${base}/?c=${id}`)).text();
    const meta = (p: string) => html.match(new RegExp(`<meta (?:property|name)="${p}" content="([^"]*)"`))?.[1] ?? null;
    check('share page: Open Graph + twitter tags', !!meta('og:title') && !!meta('og:image') && meta('twitter:card') === 'player' && !!meta('twitter:player'), { title: meta('og:title'), image: meta('og:image') });
    const saved = (await api('GET', `patches/${id}`)).json?.title ?? null;
    check('share page: og:title is the patch title alone, og:description says what BlokDust is (SPEC-SHARING-BACKEND R9)',
      meta('og:title') === (saved || 'BlokDust') && /^Connect blocks to make sounds/.test(meta('og:description') ?? ''), { title: meta('og:title'), saved, description: meta('og:description') });
    check('share page: oEmbed discovery link', /type="application\/json\+oembed"/.test(html));
    const img = await fetch(local(meta('og:image')!.replace(/&amp;/g, '&')));
    const png = new Uint8Array(await img.arrayBuffer());
    const dv = new DataView(png.buffer);
    writeFileSync(`${OUT}/thumbnail.png`, png);
    const dims = png.length > 24 ? [dv.getUint32(16), dv.getUint32(20)] : null;
    check('og:image is the saved PNG thumbnail (1200×630)', img.headers.get('content-type') === 'image/png' && dims?.[0] === 1200 && dims?.[1] === 630,
      { status: img.status, bytes: png.length, dims, url: meta('og:image') });
    // Pixel (0,0) of a PNG is its first row's first bytes whatever the row filter (every predictor is 0 there).
    let off = 8; const idat: Uint8Array[] = [];
    while (off < png.length) { const n = dv.getUint32(off), t = String.fromCharCode(...png.subarray(off + 4, off + 8)); if (t === 'IDAT') idat.push(png.subarray(off + 8, off + 8 + n)); off += 12 + n; }
    const raw = inflateSync(Buffer.concat(idat));
    const corner = '#' + [raw[1], raw[2], raw[3]].map(v => v.toString(16).padStart(2, '0')).join('');
    check("og:image is drawn in the sharer's colour theme (theme 3's background)", [raw[1], raw[2], raw[3]].join() === themeBg.match(/\d+/g)!.slice(0, 3).join(), { corner, themeBg });
    const oe = await (await fetch(`${base}/oembed?url=${encodeURIComponent(`${base}/?c=${id}`)}&maxwidth=480`)).json() as any;
    check('/oembed: rich JSON with an iframe to /embed/<id>, maxwidth respected', oe.type === 'rich' && oe.version === '1.0' && oe.width === 480 && oe.height === 300 && new RegExp(`/embed/${id}"`).test(oe.html), oe);
    check('/oembed: other sites → 404', (await fetch(`${base}/oembed?url=${encodeURIComponent('https://example.com/?c=' + id)}`)).status === 404);
    (globalThis as any).__sharedId = id;
  },

  /** Acceptance: the embed plays in a test page (iframe on another origin, one tap). */
  async embed(browser) {
    const id = (globalThis as any).__sharedId as string | undefined;
    if (!id) { check('embed: needs share-and-load first', false); return; }
    const oe = await (await fetch(`${base}/oembed?url=${encodeURIComponent(`${base}/?c=${id}`)}`)).json() as any;
    // A third-party page (another origin) pasting the oEmbed HTML. Not a data: URL: an opaque-origin parent can't
    // delegate autoplay to the iframe, which no real embedding site is.
    const hostUrl = `${mocks!.url}/host.html?html=${encodeURIComponent(oe.html)}`;
    const ctx = await browser.newContext(VIEW);
    const page = await ctx.newPage();
    await page.goto(hostUrl);
    const frameEl = await page.waitForSelector('iframe');
    const frame = (await frameEl.contentFrame())!;
    await frame.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 30000 });
    await page.screenshot({ path: `${OUT}/embed-before-tap.png` });
    check('embed: no editing chrome (no v1 UI drawn)', await frame.evaluate(() => !(window as any).__bd_probe.scene.Ctx));
    check('embed: has an "open in BlokDust" link to the share page', (await frame.getAttribute('#open-in-blokdust', 'href'))?.includes(`c=${id}`) ?? false);
    await frame.click('#start');
    await frame.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const rms = await frame.evaluate(() => (window as any).__bd_probe.state.rms);
    await page.screenshot({ path: `${OUT}/embed-playing.png` });
    check('embed plays sound after one tap (AudioWorklet output not silent)', rms > 1e-3, rms);
    check('embed never autosaves', await frame.evaluate(() => localStorage.getItem('blokdust2.autosave') === null));
    const r = await fetch(`${base}/embed/A000000000`);
    check('embed of an unknown id → 404', r.status === 404);
    await ctx.close();
  },
};

/**
 * Remote runs drive the installed Google Chrome over CDP, started without automation flags, because Turnstile refuses
 * automated browsers (error 600010 in Playwright's Chromium) but passes a normal one. This proves the real bot check end to end.
 */
async function realChrome(): Promise<{ browser: Browser; close(): void }> {
  const { spawn } = await import('node:child_process');
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [`--user-data-dir=${mkdtempSync(`${tmpdir()}/bd-smoke-`)}`,
    `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); return { browser, close: () => chrome.kill() }; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  chrome.kill();
  throw new Error('Google Chrome did not start');
}

/** css px of a point in v1 device px (the v1 UI works in device px). */
const v1Css = (page: Page, fn: string) => page.evaluate(`(() => { const s = window.__bd_probe, A = s.v1App, u = A.Unit, pr = A.Metrics?.PixelRatio ?? devicePixelRatio; const r = (${fn})(s, A, u); return [r[0] / pr, r[1] / pr]; })()`) as Promise<[number, number]>;
const sampleState = (p: Page) => p.evaluate(() => (window as any).__bd_probe.samples as { id: number; track: string; loaded: boolean; frames: number }[]);

/** Open the options panel of the block at grid (gx, gy) with a real click, then its sample row's search button. */
async function openSamplePanel(page: Page, gx: number, gy: number): Promise<void> {
  const id = await page.evaluate(([a, b]) => (window as any).__bd_probe.state.blocks.find((q: any) => q.x === a && q.y === b)?.id, [gx, gy]);
  const [x, y] = await page.evaluate(i => (window as any).__bd_probe.blockPoint(i), id);
  await page.mouse.click(x, y);
  await page.waitForFunction(() => (window as any).__bd_probe.scene.OptionsPanel.Scale === 1, null, { timeout: 5000 });
  await page.waitForTimeout(400);
  // v1 OptionsPanel hit rect for a "sample" option: HandleRoll[0] = x from Margin + 65% of Range, full row height.
  const [sx, sy] = await v1Css(page, `(s) => { const o = s.scene.OptionsPanel, opt = o.Options.find(q => q.Type === 'sample');
    return [o.Position.x + o.Margin + o.Range * 0.82, o.Position.y + opt.Position.y + opt.Size.height * 0.5]; }`);
  await page.mouse.move(sx, sy); await page.waitForTimeout(100);
  await page.mouse.click(sx, sy);
  await page.waitForFunction(() => (window as any).__bd_probe.scene.SoundcloudPanel.Open, null, { timeout: 5000 });
  await page.waitForTimeout(700);
}
/** Drop a file on the stage at grid (gx, gy) as the browser would (DragEvent with a DataTransfer). */
async function dropFile(page: Page, gx: number, gy: number, name: string, bytes: Buffer): Promise<void> {
  const [x, y] = await page.evaluate(([a, b]) => (window as any).__bd_probe.toCss(a, b), [gx, gy + 0.3]);
  await page.evaluate(([b64, n, cx, cy]) => {
    const bin = Uint8Array.from(atob(b64 as string), c => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], n as string, { type: 'audio/wav' }));
    const canvas = document.querySelector('#stage canvas:last-of-type') as HTMLCanvasElement, r = canvas.getBoundingClientRect();
    const at = { clientX: r.left + (cx as number), clientY: r.top + (cy as number), bubbles: true, cancelable: true, dataTransfer: dt };
    canvas.dispatchEvent(new DragEvent('dragover', at));
    canvas.dispatchEvent(new DragEvent('drop', at));
  }, [bytes.toString('base64'), name, x, y] as const);
}

tests.samples = async browser => {
  const wait = searchLimitedAt + 61000 - Date.now();
  if (wait > 0) { console.error(`  (waiting ${Math.ceil(wait / 1000)} s for api-guards' search limit to reset)`); await new Promise(r => setTimeout(r, wait)); }
  // A Sample next to a Power block (v1 composition import, DATA-0004).
  const comp = { Composition: [{ Id: 1, Type: 'Sample', Position: { x: 0, y: 2 }, ZIndex: 1 }, { Id: 2, Type: 'Power', Position: { x: -3, y: 2 }, ZIndex: 2 }] };
  const a = await open(browser, `${base}/?v1=${encodeURIComponent(JSON.stringify(comp))}`);
  await a.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded), null, { timeout: 30000 }).catch(() => {});
  const dflt = (await sampleState(a))[0];
  check("a new Sample starts with v2's default CC0 Freesound sound (v1's default file is gone)", dflt?.track === 'freesound:223835' && dflt.loaded, dflt);
  await a.waitForTimeout(1000);
  await openSamplePanel(a, 0, 2);
  const block = () => a.evaluate(() => { const s = (window as any).__bd_probe; const b = s.scene.OptionsPanel.SelectedBlock; return { results: b?.SearchResults.length ?? 0, searching: b?.Searching, query: b?.SearchString }; });
  await a.waitForFunction(() => { const b = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock; return b && !b.Searching && b.SearchResults.length > 0; }, null, { timeout: 20000 }).catch(() => {});
  const first = await block();
  // v1's random two-word query can match nothing on real Freesound; the mock always answers (typed search below needs results).
  check('sample panel opens with v1\'s random search, results from Freesound', (remote !== null || first.results > 0) && !!first.query && !first.searching, first);
  await a.screenshot({ path: `${OUT}/sample-search.png` });

  // Type a search (Enter submits, as v1's EnterCheck), without reloading the page or playing notes.
  const notesBefore = (await probe(a)).gateOns;
  const [ix, iy] = await a.evaluate(() => { const r = document.getElementById('soundCloudSearchInput')!.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await a.mouse.click(ix, iy);
  await a.keyboard.press('Meta+A'); await a.keyboard.type(remote ? 'bell' : 'bells');
  await a.keyboard.press('Enter');
  await a.waitForTimeout(300);
  await a.waitForFunction(() => { const b = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock; return b && !b.Searching && b.SearchResults.length > 0; }, null, { timeout: 20000 }).catch(() => {});
  const typed = await block();
  check('typed search + Enter searches (no page reload)', /^bells?$/i.test(typed.query ?? '') && typed.results > 0 && await a.evaluate(() => !!(window as any).__bd_probe), typed);
  check('typing in the search box plays no notes', (await probe(a)).gateOns === notesBefore);
  if (!remote) {
    const sr = mocks!.requests.filter(r => r.path.startsWith('/apiv2/search/text/'));
    check('the Worker searched Freesound with its own key (never the browser)', sr.length > 0 && sr.every(r => r.auth === 'Token test-freesound-key') && sr.some(r => r.path.includes('query=bells')), sr.length);
  }

  // Pick the first result (v1 row 1: 40 units tall from centerY − 98).
  const [rx, ry] = await v1Css(a, `(s, A, u) => [A.Width / 2, s.scene.SoundcloudPanel.OffsetY + A.Height / 2 - 78 * u]`);
  await a.mouse.move(rx, ry); await a.waitForTimeout(100);
  await a.mouse.click(rx, ry);
  await a.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.loaded && /^freesound:/.test(x.track) && x.track !== 'freesound:223835'), null, { timeout: 30000 }).catch(() => {});
  const st = await sampleState(a), pa = await probe(a);
  const track = st[0]?.track ?? '';
  const ref = pa.patch.refs?.[track];
  check('choosing a result loads it into the Sample', !!st[0]?.loaded && /^freesound:\d+$/.test(track) && track !== 'freesound:223835', st);
  check('the patch references it (id, user, licence, preview), no audio', ref?.provider === 'freesound' && !!ref.username && /^CC/.test(ref.license) && /^https?:/.test(ref.preview) && JSON.stringify(pa.patch).length < 8000, ref);
  check('options panel credits the sound (v1 "By <user>")', await a.evaluate(() => { const v = (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock; return !!v?.Params.user && !!v?.Params.permalink; }));
  const hashA = await renderHash(a);
  check('the Sample plays the sound (powered)', hashA.peak > 0.01, hashA);

  // Shared: the recipient fetches the same sound and renders identically.
  await a.mouse.click(1000, 700);  // close the options panel (click the stage)
  await a.waitForTimeout(600);
  const url = await shareVia(a, 'generate');
  const id = idOf(url);
  const tok = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], id);
  if (id && tok) created.push({ id, token: tok });
  check('share panel: no warning for a Freesound sample', await a.evaluate(() => !(window as any).__bd_probe.scene.host.links.warning()));
  const b = await open(browser, local(url));
  await b.waitForFunction(t => (window as any).__bd_probe.samples.some((x: any) => x.loaded && x.track === t), track, { timeout: 30000 }).catch(() => {});
  const hashB = await renderHash(b);
  check('a recipient loads the same Freesound sound and renders identically', hashA.hash === hashB.hash, { a: hashA, b: hashB });
  await b.context().close();

  // The user's own file, dropped on the Sample: referenced by fingerprint, not portable.
  await closeShare(a);
  await dropFile(a, 0, 2, 'my-loop.wav', sineWav(330));
  await a.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.track === 'file:my-loop.wav' && x.loaded), null, { timeout: 10000 }).catch(() => {});
  const pf = await probe(a);
  const fref = pf.patch.refs?.['file:my-loop.wav'];
  check('dropping a file on a Sample loads it there', (await sampleState(a)).some(x => x.track === 'file:my-loop.wav' && x.loaded), await sampleState(a));
  check('file reference: name, size, duration, sha256 fingerprint', fref?.provider === 'file' && fref.bytes > 0 && fref.durationSec > 1.4 && /^sha256:[0-9a-f]{64}$/.test(fref.hash), fref);
  check('the unused Freesound ref is dropped from the patch', !Object.keys(pf.patch.refs ?? {}).some(k => k.startsWith('freesound:')));
  await openShare(a);
  await a.screenshot({ path: `${OUT}/share-warning.png` });
  check('share panel warns: a local file is not in the link', await a.evaluate(() => /own audio samples/.test((window as any).__bd_probe.scene.host.links.warning() ?? '')));
  await shareVia(a, 'overwrite').catch(() => '');
  const c = await open(browser, local(url));
  await c.waitForTimeout(2500);
  const cs = await sampleState(c);
  check("a recipient sees the file as missing (not loaded, reference kept)", cs.length === 1 && !cs[0].loaded && cs[0].track === 'file:my-loop.wav', cs);
  await openSamplePanelIfMissingLabel(c);
  await c.context().close();

  // A file dropped on empty stage makes a new Sample there (v1's planned behaviour).
  const before = (await probe(a)).blocks.length;
  await dropFile(a, 6, -3, 'second.wav', sineWav(550));
  await a.waitForFunction(() => (window as any).__bd_probe.samples.some((x: any) => x.track === 'file:second.wav' && x.loaded), null, { timeout: 10000 }).catch(() => {});
  const after = await probe(a);
  check('dropping a file on empty stage creates a Sample holding it', after.blocks.length === before + 1 && after.patch.blocks.some((x: any) => x.type === 'source.sample' && x.x === 6 && x.y === -3 && x.params.track === 'file:second.wav'));
  await a.context().close();
};

/** The recipient's options panel names the missing file (SPEC-SHARING-BACKEND R13). */
async function openSamplePanelIfMissingLabel(c: Page): Promise<void> {
  const [x, y] = await c.evaluate(() => { const s = (window as any).__bd_probe; const b = s.state.blocks.find((q: any) => q.type === 'source.sample'); return s.blockPoint(b.id); });
  await c.mouse.click(x, y);
  await c.waitForFunction(() => (window as any).__bd_probe.scene.OptionsPanel.Scale === 1, null, { timeout: 5000 }).catch(() => {});
  await c.waitForTimeout(500);
  const label = await c.evaluate(() => (window as any).__bd_probe.scene.OptionsPanel.SelectedBlock?.Params.trackName ?? '');
  await c.screenshot({ path: `${OUT}/sample-missing.png` });
  check('… and its options panel says MISSING with the file name', /^MISSING · MY-LOOP\.WAV/.test(label), label);
}

/** Owner review 2026-11-07, bug 5 (not reproduced yet): add blocks from the menus, rearrange, Generate share link, open
 * the link in a new tab of the same browser → the same scene (not the default stage). */
tests['share-new-tab'] = async browser => {
  const ctx = await browser.newContext(VIEW);
  if (!remote) await ctx.route('https://cdn.freesound.org/**', r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: sineWav(440) }));
  const a = await ctx.newPage();
  await a.goto(`${base}/`); await a.waitForFunction(() => (window as any).__bd_probe);
  await a.click('#start'); await a.waitForFunction(() => (window as any).__bd_probe.state.started);
  await a.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 });
  await a.waitForTimeout(2000);
  const dragOut = async (menu: [number, number], item: [number, number], to: [number, number]) => {
    await a.mouse.move(...menu); await a.waitForTimeout(150); await a.mouse.click(...menu); await a.waitForTimeout(900);
    await a.mouse.move(...item); await a.mouse.down(); await a.mouse.move(item[0], item[1] + 60, { steps: 5 }); await a.mouse.move(...to, { steps: 10 }); await a.mouse.up(); await a.waitForTimeout(700);
  };
  const before0 = (await probe(a)).patch.blocks.length;
  await dragOut([421, 45], [182, 180], [700, 600]);   // SOURCE → Tone
  await dragOut([692, 45], [365, 180], [630, 600]);   // POWER → Power (second item of a paged menu)
  const first = (await probe(a)).blocks[0];
  const p0 = await a.evaluate(i => (window as any).__bd_probe.blockPoint(i), first.id);
  await a.mouse.move(p0[0], p0[1]); await a.mouse.down(); await a.mouse.move(p0[0] + 150, p0[1] + 80, { steps: 8 }); await a.mouse.up(); await a.waitForTimeout(800);
  const scene = (await probe(a)).patch.blocks;
  const url = await shareVia(a, 'generate');
  const tok = await a.evaluate(i => JSON.parse(localStorage.getItem('blokdust2.editTokens') ?? '{}')[i], idOf(url));
  if (tok) created.push({ id: idOf(url), token: tok });
  const b = await ctx.newPage();
  await b.goto(local(url)); await b.waitForFunction(() => (window as any).__bd_probe); await b.waitForTimeout(1000);
  const opened = (await probe(b)).patch.blocks;
  const key = (bl: any[]) => JSON.stringify(bl.map(x => [x.type, x.x, x.y]));
  check('edited scene (2 blocks added from menus, 1 moved) → Generate → new tab opens that scene', scene.length === before0 + 2 && key(opened) === key(scene),
    { added: scene.length - before0, same: key(opened) === key(scene) });
  await ctx.close();
};

async function main() {
  let server: LocalServer | null = null;
  mocks = await startMockServices();  // remote runs only use its third-party host page
  if (remote) base = remote.replace(/\/+$/, '');
  else {
    server = await startLocal({ name: 'test', vars: {
      TURNSTILE_SECRET: 'test-secret', TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
      FREESOUND_TOKEN: 'test-freesound-key', FREESOUND_API: `${mocks.url}/apiv2`,
    }, env: based ? 'based' : undefined });
    base = server.url + (based ? '/blokdust' : '');
  }
  console.error(`sharing tests against ${base}${remote ? ' (remote)' : ''}`);
  const real = remote ? await realChrome() : null;
  const browser = real ? real.browser : await chromium.launch();
  try {
    for (const [name, fn] of Object.entries(tests)) {
      if (only && !only.includes(name)) continue;
      console.error(`— ${name}`);
      try { await fn(browser); } catch (e) { check(`${name} threw`, false, String(e)); }
    }
  } finally {
    await browser.close();
    real?.close();
    for (const c of created) await api('DELETE', `patches/${c.id}`, undefined, c.token).catch(() => {});
    if (server) await server.stop();
    mocks?.close();
  }
  const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify({ base, checks: results.length, passed: results.length - failed.length, failed: failed.map(f => f.name) }));
  process.exitCode = failed.length ? 1 : 0;
}
void MOCK_SOUNDS;
void main();
