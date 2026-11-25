// Outlines around blocks that v1 did not have: multi-select rings (CHG-0005 task 9), the box
// being dragged, and the Stage block a drag would drop into (CHG-0021). Device px.
import type { Theme } from '../generated/palettes.gen.ts';
import type { DrawnBlock } from './drawWorld.ts';
import { gridToPx, type Metrics } from './metrics.ts';
import { offsetPolygon, type PolygonPoint } from './polygon.ts';
import { selectionRing } from './ring.ts';

export interface PixelRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const SELECTED_RING_GAP_UNITS = 4;
const DROP_TARGET_RING_GAP_UNITS = 6;

/** A block's ring in device px: its selection shape moved out `gapUnits` on every side. */
function ringPoints(entry: DrawnBlock, metrics: Metrics, gapUnits: number): PolygonPoint[] {
  return offsetPolygon(
    selectionRing(entry.def).map(([gx, gy]) =>
      gridToPx(metrics, entry.block.x + gx, entry.block.y + gy),
    ),
    gapUnits * metrics.scaledUnit,
  );
}

function tracePolygon(ctx: CanvasRenderingContext2D, points: PolygonPoint[]): void {
  points.forEach(([x, y], i) => {
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

/** The selected blocks' rings together, or null with nothing selected. */
export function selectedBounds(selected: Iterable<DrawnBlock>, metrics: Metrics): PixelRect | null {
  let bounds: PixelRect | null = null;
  for (const entry of selected) {
    for (const [x, y] of ringPoints(entry, metrics, SELECTED_RING_GAP_UNITS)) {
      if (!bounds) bounds = { x0: x, y0: y, x1: x, y1: y };
      else {
        bounds.x0 = Math.min(bounds.x0, x);
        bounds.y0 = Math.min(bounds.y0, y);
        bounds.x1 = Math.max(bounds.x1, x);
        bounds.y1 = Math.max(bounds.y1, y);
      }
    }
  }
  return bounds;
}

/** Selected blocks ringed and the selection box, dashed in the text colour at half strength. */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  theme: Theme,
  selected: Iterable<DrawnBlock>,
  selectBox: PixelRect | null,
): void {
  ctx.save();
  ctx.strokeStyle = theme.colors[theme.roles.txt];
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([4 * metrics.unit, 3 * metrics.unit]);
  ctx.beginPath();
  for (const entry of selected)
    tracePolygon(ctx, ringPoints(entry, metrics, SELECTED_RING_GAP_UNITS));
  if (selectBox) {
    ctx.rect(
      Math.min(selectBox.x0, selectBox.x1),
      Math.min(selectBox.y0, selectBox.y1),
      Math.abs(selectBox.x1 - selectBox.x0),
      Math.abs(selectBox.y1 - selectBox.y0),
    );
  }
  ctx.stroke();
  ctx.restore();
}

/** The Stage block a drag would go into, ringed solid. */
export function drawDropTarget(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  theme: Theme,
  target: DrawnBlock,
): void {
  ctx.save();
  ctx.strokeStyle = theme.colors[theme.roles.txt];
  ctx.lineWidth = 2;
  ctx.beginPath();
  tracePolygon(ctx, ringPoints(target, metrics, DROP_TARGET_RING_GAP_UNITS));
  ctx.stroke();
  ctx.restore();
}
