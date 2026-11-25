// Labels (CHG-0020, UI-0011): notes on the stage, a line of v1 type after a small drag dot. Not
// blocks: they never connect, collide or sound. Patches keep them in `labels`.
import { gridToPx, type Metrics } from './metrics.ts';

export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
}
/** Text size in v1 units (TxtMid is 10; a label reads a little larger), scaled with the zoom. */
const SIZE = 12;
/** The dot: a diamond (v1's handle shape) this many units tip to centre, and the gap before the
 * text. */
const DOT = 3,
  GAP = 8;

const font = (metrics: Metrics) =>
  `400 ${Math.max(1, Math.round(SIZE * metrics.scaledUnit))}px Dosis`;

/** Every label (device px; under the v1 panels, over the blocks). `hidden`: the one being
 * edited. */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  labels: Iterable<Label>,
  colour: string,
  hidden: string | null,
): void {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.font = font(metrics);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const label of labels) {
    const [x, y] = gridToPx(metrics, label.x, label.y),
      dotSize = DOT * metrics.scaledUnit;
    ctx.beginPath();
    ctx.moveTo(x - dotSize, y);
    ctx.lineTo(x, y - dotSize);
    ctx.lineTo(x + dotSize, y);
    ctx.lineTo(x, y + dotSize);
    ctx.closePath();
    ctx.fill();
    if (label.id !== hidden)
      ctx.fillText(label.text.toUpperCase(), x + GAP * metrics.scaledUnit, y);
  }
  ctx.restore();
}

/** A label's box in device px: the dot and the text, with a margin that is easy to hit. */
export function labelRect(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  label: Label,
): { x: number; y: number; w: number; h: number; textX: number } {
  ctx.save();
  ctx.font = font(metrics);
  const textWidth = ctx.measureText(label.text.toUpperCase()).width;
  ctx.restore();
  const [x, y] = gridToPx(metrics, label.x, label.y),
    unit = metrics.scaledUnit,
    height = Math.max(SIZE * unit * 1.6, 24 * metrics.dpr);
  return {
    x: x - (DOT + 5) * unit,
    y: y - height / 2,
    w: (DOT + 5 + GAP) * unit + textWidth + 4 * unit,
    h: height,
    textX: x + GAP * unit,
  };
}
/** The topmost label under device px (x, y), or null. */
export function labelAt(
  ctx: CanvasRenderingContext2D,
  metrics: Metrics,
  labels: Label[],
  x: number,
  y: number,
): Label | null {
  for (let i = labels.length - 1; i >= 0; i--) {
    const rect = labelRect(ctx, metrics, labels[i]);
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h)
      return labels[i];
  }
  return null;
}
/** CSS font for the edit box, so the text does not jump when editing starts. */
export const labelCssFont = (metrics: Metrics): string =>
  `400 ${Math.max(1, Math.round(SIZE * metrics.scaledUnit)) / metrics.dpr}px Dosis, Arial, Helvetica, sans-serif`;
