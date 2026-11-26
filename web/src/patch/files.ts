// Patch files (CHG-0005, SPEC-PATCH-FORMAT-V2 R10): a `.blokdust` file is v2 patch JSON, titled
// in `meta.title`. Samples stay references (DATA-0005): one this machine lacks shows missing.
import type { Patch, PatchBlock } from './loadPatch.ts';
import { importV1, type V1Composition } from './importV1.ts';

export const PATCH_EXT = 'blokdust';

/** A patch file's text → a v2 patch (v1 save files, `{Composition: […]}`, are imported too), or
 * null. */
export function parsePatchFile(text: string): (Patch & { meta?: { title?: string } }) | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const fields = parsed as Record<string, unknown>;
  if (Array.isArray(fields.Composition)) {
    try {
      return importV1(fields as unknown as V1Composition).patch;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(fields.blocks)) return null;
  if (fields.format !== undefined && fields.format !== 'blokdust.patch') return null;
  const blocks = (fields.blocks as unknown[]).filter(
    (b): b is PatchBlock =>
      !!b && typeof b === 'object' && typeof (b as PatchBlock).type === 'string',
  );
  return { ...(fields as unknown as Patch), blocks };
}

export function patchTitle(patch: { meta?: { title?: string } } | null, fallback = ''): string {
  const title = patch?.meta?.title;
  return typeof title === 'string' && title.trim() ? title.trim() : fallback;
}

const RESERVED_IN_FILE_NAMES = '/\\:*?"<>|';
/** A title → a safe file name (no extension): no path or reserved characters, never empty. */
export function fileNameFor(title: string): string {
  let kept = '';
  for (let i = 0; i < title.length; i++) {
    const char = title.charAt(i);
    if (char.charCodeAt(0) >= 0x20 && !RESERVED_IN_FILE_NAMES.includes(char)) kept += char;
  }
  const safe = kept.replace(/^\.+/, '').trim().slice(0, 64);
  return safe || 'Untitled';
}

/** Insert (CHG-0005): incoming blocks keep their layout, centred on cell `at`, with ids not in
 * `taken`. Refs come along; automation and tempo stay with the scene inserted into. */
export function insertBlocks(
  incoming: Patch,
  taken: Set<string>,
  at: { x: number; y: number },
): {
  blocks: PatchBlock[];
  refs: Record<string, unknown>;
  labels: NonNullable<Patch['labels']>;
  macros: NonNullable<Patch['macros']>;
} {
  const src = incoming.blocks;
  if (!src.length) return { blocks: [], refs: {}, labels: [], macros: [] };
  const xs = src.map((b) => b.x ?? 0),
    ys = src.map((b) => b.y ?? 0);
  const dx = Math.round(at.x - (Math.min(...xs) + Math.max(...xs)) / 2),
    dy = Math.round(at.y - (Math.min(...ys) + Math.max(...ys)) / 2);
  const used = new Set(taken);
  const blocks = src.map((b, i) => {
    let id = b.id && !used.has(b.id) ? b.id : `b${i + 1}`;
    for (let k = 2; used.has(id); k++) id = `${b.id || 'b'}_${k}`;
    used.add(id);
    return {
      ...b,
      id,
      x: (b.x ?? 0) + dx,
      y: (b.y ?? 0) + dy,
      params: structuredClone(b.params ?? {}),
    };
  });
  // LFO targets ("<block id>:<param key>", AUDIO-0003) follow blocks whose id changed.
  const renamed = new Map(src.map((b, i) => [b.id, blocks[i].id]));
  for (const b of blocks) {
    const target = b.params.target,
      colon = typeof target === 'string' ? target.lastIndexOf(':') : -1;
    if (typeof target === 'string' && colon > 0 && renamed.has(target.slice(0, colon)))
      b.params.target = `${renamed.get(target.slice(0, colon))}${target.slice(colon)}`;
  }
  // Labels come along, moved with the blocks (CHG-0020); the scene gives them ids of its own.
  const labels = (incoming.labels ?? []).map((label) => ({
    ...label,
    x: label.x + dx,
    y: label.y + dy,
  }));
  // What is inside Stage blocks comes along too (CHG-0021), under their new ids.
  const macros = (incoming.macros ?? [])
    .filter((macro) => renamed.has(macro.block))
    .flatMap((macro) => {
      const block = renamed.get(macro.block);
      return block === undefined ? [] : [{ ...structuredClone(macro), block }];
    });
  return { blocks, refs: { ...(incoming.refs ?? {}) }, labels, macros };
}
