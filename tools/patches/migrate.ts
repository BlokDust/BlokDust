// Patch conversions for block settings that changed shape (SPEC-PATCH-FORMAT-V2; no load-time conversion: patches are
// rewritten where they are stored, once). Pure functions: `pnpm bd patches migrate` applies them to files or to D1.

type Block = { type?: string; params?: Record<string, unknown> };
type Patch = { blocks?: Block[]; macros?: { blocks?: Block[] }[] };

/** Random Note's old scales (engine kScales before CHG-0040): major, minor, dorian, lydian, mixolydian, pentatonic. */
const SCALES = [[0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 9, 10], [0, 2, 4, 6, 7, 9, 11], [0, 2, 4, 5, 7, 9, 10], [0, 2, 4, 7, 9]];
/** Chord's old types (0 fifth, 1 major, 2 minor, 3 sus2, 4 sus4, 5 seventh, 6 major 7th, 7 minor 7th) → the new
 * qualities (0 none, 1 sus2, 2 minor, 3 major, 4 sus4, 5 minor 7th, 6 7th, 7 major 7th). Fifth is gone: major. */
const CHORD_MAP = [3, 3, 2, 1, 4, 6, 7, 5];
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? Number(v) : d);
const has = (p: Record<string, unknown>, ...k: string[]) => k.some(x => x in p);

/** CHG-0040: one block in place; true when it changed. */
export function migrateBlock(b: Block): boolean {
  const p = b.params;
  if (!p || (b.type !== 'fx.random-note' && b.type !== 'fx.chord')) return false;  // no settings: nothing old to convert
  if (b.type === 'fx.random-note') {
    const octaves = (k: string) => k in p && num(p[k], 60) < 24;
    if (!has(p, 'scale') && !octaves('low') && !octaves('high')) return false;  // already new (or all defaults: the same notes)
    const scale = SCALES[Math.max(0, Math.min(5, Math.round(num(p.scale, 0))))];
    for (let i = 0; i < 12; i++) p[`w${i}`] = scale.includes(i) ? 1 : 0;
    p.key = Math.max(0, Math.min(11, Math.round(num(p.key, 0))));
    const low = 60 + 12 * Math.max(-3, Math.min(3, Math.round(num(p.low, 0))));
    const high = 71 + 12 * Math.max(-3, Math.min(3, Math.round(num(p.high, 0))));
    [p.low, p.high] = low > high ? [high - 11, low + 11] : [low, high];
    delete p.scale;
    return true;
  }
  if (b.type === 'fx.chord') {
    // Only blocks that still hold the old settings: a patch leaves settings at their defaults out, so a Chord with no
    // settings may be a new one (an old one with none played a major chord; it now plays the new defaults).
    if (!has(p, 'chord', 'inversion')) return false;
    // The old chord on every note, root position, as it sounded.
    const q = CHORD_MAP[Math.max(0, Math.min(7, Math.round(num(p.chord, 1))))];
    for (let i = 0; i < 12; i++) p[`q${i}`] = q;
    p.key = 0;
    p.smooth = 0;
    delete p.chord; delete p.inversion;
    return true;
  }
  return false;
}

/** Every block of a patch, its Stages' macros too; the number changed. */
export function migratePatch(patch: Patch): number {
  let n = 0;
  for (const b of patch.blocks ?? []) if (migrateBlock(b)) n++;
  for (const m of patch.macros ?? []) for (const b of m.blocks ?? []) if (migrateBlock(b)) n++;
  return n;
}
