// pnpm test:accounts — CHG-0023 acceptance (SPEC-SHARING-ACCOUNTS), black-box through the real app and the Worker:
// `wrangler dev` on web/dist with a local D1, Cloudflare's test Turnstile key, siteverify and Google mocked
// (tests/e2e/mock-services.ts), and Chrome's virtual WebAuthn authenticator standing in for a phone or laptop.
// The app is opened on http://localhost:<port>: passkeys need a domain, not an IP address.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { startLocal } from '../../tools/server/lib.ts';
import { sineWav, startMockServices } from './mock-services.ts';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const OUT = 'tests/e2e/output/accounts';
mkdirSync(OUT, { recursive: true });
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`);
}

const mocks = await startMockServices();
const server = await startLocal({ name: 'accounts', vars: {
  TURNSTILE_SECRET: 'test-secret', TURNSTILE_VERIFY_URL: `${mocks.url}/siteverify`,
  GOOGLE_CLIENT_ID: 'test-google-client', GOOGLE_CLIENT_SECRET: 'test-google-secret',
  GOOGLE_AUTH_URL: `${mocks.url}/google/auth`, GOOGLE_TOKEN_URL: `${mocks.url}/google/token`,
  APPLE_CLIENT_ID: 'test-apple-client', APPLE_TEAM_ID: 'test-team', APPLE_KEY_ID: 'test-key-id', APPLE_PRIVATE_KEY: mocks.appleKey,
  APPLE_AUTH_URL: `${mocks.url}/apple/auth`, APPLE_TOKEN_URL: `${mocks.url}/apple/token`,
} });
const base = server.url.replace('127.0.0.1', 'localhost');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

/** A device: a browser context with its own cookies and its own (virtual) passkey authenticator. */
interface Device { ctx: BrowserContext; page: Page; cdp: CDPSession; authenticator: string }
async function device(): Promise<Device> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('https://cdn.freesound.org/**', r => r.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' }, body: sineWav(440) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`  page error: ${e.message}`));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  return { ctx, page, cdp, authenticator: authenticatorId };
}
async function openApp(d: Device, query = ''): Promise<void> {
  await d.page.goto(`${base}/${query}`);
  await d.page.waitForFunction(() => (window as any).__bd_probe);
  if (await d.page.$('#start')) {
    await d.page.click('#start');
    await d.page.waitForFunction(() => (window as any).__bd_probe.state.started, null, { timeout: 20000 });
  }
  await d.page.waitForTimeout(1500);
}
/** Patches open, and Settings › ACCOUNT's state (accountPage.ts). */
const pp = (p: Page) => p.evaluate(() => {
  const s = (window as any).__bd_probe.scene, x = s.SettingsPanel.accountPage;
  return { open: s.PatchesPanel.Open, settings: s.SettingsPanel.Open, tabName: s.SettingsPanel.MenuItems[4]?.Name, view: x.View, account: x.Account, busy: x.Busy, message: x.Message };
});
const ACCOUNT_CONTROLS = new Set(['passkey', 'google', 'apple', 'create', 'back', 'submit', 'addPasskey', 'signOut', 'deleteAccount', 'deleteCancel', 'deleteOk']);
async function press(p: Page, name: string, wait = 400): Promise<void> {
  const at = await p.evaluate(([n, inSettings]) => { const s = (window as any).__bd_probe.scene; return inSettings ? s.SettingsPanel.accountCentre(n) : s.PatchesPanel.centreOf(n); }, [name, ACCOUNT_CONTROLS.has(name)] as const);
  if (!at) throw new Error(`no control ${name}`);
  await p.mouse.move(at[0], at[1]); await p.mouse.click(at[0], at[1]); await p.waitForTimeout(wait);
}
/** Settings › SIGN IN / ACCOUNT (the corner name and the Google return open it the same way). */
async function openAccount(p: Page): Promise<void> {
  if ((await pp(p)).open) { await p.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel()); await p.waitForTimeout(700); }
  await p.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.openAccount());
  await p.waitForFunction(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return s.OffsetY === 0 && s.accountPage.Account !== undefined; }, null, { timeout: 10000 });
  await p.waitForTimeout(300);
}
const settled = (p: Page) => p.waitForFunction(() => !(window as any).__bd_probe.scene.SettingsPanel.accountPage.Busy, null, { timeout: 30000 });
const corners = (p: Page) => p.evaluate(() => (window as any).__bd_probe.corners);
const api = (d: Device, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  d.page.evaluate(async ([m, url, b, h]) => {
    const r = await fetch(url as string, { method: m as string, headers: { 'content-type': 'application/json', ...(h as object) }, body: b === undefined ? undefined : JSON.stringify(b) });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, [method, `${base}/api/${path}`, body, headers] as const);
/** SAVE on the Patches › SAVE tab (a new link the first time, then saves over it). Returns the link's id. */
async function saveLink(p: Page): Promise<string> {
  await press(p, 'tab0', 500);
  const before = await p.evaluate(() => (window as any).__bd_probe.scene.host.links.current()?.url ?? '');
  await press(p, 'share', 200);
  await p.waitForFunction(prev => { const l = (window as any).__bd_probe.scene.host.links.current(); return !!l && !l.stale && !(window as any).__bd_probe.scene.PatchesPanel.Saving && (l.url !== prev || true); }, before, { timeout: 60000 });
  await p.waitForTimeout(500);
  return (await p.evaluate(() => (window as any).__bd_probe.scene.host.links.current().url as string)).match(/[?&]c=([^&]+)/)![1];
}
async function addBlock(p: Page): Promise<void> {
  await p.evaluate(() => (window as any).__bd_probe.scene.host.createBlock('ToneSource', 4, 4));
  await p.waitForTimeout(300);
}

const tests: Record<string, () => Promise<void>> = {
  /** R1, R3, R6, R9, R13: a patch saved before signing up; CREATE ACCOUNT with a passkey; the account claims it; the
   * session cookie is HttpOnly; the name rules hold. */
  async 'passkey-account'() {
    const a = await device();
    await openApp(a, '?demo');
    await (async () => { for (let i = 0; i < 8 && !(await pp(a.page)).open; i++) { await a.page.mouse.move(1138, 45); await a.page.mouse.click(1138, 45); await a.page.waitForTimeout(700); } })();
    const before = await saveLink(a.page);  // anonymous: this browser holds its edit token
    await openAccount(a.page);
    const ways = await a.page.evaluate(() => ['google', 'apple', 'passkey'].map(k => (window as any).__bd_probe.scene.SettingsPanel.accountCentre(k)));
    check('signed out: Settings › SIGN IN offers Google, Apple and a passkey, in that order (owner review 2)', (await pp(a.page)).account === null && (await pp(a.page)).tabName === 'SIGN IN'
      && ways.every(Boolean) && ways[0][1] < ways[1][1] && ways[1][1] < ways[2][1], { p: await pp(a.page), ways });
    await press(a.page, 'create');
    await a.page.fill('#accountHandleInput', 'Admin');
    await press(a.page, 'submit'); await settled(a.page);
    check('R6: a reserved name is refused', (await pp(a.page)).message.includes('reserved'), (await pp(a.page)).message);
    await a.page.fill('#accountHandleInput', 'tester_1');
    await press(a.page, 'submit'); await settled(a.page);
    const st = await pp(a.page);
    check('R1: CREATE WITH PASSKEY makes the account and signs in; the tab reads ACCOUNT', st.account?.handle === 'tester_1' && st.view === 'main' && st.tabName === 'ACCOUNT', st);
    await a.page.evaluate(() => { const s = (window as any).__bd_probe.scene; s.SettingsPanel.ClosePanel(); s.PatchesPanel.ClosePanel(); }); await a.page.waitForTimeout(700);
    const c1 = await corners(a.page);
    check('R14: the stage says who is signed in; pressing it opens Settings › ACCOUNT', c1.me === 'tester_1' && !!c1.meAt, c1);
    await a.page.mouse.click(c1.meAt![0], c1.meAt![1]); await a.page.waitForTimeout(900);
    check('… it does', (await pp(a.page)).settings === true);
    const cookie = (await a.ctx.cookies()).find(c => c.name === 'bd_session');
    check('R3: the session is an HttpOnly, SameSite=Lax cookie the page cannot read', !!cookie && cookie.httpOnly && cookie.sameSite === 'Lax'
      && !(await a.page.evaluate(() => document.cookie)).includes('bd_session'), cookie && { httpOnly: cookie.httpOnly, sameSite: cookie.sameSite });
    const mine = await api(a, 'GET', 'me/patches');
    check('R9: the patch saved before signing up is the account\'s now', mine.status === 200 && mine.json.patches.some((p: { id: string }) => p.id === before), mine.json);
    const taken = await api(a, 'POST', 'auth/passkey/register/options', { handle: 'tester_1', turnstile: 'ok' });
    // Signed in, register/options adds a passkey to this account instead; ask as a signed-out client.
    const anon = await device(); await anon.page.goto(`${base}/api/config`);
    const t2 = await api(anon, 'POST', 'auth/passkey/register/options', { handle: 'TESTER_1', turnstile: 'ok' }, { origin: base });
    const rude = await api(anon, 'POST', 'auth/passkey/register/options', { handle: 'b1tch_1', turnstile: 'ok' }, { origin: base });
    const fine = await api(anon, 'POST', 'auth/passkey/register/options', { handle: 'grape_scunthorpe', turnstile: 'ok' }, { origin: base });
    const bot = await api(anon, 'POST', 'auth/passkey/register/options', { handle: 'new_one', turnstile: 'fail' }, { origin: base });
    check('R6: names are unique ignoring case; rude ones refused; innocent ones allowed; R1: the bot check applies',
      taken.status === 200 && t2.status === 409 && rude.status === 400 && fine.status === 200 && bot.status === 403, [taken.status, t2.status, rude.status, fine.status, bot.status]);
    await anon.ctx.close();
    shared.a = a; shared.firstPatch = before;
  },

  /** R2, R4, R8, R9: SIGN OUT, then SIGN IN WITH PASSKEY; a second device with the same (synced) passkey sees the
   * account's patches, opens one, changes it and SAVEs over the same link without its edit token. */
  async 'second-device'() {
    const a = shared.a!;
    await openAccount(a.page);
    await press(a.page, 'signOut'); await settled(a.page);
    const out = await api(a, 'GET', 'me');
    check('R4: SIGN OUT ends the session', out.json.user === null && (await pp(a.page)).account === null);
    await press(a.page, 'passkey'); await settled(a.page);
    await a.page.waitForTimeout(700);
    check('R2: SIGN IN WITH PASSKEY (no name needed), then back to the stage', (await pp(a.page)).account?.handle === 'tester_1' && (await pp(a.page)).settings === false, await pp(a.page));

    // The passkey syncs to another device (iCloud Keychain, Google Password Manager): copy it to device B.
    const b = await device();
    const { credentials } = await a.cdp.send('WebAuthn.getCredentials', { authenticatorId: a.authenticator });
    for (const c of credentials) await b.cdp.send('WebAuthn.addCredential', { authenticatorId: b.authenticator, credential: c });
    await openApp(b);
    await openAccount(b.page);
    await press(b.page, 'passkey'); await settled(b.page);
    check('R2: the synced passkey signs in on device B', (await pp(b.page)).account?.handle === 'tester_1');
    // Signed in, the page is back on the stage (owner review 2026-11-15): open Patches › OPEN.
    for (let i = 0; i < 8 && !(await pp(b.page)).open; i++) { await b.page.mouse.move(1138, 45); await b.page.mouse.click(1138, 45); await b.page.waitForTimeout(700); }
    await b.page.waitForTimeout(600);
    await press(b.page, 'tab1', 1500);
    const rows = await b.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.Items as { name: string; detail: string; key: string }[]);
    const row = rows.findIndex(r => r.key === `acct:${shared.firstPatch}`);
    check('R8: OPEN lists the account\'s patches first', row === 0 && rows[0].detail.startsWith('Your account'), rows.slice(0, 3));
    await press(b.page, 'open0', 2500);
    const opened = await b.page.evaluate(() => ({ id: (window as any).__bd_probe.v1App.CompositionId, url: location.search }));
    await b.page.evaluate(() => (window as any).__bd_probe.scene.PatchesPanel.ClosePanel()); await b.page.waitForTimeout(600);
    await addBlock(b.page);
    await (async () => { for (let i = 0; i < 8 && !(await pp(b.page)).open; i++) { await b.page.mouse.move(1138, 45); await b.page.mouse.click(1138, 45); await b.page.waitForTimeout(700); } })();
    const saved = await saveLink(b.page);
    const latest = await api(b, 'GET', `patches/${saved}`);
    check('R9: device B saves over the same link (no edit token there)', opened.id === shared.firstPatch && saved === shared.firstPatch && latest.json.rev === 2, { opened, saved, rev: latest.json?.rev });
    shared.b = b;
  },

  /** R2a, R6: Sign in with Google (PKCE S256); a new Google account picks its name; the callback refuses a wrong state. */
  async 'google'() {
    const c = await device();
    await fetch(`${mocks.url}/google/next?user=carol`);
    await openApp(c);
    await openAccount(c.page);
    await Promise.all([c.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}), press(c.page, 'google', 0)]);
    await c.page.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 20000 });
    // Back from Google (owner review 2026-11-15): no START and no intro; a new account names itself in Settings at once.
    await c.page.waitForFunction(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return s.Open && s.OffsetY === 0 && s.accountPage.View === 'name'; }, null, { timeout: 20000 }).catch(() => {});
    const auth = mocks.googleAuths.at(-1);
    check('R2a: PKCE S256 with our client id', auth?.method === 'S256' && !!auth.challenge && auth.client === 'test-google-client', auth);
    check('R2a: back from Google there is no start screen', !(await c.page.$('#start')) && !(await c.page.evaluate(() => location.search.includes('account='))));
    check('R6: a new Google account is asked for a name in Settings', (await pp(c.page)).view === 'name' && (await pp(c.page)).settings === true, await pp(c.page));
    await c.page.fill('#accountHandleInput', 'carol_g');
    await press(c.page, 'submit'); await settled(c.page);
    check('… and has it', (await pp(c.page)).account?.handle === 'carol_g' && (await pp(c.page)).account?.providers.includes('google'), await pp(c.page));
    // The same Google account again, on another device: the same BlokDust account, straight to the stage.
    const d = await device();
    await openApp(d); await openAccount(d.page);
    await Promise.all([d.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}), press(d.page, 'google', 0)]);
    await d.page.waitForFunction(() => (window as any).__bd_probe?.corners?.me === 'carol_g', null, { timeout: 20000 }).catch(() => {});
    check('R2a: the same Google account signs in to the same account, no panel in the way', (await corners(d.page)).me === 'carol_g' && !(await pp(d.page)).settings && !(await pp(d.page)).open, { c: await corners(d.page), p: await pp(d.page) });
    const r = await fetch(`${base}/api/auth/google/callback?code=x&state=wrong`, { redirect: 'manual', headers: { cookie: 'bd_oauth=right.verifier.%2F' } });
    check('R2a: a callback whose state does not match is refused', r.status === 400, r.status);
    await c.ctx.close(); await d.ctx.close();
  },

  /** R2b: Sign in with Apple (no scopes, query response; client secret signed with the key); a new account picks its name. */
  async 'apple'() {
    const e = await device();
    await fetch(`${mocks.url}/google/next?user=erin`);  // the mock's next user, for Apple too
    await openApp(e); await openAccount(e.page);
    await Promise.all([e.page.waitForURL(/account=/, { timeout: 20000 }).catch(() => {}), press(e.page, 'apple', 0)]);
    await e.page.waitForFunction(() => (window as any).__bd_probe, null, { timeout: 20000 });
    await e.page.waitForFunction(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return s.Open && s.OffsetY === 0 && s.accountPage.View === 'name'; }, null, { timeout: 20000 }).catch(() => {});
    const auth = mocks.appleAuths.at(-1);
    check('R2b: Apple is asked for no name or email, answering by redirect, with our Services ID', auth?.mode === 'query' && !auth.scope && auth.client === 'test-apple-client', auth);
    check('R2b: the client secret is an ES256 JWT signed with the key', mocks.appleSecrets.length > 0 && mocks.appleSecrets.every(Boolean), mocks.appleSecrets);
    check('R2b, R6: a new Apple account is asked for a name in Settings', (await pp(e.page)).view === 'name' && (await pp(e.page)).settings === true, await pp(e.page));
    await e.page.fill('#accountHandleInput', 'erin_a');
    await press(e.page, 'submit'); await settled(e.page);
    check('… and has it, with Apple as its way in', (await pp(e.page)).account?.handle === 'erin_a' && (await pp(e.page)).account?.providers.includes('apple'), await pp(e.page));
    const r = await fetch(`${base}/api/auth/apple/callback?code=x&state=s`, { redirect: 'manual', headers: { cookie: 'bd_oauth=s.verifier.%2F' } });
    check('R2b: a Google sign-in\'s cookie is no good for Apple\'s callback', r.status === 400, r.status);
    await e.ctx.close();
  },

  /** R5: cookie-authenticated changes only from this site. */
  async 'cross-site'() {
    const a = shared.a!;
    const cookie = (await a.ctx.cookies()).find(c => c.name === 'bd_session')!;
    const evil = await fetch(`${server.url}/api/auth/logout`, { method: 'POST', headers: { cookie: `bd_session=${cookie.value}`, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
    const none = await fetch(`${server.url}/api/me`, { method: 'DELETE', headers: { cookie: `bd_session=${cookie.value}` } });
    const still = await api(a, 'GET', 'me');
    check('R5: another site (or no Origin) cannot sign out or delete with the cookie', evil.status === 403 && none.status === 403 && still.json.user?.handle === 'tester_1', [evil.status, none.status]);
  },

  /** R15 (CHG-0027): Settings › ACCOUNT shows the account's stats from the one `/api/me?stats=1` it already asks;
   * favourite blocks come from the tally kept on each save (and patches saved before it are counted on the way). */
  async 'stats'() {
    const a = shared.a!;
    const patch = (types: string[]) => ({ format: 'blokdust.patch', version: 2, blocks: types.map((type, i) => ({ id: `b${i}`, type, x: i * 4, y: 0 })) });
    const save = (d: Device, body: Record<string, unknown>) => api(d, 'POST', 'patches', { turnstile: 'ok', ...body }, { origin: base });
    // Someone else (signed out) remixes the account's first patch, twice; the account remixes theirs once.
    const anon = await device(); await anon.page.goto(`${base}/api/config`);
    const theirs = await save(anon, { patch: patch(['source.noise']), title: 'Theirs', parent: shared.firstPatch });
    await save(anon, { patch: patch(['source.noise']), title: 'Theirs 2', parent: shared.firstPatch });
    const mine1 = await save(a, { patch: patch(['source.tone', 'source.tone', 'power.emitter', 'power.laser']), title: 'Lasers', parent: theirs.json.id });
    await save(a, { patch: patch(['source.tone', 'power.emitter', 'fx.reverb']), title: 'Tones' });
    // A patch from before migration 0006 (blocks not counted yet): counted when the tab next asks.
    await server.sql(`UPDATE patches SET blocks = '' WHERE id = '${mine1.json.id}'`);
    const requests: string[] = [];
    a.page.on('request', r => { if (r.url().includes('/api/')) requests.push(new URL(r.url()).pathname + new URL(r.url()).search); });
    await openAccount(a.page);
    await a.page.waitForFunction(() => !!(window as any).__bd_probe.scene.SettingsPanel.accountPage.Account?.stats, null, { timeout: 10000 });
    await a.page.waitForTimeout(400);
    const st = (await pp(a.page)).account?.stats;
    check('R15: opening ACCOUNT asks once, for who is signed in and the stats together', requests.filter(r => r.startsWith('/api/')).length === 1 && requests[0] === '/api/me?stats=1', requests);
    check('R15: patches, remixes made, remixes of the account’s patches, the most remixed', st?.patches === 3 && st.remixes === 1 && st.remixed === 2
      && st.mostRemixed?.id === shared.firstPatch && st.mostRemixed.n === 2, st);
    const favs = st?.favourites.map((f: { type: string; patches: number; count: number }) => `${f.type}:${f.patches}:${f.count}`);
    // The demo patch (the first save, with a Tone added on device B) has Tones and an Emitter: Tone is in 3 patches only
    // if the older one was counted.
    check('R15: favourite blocks, in the most patches first, then the most of them (an older patch counted on the way)',
      /^source\.tone:3:\d+$/.test(favs?.[0] ?? '') && favs?.[1].startsWith('power.emitter:3:') && favs.length === 5 && !favs.some((f: string) => f.startsWith('power.laser')), favs);
    const plain = await api(a, 'GET', 'me');
    check('R15: /api/me without ?stats=1 does no stats work (loading the page)', plain.json.user && !('stats' in plain.json.user), plain.json.user);
    await a.page.screenshot({ path: `${OUT}/account-stats.png` });
    await a.page.setViewportSize({ width: 390, height: 844 }); await a.page.waitForTimeout(800);
    await a.page.screenshot({ path: `${OUT}/account-stats-phone.png` });
    await a.page.setViewportSize({ width: 1280, height: 800 }); await a.page.waitForTimeout(500);
    await a.page.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.ClosePanel()); await a.page.waitForTimeout(700);
    await anon.ctx.close();
  },

  /** R4, R10: SIGN OUT EVERYWHERE ends device B's session too; DELETE ACCOUNT removes the account and its patches. */
  async 'sign-out-everywhere-and-delete'() {
    const a = shared.a!, b = shared.b!;
    await api(a, 'POST', 'auth/logout', { everywhere: true }, { origin: base });
    const bMe = await api(b, 'GET', 'me');
    await openAccount(a.page);
    check('R4: signing out everywhere (the API) ends every session', bMe.json.user === null && (await pp(a.page)).account === null);
    // The passkey manager syncs B's use back to A (its signature counter moved on there): copy it back. Without this
    // the server rightly refuses A's older counter as a possibly cloned key.
    const { credentials } = await b.cdp.send('WebAuthn.getCredentials', { authenticatorId: b.authenticator });
    await a.cdp.send('WebAuthn.clearCredentials', { authenticatorId: a.authenticator });
    for (const c of credentials) await a.cdp.send('WebAuthn.addCredential', { authenticatorId: a.authenticator, credential: c });
    await press(a.page, 'passkey'); await settled(a.page);
    const signedIn = await pp(a.page);
    await a.page.waitForFunction(() => !(window as any).__bd_probe.scene.SettingsPanel.Open, null, { timeout: 5000 }).catch(() => {});
    await a.page.waitForTimeout(600);  // its slide away ends (v1's panel tween)
    await openAccount(a.page);  // signing in went back to the stage
    await press(a.page, 'deleteAccount', 500);
    check('DELETE ACCOUNT asks first', (await pp(a.page)).view === 'delete', { signedIn, now: await pp(a.page) });
    await press(a.page, 'deleteOk'); await settled(a.page);
    const gone = await api(a, 'GET', `patches/${shared.firstPatch}`), me = await api(a, 'GET', 'me');
    const again = await api(a, 'POST', 'auth/passkey/login/options', {}, { origin: base });
    check('R10: the account and its patches are gone', me.json.user === null && gone.status === 404 && again.status === 200, [me.json, gone.status]);
    await a.ctx.close(); await b.ctx.close();
  },
};
const shared: { a?: Device; b?: Device; firstPatch?: string } = {};

try {
  for (const [name, t] of Object.entries(tests)) {
    if (only && !only.includes(name)) continue;
    try { await t(); } catch (e) { check(name, false, String((e as Error).stack ?? e).slice(0, 600)); }
  }
} finally {
  await browser.close(); await server.stop(); mocks.close();
}
writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
const ok = results.length > 0 && results.every(r => r.ok);
console.log(JSON.stringify({ ok, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).map(r => r.name) }));
process.exit(ok ? 0 : 1);
