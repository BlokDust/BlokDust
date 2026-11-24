// The multi-select ring's shape (CHG-0010; owner, 2026-11-12). Normally a block's outline (v1's hit-test shape), but the
// MIDI Keyboard's outline leaves out a corner it draws (v1 MIDIController: (-1,-1) is drawn, outside its Outline), and
// the ring cut through the block. Where an outline misses drawn points, the ring follows the drawn shape's convex hull
// (polygon layers only: the Void's star pixels are decoration). Grid units, relative to the block.
import type { BlockDef } from '../generated/blocks.gen.ts';

type Pt = [number, number];

/** Is `p` inside or on the polygon? */
export function insidePolygon(pt: Pt, poly: readonly (readonly number[])[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j],
      [x2, y2] = poly[i];
    const cross = (x2 - x1) * (pt[1] - y1) - (y2 - y1) * (pt[0] - x1);
    if (
      Math.abs(cross) < 1e-9 &&
      pt[0] >= Math.min(x1, x2) - 1e-9 &&
      pt[0] <= Math.max(x1, x2) + 1e-9 &&
      pt[1] >= Math.min(y1, y2) - 1e-9 &&
      pt[1] <= Math.max(y1, y2) + 1e-9
    )
      return true;
    if (y1 > pt[1] !== y2 > pt[1] && pt[0] < ((x2 - x1) * (pt[1] - y1)) / (y2 - y1) + x1)
      inside = !inside;
  }
  return inside;
}

function hull(points: Pt[]): Pt[] {
  const p = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  );
  if (p.length < 3) return p;
  const cross = (pt: Pt, a: Pt, b: Pt) =>
    (a[0] - pt[0]) * (b[1] - pt[1]) - (a[1] - pt[1]) * (b[0] - pt[0]);
  const lower: Pt[] = [],
    upper: Pt[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, pt) <= 0) lower.pop();
    lower.push(pt);
  }
  for (const pt of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The points the block draws as polygons (not pixel decorations), in grid units. */
export function drawnPoints(def: BlockDef): Pt[] {
  const upg = def.geometry.unitsPerGrid ?? 15;
  return def.geometry.layers
    .filter((layer) => (layer as { kind?: string }).kind !== 'pixel')
    .flatMap((geometryLayer) =>
      geometryLayer.points.map(([x, y]) =>
        (geometryLayer as { units?: string }).units === 'unit' ? [x / upg, y / upg] : [x, y],
      ),
    );
}

const cache = new Map<string, Pt[]>();
/** The ring's polygon before it is moved outwards. */
export function selectionRing(def: BlockDef): Pt[] {
  let r = cache.get(def.id);
  if (!r) {
    const outline = def.geometry.outline.map(([x, y]) => [x, y] as Pt),
      drawn = drawnPoints(def);
    r = drawn.every((pt) => insidePolygon(pt, outline)) ? outline : hull([...outline, ...drawn]);
    cache.set(def.id, r);
  }
  return r;
}
