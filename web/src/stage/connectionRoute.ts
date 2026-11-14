// v1 UI/ConnectionLines.UpdateList: a straight run then a 45° diagonal from source to effect (grid units).
export function routeConnection(sx: number, sy: number, tx: number, ty: number): [number, number][] {
  const pts: [number, number][] = [[sx, sy]];
  const dx = tx - sx, dy = ty - sy;
  if (dx > 0) {
    if (dy < 0) {
      if (-dy < dx) pts.push([Math.round(sx + (dx - -dy)), Math.round(sy)]);
      if (-dy > dx) pts.push([Math.round(sx), Math.round(sy - (-dy - dx))]);
    }
    if (dy > 0) {
      if (dy < dx) pts.push([Math.round(sx + (dx - dy)), Math.round(sy)]);
      if (dy > dx) pts.push([Math.round(sx), Math.round(sy + (dy - dx))]);
    }
  }
  if (dx < 0) {
    if (dy < 0) {
      if (dy > dx) pts.push([Math.round(sx - (dy - dx)), Math.round(sy)]);
      if (dy < dx) pts.push([Math.round(sx), Math.round(sy - (dx - dy))]);
    }
    if (dy > 0) {
      if (dy < -dx) pts.push([Math.round(sx - (-dx - dy)), Math.round(sy)]);
      if (dy > -dx) pts.push([Math.round(sx), Math.round(sy + (dy - -dx))]);
    }
  }
  pts.push([tx, ty]);
  return pts;
}
