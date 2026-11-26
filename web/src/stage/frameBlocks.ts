// Opening a Stage shows its blocks (UI-0012): the saved view while every block shows in it, or the
// blocks centred at the largest v1 zoom (up to the saved one) that fits them. Pure geometry.
import { UNITS_PER_GRID, ZOOM_SLOTS } from './metrics.ts';

export interface View {
  x: number;
  y: number;
  zoom: number;
}
/** The canvas (device px), v1's unit, and the window the inner stage shows in (device px). */
export interface Screen {
  width: number;
  height: number;
  unit: number;
  area: { x: number; y: number; w: number; h: number };
}

/** Room kept round the blocks' centres, in v1 units (a block is about two cells across). */
const MARGIN = 45;

function inArea(points: readonly { x: number; y: number }[], view: View, screen: Screen): boolean {
  const gridPx = UNITS_PER_GRID * screen.unit * view.zoom,
    margin = MARGIN * screen.unit * view.zoom * 0.5,
    area = screen.area;
  return points.every((point) => {
    const px = screen.width / 2 + view.x * view.zoom * screen.unit + point.x * gridPx,
      py = screen.height / 2 + view.y * view.zoom * screen.unit + point.y * gridPx;
    return (
      px >= area.x + margin &&
      px <= area.x + area.w - margin &&
      py >= area.y + margin &&
      py <= area.y + area.h - margin
    );
  });
}

/** The view to open a Stage with: `saved` if all `points` show in it, else centred on them. */
export function frameBlocks(
  points: readonly { x: number; y: number }[],
  saved: View | undefined,
  screen: Screen,
): View {
  const start =
    saved && Number.isFinite(saved.zoom) && Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? saved
      : { x: 0, y: 0, zoom: 1 };
  if (!points.length || inArea(points, start, screen)) return start;
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  // In v1 units: the blocks' extent plus a margin, against the window.
  const extentWidth = (maxX - minX) * UNITS_PER_GRID + 2 * MARGIN,
    extentHeight = (maxY - minY) * UNITS_PER_GRID + 2 * MARGIN;
  const fits = (z: number) =>
    extentWidth * z * screen.unit <= screen.area.w &&
    extentHeight * z * screen.unit <= screen.area.h;
  const zoom = [...ZOOM_SLOTS].reverse().find((z) => z <= start.zoom && fits(z)) ?? ZOOM_SLOTS[0];
  // screen = W/2 + x·zoom·unit + p·15·unit·zoom: put the blocks' middle at the window's middle.
  const dx = screen.area.x + screen.area.w / 2 - screen.width / 2,
    dy = screen.area.y + screen.area.h / 2 - screen.height / 2;
  return {
    x: -cx * UNITS_PER_GRID + dx / (zoom * screen.unit),
    y: -cy * UNITS_PER_GRID + dy / (zoom * screen.unit),
    zoom,
  };
}
