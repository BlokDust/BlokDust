// CHG-0009 / SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS R1–R8.
// Real Worker + dedicated local D1 + actual Settings pointer actions. No external services or audio uploads.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startLocal, run, WRANGLER } from '../../tools/server/lib.ts';
import { diagnosticText, supportDiagnostics, supportPatch } from '../../shared/support.ts';

const state = resolve('.cache/server/support-test');
const based = process.argv.includes('--based');
const local = await startLocal({ name: 'support-test', vars: {}, fresh: true, ...(based ? { env: 'based' } : {}) });
const service = { ...local, url: local.url + (based ? '/blokdust' : '') };
const browser = await chromium.launch({ headless: true });
let count = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); count++; console.error(`PASS ${name}`); }
async function sql(command: string, db = 'blokdust-support-dev'): Promise<any[]> {
  const r = await run([WRANGLER, 'd1', 'execute', db, '--local', '--persist-to', state, '--command', command, '--json'], { quiet: true });
  assert.equal(r.code, 0, r.out);
  return JSON.parse(r.out)[0].results;
}
let ip = 10;
const patch = { format: 'blokdust.patch', version: 2, blocks: [{ id: 'private-name', type: 'source.sample', x: 2, y: 3,
  params: { track: 'file:private-recording.wav', volume: -8, audio: 'data:audio/wav;base64,PRIVATE', token: 'SECRET' } }],
  refs: { 'file:private-recording.wav': { name: 'private-recording.wav', path: '/private/test.wav' } } };
function report() { return { schema: 1, kind: 'feedback', message: 'Test support query', email: '', version: '2.0.0-dev', build: 'test-build', system: { surface: 'web', password: 'SECRET' }, patch,
  diagnostics: [{ at: Date.now(), kind: 'console', message: 'Failed https://example.invalid/audio?token=SECRET /private/test.wav' }] }; }
