// Polygon helpers for the stage: hit tests (grid units) and outlines grown outwards (device px).
export type PolygonPoint = [number, number];

/** Crossing-number test, grid units (same rule as the engine). */
export function pointInPolygon(
  px: number,
  py: number,
  poly: PolygonPoint[],
  originX: number,
  originY: number,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = originX + poly[i][0],
      yi = originY + poly[i][1],
      xj = originX + poly[j][0],
      yj = originY + poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A polygon moved out by `distance` on every side (edges shifted along their outward normals,
 * corners where they meet), so the gap is even. A very sharp corner is capped at 3·distance. */
export function offsetPolygon(points: PolygonPoint[], distance: number): PolygonPoint[] {
  const pointCount = points.length;
  if (pointCount < 3) return points;
  let area = 0;
  for (let i = 0; i < pointCount; i++) {
    const [x0, y0] = points[i],
      [x1, y1] = points[(i + 1) % pointCount];
    area += x0 * y1 - x1 * y0;
  }
  const sign = area > 0 ? 1 : -1; // outward normal side for this winding (screen y points down)
  const normal = (a: PolygonPoint, b: PolygonPoint): PolygonPoint => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      edgeLength = Math.hypot(dx, dy) || 1;
    return [(sign * dy) / edgeLength, (-sign * dx) / edgeLength];
  };
  // Drop repeated points (zero-length edges have no normal).
  const distinct = points.filter((point, i) => {
    const previous = points[(i + pointCount - 1) % pointCount];
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-6;
  });
  const distinctCount = distinct.length;
  return distinct.map((vertex, i): PolygonPoint => {
    const before = distinct[(i + distinctCount - 1) % distinctCount],
      after = distinct[(i + 1) % distinctCount],
      n1 = normal(before, vertex),
      n2 = normal(vertex, after);
    const bx = n1[0] + n2[0],
      by = n1[1] + n2[1],
      dot = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    if (dot < 1e-6) return [vertex[0] + n1[0] * distance, vertex[1] + n1[1] * distance];
    // Miter: v + (n1 + n2)·d / (1 + n1·n2) is d from both shifted edges; capped at 3·d.
    const miterLength = Math.hypot(bx, by),
      scale = Math.min(distance / dot, (3 * distance) / miterLength);
    return [vertex[0] + bx * scale, vertex[1] + by * scale];
  });
}
