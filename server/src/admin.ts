// The private analytics dashboard (SPEC-SHARING-USAGE-ANALYTICS R10–R11): /admin/analytics, behind Cloudflare Access.
// Access signs in the owner before the request reaches us; the Worker checks Access's signed token as well (defence in
// depth: a route or policy mistake must not open it). Without ACCESS_TEAM_DOMAIN + ACCESS_AUD the dashboard doesn't
// exist (404), except in local tests (ADMIN_LOCAL=1, never set on a deployed env).
import type { Env } from './env.ts';
import { HttpError, json } from './http.ts';
import { runQueries, sqlUrl } from './analyticsQueries.ts';

// ---- Access token check (RS256 JWT against the team's published keys) ----
let certs: { at: number; team: string; keys: (JsonWebKey & { kid?: string })[] } | null = null;
async function accessKeys(
  team: string,
  refresh = false,
): Promise<(JsonWebKey & { kid?: string })[]> {
  if (!refresh && certs && certs.team === team && Date.now() - certs.at < 3600_000)
    return certs.keys;
  const r = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new HttpError(503, 'access keys unavailable');
  certs = {
    at: Date.now(),
    team,
    keys: ((await r.json()) as { keys: (JsonWebKey & { kid?: string })[] }).keys ?? [],
  };
  return certs.keys;
}
const b64url = (s: string) =>
  Uint8Array.from(
    atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)),
    (c) => c.charCodeAt(0),
  );

export async function verifyAccess(env: Env, req: Request): Promise<boolean> {
  const team = (env.ACCESS_TEAM_DOMAIN ?? '').trim().replace(/\/+$/, ''),
    aud = (env.ACCESS_AUD ?? '').trim();
  // https only; plain http is accepted for a loopback address alone (the local tests' stand-in for Access).
  if (
    !team ||
    !aud ||
    !(team.startsWith('https://') || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(team))
  )
    return false;
  const token = req.headers.get('cf-access-jwt-assertion') ?? '';
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h))) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(new TextDecoder().decode(b64url(p))) as {
      aud?: string | string[];
      iss?: string;
      exp?: number;
      nbf?: number;
    };
    if (header.alg !== 'RS256') return false;
    const now = Date.now() / 1000;
    if (
      payload.iss !== team ||
      typeof payload.exp !== 'number' ||
      payload.exp < now ||
      (payload.nbf ?? 0) > now + 60
    )
      return false;
    if (!(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(aud)) return false;
    let jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await accessKeys(team, true)).find((k) => k.kid === header.kid); // keys rotate
    if (!jwk) return false;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64url(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
  } catch {
    return false;
  }
}

const allowed = async (env: Env, req: Request) =>
  env.ADMIN_LOCAL === '1' || (await verifyAccess(env, req));
const configured = (env: Env) =>
  env.ADMIN_LOCAL === '1' || (!!env.ACCESS_TEAM_DOMAIN && !!env.ACCESS_AUD);

/** /admin/analytics and /admin/analytics/data. */
export async function admin(env: Env, req: Request, path: string): Promise<Response> {
  if (!configured(env)) return new Response('Not found', { status: 404 });
  if (!(await allowed(env, req))) return new Response('Forbidden', { status: 403 });
  if (req.method !== 'GET') throw new HttpError(405, 'method not allowed');
  const noStore = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
  if (path === '/admin/analytics/data') {
    const days = Number(new URL(req.url).searchParams.get('days') ?? 7) || 7;
    const account = (env.CF_ACCOUNT_ID ?? '').trim(),
      token = (env.CF_ANALYTICS_TOKEN ?? '').trim(),
      dataset = (env.ANALYTICS_DATASET ?? '').trim();
    if (!token || !dataset || (!account && !env.ANALYTICS_SQL_URL))
      return json({ configured: false, days }, 200, noStore);
    const results = await runQueries(
      { url: env.ANALYTICS_SQL_URL || sqlUrl(account), token },
      dataset,
      days,
    );
    return json({ configured: true, days, rate: env.ANALYTICS_RATE ?? '0', results }, 200, noStore);
  }
  if (path === '/admin/analytics' || path === '/admin/analytics/') {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    return new Response(DASHBOARD.replaceAll('__NONCE__', nonce), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        ...noStore,
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        // R11: only our own script and data; nothing user-sent can run.
        'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      },
    });
  }
  return new Response('Not found', { status: 404 });
}

