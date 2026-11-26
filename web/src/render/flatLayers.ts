// Block layers flattened: each keeps only its visible part plus a strip under later layers' inside
// edges, so v1's pixels stay but outer edges lose the anti-aliased hairline of hidden faces.
import type { GeometryLayer } from '../generated/blocks.gen.ts';
import { layerPoints } from './bakeBlock.ts';

type Pt = [number, number];
export interface FlatLayer {
  palette: number;
  paths: Pt[][];
}

/** How far (grid units) a face reaches under a later one along an inside edge: about a device pixel
 * at 1×. */
const UNDER = 0.04;
const EPS = 1e-9;

const area = (polygon: Pt[]) => {
  let a = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i],
      [x2, y2] = polygon[(i + 1) % polygon.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
const ccw = (polygon: Pt[]): Pt[] => (area(polygon) < 0 ? polygon.slice().reverse() : polygon);
const cross = (origin: Pt, a: Pt, b: Pt) =>
  (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);

function inside(pt: Pt, poly: Pt[]): boolean {
  let isInside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < xi + ((pt[1] - yi) * (xj - xi)) / (yj - yi))
      isInside = !isInside;
  }
  return isInside;
}

/** Ear clipping: a simple polygon (either winding) as counter-clockwise triangles. Convex ones stay
 * whole. */
function convexParts(poly: Pt[]): Pt[][] {
  const ordered = ccw(poly);
  if (
    ordered.every(
      (_, i) =>
        cross(ordered[i], ordered[(i + 1) % ordered.length], ordered[(i + 2) % ordered.length]) >=
        -EPS,
    )
  )
    return [ordered];
  const remaining = ordered.slice(),
    out: Pt[][] = [];
  for (let guard = 0; remaining.length > 3 && guard < 1000; guard++) {
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[(i + remaining.length - 1) % remaining.length],
        b = remaining[i],
        pt = remaining[(i + 1) % remaining.length];
      if (cross(a, b, pt) <= EPS) continue;
      if (
        remaining.some(
          (other) =>
            other !== a &&
            other !== b &&
            other !== pt &&
            cross(a, b, other) > EPS &&
            cross(b, pt, other) > EPS &&
            cross(pt, a, other) > EPS,
        )
      )
        continue;
      out.push([a, b, pt]);
      remaining.splice(i, 1);
      break;
    }
  }
  if (remaining.length === 3) out.push(remaining);
  return out;
}

/** Sutherland–Hodgman: `subject` on the left of the directed line a→b (keep = 1) or on its right
 * (keep = -1). */
function clipHalf(subject: Pt[], a: Pt, b: Pt, keep: 1 | -1): Pt[] {
  const out: Pt[] = [],
    side = (pt: Pt) => keep * cross(a, b, pt);
  for (let i = 0; i < subject.length; i++) {
    const pt = subject[i],
      next = subject[(i + 1) % subject.length],
      sp = side(pt),
      sq = side(next);
    if (sp >= -EPS) out.push(pt);
    if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) {
      const fraction = sp / (sp - sq);
      out.push([pt[0] + (next[0] - pt[0]) * fraction, pt[1] + (next[1] - pt[1]) * fraction]);
    }
  }
  return out;
}
const clipConvex = (subject: Pt[], clip: Pt[]): Pt[] =>
  clip.reduce(
    (clipped, a, i) =>
      clipped.length < 3 ? clipped : clipHalf(clipped, a, clip[(i + 1) % clip.length], 1),
    subject,
  );
/** `subject` minus a convex `clip`: disjoint pieces, one per edge of the clip it lies outside. */
function minusConvex(subject: Pt[], clip: Pt[]): Pt[][] {
  const out: Pt[][] = [];
  let rest = subject;
  for (let i = 0; i < clip.length && rest.length >= 3; i++) {
    const a = clip[i],
      b = clip[(i + 1) % clip.length];
    out.push(clipHalf(rest, a, b, -1));
    rest = clipHalf(rest, a, b, 1);
  }
  return out.filter((piece) => piece.length >= 3 && Math.abs(area(piece)) > 1e-7);
}

