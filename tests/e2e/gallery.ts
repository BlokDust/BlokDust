// pnpm test:gallery — CHG-0024 acceptance (SPEC-SHARING-GALLERY), black-box through the real app and the Worker
// (local `wrangler dev`, mocked siteverify, Chrome's virtual passkey authenticator for the accounts).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { startLocal } from '../../tools/server/lib.ts';
import { sineWav, startMockServices } from './mock-services.ts';

const OUT = 'tests/e2e/output/gallery';
mkdirSync(OUT, { recursive: true });
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`);
}
const mocks = await startMockServices();
const STATE = 'gallery';
const server = await startLocal({ name: STATE, vars: { TURNSTILE_SECRET: 'test-secret', TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify` } });
const base = server.url.replace('127.0.0.1', 'localhost');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

interface Device { ctx: BrowserContext; page: Page }
async function device(name: string | null, query = '?demo'): Promise<Device> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('https://cdn.freesound.org/**', r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: sineWav(440) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`  page error: ${e.message}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await page.goto(`${base}/${query}`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  const d = { ctx, page };
  if (name) {  // an account, made in the ACCOUNT tab
    await tab(d, 3);
    await press(d, 'create'); await page.fill('#accountHandleInput', name); await press(d, 'submit');
    await page.waitForFunction(() => !!(window as any).__bd_probe.scene.PatchesPanel.Account?.handle, null, { timeout: 20000 });
  }
  return d;
}
const P = (d: Device) => d.page.evaluate(() => { const x = (window as any).__bd_probe.scene.PatchesPanel; return { open: x.Open, items: x.GalleryItems, message: x.GalleryMessage, view: x.GalleryView, loading: x.GalleryLoading, sort: x.GallerySort }; });
async function press(d: Device, name: string, wait = 400): Promise<void> {
  const at = await d.page.evaluate(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n), name);
  if (!at) throw new Error(`no control ${name}`);
  await d.page.mouse.move(at[0], at[1]); await d.page.mouse.click(at[0], at[1]); await d.page.waitForTimeout(wait);
}
async function tab(d: Device, id: number): Promise<void> {
  for (let i = 0; i < 8 && !(await P(d)).open; i++) { await d.page.mouse.move(1138, 45); await d.page.mouse.click(1138, 45); await d.page.waitForTimeout(700); }
  await d.page.waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.OffsetY === 0, null, { timeout: 5000 }).catch(() => {});
  await press(d, `tab${id}`, 600);
}
const idle = (d: Device) => d.page.waitForFunction(() => !(window as any).__bd_probe.scene.PatchesPanel.GalleryLoading, null, { timeout: 60000 });
async function search(d: Device, q: string): Promise<{ title: string; by: string }[]> {
  await d.page.fill('#gallerySearchInput', q); await press(d, 'search'); await idle(d);
  return (await P(d)).items;
}
const api = (d: Device, method: string, path: string, body?: unknown) => d.page.evaluate(async ([m, url, b]) => {
  const r = await fetch(url as string, { method: m as string, headers: { 'content-type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) });
  return { status: r.status, json: await r.json().catch(() => null) };
}, [method, `${base}/api/${path}`, body] as const);
const PATCH = (blocks: { id: string; type: string; x: number; y: number; params: Record<string, unknown> }[]) => ({ format: 'blokdust.patch', version: 2, seed: 1, blocks });
const bd = (...a: string[]) => JSON.parse(execFileSync('node', ['tools/bd.ts', 'gallery', ...a, '--local', STATE], { encoding: 'utf8' }));

try {
  // ---- R1, R2: publishing from the GALLERY tab saves to the account first ----
  const alice = await device('alice_g');
  await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain'));
  await tab(alice, 4); await idle(alice);
  check('R7: an empty gallery says so', (await P(alice)).items.length === 0);
  await press(alice, 'publish', 300); await idle(alice);
  const a1 = await P(alice);
  const aliceId = await alice.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
  check('R1: PUBLISH THIS PATCH saves it to the account and publishes it', /Published/.test(a1.message) && a1.items.length === 1 && a1.items[0].title === 'Glass Rain' && a1.items[0].by === 'alice_g' && a1.items[0].mine && a1.items[0].id === aliceId, a1);

  // ---- R3, R4: what can't be published ----
  const own = await api(alice, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.sample', x: 0, y: 0, params: { track: 'file:loop.wav' } }]), title: 'Mine', turnstile: 'ok' });
  const ownPub = await api(alice, 'POST', `gallery/${own.json.id}`);
  const rude = await api(alice, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }]), title: 'shit tune', turnstile: 'ok' });
  const rudePub = await api(alice, 'POST', `gallery/${rude.json.id}`);
  const anon = await device(null);
  const anonPub = await api(anon, 'POST', `gallery/${aliceId}`);
  check('R3: a patch with the user\'s own audio files can\'t be published', ownPub.status === 400 && /audio files/.test(ownPub.json.error), ownPub);
  check('R4: a rude title can\'t; R2: only the owner, signed in, can publish', rudePub.status === 400 && anonPub.status === 401, [rudePub.status, anonPub.status]);

  // ---- R8: likes, signed in only, one per person, no down votes ----
  await tab(anon, 4); await idle(anon);
  await press(anon, 'glike0', 800);
  check('R8: liking needs an account', /Sign in/.test((await P(anon)).message) && (await P(anon)).items[0].likes === 0, (await P(anon)).message);
  const bob = await device('bob_g');
  await tab(bob, 4); await idle(bob);
  await press(bob, 'glike0', 800);
  const liked = (await P(bob)).items[0];
  await press(bob, 'glike0', 800);
  const unliked = (await P(bob)).items[0];
  await press(bob, 'glike0', 800);
  const again = await api(bob, 'POST', `gallery/${aliceId}/like`, { on: true });
  check('R8: LIKE, then again to take it back; one like per person', liked.liked && liked.likes === 1 && !unliked.liked && unliked.likes === 0 && again.json.likes === 1, [liked, unliked, again.json]);

  // ---- R7: search by title, block, @name; sort ----
  await bob.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
  await bob.page.waitForTimeout(600);
  await bob.page.evaluate(() => { const h = (window as any).__bd_probe.scene.host; h.createBlock('Laser', 3, 3); });
  await bob.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bob Lasers'));
  await tab(bob, 4); await idle(bob);
  await press(bob, 'publish', 300); await idle(bob);
  const byTitle = await search(bob, 'glass'), byBlock = await search(bob, 'laser'), byName = await search(bob, '@alice_g'), none = await search(bob, 'zzzz');
  check('R7: search finds titles, block types and @names', byTitle.length === 1 && byTitle[0].title === 'Glass Rain' && byBlock.some(r => r.title === 'Bob Lasers')
    && byName.length === 1 && byName[0].by === 'alice_g' && none.length === 0, { byTitle, byBlock: byBlock.map(r => r.title), byName, none });
  await search(bob, '');
  const popular = (await P(bob)).items.map((r: { title: string }) => r.title);
  await bob.page.mouse.move(5, 5); await bob.page.waitForTimeout(300); await bob.page.screenshot({ path: `${OUT}/gallery-rows.png` });
  await press(bob, 'sort', 300); await idle(bob);
  const newest = (await P(bob)).items.map((r: { title: string }) => r.title);
  check('R7: POPULAR puts the liked patch first; NEW the newest', popular[0] === 'Glass Rain' && newest[0] === 'Bob Lasers', { popular, newest });

  // ---- R11: OPEN from the gallery; SAVE makes a remix, counted on the original ----
  await press(bob, 'sort', 300); await idle(bob);  // back to POPULAR: Glass Rain is row 0
  await press(bob, 'gopen0', 2500);
  const opened = await bob.page.evaluate(() => ({ id: (window as any).__bd_probe.v1App.CompositionId, blocks: (window as any).__bd_probe.state.blocks.length }));
  await bob.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', -5, 5); });
  await tab(bob, 0);
  await press(bob, 'share', 200);
  await bob.page.waitForFunction(id => { const v = (window as any).__bd_probe.v1App.CompositionId; return v && v !== id && !(window as any).__bd_probe.scene.PatchesPanel.Saving; }, opened.id, { timeout: 60000 });
  const remix = await bob.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
  const rp = await api(bob, 'GET', `patches/${remix}`);
  await tab(bob, 4); await idle(bob);
  const glass = (await P(bob)).items.find((r: { id: string }) => r.id === aliceId);
  check('R11: SAVE after opening someone\'s patch makes a remix; the original counts it', opened.id === aliceId && remix !== aliceId && rp.json.parent === aliceId && glass?.remixes === 1, { opened, remix, parent: rp.json?.parent, remixes: glass?.remixes });

  // ---- R9, R10: three reports hide it; the site owner reviews with bd gallery ----
  const carol = await device('carol_g'), dave = await device('dave_g');
  for (const d of [bob, carol, dave]) {
    await tab(d, 4); await idle(d);
    const i = (await P(d)).items.findIndex((r: { id: string }) => r.id === aliceId);
    await press(d, `greport${i}`, 300);
    if (d === bob) check('R9: REPORT asks first', (await P(d)).view === 'report');
    await press(d, 'reportOk', 300); await idle(d);
  }
  const after = await api(anon, 'GET', 'gallery?sort=new');
  check('R9: reported by three people, it is hidden', !after.json.items.some((r: { id: string }) => r.id === aliceId), after.json.items.map((r: { title: string }) => r.title));
  const listed = bd('reports');
  check('R10: bd gallery reports lists it with its reports', listed.reported.some((r: { id: string; reports: number; hidden: number }) => r.id === aliceId && r.reports === 3 && r.hidden === 1), listed);
  bd('keep', aliceId);
  const kept = await api(anon, 'GET', 'gallery?sort=new');
  bd('hide', aliceId);
  const hidden = await api(anon, 'GET', 'gallery?sort=new');
  bd('keep', aliceId);
  check('R10: keep shows it again; hide takes it out', kept.json.items.some((r: { id: string }) => r.id === aliceId) && !hidden.json.items.some((r: { id: string }) => r.id === aliceId));

  // ---- R5: saving a published patch updates it; a rude new title withdraws it ----
  await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain II'));
  await alice.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', 6, -5); });
  await tab(alice, 0); await press(alice, 'share', 200);
  await alice.page.waitForFunction(() => !(window as any).__bd_probe.scene.host.links.current()?.stale && !(window as any).__bd_probe.scene.PatchesPanel.Saving, null, { timeout: 60000 });
  const renamed = (await api(anon, 'GET', 'gallery?q=glass')).json.items;
  check('R5: SAVE updates the published title', renamed.length === 1 && renamed[0].title === 'Glass Rain II', renamed);

  // ---- R6: the owner unpublishes from their row ----
  await tab(alice, 4); await idle(alice);
  await search(alice, '@alice_g');
  await press(alice, 'gunpub0', 300); await idle(alice);
  const gone = (await api(anon, 'GET', 'gallery?q=%40alice_g')).json.items;
  check('R6: UNPUBLISH takes it out (the link still opens)', gone.length === 0 && (await api(anon, 'GET', `patches/${aliceId}`)).status === 200, gone);

  // ---- account deletion takes its gallery entries and likes ----
  const bobDel = await api(bob, 'DELETE', 'me');
  const afterDel = (await api(anon, 'GET', 'gallery?q=%40bob_g')).json.items;
  check('Deleting an account removes its gallery entries', bobDel.status === 200 && afterDel.length === 0, afterDel);
  await alice.page.screenshot({ path: `${OUT}/gallery-alice.png` });
} catch (e) {
  check('gallery run', false, String((e as Error).stack ?? e).slice(0, 800));
} finally {
  await browser.close(); await server.stop(); mocks.close();
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
const ok = results.length > 0 && results.every(r => r.ok);
console.log(JSON.stringify({ ok, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).map(r => r.name) }));
process.exit(ok ? 0 : 1);
