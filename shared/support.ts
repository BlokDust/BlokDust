// SPEC-SUPPORT-IN-APP-FEEDBACK-AND-DIAGNOSTIC-REPORTS R2, R3: one allowlist on both sides.
import { BLOCKS } from '../web/src/generated/blocks.gen.ts';
import { isC0Control, replaceChars } from './text.ts';

export const SUPPORT = {
  bodyBytes: 128 * 1024,
  patchBytes: 64 * 1024,
  messageChars: 5000,
  events: 100,
  windowMs: 15 * 60 * 1000,
} as const;
export type DiagnosticKind = 'error' | 'unhandledrejection' | 'console';
export type SupportKind = 'feedback' | 'suggestion' | 'bug' | 'automatic';
export const SUPPORT_KINDS: readonly SupportKind[] = ['feedback', 'suggestion', 'bug', 'automatic'];
export interface Diagnostic {
  at: number;
  kind: DiagnosticKind;
  message: string;
}
export interface SupportPatch {
  format: 'blokdust.patch';
  version: 2;
  seed?: number;
  tempo?: number;
  connectionOrder?: [string, string][];
  blocks: {
    id: string;
    type: string;
    x: number;
    y: number;
    params: Record<string, number | boolean | string>;
  }[];
}
export interface SupportReport {
  /** FEEDBACK's choice (CHG-0041: suggestion, bug; older builds: feedback), or an error report. */
  schema: 1;
  kind: SupportKind;
  message: string;
  email: string;
  version: string;
  build: string;
  system: Record<string, string | number>;
  includeContext?: boolean;
  patch: SupportPatch | null;
  diagnostics: Diagnostic[];
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
/** Tab, newline and carriage return: the control characters text may keep. */
const TEXT_LAYOUT = new Set([0x09, 0x0a, 0x0d]);

/** Diagnostic text only: never logged objects, URLs, file paths or credentials. */
export function diagnosticText(value: unknown): string {
  if (typeof value !== 'string') return '[non-text diagnostic]';
  return replaceChars(
    value
      .slice(0, 4096)
      .replace(/(?:https?:\/\/|file:\/\/|blob:|data:)[^\s<>"']+/gi, '[url]')
      .replace(/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp|private|var|Volumes)\/)[^\s<>"']+/g, '[path]')
      .replace(
        /\b(?:bearer\s+\S+|(?:token|password|secret|authorization|api[_-]?key)\s*[=:]\s*[^\s,;]+)/gi,
        '[credential]',
      )
      .replace(/[^\s<>"']+\.(?:wav|mp3|aiff?|flac|ogg|m4a|caf)\b/gi, '[sample]')
      .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email]'),
    (codePoint) => isC0Control(codePoint) && !TEXT_LAYOUT.has(codePoint),
  ).slice(0, 512);
}
/** Rebuilt from block manifests: no refs, audio, file or device names, or other properties. */
export function supportPatch(value: unknown): SupportPatch {
  const fields = record(value);
  if (fields.format !== 'blokdust.patch' || fields.version !== 2)
    throw new Error('Invalid support patch format');
  if (!Array.isArray(fields.blocks) || fields.blocks.length > 1024)
    throw new Error('Invalid support patch');
  const blocks = fields.blocks.map((value, i) => {
    const b = record(value),
      def = BLOCKS.find((definition) => definition.id === b.type);
    if (!def) throw new Error('Unknown block type');
    const params: Record<string, number | boolean | string> = {};
    const source = record(b.params);
    for (const param of def.params) {
      const paramValue = source[param.key];
      if (finite(paramValue) || typeof paramValue === 'boolean') params[param.key] = paramValue;
      // Text enum controls are harmless; free strings (track, file, device, display names) are out.
      else if (
        typeof paramValue === 'string' &&
        ['waveform', 'wave', 'filterType', 'mode'].includes(param.key) &&
        /^[a-zA-Z0-9_-]{1,32}$/.test(paramValue)
      )
        params[param.key] = paramValue;
      else if (param.key === 'track' && typeof paramValue === 'string')
        params.track = /^freesound:\d{1,12}$/.test(paramValue) ? paramValue : 'file:redacted';
    }
    return {
      id: `b${i + 1}`,
      type: def.id,
      x: finite(b.x) ? b.x : 0,
      y: finite(b.y) ? b.y : 0,
      params,
    };
  });
  const out: SupportPatch = { format: 'blokdust.patch', version: 2, blocks };
  // Release 2.0.1 saves effect connection order. Retain it using only remapped, known block IDs.
  const ids = new Map(fields.blocks.map((value, i) => [record(value).id, `b${i + 1}`]));
  if (Array.isArray(fields.connectionOrder)) {
    const order: [string, string][] = [];
    for (const pair of fields.connectionOrder.slice(0, 4096)) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== 'string' ||
        typeof pair[1] !== 'string'
      )
        continue;
      const a = ids.get(pair[0]),
        b = ids.get(pair[1]);
      if (a && b && a !== b) order.push([a, b]);
    }
    if (order.length) out.connectionOrder = order;
  }
  if (finite(fields.seed)) out.seed = fields.seed;
  if (finite(fields.tempo)) out.tempo = fields.tempo;
  if (new TextEncoder().encode(JSON.stringify(out)).length > SUPPORT.patchBytes)
    throw new Error('Support patch exceeds 64 KB');
  return out;
}
const SYSTEM_TEXT = ['surface', 'os', 'browser', 'format', 'host', 'architecture'] as const;
const SYSTEM_NUMBER = [
  'sampleRate',
  'bufferSize',
  'cores',
  'width',
  'height',
  'pixelRatio',
] as const;
export function supportSystem(value: unknown): Record<string, string | number> {
  const input = record(value),
    out: Record<string, string | number> = {};
  for (const k of SYSTEM_TEXT)
    if (typeof input[k] === 'string') out[k] = diagnosticText(input[k]).slice(0, 160);
  for (const k of SYSTEM_NUMBER)
    if (finite(input[k]) && input[k] >= 0 && input[k] < 1e7) out[k] = input[k];
  return out;
}
export function supportDiagnostics(input: unknown, now = Date.now()): Diagnostic[] {
  if (!Array.isArray(input)) return [];
  return input.slice(-SUPPORT.events).flatMap((value) => {
    const entry = record(value);
    if (
      !finite(entry.at) ||
      entry.at < now - SUPPORT.windowMs ||
      entry.at > now + 60000 ||
      !['error', 'unhandledrejection', 'console'].includes(String(entry.kind))
    )
      return [];
    return [
      { at: entry.at, kind: entry.kind as DiagnosticKind, message: diagnosticText(entry.message) },
    ];
  });
}
