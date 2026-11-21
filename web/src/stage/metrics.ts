// v1 stage geometry (app/Metrics.ts), in canvas backing-store (device) pixels.
// unit = min(cssWidth, cssHeight · MAX_ASPECT) / 850 · dpr; grid cell = 15 units; zoom snaps to 0.15 | 0.25 | 0.5 | 1 | 2 | 4; C = canvas centre.
export const ZOOM_SLOTS = [0.15, 0.25, 0.5, 1, 2, 4] as const;  // 0.15: owner, 2026-11-17 (CHG-0035)
export const SCREEN_DIVISION = 850;
export const UNITS_PER_GRID = 15;
/** Widest view shape (width ÷ height) sized from its width, as v1 did. Wider (a plugin above GarageBand's keyboard on
 * an iPad), the height sets the unit so panels and blocks fit (owner, 2026-11-16). The v1 chrome reads App.MaxAspect. */
export const MAX_ASPECT = 2;

export interface MetricsInput { cssWidth: number; cssHeight: number; dpr: number; zoom: number; drag: { x: number; y: number } }
export interface Metrics {
  dpr: number; width: number; height: number;   // device px
  unit: number; gridSize: number; scaledUnit: number; scaledGridSize: number;
  originX: number; originY: number;              // device px of grid (0,0) incl. pan
}

export function computeMetrics(i: MetricsInput): Metrics {
  // v1 Metrics.DeviceCheck: taller-than-wide screens use a smaller screen division (bigger units).
  const division = i.cssHeight > i.cssWidth * 1.3 ? 475 : i.cssHeight > i.cssWidth * 1.1 ? 600 : SCREEN_DIVISION;
  const unit = (Math.min(i.cssWidth, i.cssHeight * MAX_ASPECT) / division) * i.dpr;
  const gridSize = UNITS_PER_GRID * unit;
  const width = i.cssWidth * i.dpr, height = i.cssHeight * i.dpr;
  return {
    dpr: i.dpr, width, height, unit, gridSize,
    scaledUnit: unit * i.zoom, scaledGridSize: gridSize * i.zoom,
    // v1 PointOnGrid: C + ScaledDragOffset·Unit + p·ScaledGridSize, with ScaledDragOffset = DragOffset·Zoom
    originX: width * 0.5 + i.drag.x * i.zoom * unit,
    originY: height * 0.5 + i.drag.y * i.zoom * unit,
  };
}

export const gridToPx = (m: Metrics, gx: number, gy: number): [number, number] => [m.originX + gx * m.scaledGridSize, m.originY + gy * m.scaledGridSize];
export const pxToGrid = (m: Metrics, px: number, py: number): [number, number] => [(px - m.originX) / m.scaledGridSize, (py - m.originY) / m.scaledGridSize];