// The page: plain tables and bars, every value placed with textContent (R11: event values come from clients).
const DASHBOARD = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>BlokDust analytics</title>
<style nonce="__NONCE__">
:root { --bg: #1a1f21; --panel: #232a2d; --txt: #fff4d6; --dim: #a9a28f; --bar: #e8524f; --bar2: #2f9aa8; --line: #39454a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--txt); font: 14px/1.4 system-ui, -apple-system, sans-serif; }
header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--line); }
h1 { margin: 0; font-size: 18px; font-weight: 500; letter-spacing: .08em; }
h2 { margin: 0 0 8px; font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; padding: 16px; }
section { background: var(--panel); border-radius: 6px; padding: 14px; min-width: 0; }
section.wide { grid-column: 1 / -1; }
table { width: 100%; border-collapse: collapse; }
td { padding: 3px 4px; border-bottom: 1px solid var(--line); vertical-align: middle; overflow-wrap: anywhere; }
td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; width: 1%; }
td.bar { width: 35%; }
.b { height: 8px; background: var(--bar); border-radius: 2px; min-width: 1px; }
.tiles { display: flex; flex-wrap: wrap; gap: 12px; }
.tile { flex: 1 1 140px; background: var(--bg); border-radius: 4px; padding: 10px; }
.tile .v { font-size: 26px; font-variant-numeric: tabular-nums; }
.tile .l { color: var(--dim); font-size: 12px; }
.chart { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
.chart div { flex: 1; background: var(--bar2); min-height: 1px; border-radius: 2px 2px 0 0; }
#status { padding: 0 16px; }
.note, .err { color: var(--dim); font-size: 12px; }
.err { color: var(--bar); }
select { background: var(--panel); color: var(--txt); border: 1px solid var(--line); border-radius: 4px; padding: 4px 8px; font: inherit; }
</style></head><body>
<header><h1>BLOKDUST ANALYTICS</h1>
<label>Last <select id="days"><option value="1">1 day</option><option value="7" selected>7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label></header>
<p class="note" id="status">Loading…</p>
<main id="main"></main>
<script nonce="__NONCE__">
const main = document.getElementById('main'), status = document.getElementById('status');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = String(text); return e; };
const num = v => Math.round(Number(v) || 0);
const fmt = v => num(v).toLocaleString();
function section(title, wide) { const s = el('section', wide ? 'wide' : ''); s.appendChild(el('h2', '', title)); main.appendChild(s); return s; }
function table(title, res, label, value = 'n') {
  const s = section(title);
  if (!res) return;
  if (res.error) { s.appendChild(el('p', 'err', res.error)); return; }
  if (!res.rows.length) { s.appendChild(el('p', 'note', 'No data yet.')); return; }
  const max = Math.max(...res.rows.map(r => Number(r[value]) || 0), 1), t = el('table');
  for (const r of res.rows) {
    const tr = el('tr'), bar = el('td', 'bar'), b = el('div', 'b');
    b.style.width = (100 * (Number(r[value]) || 0) / max) + '%'; bar.appendChild(b);
    tr.appendChild(el('td', '', label(r) || '(none)')); tr.appendChild(bar); tr.appendChild(el('td', 'num', fmt(r[value])));
    t.appendChild(tr);
  }
  s.appendChild(t);
}
function chart(title, rows, value) {
  const s = section(title, true);
  if (!rows || !rows.length) { s.appendChild(el('p', 'note', 'No data yet.')); return; }
  const max = Math.max(...rows.map(r => Number(r[value]) || 0), 1), c = el('div', 'chart');
  for (const r of rows) { const d = el('div'); d.style.height = (100 * (Number(r[value]) || 0) / max) + '%'; d.title = String(r.day).slice(0, 10) + ': ' + fmt(r[value]); c.appendChild(d); }
  s.appendChild(c);
}
async function load() {
  const days = document.getElementById('days').value;
  status.textContent = 'Loading…'; main.replaceChildren();
  const r = await fetch(location.pathname.replace(/[/]$/, '') + '/data?days=' + encodeURIComponent(days), { credentials: 'same-origin' });
  if (!r.ok) { status.textContent = 'Could not load (' + r.status + ').'; return; }
  const d = await r.json();
  if (!d.configured) { status.textContent = 'Not configured: set ANALYTICS_DATASET, CF_ACCOUNT_ID and the CF_ANALYTICS_TOKEN secret (pnpm bd server secret).'; return; }
  const q = d.results, total = e => num((q.totals.rows || []).find(x => x.event === e)?.n);
  status.textContent = 'Sample rate ' + d.rate + '. Counts are estimates (sampled, unauthenticated). Raw data is kept 3 months.';
  const s = section('Overview', true), tiles = el('div', 'tiles');
  const visitors = (q.visitors.rows || []).reduce((a, x) => a + num(x.visitors), 0);
  for (const [l, v] of [['Sessions', total('session_start')], ['Daily visitors (sum)', visitors], ['Patches created', total('patch_created')],
    ['Shared', total('patch_shared')], ['Saved to file', total('patch_saved')], ['Plugin installs active', num(q.pluginInstalls.rows?.[0]?.installs)]]) {
    const t = el('div', 'tile'); t.appendChild(el('div', 'v', fmt(v))); t.appendChild(el('div', 'l', l)); tiles.appendChild(t);
  }
  s.appendChild(tiles);
  chart('Daily visitors (web)', q.visitors.rows, 'visitors');
  chart('Daily active plugin installs', q.pluginDaily.rows, 'installs');
  table('DAWs (installs)', q.daws, r => r.host + ' ' + r.version, 'installs');
  table('Plugin formats', q.pluginFormats, r => [r.format, r.kind, r.os, r.arch].join(' · '), 'installs');
  table('Blocks added', q.blocks, r => r.type);
  table('Samples loaded', q.samples, r => r.source);
  table('Patches opened from', q.opened, r => r.source);
  table('Where (web, embed…)', q.surfaces, r => r.surface);
  table('Referrers', q.referrers, r => r.referrer);
  table('Embedded on', q.embedHosts, r => r.host);
  table('Countries', q.countries, r => r.country);
  table('OS · browser', q.browsers, r => r.os + ' · ' + r.browser);
  table('Versions', q.versions, r => r.surface + ' ' + r.version);
  table('Problems', q.problems, r => r.event + (r.detail ? ' · ' + r.detail : '') + (num(r.code) ? ' · ' + num(r.code) : ''));
  table('Frame rate', q.perf, r => r.fps + ' fps');
  table('All events', q.totals, r => r.event);
}
document.getElementById('days').addEventListener('change', load);
load().catch(e => { status.textContent = 'Error: ' + e; });
</script></body></html>`;