/** The grid layers flattened (see above); pixel layers (`units: 'unit'`, the stars) are left as
 * drawn. */
function flatten(layers: readonly GeometryLayer[]): (FlatLayer | null)[] {
  const grid = layers.map((layer) => (layer.units === 'unit' ? null : (layer.points as Pt[])));
  return grid.map((own, i) => {
    if (!own) return null;
    // A see-through layer hides nothing.
    const later = grid
      .slice(i + 1)
      .filter((points, k): points is Pt[] => !!points && (layers[i + 1 + k].alpha ?? 1) >= 1);
    let seen: Pt[][] = [ccw(own)];
    for (const laterPoints of later)
      for (const part of convexParts(laterPoints))
        seen = seen.flatMap((piece) => minusConvex(piece, part));
    // Strips: each later layer's edge, where the other side is still the block (not the outside),
    // reached under by UNDER.
    const strips: Pt[][] = [];
    for (const laterPoints of later.map(ccw)) {
      for (let k = 0; k < laterPoints.length; k++) {
        const a = laterPoints[k],
          b = laterPoints[(k + 1) % laterPoints.length],
          len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < EPS) continue;
        const nx = (b[1] - a[1]) / len,
          ny = -(b[0] - a[0]) / len; // outward normal of a counter-clockwise edge
        const pieces = Math.max(1, Math.ceil(len / 0.125)),
          dx = (b[0] - a[0]) / len,
          dy = (b[1] - a[1]) / len;
        const at = (step: number): Pt => [
          a[0] + ((b[0] - a[0]) * step) / pieces,
          a[1] + ((b[1] - a[1]) * step) / pieces,
        ];
        // The runs of the edge with this layer on its other side (overlapped or only touching;
        // never the outside), each one strip.
        for (let start = 0; start < pieces;) {
          const inner = (k: number) => {
            const pt = at(k),
              pieceEnd = at(k + 1);
            return inside(
              [(pt[0] + pieceEnd[0]) / 2 + nx * 0.01, (pt[1] + pieceEnd[1]) / 2 + ny * 0.01],
              own,
            );
          };
          if (!inner(start)) {
            start++;
            continue;
          }
          let end = start + 1;
          while (end < pieces && inner(end)) end++;
          const from = at(start),
            to = at(end);
          start = end;
          // Bevelled at 45° and kept inside the later layer, so it leaves the outer edge at once
          // (at a square corner it would otherwise run along it).
          const strip: Pt[] = [
            from,
            to,
            [to[0] - nx * UNDER - dx * UNDER, to[1] - ny * UNDER - dy * UNDER],
            [from[0] - nx * UNDER + dx * UNDER, from[1] - ny * UNDER + dy * UNDER],
          ];
          for (const part of convexParts(laterPoints)) {
            const clipped = clipConvex(ccw(strip), part);
            if (clipped.length >= 3 && Math.abs(area(clipped)) > 1e-9) strips.push(clipped);
          }
        }
      }
    }
    return { palette: layers[i].palette, paths: [...seen, ...strips].map(ccw) };
  });
}

const cache = new WeakMap<readonly GeometryLayer[], (FlatLayer | null)[]>();
/** A block's layers to draw at full opacity: grid layers flattened, pixel layers as they are (in
 * grid units). */
export function flatLayers(
  layers: readonly GeometryLayer[],
  unitsPerGrid: number,
  starPos?: { x: number; y: number },
): FlatLayer[] {
  let flat = cache.get(layers);
  if (!flat) cache.set(layers, (flat = flatten(layers)));
  return layers.map(
    (layer, i) =>
      flat[i] ?? { palette: layer.palette, paths: [layerPoints(layer, unitsPerGrid, starPos)] },
  );
}
