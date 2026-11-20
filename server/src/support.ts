import type { Env } from './env.ts';
import { HttpError, json, sha256Hex } from './http.ts';
import { SUPPORT, SUPPORT_KINDS, diagnosticText, record, supportDiagnostics, supportPatch, supportSystem } from '../../shared/support.ts';

const DAY = 86400000;
// Write-only, credential-free endpoint also used by the embedded plugin WebView. No public report lookup/list API.
export const supportHeaders = { 'access-control-allow-origin': '*', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
async function body(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON required');
  if (Number(req.headers.get('content-length')) > SUPPORT.bodyBytes) throw new HttpError(413, 'report too large');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'report required');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const r = await reader.read(); if (r.done) break;
      bytes += r.value.byteLength;
      if (bytes > SUPPORT.bodyBytes) { await reader.cancel(); throw new HttpError(413, 'report too large'); }
      chunks.push(r.value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(bytes); let at = 0;
  for (const chunk of chunks) { all.set(chunk, at); at += chunk.length; }
  try { return record(JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(all))); }
  catch { throw new HttpError(400, 'invalid JSON'); }
}
export async function submitSupport(env: Env, req: Request): Promise<Response> {
  if (!env.SUPPORT_DB || !env.SUPPORT_LIMIT) throw new HttpError(503, 'support is not configured');
  const key = req.headers.get('cf-connecting-ip') ?? 'local';
  if (!(await env.SUPPORT_LIMIT.limit({ key: `support:${key}` })).success) throw new HttpError(429, 'too many reports; try again later');
  const b = await body(req);
  if (b.website) throw new HttpError(400, 'invalid submission'); // honeypot, never stored
  if (b.schema !== 1 || !(SUPPORT_KINDS as readonly string[]).includes(String(b.kind))) throw new HttpError(400, 'unsupported report');
  const automatic = b.kind === 'automatic';
  if (automatic && b.consent !== true) throw new HttpError(400, 'automatic reporting requires consent');
  if (typeof b.message !== 'string' || !b.message.trim() || b.message.length > SUPPORT.messageChars) throw new HttpError(400, 'message must contain 1–5000 characters');
  const email = b.email ?? '';
  if (typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))) throw new HttpError(400, 'invalid email');
  if (typeof b.version !== 'string' || !/^[\w.+-]{1,64}$/.test(b.version) || typeof b.build !== 'string' || !/^[\w.+-]{1,80}$/.test(b.build)) throw new HttpError(400, 'invalid build');
  if (b.includeContext !== undefined && typeof b.includeContext !== 'boolean') throw new HttpError(400, 'invalid context preference');
  const includeContext = b.includeContext !== false;
  let patch = null;
  try { if (includeContext) patch = supportPatch(b.patch); } catch { throw new HttpError(400, 'invalid support patch'); }
  const now = Date.now(), diagnostics = includeContext ? supportDiagnostics(b.diagnostics, now) : [], system = includeContext ? supportSystem(b.system) : {};
  const message = automatic ? diagnosticText(b.message) : b.message.replace(/\u0000/g, '').trim();
  const fingerprint = await sha256Hex(`${b.version}:${system.surface ?? ''}:${diagnostics.at(-1)?.kind ?? ''}:${diagnostics.at(-1)?.message ?? message}`);
  const id = crypto.randomUUID();
  await env.SUPPORT_DB.batch([
    env.SUPPORT_DB.prepare(`INSERT INTO support_reports
      (id, created, kind, topic, message, email, version, build, surface, fingerprint, review_due, expires)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      // FEEDBACK's SUGGESTION and BUG (CHG-0041) are feedback with a topic (the table's kinds stay as they were).
      .bind(id, now, automatic ? 'automatic' : 'feedback', b.kind === 'suggestion' || b.kind === 'bug' ? b.kind : null, message, automatic ? '' : email, b.version, b.build, ['web', 'plugin', 'standalone'].includes(String(system.surface)) ? system.surface : 'unknown', fingerprint, now + 7 * DAY, now + 365 * DAY),
    env.SUPPORT_DB.prepare('INSERT INTO support_context (report_id, system_json, patch_json, diagnostics_json, expires) VALUES (?, ?, ?, ?, ?)')
      .bind(id, JSON.stringify(system), JSON.stringify(patch), JSON.stringify(diagnostics), now + 90 * DAY),
  ]);
  return json({ id }, 201, supportHeaders);
}
/** Daily cron. Also callable directly from local tests; never exposed as a public HTTP action. */
export async function expireSupport(env: Env, now = Date.now()): Promise<void> {
  if (!env.SUPPORT_DB) return;
  await env.SUPPORT_DB.batch([
    env.SUPPORT_DB.prepare('DELETE FROM support_context WHERE expires <= ?').bind(now),
    env.SUPPORT_DB.prepare('DELETE FROM support_reports WHERE expires <= ?').bind(now),
  ]);
}
