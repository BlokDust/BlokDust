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
  if (name) {  // an account, made in Settings › SIGN IN
    await page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.openAccount());
    await page.waitForFunction(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return s.OffsetY === 0 && s.accountPage.Account !== undefined; }, null, { timeout: 10000 });
    const at = async (n: string) => { const c = await page.evaluate(k => (window as any).__bd_probe.scene.SettingsPanel.accountCentre(k), n); await page.mouse.click(c[0], c[1]); await page.waitForTimeout(400); };
    await at('create'); await page.fill('#accountHandleInput', name); await at('submit');
    await page.waitForFunction(() => !!(window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.handle, null, { timeout: 20000 });
    await page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel()); await page.waitForTimeout(800);
  }
  return d;
}
const P = (d: Device) => d.page.evaluate(() => { const x = (window as any).__bd_probe.scene.PatchesPanel; return { open: x.Open, items: x.GalleryItems, message: x.GalleryMessage, view: x.GalleryView, loading: x.GalleryLoading, sort: x.GallerySort, on: x.GalleryOn, note: x.GalleryNote }; });
/** SAVE on Patches › SAVE / SHARE (a new link the first time, then saves over it); resolves once saved. */
async function save(d: Device): Promise<string> {
  await tab(d, 0);
  await press(d, 'share', 200);
  await d.page.waitForFunction(() => { const s = (window as any).__bd_probe; const l = s.scene.host.links.current(); return !!l && !l.stale && !s.scene.PatchesPanel.Saving; }, null, { timeout: 60000 });
  await d.page.waitForTimeout(400);
  return d.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
}
const GALLERY = 2;
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
  // ---- R1: SAVE with ADD TO GALLERY (on by default) publishes ----
  const alice = await device('alice_g');
  await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain'));
  await tab(alice, GALLERY); await idle(alice);
  check('R7: an empty gallery says so', (await P(alice)).items.length === 0);
  check('R1: ADD TO GALLERY is on by default', (await P(alice)).on === true);
  const aliceId = await save(alice);
  await tab(alice, GALLERY); await idle(alice);
  const a1 = await P(alice);
  check('R1: SAVE published it, with no message to read', a1.items.length === 1 && a1.items[0].title === 'Glass Rain' && a1.items[0].by === 'alice_g' && a1.items[0].mine && a1.items[0].id === aliceId && !a1.note, a1);

  // ---- R2–R4: what can't be published ----
  const own = await api(alice, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.sample', x: 0, y: 0, params: { track: 'file:loop.wav' } }]), title: 'Mine', turnstile: 'ok', gallery: true });
  const rude = await api(alice, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }]), title: 'shit tune', turnstile: 'ok', gallery: true });
  const anon = await device(null);
  const anonSave = await api(anon, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.tone', x: 0, y: 0, params: {} }]), title: 'Anon', turnstile: 'ok', gallery: true });
  check('R3: the user\'s own audio files keep a patch out (saved, not published)', own.status === 201 && own.json.gallery.published === false && /audio files/.test(own.json.gallery.reason), own.json?.gallery);
  check('R4: a rude title keeps it out', rude.status === 201 && rude.json.gallery.published === false, rude.json?.gallery);
  check('R2: only signed-in users can publish (owner, 2026-11-15)', anonSave.status === 201 && anonSave.json.gallery.published === false && anonSave.json.gallery.reason === 'Only signed-in users can publish to the gallery.', anonSave.json?.gallery);
  await tab(anon, 0);
  check('R2: signed out, the switch says so (and SAVE leaves the gallery alone)', !(await anon.page.evaluate(() => (window as any).__bd_probe.scene.host.signedIn())));

  // ---- R13: the gallery's rows have OPEN and INSERT only (owner review 2: like and report with the patch open; review 3: INSERT) ----
  await tab(anon, GALLERY); await idle(anon);
  const rowControls = await anon.page.evaluate(() => ['glike0', 'greport0', 'gunpub0', 'gopen0', 'gins0'].map(n => (window as any).__bd_probe.scene.PatchesPanel.centreOf(n)));
  check('R13: a row has OPEN and INSERT and nothing else', rowControls.slice(0, 3).every(c => c === null) && !!rowControls[3] && !!rowControls[4] && rowControls[3][0] < rowControls[4][0], rowControls);

  // ---- R8: likes, from the star by the credit; signed in only, one per person, no down votes ----
  await press(anon, 'gopen0', 2500);
  const anonCorners = await anon.page.evaluate(() => (window as any).__bd_probe.corners);
  await anon.page.mouse.click(anonCorners.starAt[0], anonCorners.starAt[1]); await anon.page.waitForTimeout(1000);
  const anonSettings = await anon.page.evaluate(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return { open: s.Open, tab: s._OpenTab }; });
  check('R8: a published patch has a star by its credit; signed out, it opens SIGN IN', !!anonCorners.starAt && anonSettings.open && anonSettings.tab === 4
    && (await api(anon, 'GET', `patches/${aliceId}`)).json.likes === 0, { anonCorners, anonSettings });
  await anon.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel()); await anon.page.waitForTimeout(800);
  const erin = await device('erin_g');
  await tab(erin, GALLERY); await idle(erin);
  await press(erin, 'gopen0', 2500);
  const star = async () => { const c = await erin.page.evaluate(() => (window as any).__bd_probe.corners); await erin.page.mouse.click(c.starAt[0], c.starAt[1]); await erin.page.waitForTimeout(800); return (await api(erin, 'GET', `patches/${aliceId}`)).json; };
  const liked = await star(), unliked = await star(), relike = await star();
  await erin.page.mouse.move(5, 5); await erin.page.waitForTimeout(300); await erin.page.screenshot({ path: `${OUT}/stage-star.png` });
  const again = await api(erin, 'POST', `gallery/${aliceId}/like`, { on: true });
  check('R8: the star likes it, again takes it back; one like per person', liked.liked && liked.likes === 1 && !unliked.liked && unliked.likes === 0 && relike.likes === 1 && again.json.likes === 1,
    [liked.likes, unliked.likes, relike.likes, again.json]);
  await erin.ctx.close();
  const bob = await device('bob_g');

  // ---- R7: search by title, block, name (with or without @); sort ----
  await bob.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel());
  await bob.page.waitForTimeout(600);
  await bob.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('Laser', 3, 3); });
  await bob.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Bob Lasers'));
  await save(bob);
  await tab(bob, GALLERY); await idle(bob);
  const byTitle = await search(bob, 'glass'), byBlock = await search(bob, 'laser'), byAt = await search(bob, '@alice_g'), byName = await search(bob, 'alice'), none = await search(bob, 'zzzz');
  check('R7: search finds titles, block types and names (with or without @)', byTitle.length === 1 && byTitle[0].title === 'Glass Rain' && byBlock.some(r => r.title === 'Bob Lasers')
    && byAt.length === 1 && byAt[0].by === 'alice_g' && byName.some(r => r.by === 'alice_g') && none.length === 0, { byTitle, byBlock: byBlock.map(r => r.title), byAt, byName: byName.map(r => r.by), none });
  await search(bob, '');
  const popular = (await P(bob)).items.map((r: { title: string }) => r.title);
  await bob.page.mouse.move(5, 5); await bob.page.waitForTimeout(300); await bob.page.screenshot({ path: `${OUT}/gallery-rows.png` });
  await press(bob, 'sort_new', 300); await idle(bob);
  const newest = (await P(bob)).items.map((r: { title: string }) => r.title);
  check('R7: POPULAR puts the liked patch first; NEW the newest', popular[0] === 'Glass Rain' && newest[0] === 'Bob Lasers', { popular, newest });

  // ---- R11, R14, R15: OPEN from the gallery: counted, credited; SAVE makes a remix ----
  // ---- R13 (owner review 3): INSERT adds a gallery patch's blocks to yours; it doesn't open it (no credit, no remix) ----
  const bobBefore = await bob.page.evaluate(() => ({ n: (window as any).__bd_probe.state.patch.blocks.length, id: (window as any).__bd_probe.v1App.CompositionId }));
  const glassAt = (await P(bob)).items.findIndex((r: { title: string }) => r.title === 'Glass Rain');
  await press(bob, `gins${glassAt}`, 300);
  await bob.page.mouse.move(300, 600, { steps: 4 }); await bob.page.mouse.click(300, 600); await bob.page.waitForTimeout(800);
  const bobAfter = await bob.page.evaluate(() => ({ n: (window as any).__bd_probe.state.patch.blocks.length, id: (window as any).__bd_probe.v1App.CompositionId, credit: (window as any).__bd_probe.corners.credit, open: (window as any).__bd_probe.scene.PatchesPanel.Open }));
  check('R13: INSERT puts its blocks into the patch, keeping the patch (no credit)', bobAfter.n > bobBefore.n && bobAfter.id === bobBefore.id && !bobAfter.credit && !bobAfter.open, { bobBefore, bobAfter });
  await bob.page.keyboard.press('ControlOrMeta+z'); await bob.page.waitForTimeout(300);
  await tab(bob, GALLERY); await idle(bob);
  await press(bob, 'sort_popular', 300); await idle(bob);  // back to POPULAR: Glass Rain is row 0
  const viewsBefore = (await P(bob)).items[0].views;
  await press(bob, 'gopen0', 2500);
  const opened = await bob.page.evaluate(() => ({ id: (window as any).__bd_probe.v1App.CompositionId, corners: (window as any).__bd_probe.corners }));
  check('R15: someone else\'s patch shows "TITLE BY @NAME" on the stage', opened.corners.credit?.by === 'alice_g' && opened.corners.credit?.title === 'Glass Rain' && !!opened.corners.byAt, opened.corners);
  await bob.page.mouse.click(opened.corners.byAt[0], opened.corners.byAt[1]); await bob.page.waitForTimeout(1200); await idle(bob);
  const theirs = await P(bob);
  check('R15: pressing @NAME opens the gallery on their patches', theirs.open && theirs.items.every((r: { by: string }) => r.by === 'alice_g') && theirs.items.length === 1
    && await bob.page.evaluate(() => (document.getElementById('gallerySearchInput') as HTMLInputElement).value === '@alice_g'), theirs.items);
  check('R14: opening it counted a view', theirs.items[0].views === viewsBefore + 1, [viewsBefore, theirs.items[0].views]);
  await bob.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel()); await bob.page.waitForTimeout(600);
  await bob.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', -5, 5); });
  const remix = await save(bob);
  const rp = await api(bob, 'GET', `patches/${remix}`);
  await tab(bob, GALLERY); await search(bob, '');
  const glass = (await P(bob)).items.find((r: { id: string }) => r.id === aliceId);
  check('R11: SAVE after opening someone\'s patch makes a remix; the original counts it; the credit goes', opened.id === aliceId && remix !== aliceId && rp.json.parent === aliceId && glass?.remixes === 1
    && !(await bob.page.evaluate(() => (window as any).__bd_probe.corners.credit)), { remix, parent: rp.json?.parent, remixes: glass?.remixes });

  // ---- R9, R10: right-click the credit to report; three reports hide it; the site owner reviews with bd gallery ----
  const carol = await device('carol_g'), dave = await device('dave_g');
  for (const d of [bob, carol, dave]) {
    await tab(d, GALLERY); await search(d, '');
    const i = (await P(d)).items.findIndex((r: { id: string }) => r.id === aliceId);
    await press(d, `gopen${i}`, 2500);
    const c = await d.page.evaluate(() => (window as any).__bd_probe.corners);
    await d.page.mouse.click(c.creditAt[0], c.creditAt[1], { button: 'right' }); await d.page.waitForTimeout(900);
    if (d === bob) {
      const asked = await P(d);
      const text = await d.page.evaluate(() => { const seen: string[] = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t: string, ...a: any[]) { seen.push(t); return (f as any).call(this, t, ...a); }; (window as any).__bd_probe.scene.PatchesPanel.Draw(); CanvasRenderingContext2D.prototype.fillText = f; return seen.join(' | '); });
      await d.page.mouse.move(5, 5); await d.page.waitForTimeout(300); await d.page.screenshot({ path: `${OUT}/report-confirm.png` });
      check('R9: right-click on the credit asks first, without saying how many reports hide a patch', asked.open && asked.view === 'report' && !/three|hidden/i.test(text), text.slice(0, 300));
    }
    await press(d, 'reportOk', 300); await idle(d);
    await d.page.waitForTimeout(2200);
    if (d === bob) check('R9: after REPORT the thanks shows, then the panel closes', !(await P(d)).open);
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

  // ---- R5: saving a published patch updates it ----
  await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain II'));
  await alice.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', 6, -5); });
  await save(alice);
  const renamed = (await api(anon, 'GET', 'gallery?q=glass')).json.items;
  check('R5: SAVE updates the published title', renamed.find((r: { id: string }) => r.id === aliceId)?.title === 'Glass Rain II', renamed);

  // ---- Option A (owner review 2): one main button; MAKE VIDEO on goes from SAVE on to the video ----
  await tab(alice, 0);
  const pp = () => alice.page.evaluate(() => { const x = (window as any).__bd_probe.scene.PatchesPanel; return { view: x.View, video: x.VideoState, on: x.videoOn, main: x.mainAction(), saving: x.Saving,
    saveAs: !!x.centreOf('saveAs'), download: !!x.centreOf('save') }; });
  const quiet = await pp();
  await press(alice, 'videoSwitch', 300);
  const nothing = await pp();
  await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.setTitle('Glass Rain III'));
  await alice.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', -6, -5); });
  await alice.page.waitForTimeout(300);
  const toSave = await pp();
  await press(alice, 'share', 200);
  await alice.page.waitForFunction(() => (window as any).__bd_probe.scene.PatchesPanel.View === 'video', null, { timeout: 60000 }).catch(() => {});
  const afterSave = await pp();
  await alice.page.mouse.move(5, 5); await alice.page.waitForTimeout(400); await alice.page.screenshot({ path: `${OUT}/save-then-video.png` });
  await press(alice, 'videoBack', 400);
  await press(alice, 'videoSwitch', 300);
  check('Option A: SAVE is the main button, SAVE AS and DOWNLOAD PATCH sit below; MAKE VIDEO (off on desktop) turns it into MAKE VIDEO when there is nothing to save, and SAVE then goes on to the video',
    quiet.on === false && quiet.main.label === 'Save' && quiet.main.off && quiet.saveAs && quiet.download && nothing.on && nothing.main.label === 'Make Video' && !nothing.main.off
    && toSave.main.label === 'Save' && afterSave.view === 'video' && afterSave.video !== 'idle', { quiet, nothing, toSave, afterSave });


  await tab(alice, 0);
  await press(alice, 'gallerySwitch', 300);
  const switched = await P(alice);
  const st = await alice.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.shareState());
  await press(alice, 'share', 200);
  await alice.page.waitForFunction(() => !(window as any).__bd_probe.scene.PatchesPanel.Saving, null, { timeout: 60000 });
  await alice.page.waitForTimeout(500);
  const gone = (await api(anon, 'GET', 'gallery?q=%40alice_g')).json.items;
  check('R6: switching ADD TO GALLERY off makes SAVE available, and SAVE unpublishes', switched.on === false && st.save === 'save' && gone.length === 0 && (await api(anon, 'GET', `patches/${aliceId}`)).status === 200, { st, gone });

  // ---- R7a: one list that scrolls and loads the next page as it nears its end (owner review 2) ----
  for (let i = 0, tries = 0; i < 22; i++) {
    const r = await api(alice, 'POST', 'patches', { patch: PATCH([{ id: 'b1', type: 'source.tone', x: i, y: 0, params: {} }]), title: `Pad ${i}`, turnstile: 'ok', gallery: true });
    // Saves are rate-limited per address (SPEC-SHARING-BACKEND): wait out the minute.
    if (r.status === 429 && tries++ < 2) { await new Promise(res => setTimeout(res, 61_000)); i--; continue; }
    if (r.status !== 201 || !r.json.gallery.published) { check('R7a: made 22 patches', false, r); break; }
  }
  await tab(carol, GALLERY); await carol.page.fill('#gallerySearchInput', 'pad'); await press(carol, 'search'); await idle(carol);
  const first = await P(carol);
  const list = await carol.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.centreOf('list'));
  for (let i = 0; i < 12; i++) { await carol.page.mouse.move(list[0], list[1]); await carol.page.mouse.wheel(0, 400); await carol.page.waitForTimeout(150); }
  await idle(carol); await carol.page.waitForTimeout(300);
  const more = await P(carol);
  const scrolled = await carol.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll);
  check('R7a: 20 a page; scrolling to the end loads the rest onto the same list, each once', first.items.length === 20 && more.items.length === 22
    && new Set(more.items.map((r: { id: string }) => r.id)).size === 22 && scrolled > 0, { first: first.items.length, more: more.items.length, scrolled });
  // A drag scrolls and doesn't open the row it started on.
  const before = await carol.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll), compBefore = await carol.page.evaluate(() => (window as any).__bd_probe.v1App.CompositionId);
  await carol.page.mouse.move(list[0] + 100, list[1]); await carol.page.mouse.down();
  for (let k = 1; k <= 6; k++) { await carol.page.mouse.move(list[0] + 100, list[1] + k * 20); await carol.page.waitForTimeout(30); }
  await carol.page.mouse.up(); await carol.page.waitForTimeout(600);
  const dragged = await carol.page.evaluate(() => ({ scroll: (window as any).__bd_probe.scene.PatchesPanel.GalleryScroll, open: (window as any).__bd_probe.scene.PatchesPanel.Open, comp: (window as any).__bd_probe.v1App.CompositionId }));
  check('R7a: dragging the list scrolls it and opens nothing', dragged.scroll < before && dragged.open && dragged.comp === compBefore, { before, dragged });

  // ---- R16 (owner review 3): the presets are @blokdust's EXAMPLES; OPEN lists only the user's own patches ----
  const seeded = bd('presets'), again2 = bd('presets');
  await tab(carol, GALLERY); await search(carol, '');
  await press(carol, 'sort_examples', 300); await idle(carol);
  const examples = await P(carol);
  await carol.page.mouse.move(5, 5); await carol.page.waitForTimeout(300); await carol.page.screenshot({ path: `${OUT}/gallery-examples.png` });
  const want = ['Computer Keys + 2 Tones', 'MIDI Keys + 2 Tones', 'Microphone + Recorder', 'Rotating Sequencer', 'Step Sequencer'];
  check('R16: bd gallery presets publishes the five presets as @blokdust\'s EXAMPLES, in order, once', seeded.added.length === 5 && again2.added.length === 0
    && examples.sort === 'examples' && examples.items.map((r: { title: string }) => r.title).join() === want.join() && examples.items.every((r: { by: string }) => r.by === 'blokdust'),
    { seeded, again: again2, examples: examples.items.map((r: { title: string; by: string }) => `${r.title} @${r.by}`) });
  await press(carol, 'sort_tutorials', 300); await idle(carol);
  const tutorialsEmpty = (await P(carol)).items.length;
  bd('kind', seeded.added[4].id, 'tutorial');
  await press(carol, 'sort_examples', 300); await press(carol, 'sort_tutorials', 300); await idle(carol);
  const tutorials = (await P(carol)).items.map((r: { title: string }) => r.title);
  check('R16: bd gallery kind moves one to TUTORIALS', tutorialsEmpty === 0 && tutorials.join() === 'Step Sequencer', { tutorialsEmpty, tutorials });
  await press(carol, 'sort_examples', 300); await idle(carol);
  await press(carol, 'gopen3', 2500);
  if (await carol.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.View) === 'confirm') await press(carol, 'openAnyway', 2500);
  const rotating = await carol.page.evaluate(() => ({ n: (window as any).__bd_probe.state.patch.blocks.length, credit: (window as any).__bd_probe.corners.credit }));
  check('R16: an example opens with all its blocks, credited to @blokdust', rotating.n === 10 && rotating.credit?.by === 'blokdust' && rotating.credit?.title === 'Rotating Sequencer', rotating);
  await tab(carol, 1); await carol.page.waitForTimeout(800);
  const carolOpen = await carol.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items.map((i: { name: string; detail: string }) => `${i.name} | ${i.detail}`));
  check('R16: the web OPEN lists only the user\'s own patches (no presets)', !carolOpen.some((i: string) => /Preset|Computer Keys/.test(i)), carolOpen);
  const taken = await api(dave, 'PUT', 'me/handle', { handle: 'BlokDust' });
  // An account made for the site's own patches: once handed over, signing in that way is signing in as @blokdust.
  const zed = await device('zed_g');
  await zed.page.evaluate(() => { (window as any).__bd_probe.scene.host.createBlock('ToneSource', 0, 0); (window as any).__bd_probe.scene.PatchesPanel.setTitle('Zed Tones'); });
  const zedId = await save(zed);
  const merged = bd('official', 'zed_g');
  const zedMe = (await api(zed, 'GET', 'me')).json;
  const zedNow = (await api(anon, 'GET', 'gallery?sort=examples')).json.items.map((r: { id: string; by: string }) => `${r.id} @${r.by}`);
  check('R16: nobody can choose the name; bd gallery official hands an account\'s sign-ins and patches to @blokdust', taken.status === 400 && merged.into === 'blokdust'
    && zedMe.user?.handle === 'blokdust' && zedNow.includes(`${zedId} @blokdust`), { taken: taken.json, merged, me: zedMe.user, zedNow });
  await zed.ctx.close();

  // ---- account deletion takes its gallery entries and likes ----
  const bobDel = await api(bob, 'DELETE', 'me');
  const afterDel = (await api(anon, 'GET', 'gallery?q=%40bob_g')).json.items;
  check('Deleting an account removes its gallery entries', bobDel.status === 200 && afterDel.length === 0, afterDel);
  await tab(alice, 0); await alice.page.mouse.move(5, 5); await alice.page.waitForTimeout(300);
  await alice.page.screenshot({ path: `${OUT}/save-share.png` });
} catch (e) {
  check('gallery run', false, String((e as Error).stack ?? e).slice(0, 800));
} finally {
  await browser.close(); await server.stop(); mocks.close();
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
const ok = results.length > 0 && results.every(r => r.ok);
console.log(JSON.stringify({ ok, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).map(r => r.name) }));
process.exit(ok ? 0 : 1);
