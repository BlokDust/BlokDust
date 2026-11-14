// Patch files (CHG-0005, SPEC-PATCH-FORMAT-V2 R10): a `.blokdust` file is a v2 patch as JSON, with its title in
// `meta.title`. The same file opens in the plugin and on the web. Samples stay references (DATA-0005): a file ref the
// machine can't find shows as missing and can be relinked.
import type { Patch, PatchBlock } from './loadPatch.ts';
import { importV1, type V1Composition } from './importV1.ts';

export const PATCH_EXT = 'blokdust';

/** A patch file's text → a v2 patch (v1 save files, `{Composition: […]}`, are imported too), or null. */
export function parsePatchFile(text: string): (Patch & { meta?: { title?: string } }) | null {
  let j: unknown;
  try { j = JSON.parse(text); } catch { return null; }
  if (!j || typeof j !== 'object') return null;
  const o = j as Record<string, unknown>;
  if (Array.isArray(o.Composition)) { try { return importV1(o as unknown as V1Composition).patch; } catch { return null; } }
  if (!Array.isArray(o.blocks)) return null;
  if (o.format !== undefined && o.format !== 'blokdust.patch') return null;
  const blocks = (o.blocks as unknown[]).filter((b): b is PatchBlock => !!b && typeof b === 'object' && typeof (b as PatchBlock).type === 'string');
  return { ...(o as unknown as Patch), blocks };
}

export function patchTitle(p: { meta?: { title?: string } } | null, fallback = ''): string {
  const t = p?.meta?.title;
  return typeof t === 'string' && t.trim() ? t.trim() : fallback;
}

/** A title → a safe file name (no extension): no path or reserved characters, never empty. */
export function fileNameFor(title: string): string {
  const n = title.replace(/[\/\\:*?"<>|\x00-\x1f]/g, '').replace(/^\.+/, '').trim().slice(0, 64);
  return n || 'Untitled';
}

/**
 * Insert (CHG-0005): the incoming blocks keep their layout, centred on grid cell `at`, with ids that don't clash with
 * `taken`. Their refs come along; automation and tempo do not (they belong to the scene being inserted into).
 */
export function insertBlocks(incoming: Patch, taken: Set<string>, at: { x: number; y: number }): { blocks: PatchBlock[]; refs: Record<string, unknown> } {
  const src = incoming.blocks;
  if (!src.length) return { blocks: [], refs: {} };
  const xs = src.map(b => b.x ?? 0), ys = src.map(b => b.y ?? 0);
  const dx = Math.round(at.x - (Math.min(...xs) + Math.max(...xs)) / 2), dy = Math.round(at.y - (Math.min(...ys) + Math.max(...ys)) / 2);
  const used = new Set(taken);
  const blocks = src.map((b, i) => {
    let id = b.id && !used.has(b.id) ? b.id : `b${i + 1}`;
    for (let k = 2; used.has(id); k++) id = `${b.id || 'b'}_${k}`;
    used.add(id);
    return { ...b, id, x: (b.x ?? 0) + dx, y: (b.y ?? 0) + dy, params: structuredClone(b.params ?? {}) };
  });
  // LFO targets ("<block id>:<param key>", AUDIO-0003) follow blocks whose id changed.
  const renamed = new Map(src.map((b, i) => [b.id, blocks[i].id]));
  for (const b of blocks) {
    const t = b.params.target, colon = typeof t === 'string' ? t.lastIndexOf(':') : -1;
    if (typeof t === 'string' && colon > 0 && renamed.has(t.slice(0, colon))) b.params.target = `${renamed.get(t.slice(0, colon))}${t.slice(colon)}`;
  }
  return { blocks, refs: { ...(incoming.refs ?? {}) } };
}