async function post(value: unknown, address = `192.0.2.${ip++}`) {
  return fetch(`${service.url}/api/support`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': address }, body: JSON.stringify(value) });
}
try {
  // R2/R3: privacy allowlist, event count/age and hostile strings. User text is data, never executable content.
  const clean = JSON.stringify(supportPatch(patch));
  check('patch allowlist preserves configuration but drops audio, credentials, filenames and custom identifiers', !/PRIVATE|SECRET|private-name|private-recording|refs|audio/.test(clean) && clean.includes('file:redacted') && clean.includes('"volume":-8'));
  const ordered = supportPatch({ ...patch, blocks: [...patch.blocks, { id: 'control-private', type: 'power.power' }], connectionOrder: [['control-private', 'private-name'], ['missing', 'private-name']] });
  check('release effect order survives private ID remapping', JSON.stringify(ordered.connectionOrder) === JSON.stringify([['b2', 'b1']]));
  check('diagnostic redaction', !/SECRET|example.invalid|private|test.wav/.test(diagnosticText('token=SECRET https://example.invalid/x /private/test.wav')));
  check('events bounded to 100 and 15 minutes', supportDiagnostics(Array.from({ length: 150 }, () => ({ at: Date.now(), kind: 'error', message: 'test' }))).length === 100 && supportDiagnostics([{ at: Date.now() - 900001, kind: 'error', message: 'old' }]).length === 0);
  for (const [name, value, status] of [
    ['empty text', { ...report(), message: ' ' }, 400], ['oversized text', { ...report(), message: 'x'.repeat(5001) }, 400],
    ['invalid email', { ...report(), email: 'bad\naddress' }, 400], ['invalid patch', { ...report(), patch: { blocks: [{}] } }, 400],
    ['unsupported patch version', { ...report(), patch: { ...patch, version: 99 } }, 400],
    ['automatic without consent', { ...report(), kind: 'automatic' }, 400], ['honeypot', { ...report(), website: 'spam' }, 400],
    ['oversized streamed body', { ...report(), padding: 'x'.repeat(140000) }, 413],
  ] as const) check(`API rejects ${name}`, (await post(value)).status === status);
  const hostile = `A <script>alert('x')</script> suggestion; DROP TABLE support_reports;`;
  const response = await post({ ...report(), message: hostile, email: 'reply@example.invalid' });
  check('submission returns reference and CORS for plugin', response.status === 201 && response.headers.get('access-control-allow-origin') === '*');
  const { id } = await response.json() as { id: string };
  const stored = (await sql(`SELECT * FROM support_reports WHERE id = '${id}'`))[0];
  check('triage fields ready; original text safely stored with parameterised SQL', stored.message === hostile && stored.status === 'new' && stored.category === 'unclassified' && stored.severity === 'unknown' && stored.priority === 0 && stored.fingerprint.length === 64 && stored.review_due - stored.created === 7 * 86400000);
  const context = (await sql(`SELECT * FROM support_context WHERE report_id = '${id}'`))[0];
  check('server repeats privacy filtering and enforces 90-day context retention', !/PRIVATE|SECRET|private-recording|example.invalid|private-name/.test(JSON.stringify(context)) && context.expires - stored.created === 90 * 86400000);
  const without = await post({ ...report(), includeContext: false });
  const withoutId = (await without.json() as { id: string }).id;
  const withoutContext = (await sql(`SELECT * FROM support_context WHERE report_id='${withoutId}'`))[0];
  check('backend strips context when disabled', withoutContext.patch_json === 'null' && withoutContext.diagnostics_json === '[]' && withoutContext.system_json === '{}');
  check('support tables isolated from sharing database', (await sql("SELECT name FROM sqlite_master WHERE name LIKE 'support_%'", 'blokdust-dev')).length === 0);
  check('no public read endpoint', (await fetch(`${service.url}/api/support/${id}`)).status === 404 && (await fetch(`${service.url}/api/support`)).status === 404);
  check('plugin preflight', (await fetch(`${service.url}/api/support`, { method: 'OPTIONS', headers: { origin: 'null', 'access-control-request-method': 'POST' } })).status === 204);
  const codes = []; for (let n = 0; n < 7; n++) codes.push((await post(report(), '192.0.2.200')).status);
  check('server rate limit stops flooding', codes.includes(429));

  // R1/R4/R5/R6: actual panel, failed sends retain text, no queue/retry, opt-in persistence and bounded automatic reports.
  const browserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await browserContext.route('https://cdn.freesound.org/**', r => r.abort());
  const page = await browserContext.newPage();
  await page.goto(`${service.url}/?demo=1`);
  await page.waitForFunction(() => (window as any).__bd_probe);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).__bd_probe.state.started);
  for (let n = 0; n < 6; n++) {
    await page.mouse.click(1220, 45);
    try { await page.waitForFunction(() => (window as any).__bd_probe.scene.SettingsPanel.Open, null, { timeout: 1500 }); break; } catch { /* header entrance */ }
  }
  await page.waitForTimeout(900);
  const point = await page.evaluate(() => {
    const { scene: s, v1App: a } = (window as any).__bd_probe, p = s.SettingsPanel;
    return [p.MenuItems[1].Position.x / devicePixelRatio, (p.OffsetY + 30 * a.Unit) / devicePixelRatio];
  });
  await page.mouse.click(point[0], point[1]);
  await page.waitForSelector('#feedback-message');
  check('Connect shows the embedded support form', await page.getByRole('form', { name: 'Feedback & support' }).isVisible());
  check('context included by default', await page.getByRole('switch').getAttribute('aria-checked') === 'true');
  let submissions: any[] = [];
  await page.route('**/api/support', async route => {
    const value = route.request().postDataJSON(); submissions.push(value);
    await route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': `192.0.2.${ip++}` } });
  });
  await page.evaluate(() => { localStorage.setItem('blokdust2.editTokens', '{"private":"SECRET"}'); console.error('Support diagnostic', { password: 'SECRET' }); });
  await page.locator('#feedback-message').fill('A suggestion from the panel');
  await page.locator('#feedback-email').fill('reply@example.invalid');
  await browserContext.setOffline(true);
  await page.click('#feedback-send');
  await page.getByRole('status').filter({ hasText: 'You need to be connected to the internet' }).waitFor();
  check('offline failure retains draft and sends nothing', await page.locator('#feedback-message').inputValue() === 'A suggestion from the panel' && submissions.length === 0);
  await browserContext.setOffline(false);
  await page.waitForTimeout(400);
  check('reconnect does not auto-retry', submissions.length === 0);
  await page.route('**/api/support', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"unavailable"}' }), { times: 1 });
  await page.click('#feedback-send');
  await page.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
  check('server failure retains draft', await page.locator('#feedback-message').inputValue() === 'A suggestion from the panel');
  await page.click('#feedback-send');
  await page.getByRole('status').filter({ hasText: 'Thank you' }).waitFor();
  check('manual feedback captures actual patch/build/system/diagnostics without storage secrets', submissions.length === 1 && submissions[0].patch.blocks.length > 0 && submissions[0].version === JSON.parse(readFileSync('package.json', 'utf8')).version && submissions[0].build && submissions[0].system.surface === 'web' && submissions[0].diagnostics.length > 0 && !JSON.stringify(submissions).includes('SECRET'));
  await page.getByRole('switch', { name: 'Include current patch and diagnostics' }).click();
  await page.locator('#feedback-message').fill('Text only feedback');
  await page.click('#feedback-send');
  await page.getByRole('status').filter({ hasText: 'Thank you' }).waitFor();
  check('context switch excludes patch, diagnostics and system from the request', submissions.length === 2 && submissions[1].includeContext === false && submissions[1].patch === null && submissions[1].diagnostics.length === 0 && Object.keys(submissions[1].system).length === 0);
  await page.evaluate(() => { console.error('Unexpected test error'); });
  await page.waitForTimeout(300);
  check('attachment switch does not enable automatic reports', submissions.length === 2);
  check('success copy contains no reference', await page.getByRole('status').textContent() === 'Thank you');
  await page.locator('#feedback-message').fill('z');
  await page.keyboard.press('q');
  check('typing does not trigger stage shortcuts', await page.locator('#feedback-message').inputValue() === 'zq');
  mkdirSync('tests/e2e/output/support', { recursive: true });
  await page.screenshot({ path: 'tests/e2e/output/support/panel.png' });
  await page.setViewportSize({ width: 390, height: 740 });
  await page.waitForTimeout(300);
  const mobile = await page.locator('#feedback-send').boundingBox();
  check('Connect form stays inside mobile viewport', mobile && mobile.x >= 0 && mobile.x + mobile.width <= 390 && mobile.y + mobile.height <= 740);
  await page.screenshot({ path: 'tests/e2e/output/support/mobile.png' });
  check('panel works at mobile width without horizontal overflow', await page.evaluate(() => document.querySelector('#feedback-panel')!.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  const settingsPoint = await page.evaluate(() => { const s = (window as any).__bd_probe.scene.SettingsPanel; return [s.MenuItems[0].Position.x / devicePixelRatio, 30]; });
  await page.mouse.click(settingsPoint[0], settingsPoint[1]); await page.waitForTimeout(800);
  check('switching tabs hides embedded inputs', !(await page.locator('#feedback-message').isVisible()));
  await browserContext.close();

  // R7: actual scheduled handler deletes context first and report + triage history after one year.
  await sql(`INSERT INTO support_triage_events(report_id,created,actor,source,details_json) VALUES ('${id}',0,'test','human','{}'); UPDATE support_context SET expires=0 WHERE report_id='${id}';`);
  check('local cron invokes scheduled handler', (await fetch(`${local.url}/__scheduled?cron=17+3+*+*+*`)).ok);
  check('90-day cleanup keeps feedback text', (await sql(`SELECT * FROM support_context WHERE report_id='${id}'`)).length === 0 && (await sql(`SELECT * FROM support_reports WHERE id='${id}'`)).length === 1);
  await sql(`UPDATE support_reports SET expires=0 WHERE id='${id}'`);
  await fetch(`${local.url}/__scheduled?cron=17+3+*+*+*`);
  check('one-year cleanup cascades triage history', (await sql(`SELECT * FROM support_reports WHERE id='${id}'`)).length === 0 && (await sql(`SELECT * FROM support_triage_events WHERE report_id='${id}'`)).length === 0);
  console.log(JSON.stringify({ passed: count, failed: 0 }));
} finally { await browser.close(); await service.stop(); }
