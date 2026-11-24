#pragma once
#include <cstddef>
#include "blokdust/generated/blocks.gen.hpp"

namespace blokdust {

/// Crossing-number point-in-polygon test. Polygon points are relative to (ox, oy). Grid units.
inline bool pointInPolygon(double px, double py, const gen::GridPoint* poly, std::size_t n,
                           double ox, double oy) noexcept {
  bool inside = false;
  for (std::size_t i = 0, j = n - 1; i < n; j = i++) {
    const double xi = ox + poly[i].x, yi = oy + poly[i].y;
    const double xj = ox + poly[j].x, yj = oy + poly[j].y;
    if (((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

/// Smallest t in [0, 1] at which segment P0→P1 is inside polygon (offset by ox, oy): 0 if P0 is
/// inside, else the first edge crossing. Returns false if the segment never touches the polygon.
/// Grid units.
inline bool segmentPolygonFirstHit(double x0, double y0, double x1, double y1,
                                   const gen::GridPoint* poly, std::size_t n, double ox, double oy,
                                   double& tOut) noexcept {
  if (pointInPolygon(x0, y0, poly, n, ox, oy)) {
    tOut = 0.0;
    return true;
  }
  const double dx = x1 - x0, dy = y1 - y0;
  bool hit = false;
  double best = 2.0;
  for (std::size_t i = 0, j = n - 1; i < n; j = i++) {
    const double ax = ox + poly[j].x, ay = oy + poly[j].y, ex = ox + poly[i].x - ax,
                 ey = oy + poly[i].y - ay;
    const double den = dx * ey - dy * ex;
    if (den == 0.0)
      continue;  // parallel
    const double t = ((ax - x0) * ey - (ay - y0) * ex) / den;
    const double u = ((ax - x0) * dy - (ay - y0) * dx) / den;
    if (t >= 0.0 && t <= 1.0 && u >= 0.0 && u <= 1.0 && t < best) {
      best = t;
      hit = true;
    }
  }
  if (hit)
    tOut = best;
  return hit;
}

}  // namespace blokdust
