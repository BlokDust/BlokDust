// A block's layers as drawn on the stage (owner, iPad 2026-11-20): v1 paints a base (often the whole outline) and its
// faces on top. Where a face's outer edge lies on the base's edge, anti-aliasing mixes in a quarter of the hidden colour,
// a hairline of the face underneath around the block. Here each grid layer keeps only what is seen of it (it minus the
// layers drawn after it), plus a thin strip reaching under each later layer's edge where this layer lies on the other
// side, so neighbouring faces meet without a gap (v1's faces that only touch had a faint seam of background too). The visible pixels are v1's; only the outer edges lose the hairline.
import type { GeometryLayer } from '../generated/blocks.gen.ts';
import { layerPoints } from './bakeBlock.ts';

type Pt = [number, number];
export interface FlatLayer { palette: number; paths: Pt[][] }

/** How far (grid units) a face reaches under a later one along an inside edge: about a device pixel at 1×. */
const UNDER = 0.04;
const EPS = 1e-9;

const area = (p: Pt[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
const ccw = (p: Pt[]): Pt[] => (area(p) < 0 ? p.slice().reverse() : p);
const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function inside(pt: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < xi + ((pt[1] - yi) * (xj - xi)) / (yj - yi)) c = !c;
  }
  return c;
}

/** Ear clipping: a simple polygon (either winding) as counter-clockwise triangles. Convex ones stay whole. */
function convexParts(poly: Pt[]): Pt[][] {
  const p = ccw(poly);
  if (p.every((_, i) => cross(p[i], p[(i + 1) % p.length], p[(i + 2) % p.length]) >= -EPS)) return [p];
  const v = p.slice(), out: Pt[][] = [];
  for (let guard = 0; v.length > 3 && guard < 1000; guard++) {
    for (let i = 0; i < v.length; i++) {
      const a = v[(i + v.length - 1) % v.length], b = v[i], c = v[(i + 1) % v.length];
      if (cross(a, b, c) <= EPS) continue;
      if (v.some(q => q !== a && q !== b && q !== c && cross(a, b, q) > EPS && cross(b, c, q) > EPS && cross(c, a, q) > EPS)) continue;
      out.push([a, b, c]); v.splice(i, 1); break;
    }
  }
  if (v.length === 3) out.push(v);
  return out;
}

/** Sutherland–Hodgman: `subject` on the left of the directed line a→b (keep = 1) or on its right (keep = -1). */
function clipHalf(subject: Pt[], a: Pt, b: Pt, keep: 1 | -1): Pt[] {
  const out: Pt[] = [], side = (q: Pt) => keep * cross(a, b, q);
  for (let i = 0; i < subject.length; i++) {
    const p = subject[i], q = subject[(i + 1) % subject.length], sp = side(p), sq = side(q);
    if (sp >= -EPS) out.push(p);
    if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
const clipConvex = (subject: Pt[], clip: Pt[]): Pt[] => clip.reduce((s, a, i) => (s.length < 3 ? s : clipHalf(s, a, clip[(i + 1) % clip.length], 1)), subject);
/** `subject` minus a convex `clip`: disjoint pieces, one per edge of the clip it lies outside. */
function minusConvex(subject: Pt[], clip: Pt[]): Pt[][] {
  const out: Pt[][] = [];
  let rest = subject;
  for (let i = 0; i < clip.length && rest.length >= 3; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    out.push(clipHalf(rest, a, b, -1));
    rest = clipHalf(rest, a, b, 1);
  }
  return out.filter(p => p.length >= 3 && Math.abs(area(p)) > 1e-7);
}

/** The grid layers flattened (see above); pixel layers (`units: 'unit'`, the stars) are left as drawn. */
function flatten(layers: readonly GeometryLayer[]): (FlatLayer | null)[] {
  const grid = layers.map(l => (l.units === 'unit' ? null : l.points as Pt[]));
  return grid.map((L, i) => {
    if (!L) return null;
    // A see-through layer hides nothing.
    const later = grid.slice(i + 1).filter((g, k): g is Pt[] => !!g && (layers[i + 1 + k].alpha ?? 1) >= 1);
    let seen: Pt[][] = [ccw(L)];
    for (const T of later) for (const part of convexParts(T)) seen = seen.flatMap(s => minusConvex(s, part));
    // Strips: each later layer's edge, where the other side is still the block (not the outside), reached under by UNDER.
    const strips: Pt[][] = [];
    for (const T of later.map(ccw)) {
      for (let k = 0; k < T.length; k++) {
        const a = T[k], b = T[(k + 1) % T.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < EPS) continue;
        const nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;  // outward normal of a counter-clockwise edge
        const pieces = Math.max(1, Math.ceil(len / 0.125)), dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len;
        const at = (s: number): Pt => [a[0] + ((b[0] - a[0]) * s) / pieces, a[1] + ((b[1] - a[1]) * s) / pieces];
        // The runs of the edge with this layer on its other side (overlapped or only touching; never the outside), each one strip.
        for (let s = 0; s < pieces;) {
          const inner = (k: number) => { const p = at(k), q = at(k + 1); return inside([(p[0] + q[0]) / 2 + nx * 0.01, (p[1] + q[1]) / 2 + ny * 0.01], L); };
          if (!inner(s)) { s++; continue; }
          let e = s + 1;
          while (e < pieces && inner(e)) e++;
          const p = at(s), q = at(e);
          s = e;
          // Bevelled at 45° at its ends and kept inside the later layer, so where an inside edge meets the outer edge the
          // strip leaves it at once (at a square corner it would otherwise run along it).
          const strip: Pt[] = [p, q, [q[0] - nx * UNDER - dx * UNDER, q[1] - ny * UNDER - dy * UNDER], [p[0] - nx * UNDER + dx * UNDER, p[1] - ny * UNDER + dy * UNDER]];
          for (const t of convexParts(T)) {
            const c = clipConvex(ccw(strip), t);
            if (c.length >= 3 && Math.abs(area(c)) > 1e-9) strips.push(c);
          }
        }
      }
    }
    return { palette: layers[i].palette, paths: [...seen, ...strips].map(ccw) };
  });
}

const cache = new WeakMap<readonly GeometryLayer[], (FlatLayer | null)[]>();
/** A block's layers to draw at full opacity: grid layers flattened, pixel layers as they are (in grid units). */
export function flatLayers(layers: readonly GeometryLayer[], unitsPerGrid: number, starPos?: { x: number; y: number }): FlatLayer[] {
  let flat = cache.get(layers);
  if (!flat) cache.set(layers, flat = flatten(layers));
  return layers.map((l, i) => flat![i] ?? { palette: l.palette, paths: [layerPoints(l, unitsPerGrid, starPos)] });
}
