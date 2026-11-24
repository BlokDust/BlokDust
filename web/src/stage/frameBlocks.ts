// Opening a Stage shows its blocks (owner, 2026-11-14; UI-0012): the view keeps the one saved with the Stage while every
// block is inside the window in it; otherwise it centres the blocks in the window, at the largest of v1's zoom levels
// (no bigger than the saved one) that fits them all. Pure geometry so it can be checked without a browser.
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

/** Room kept round the blocks' centres, in v1 units (a block is about two grid cells across, so whole blocks show). */
const MARGIN = 45;

function inArea(
  points: readonly { x: number; y: number }[],
  view: View,
  screenValue: Screen,
): boolean {
  const g = UNITS_PER_GRID * screenValue.unit * view.zoom,
    m = MARGIN * screenValue.unit * view.zoom * 0.5,
    a = screenValue.area;
  return points.every((point) => {
    const px = screenValue.width / 2 + view.x * view.zoom * screenValue.unit + point.x * g,
      py = screenValue.height / 2 + view.y * view.zoom * screenValue.unit + point.y * g;
    return px >= a.x + m && px <= a.x + a.w - m && py >= a.y + m && py <= a.y + a.h - m;
  });
}

/** The view to open a Stage with: `saved` if all of `points` (grid positions) show in it, else one centred on them. */
export function frameBlocks(
  points: readonly { x: number; y: number }[],
  saved: View | undefined,
  screenValue: Screen,
): View {
  const start =
    saved && Number.isFinite(saved.zoom) && Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? saved
      : { x: 0, y: 0, zoom: 1 };
  if (!points.length || inArea(points, start, screenValue)) return start;
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  // In v1 units: the blocks' extent plus a margin, against the window.
  const w = (maxX - minX) * UNITS_PER_GRID + 2 * MARGIN,
    h = (maxY - minY) * UNITS_PER_GRID + 2 * MARGIN;
  const fits = (z: number) =>
    w * z * screenValue.unit <= screenValue.area.w &&
    h * z * screenValue.unit <= screenValue.area.h;
  const zoom = [...ZOOM_SLOTS].reverse().find((z) => z <= start.zoom && fits(z)) ?? ZOOM_SLOTS[0];
  // screen = W/2 + x·zoom·unit + p·15·unit·zoom: put the blocks' middle at the window's middle.
  const dx = screenValue.area.x + screenValue.area.w / 2 - screenValue.width / 2,
    dy = screenValue.area.y + screenValue.area.h / 2 - screenValue.height / 2;
  return {
    x: -cx * UNITS_PER_GRID + dx / (zoom * screenValue.unit),
    y: -cy * UNITS_PER_GRID + dy / (zoom * screenValue.unit),
    zoom,
  };
}
