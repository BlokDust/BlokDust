// pnpm test:analytics: CHG-0026 acceptance (SPEC-SHARING-USAGE-ANALYTICS R2–R11), black-box through
// the local Worker (wrangler dev, local D1, a stand-in for Access and the SQL API) and Chromium.
import { createServer, type Server } from 'node:http';
import { generateKeyPairSync, createSign, randomUUID, type KeyObject } from 'node:crypto';
import { chromium, type Page } from 'playwright';
import { startLocal, type LocalServer } from '../../tools/server/lib.ts';
import type { AppSettingsPanel } from './pageGlobals.ts';

const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  console.error(
    `${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 300)}` : ''}`,
  );
}
/** What POST /api/events answers. */
interface EventsReply {
  accepted?: number;
  off?: boolean;
}
/** A batch the app sent to /api/events. */
interface SentBatch {
  events: { e: string }[];
  surface?: string;
  v?: unknown;
  install?: unknown;
}
/** The dashboard's data endpoint's answer. */
interface DashboardData {
  configured?: boolean;
  results?: { totals?: { rows?: unknown[] }; daws?: { rows?: { host?: string }[] } };
}
const post = async (base: string, body: unknown, raw?: string) => {
  const response = await fetch(`${base}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as EventsReply | null;
  return { status: response.status, json };
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
    const requestUrl = new URL(req.url ?? '/', 'http://x');
    if (requestUrl.pathname === '/cdn-cgi/access/certs') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }],
        }),
      );
      return;
    }
    if (requestUrl.pathname === '/sql' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
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
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      resolve();
    }),
  );
  return {
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    server,
    sql,
    key: privateKey,
    kid,
  };
}
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(mocks: Mocks, claims: Record<string, unknown>): string {
  const head = b64({ alg: 'RS256', kid: mocks.kid, typ: 'JWT' }),
    body = b64(claims);
  const sig = createSign('RSA-SHA256')
    .update(`${head}.${body}`)
    .sign(mocks.key)
    .toString('base64url');
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
    // The default local Worker: analytics on, dashboard open (ADMIN_LOCAL=1, wrangler.jsonc).
    const localServer = await startLocal({
      name: 'analytics',
      vars: {
        TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
        ANALYTICS_SQL_URL: `${mocks.url}/sql`,
        CF_ANALYTICS_TOKEN: 'test-token',
      },
    });
    servers.push(localServer);
    const base = localServer.url;

    // R3: accepted and refused
    let reply = await post(
      base,
      batch([
        { e: 'session_start', s: { referrer: 'example.com' } },
        { e: 'block_added', s: { type: 'source.tone' }, n: { count: 3 } },
        { e: 'no_such_event' },
      ]),
    );
    check(
      'R3 known events are accepted, unknown dropped',
      reply.status === 200 && reply.json?.accepted === 2,
      reply,
    );
    reply = await post(base, batch([{ e: 'patch_shared', s: { kind: 'new' } }]));
    check(
      'R6 a client cannot send a server-only event',
      reply.status === 200 && reply.json?.accepted === 0,
      reply,
    );
    reply = await post(base, { ...batch([]), surface: 'desktop' });
    check('R3 unknown surface → 400', reply.status === 400, reply);
    reply = await post(base, { ...batch([]), v: '<script>' });
    check('R3 bad version → 400', reply.status === 400, reply);
    reply = await post(base, batch(Array.from({ length: 51 }, () => ({ e: 'keyboard_played' }))));
    check('R3 more than 50 events → 400', reply.status === 400, reply);
    reply = await post(
      base,
      null,
      JSON.stringify(batch([{ e: 'keyboard_played', s: { pad: 'x'.repeat(9000) } }])),
    );
    check('R3 a batch over 8 kB → 413', reply.status === 413, reply);
    reply = await post(base, null, '{not json');
    check('R3 bad JSON → 400', reply.status === 400, reply);
    const get = await fetch(`${base}/api/events`);
    check('R3 GET → 405', get.status === 405, get.status);
    // R8
    reply = await post(
      base,
      batch([
        {
          e: 'plugin_active',
          s: { kind: 'fx', host: 'Ableton Live 12', host_version: '12.1', arch: 'arm64' },
        },
      ]),
    );
    check('R8 plugin_active from the web is dropped', reply.json?.accepted === 0, reply);
    reply = await post(base, {
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
      reply.json?.accepted === 1,
      reply,
    );
    reply = await post(base, {
      surface: 'vst3',
      v: '2.0.2',
      install: 'not-an-id!',
      events: [{ e: 'plugin_active', s: { kind: 'fx' } }],
    });
    check('R8 a malformed install id is not an install', reply.json?.accepted === 0, reply);

    // R5: the page is told the rate
    const html = await (await fetch(`${base}/`)).text();
    check(
      'R5 the page carries the rate',
      html.includes('<meta name="blokdust-analytics" content="1">'),
    );
    const cfg = (await (await fetch(`${base}/api/config`)).json()) as {
      analytics?: { rate?: number };
    };
    check('R5 /api/config carries the rate', cfg.analytics?.rate === 1, cfg.analytics);

    // R6: the Worker's own events never change a response: a search without a Freesound key answers
    // as before (recorded as freesound_error). Shares: `pnpm test:sharing`.
    const fs = await fetch(`${base}/api/freesound/search?q=bell&max=10`);
    check(
      'R6 a recorded Freesound error answers as before',
      fs.status >= 400 && fs.status < 600,
      fs.status,
    );

    // R10: dashboard locally
    let response = await fetch(`${base}/admin/analytics`);
    const csp = response.headers.get('content-security-policy') ?? '';
    check(
      'R10 local dashboard page',
      response.status === 200 && (await response.text()).includes('BLOKDUST ANALYTICS'),
      response.status,
    );
    check(
      'R11 dashboard CSP allows only its own nonce script',
      /script-src 'nonce-[^']+'/.test(csp) &&
        !csp.includes('unsafe-inline') &&
        csp.includes("frame-ancestors 'none'"),
      csp,
    );
    response = await fetch(`${base}/admin/analytics/data?days=7`);
    const data = (await response.json()) as DashboardData;
    check(
      'R10 dashboard data from the SQL API',
      data.configured === true &&
        data.results?.totals?.rows?.length === 2 &&
        data.results.daws?.rows?.at(0)?.host === 'Ableton Live 12',
      data.results?.totals,
    );
    check(
      'R10 queries name only the dataset and the day range',
      mocks.sql.length > 0 &&
        mocks.sql.every(
          (query) =>
            query.includes('FROM blokdust_events_dev') && query.includes("INTERVAL '7' DAY"),
        ),
      mocks.sql[0],
    );
    response = await fetch(`${base}/admin/analytics/data?days=7;DROP`);
    check(
      'R10 a bad day count falls back to 7',
      response.status === 200 && (mocks.sql.at(-1) ?? '').includes("INTERVAL '7' DAY"),
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
    const sent: SentBatch[] = [];
    ctx.on('request', (rq) => {
      if (rq.url().endsWith('/api/events') && rq.method() === 'POST') {
        try {
          sent.push(JSON.parse(rq.postData() ?? '{}') as SentBatch);
        } catch {
          /* */
        }
      }
    });
    const app = await ctx.newPage();
    await app.goto(`${base}/?demo`);
    await app.waitForFunction(() => window.__bd_probe);
    await app.click('#start');
    await app.waitForFunction(() => window.__bd_probe.state.started, null, {
      timeout: 20000,
    });
    await eventsFrom(app);
    const names = sent.flatMap((b) => b.events.map((event) => event.e));
    check(
      'R2 the app sends session_start, patch_opened and audio_started',
      ['session_start', 'patch_opened', 'audio_started'].every((name) => names.includes(name)),
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
      i < 6 && !(await app.evaluate(() => window.__bd_probe.scene.SettingsPanel.Open));
      i++
    ) {
      await app.mouse.click(1233, 45);
      await app.waitForTimeout(700);
    }
    await app.waitForTimeout(1200);
    const about = await app.evaluate(() => {
      const aboutItem = window.__bd_probe.scene.SettingsPanel.MenuItems[2],
        pr = window.__bd_probe.v1App.Metrics.PixelRatio;
      return [aboutItem.Position.x / pr, 30];
    });
    await app.waitForTimeout(1200);
    await app.mouse.move(about[0], about[1]);
    await app.mouse.click(about[0], about[1]);
    await app.waitForTimeout(1200);
    const sw = await app.evaluate(() =>
      (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).usageStatsSwitch(),
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
      label: (window.__bd_probe.scene.SettingsPanel as AppSettingsPanel).usageStatsSwitch()?.label,
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
    await app.waitForFunction(() => window.__bd_probe);
    await app.click('#start');
    await app.waitForFunction(() => window.__bd_probe.state.started, null, {
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
    reply = await post(off.url, batch([{ e: 'session_start' }]));
    check(
      'R5 kill switch: the Worker records nothing',
      reply.status === 200 && reply.json?.accepted === 0 && reply.json.off === true,
      reply,
    );
    check(
      'R5 kill switch: the page is told 0',
      (await (await fetch(`${off.url}/`)).text()).includes(
        '<meta name="blokdust-analytics" content="0">',
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
    for (const localServer of servers) await localServer.stop();
    mocks.server.close();
  }
  const failed = results.filter((result) => !result.ok);
  console.log(
    JSON.stringify({
      checked: results.length,
      passed: results.length - failed.length,
      failed: failed.map((failure) => failure.name),
    }),
  );
  if (failed.length) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
