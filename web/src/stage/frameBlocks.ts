// Opening a Stage shows its blocks (owner, 2026-11-14; UI-0012): the view keeps the one saved with the Stage while every
// block is inside the window in it; otherwise it centres the blocks in the window, at the largest of v1's zoom levels
// (no bigger than the saved one) that fits them all. Pure geometry so it can be checked without a browser.
import { UNITS_PER_GRID, ZOOM_SLOTS } from './metrics.ts';

export interface View { x: number; y: number; zoom: number }
/** The canvas (device px), v1's unit, and the window the inner stage shows in (device px). */
export interface Screen { width: number; height: number; unit: number; area: { x: number; y: number; w: number; h: number } }

/** Room kept round the blocks' centres, in v1 units (a block is about two grid cells across, so whole blocks show). */
const MARGIN = 45;

function inArea(points: readonly { x: number; y: number }[], v: View, s: Screen): boolean {
  const g = UNITS_PER_GRID * s.unit * v.zoom, m = MARGIN * s.unit * v.zoom * 0.5, a = s.area;
  return points.every(p => {
    const px = s.width / 2 + v.x * v.zoom * s.unit + p.x * g, py = s.height / 2 + v.y * v.zoom * s.unit + p.y * g;
    return px >= a.x + m && px <= a.x + a.w - m && py >= a.y + m && py <= a.y + a.h - m;
  });
}

/** The view to open a Stage with: `saved` if all of `points` (grid positions) show in it, else one centred on them. */
export function frameBlocks(points: readonly { x: number; y: number }[], saved: View | undefined, s: Screen): View {
  const start = saved && Number.isFinite(saved.zoom) && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : { x: 0, y: 0, zoom: 1 };
  if (!points.length || inArea(points, start, s)) return start;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // In v1 units: the blocks' extent plus a margin, against the window.
  const w = (maxX - minX) * UNITS_PER_GRID + 2 * MARGIN, h = (maxY - minY) * UNITS_PER_GRID + 2 * MARGIN;
  const fits = (z: number) => w * z * s.unit <= s.area.w && h * z * s.unit <= s.area.h;
  const zoom = [...ZOOM_SLOTS].reverse().find(z => z <= start.zoom && fits(z)) ?? ZOOM_SLOTS[0];
  // screen = W/2 + x·zoom·unit + p·15·unit·zoom: put the blocks' middle at the window's middle.
  const dx = s.area.x + s.area.w / 2 - s.width / 2, dy = s.area.y + s.area.h / 2 - s.height / 2;
  return { x: -cx * UNITS_PER_GRID + dx / (zoom * s.unit), y: -cy * UNITS_PER_GRID + dy / (zoom * s.unit), zoom };
}
