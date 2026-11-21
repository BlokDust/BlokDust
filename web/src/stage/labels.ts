// Labels (CHG-0020, UI-0011): notes on the stage. A label is a line of text in v1's type with a small drag dot before
// it. It is not a block: it never connects, collides or sounds. Patches keep them in `labels`.
import { gridToPx, type Metrics } from './metrics.ts';

export interface Label { id: string; text: string; x: number; y: number }
/** Text size in v1 units (TxtMid is 10; a label reads a little larger on the stage), scaled with the zoom. */
const SIZE = 12;
/** The dot: a diamond (v1's handle shape) this many units from tip to centre, and the gap before the text. */
const DOT = 3, GAP = 8;

const font = (m: Metrics) => `400 ${Math.max(1, Math.round(SIZE * m.scaledUnit))}px Dosis`;

/** Draw every label (device px; under the v1 panels, over the blocks). `hidden`: the one being edited in its input. */
export function drawLabels(ctx: CanvasRenderingContext2D, m: Metrics, labels: Iterable<Label>, colour: string, hidden: string | null): void {
  ctx.save();
  ctx.fillStyle = colour; ctx.font = font(m); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const l of labels) {
    const [x, y] = gridToPx(m, l.x, l.y), d = DOT * m.scaledUnit;
    ctx.beginPath(); ctx.moveTo(x - d, y); ctx.lineTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.closePath(); ctx.fill();
    if (l.id !== hidden) ctx.fillText(l.text.toUpperCase(), x + GAP * m.scaledUnit, y);
  }
  ctx.restore();
}

/** A label's box in device px: the dot and the text, with a margin that is easy to hit. */
export function labelRect(ctx: CanvasRenderingContext2D, m: Metrics, l: Label): { x: number; y: number; w: number; h: number; textX: number } {
  ctx.save(); ctx.font = font(m);
  const w = ctx.measureText(l.text.toUpperCase()).width;
  ctx.restore();
  const [x, y] = gridToPx(m, l.x, l.y), u = m.scaledUnit, h = Math.max(SIZE * u * 1.6, 24 * m.dpr);
  return { x: x - (DOT + 5) * u, y: y - h / 2, w: (DOT + 5 + GAP) * u + w + 4 * u, h, textX: x + GAP * u };
}
/** The topmost label under device px (x, y), or null. */
export function labelAt(ctx: CanvasRenderingContext2D, m: Metrics, labels: Label[], x: number, y: number): Label | null {
  for (let i = labels.length - 1; i >= 0; i--) {
    const r = labelRect(ctx, m, labels[i]);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return labels[i];
  }
  return null;
}
/** CSS font for the edit box, so the text does not jump when editing starts. */
export const labelCssFont = (m: Metrics): string => `400 ${Math.max(1, Math.round(SIZE * m.scaledUnit)) / m.dpr}px Dosis, Arial, Helvetica, sans-serif`;
