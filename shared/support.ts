// SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS R2/R3: same allowlist on both sides of the trust boundary.
import { BLOCKS } from '../web/src/generated/blocks.gen.ts';

export const SUPPORT = { bodyBytes: 128 * 1024, patchBytes: 64 * 1024, messageChars: 5000, events: 100, windowMs: 15 * 60 * 1000 } as const;
export type DiagnosticKind = 'error' | 'unhandledrejection' | 'console';
export interface Diagnostic { at: number; kind: DiagnosticKind; message: string }
export interface SupportPatch { format: 'blokdust.patch'; version: 2; seed?: number; tempo?: number;
  connectionOrder?: [string, string][];
  blocks: { id: string; type: string; x: number; y: number; params: Record<string, number | boolean | string> }[] }
export interface SupportReport {
  schema: 1; kind: 'feedback' | 'automatic'; message: string; email: string;
  version: string; build: string; system: Record<string, string | number>;
  includeContext?: boolean; patch: SupportPatch | null; diagnostics: Diagnostic[];
}
export function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
}
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Diagnostic text only: never stringify logged objects, URLs, filesystem paths or credential values. */
export function diagnosticText(v: unknown): string {
  if (typeof v !== 'string') return '[non-text diagnostic]';
  return v.slice(0, 4096)
    .replace(/(?:https?:\/\/|file:\/\/|blob:|data:)[^\s<>"']+/gi, '[url]')
    .replace(/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp|private|var|Volumes)\/)[^\s<>"']+/g, '[path]')
    .replace(/\b(?:bearer\s+\S+|(?:token|password|secret|authorization|api[_-]?key)\s*[=:]\s*[^\s,;]+)/gi, '[credential]')
    .replace(/[^\s<>"']+\.(?:wav|mp3|aiff?|flac|ogg|m4a|caf)\b/gi, '[sample]')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 512);
}
/** Rebuild from block manifests; drop refs, audio, filenames, device names, arbitrary properties and identifiers. */
export function supportPatch(value: unknown): SupportPatch {
  const p = record(value);
  if (p.format !== 'blokdust.patch' || p.version !== 2) throw new Error('Invalid support patch format');
  if (!Array.isArray(p.blocks) || p.blocks.length > 1024) throw new Error('Invalid support patch');
  const blocks = p.blocks.map((value, i) => {
    const b = record(value), def = BLOCKS.find(d => d.id === b.type);
    if (!def) throw new Error('Unknown block type');
    const params: Record<string, number | boolean | string> = {};
    const source = record(b.params);
    for (const param of def.params) {
      const v = source[param.key];
      if (finite(v) || typeof v === 'boolean') params[param.key] = v;
      // Text enum controls are harmless; arbitrary strings (track, filename, device, display metadata) are excluded.
      else if (typeof v === 'string' && ['waveform', 'wave', 'filterType', 'mode'].includes(param.key) && /^[a-zA-Z0-9_-]{1,32}$/.test(v)) params[param.key] = v;
      else if (param.key === 'track' && typeof v === 'string') params.track = /^freesound:\d{1,12}$/.test(v) ? v : 'file:redacted';
    }
    return { id: `b${i + 1}`, type: def.id, x: finite(b.x) ? b.x : 0, y: finite(b.y) ? b.y : 0, params };
  });
  const out: SupportPatch = { format: 'blokdust.patch', version: 2, blocks };
  // Release 2.0.1 saves effect connection order. Retain it using only remapped, known block IDs.
  const ids = new Map(p.blocks.map((value, i) => [record(value).id, `b${i + 1}`]));
  if (Array.isArray(p.connectionOrder)) {
    const order: [string, string][] = [];
    for (const pair of p.connectionOrder.slice(0, 4096)) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') continue;
      const a = ids.get(pair[0]), b = ids.get(pair[1]);
      if (a && b && a !== b) order.push([a, b]);
    }
    if (order.length) out.connectionOrder = order;
  }
  if (finite(p.seed)) out.seed = p.seed;
  if (finite(p.tempo)) out.tempo = p.tempo;
  if (new TextEncoder().encode(JSON.stringify(out)).length > SUPPORT.patchBytes) throw new Error('Support patch exceeds 64 KB');
  return out;
}
const SYSTEM_TEXT = ['surface', 'os', 'browser', 'format', 'host', 'architecture'] as const;
const SYSTEM_NUMBER = ['sampleRate', 'bufferSize', 'cores', 'width', 'height', 'pixelRatio'] as const;
export function supportSystem(v: unknown): Record<string, string | number> {
  const input = record(v), out: Record<string, string | number> = {};
  for (const k of SYSTEM_TEXT) if (typeof input[k] === 'string') out[k] = diagnosticText(input[k]).slice(0, 160);
  for (const k of SYSTEM_NUMBER) if (finite(input[k]) && input[k] >= 0 && input[k] < 1e7) out[k] = input[k];
  return out;
}
export function supportDiagnostics(v: unknown, now = Date.now()): Diagnostic[] {
  if (!Array.isArray(v)) return [];
  return v.slice(-SUPPORT.events).flatMap(value => {
    const e = record(value);
    if (!finite(e.at) || e.at < now - SUPPORT.windowMs || e.at > now + 60000 || !['error', 'unhandledrejection', 'console'].includes(String(e.kind))) return [];
    return [{ at: e.at, kind: e.kind as DiagnosticKind, message: diagnosticText(e.message) }];
  });
}
