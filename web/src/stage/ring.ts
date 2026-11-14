// The multi-select ring's shape (CHG-0010; owner, 2026-11-12). Normally a block's outline (v1's hit-test shape), but the
// MIDI Keyboard's outline leaves out a corner it draws (v1 MIDIController: (-1,-1) is drawn, outside its Outline), and
// the ring cut through the block. Where an outline misses drawn points, the ring follows the drawn shape's convex hull
// (polygon layers only: the Void's star pixels are decoration). Grid units, relative to the block.
import type { BlockDef } from '../generated/blocks.gen.ts';

type Pt = [number, number];

/** Is `p` inside or on the polygon? */
export function insidePolygon(p: Pt, poly: readonly (readonly number[])[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j], [x2, y2] = poly[i];
    const cross = (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1);
    if (Math.abs(cross) < 1e-9 && p[0] >= Math.min(x1, x2) - 1e-9 && p[0] <= Math.max(x1, x2) + 1e-9
      && p[1] >= Math.min(y1, y2) - 1e-9 && p[1] <= Math.max(y1, y2) + 1e-9) return true;
    if ((y1 > p[1]) !== (y2 > p[1]) && p[0] < ((x2 - x1) * (p[1] - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}

function hull(points: Pt[]): Pt[] {
  const p = [...new Map(points.map(q => [`${q[0]},${q[1]}`, q])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [], upper: Pt[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The points the block draws as polygons (not pixel decorations), in grid units. */
export function drawnPoints(def: BlockDef): Pt[] {
  const upg = def.geometry.unitsPerGrid ?? 15;
  return def.geometry.layers.filter(l => (l as { kind?: string }).kind !== 'pixel')
    .flatMap(l => l.points.map(([x, y]) => ((l as { units?: string }).units === 'unit' ? [x / upg, y / upg] : [x, y]) as Pt));
}

const cache = new Map<string, Pt[]>();
/** The ring's polygon before it is moved outwards. */
export function selectionRing(def: BlockDef): Pt[] {
  let r = cache.get(def.id);
  if (!r) {
    const outline = def.geometry.outline.map(([x, y]) => [x, y] as Pt), drawn = drawnPoints(def);
    r = drawn.every(p => insidePolygon(p, outline)) ? outline : hull([...outline, ...drawn]);
    cache.set(def.id, r);
  }
  return r;
}
