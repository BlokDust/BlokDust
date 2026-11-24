// pnpm test:analytics — CHG-0026 acceptance (SPEC-SHARING-USAGE-ANALYTICS), black-box through the local Worker
// (`wrangler dev`, local D1) and the real app in Chromium:
//   R3  POST /api/events accepts only the listed events and values; bad batches are refused; size and count limits
//   R5  the kill switch (ANALYTICS_RATE=0): the page is told 0 and the Worker records nothing
//   R6  the Worker records shares itself; a client can't send a server-only event
//   R7  the About tab's switch turns the website's events off, and they stay off after a reload
//   R8  plugin events only with an install id, from a plugin surface
//   R10 the dashboard: 404 unconfigured, 403 without a valid Access token, 200 with one (signed by a local stand-in
//       for Access), and its data from a mock SQL API
//   R11 the dashboard's CSP
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync, createSign, randomUUID, type KeyObject } from 'node:crypto';
import { chromium, type Page } from 'playwright';
import { startLocal, type LocalServer } from '../../tools/server/lib.ts';

const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}
const post = async (base: string, body: unknown, raw?: string) => {
  const r = await fetch(`${base}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
  return { status: r.status, json: (await r.json().catch(() => null)) as any };
};
const batch = (events: unknown[], extra: Record<string, unknown> = {}) => ({
  surface: 'web',
  v: '2.0.2',
  events,
  ...extra,
});

// ---- stand-ins: Cloudflare Access (its signing keys) and the Analytics Engine SQL API ----
interface Mocks {
  url: string;
  server: Server;
  sql: string[];
  key: KeyObject;
  kid: string;
}
async function startMocks(): Promise<Mocks> {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = randomUUID(),
    sql: string[] = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://x');
    if (u.pathname === '/cdn-cgi/access/certs') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }],
        }),
      );
      return;
    }
    if (u.pathname === '/sql' && req.method === 'POST') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        sql.push(body);
        if (req.headers.authorization !== 'Bearer test-token') {
          res.writeHead(401);
          res.end('no');
          return;
        }
        const rows =
          body.includes('blob1 AS event') && body.includes('GROUP BY event ORDER BY n DESC')
            ? [
                { event: 'session_start', n: 12 },
                { event: '<img src=x onerror=alert(1)>', n: 1 },
              ]
            : body.includes('blob9 AS host, blob10 AS version')
              ? [{ host: 'Ableton Live 12', version: '12.1', installs: 3 }]
              : [];
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ meta: [], data: rows, rows: rows.length }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return {
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    server,
    sql,
    key: privateKey,
    kid,
  };
}
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(m: Mocks, claims: Record<string, unknown>): string {
  const head = b64({ alg: 'RS256', kid: m.kid, typ: 'JWT' }),
    body = b64(claims);
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(m.key).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function eventsFrom(page: Page): Promise<{ e: string; s?: Record<string, string> }[]> {
  // Hiding the page flushes the batch (beacon): ask for it the way a tab switch would.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  return [];
}

async function main() {
  const servers: LocalServer[] = [];
  const mocks = await startMocks();
  const browser = await chromium.launch();
  try {
    // ---- the default local Worker: analytics on, dashboard open locally (ADMIN_LOCAL=1, wrangler.jsonc) ----
    const s = await startLocal({
      name: 'analytics',
      vars: {
        TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        ANALYTICS_SQL_URL: `${mocks.url}/sql`,
        CF_ANALYTICS_TOKEN: 'test-token',
      },
    });
    servers.push(s);
    const base = s.url;

    // R3: accepted and refused
    let r = await post(
      base,
      batch([
        { e: 'session_start', s: { referrer: 'example.com' } },
        { e: 'block_added', s: { type: 'source.tone' }, n: { count: 3 } },
        { e: 'no_such_event' },
      ]),
    );
    check(
      'R3 known events are accepted, unknown dropped',
      r.status === 200 && r.json?.accepted === 2,
      r,
    );
    r = await post(base, batch([{ e: 'patch_shared', s: { kind: 'new' } }]));
    check(
      'R6 a client cannot send a server-only event',
      r.status === 200 && r.json?.accepted === 0,
      r,
    );
    r = await post(base, { ...batch([]), surface: 'desktop' });
    check('R3 unknown surface → 400', r.status === 400, r);
    r = await post(base, { ...batch([]), v: '<script>' });
    check('R3 bad version → 400', r.status === 400, r);
    r = await post(base, batch(Array.from({ length: 51 }, () => ({ e: 'keyboard_played' }))));
    check('R3 more than 50 events → 400', r.status === 400, r);
    r = await post(
      base,
      null,
      JSON.stringify(batch([{ e: 'keyboard_played', s: { pad: 'x'.repeat(9000) } }])),
    );
    check('R3 a batch over 8 kB → 413', r.status === 413, r);
    r = await post(base, null, '{not json');
    check('R3 bad JSON → 400', r.status === 400, r);
    const get = await fetch(`${base}/api/events`);
    check('R3 GET → 405', get.status === 405, get.status);
    // R8
    r = await post(
      base,
      batch([
        {
          e: 'plugin_active',
          s: { kind: 'fx', host: 'Ableton Live 12', host_version: '12.1', arch: 'arm64' },
        },
      ]),
    );
    check('R8 plugin_active from the web is dropped', r.json?.accepted === 0, r);
    r = await post(base, {
      surface: 'vst3',
      v: '2.0.2',
      install: randomUUID(),
      os: 'macOS 15.1',
      events: [
        {
          e: 'plugin_active',
          s: { kind: 'fx', host: 'Ableton Live 12', host_version: '12.1', arch: 'arm64' },
        },
      ],
    });
    check(
      'R8 plugin_active from a plugin with an install id is accepted',
      r.json?.accepted === 1,
      r,
    );
    r = await post(base, {
      surface: 'vst3',
      v: '2.0.2',
      install: 'not-an-id!',
      events: [{ e: 'plugin_active', s: { kind: 'fx' } }],
    });
    check('R8 a malformed install id is not an install', r.json?.accepted === 0, r);

    // R5: the page is told the rate
    const html = await (await fetch(`${base}/`)).text();
    check(
      'R5 the page carries the rate',
      /<meta name="blokdust-analytics" content="1">/.test(html),
    );
    const cfg = (await (await fetch(`${base}/api/config`)).json()) as any;
    check('R5 /api/config carries the rate', cfg.analytics?.rate === 1, cfg.analytics);

    // R6: the Worker's own events (shares, Freesound searches) never change the response: a search without a
    // Freesound key still answers as before (and is recorded as freesound_error). Shares: `pnpm test:sharing`.
    const fs = await fetch(`${base}/api/freesound/search?q=bell&max=10`);
    check(
      'R6 a recorded Freesound error answers as before',
      fs.status >= 400 && fs.status < 600,
      fs.status,
    );

    // R10: dashboard locally
    let d = await fetch(`${base}/admin/analytics`);
    const csp = d.headers.get('content-security-policy') ?? '';
    check(
      'R10 local dashboard page',
      d.status === 200 && (await d.text()).includes('BLOKDUST ANALYTICS'),
      d.status,
    );
    check(
      'R11 dashboard CSP allows only its own nonce script',
      /script-src 'nonce-[^']+'/.test(csp) &&
        !csp.includes('unsafe-inline') &&
        csp.includes("frame-ancestors 'none'"),
      csp,
    );
    d = await fetch(`${base}/admin/analytics/data?days=7`);
    const data = (await d.json()) as any;
    check(
      'R10 dashboard data from the SQL API',
      data.configured === true &&
        data.results?.totals?.rows?.length === 2 &&
        data.results?.daws?.rows?.[0]?.host === 'Ableton Live 12',
      data.results?.totals,
    );
    check(
      'R10 queries name only the dataset and the day range',
      mocks.sql.length > 0 &&
        mocks.sql.every(
          (q) => q.includes('FROM blokdust_events_dev') && q.includes("INTERVAL '7' DAY"),
        ),
      mocks.sql[0],
    );
    d = await fetch(`${base}/admin/analytics/data?days=7;DROP`);
    check(
      'R10 a bad day count falls back to 7',
      d.status === 200 && mocks.sql.at(-1)!.includes("INTERVAL '7' DAY"),
    );

    // R11: client-sent text is shown as text in the browser
    const page = await (await browser.newContext()).newPage();
    const dialogs: string[] = [];
    page.on('dialog', (dl) => {
      dialogs.push(dl.message());
      void dl.dismiss();
    });
    await page.goto(`${base}/admin/analytics`);
    await page.waitForFunction(() => document.querySelectorAll('section').length > 3, null, {
      timeout: 15000,
    });
    const injected = await page.evaluate(() => document.querySelectorAll('section img').length);
    check(
      'R11 event values render as text, never markup',
      injected === 0 && dialogs.length === 0 && (await page.content()).includes('&lt;img src=x'),
      { injected, dialogs },
    );
    await page.close();

    // ---- R7 + R2: the app sends events, and the About switch turns them off ----
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.route('https://cdn.freesound.org/**', (rt) => rt.fulfill({ status: 404, body: '' }));
    const sent: any[] = [];
    ctx.on('request', (rq) => {
      if (rq.url().endsWith('/api/events') && rq.method() === 'POST') {
        try {
          sent.push(JSON.parse(rq.postData() ?? '{}'));
        } catch {
          /* */
        }
      }
    });
    const app = await ctx.newPage();
    await app.goto(`${base}/?demo`);
    await app.waitForFunction(() => (window as any).__bd_probe);
    await app.click('#start');
    await app.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await eventsFrom(app);
    const names = sent.flatMap((b) => b.events.map((e: any) => e.e));
    check(
      'R2 the app sends session_start, patch_opened and audio_started',
      ['session_start', 'patch_opened', 'audio_started'].every((n) => names.includes(n)),
      names,
    );
    check(
      'R2 events carry the surface and version only (no ids)',
      sent.every((b) => b.surface === 'web' && typeof b.v === 'string' && !('install' in b)),
      sent[0],
    );
    // The About tab: open Settings, then About, then press the switch.
    await app.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });
    for (
      let i = 0;
      i < 6 && !(await app.evaluate(() => (window as any).__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await app.mouse.click(1233, 45);
      await app.waitForTimeout(700);
    }
    await app.waitForTimeout(1200);
    const about = await app.evaluate(() => {
      const m = (window as any).__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = (window as any).__bd_probe.v1App.Metrics.PixelRatio;
      return [m.Position.x / pr, 30];
    });
    await app.waitForTimeout(1200);
    await app.mouse.move(about[0], about[1]);
    await app.mouse.click(about[0], about[1]);
    await app.waitForTimeout(1200);
    const sw = await app.evaluate(() =>
      (window as any).__bd_probe.scene.SettingsPanel.usageStatsSwitch(),
    );
    check(
      'R7 the switch shows on the About tab, on',
      sw?.label === 'Anonymous usage stats: on',
      sw,
    );
    if (sw) {
      await app.mouse.move(sw.x, sw.y);
      await app.waitForTimeout(100);
      await app.mouse.click(sw.x, sw.y);
      await app.waitForTimeout(300);
    }
    const after = await app.evaluate(() => ({
      label: (window as any).__bd_probe.scene.SettingsPanel.usageStatsSwitch()?.label,
      stored: localStorage.getItem('blokdust2.analytics'),
    }));
    check(
      'R7 pressing it turns usage stats off and remembers it',
      after.label === 'Anonymous usage stats: off' && after.stored === 'off',
      after,
    );
    await app.screenshot({ path: 'tests/e2e/output/analytics-about.png' });
    sent.length = 0;
    await app.reload();
    await app.waitForFunction(() => (window as any).__bd_probe);
    await app.click('#start');
    await app.waitForFunction(() => (window as any).__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await eventsFrom(app);
    check('R7 after a reload, nothing is sent', sent.length === 0, sent);
    await ctx.close();

    // ---- R5: the kill switch ----
    const off = await startLocal({
      name: 'analytics-off',
      vars: { TURNSTILE_SECRET: '1x0000000000000000000000000000000AA', ANALYTICS_RATE: '0' },
    });
    servers.push(off);
    r = await post(off.url, batch([{ e: 'session_start' }]));
    check(
      'R5 kill switch: the Worker records nothing',
      r.status === 200 && r.json?.accepted === 0 && r.json?.off === true,
      r,
    );
    check(
      'R5 kill switch: the page is told 0',
      /<meta name="blokdust-analytics" content="0">/.test(
        await (await fetch(`${off.url}/`)).text(),
      ),
    );

    // ---- R10: the dashboard behind Access ----
    const aud = 'test-aud';
    const locked = await startLocal({
      name: 'analytics-access',
      vars: {
        TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        ADMIN_LOCAL: '0',
        ACCESS_TEAM_DOMAIN: mocks.url,
        ACCESS_AUD: aud,
      },
    });
    servers.push(locked);
    const now = Math.floor(Date.now() / 1000);
    const as = (token?: string) =>
      fetch(`${locked.url}/admin/analytics`, {
        headers: token ? { 'cf-access-jwt-assertion': token } : {},
      }).then((x) => x.status);
    check('R10 no Access token → 403', (await as()) === 403);
    check(
      'R10 a valid Access token → 200',
      (await as(jwt(mocks, { iss: mocks.url, aud: [aud], exp: now + 600 }))) === 200,
    );
    check(
      'R10 wrong audience → 403',
      (await as(jwt(mocks, { iss: mocks.url, aud: ['other'], exp: now + 600 }))) === 403,
    );
    check(
      'R10 expired → 403',
      (await as(jwt(mocks, { iss: mocks.url, aud: [aud], exp: now - 10 }))) === 403,
    );
    check(
      'R10 wrong issuer → 403',
      (await as(jwt(mocks, { iss: 'https://evil.example', aud: [aud], exp: now + 600 }))) === 403,
    );
    const forged = jwt(mocks, { iss: mocks.url, aud: [aud], exp: now + 600 }).split('.');
    forged[1] = b64({ iss: mocks.url, aud: [aud], exp: now + 6000 });
    check('R10 a tampered token → 403', (await as(forged.join('.'))) === 403);
    const bare = await startLocal({
      name: 'analytics-bare',
      vars: { TURNSTILE_SECRET: '1x0000000000000000000000000000000AA', ADMIN_LOCAL: '0' },
    });
    servers.push(bare);
    check(
      'R10 without Access settings the dashboard does not exist (404)',
      (await fetch(`${bare.url}/admin/analytics`)).status === 404,
    );
  } finally {
    await browser.close();
    for (const s of servers) await s.stop();
    mocks.server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      checked: results.length,
      passed: results.length - failed.length,
      failed: failed.map((f) => f.name),
    }),
  );
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
