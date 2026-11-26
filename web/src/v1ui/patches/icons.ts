// Small v1-style marks the panels draw: the like chevron, the bin, the upload mark.
import { App } from '../shim.ts';

/** The gallery's like control (CHG-0024): v1's triangle-wave icon's first peak as an up chevron
 * (45°, not a star) at (x, y), `s` wide, in v1's 2 px line; liked, in the options colour. */
export function drawUpArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  liked: boolean,
  colour: string,
  on: string,
): void {
  const half = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - half, y + half / 2);
  ctx.lineTo(x, y - half / 2);
  ctx.lineTo(x + half, y + half / 2);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2;
  ctx.strokeStyle = liked ? on : colour;
  ctx.stroke();
  ctx.restore();
}

/** v1's trash can (UI/TrashCan.Draw: a tapering bin with a cross), centred on (x, y). */
export function drawBin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const unit = App.Unit,
    size = scale;
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11 * size * unit, y - 11 * size * unit);
  ctx.lineTo(x + 11 * size * unit, y - 11 * size * unit);
  ctx.lineTo(x + 8 * size * unit, y + 11 * size * unit);
  ctx.lineTo(x - 8 * size * unit, y + 11 * size * unit);
  ctx.closePath();
  ctx.moveTo(x - 4 * size * unit, y - 4 * size * unit);
  ctx.lineTo(x + 4 * size * unit, y + 4 * size * unit);
  ctx.moveTo(x + 4 * size * unit, y - 4 * size * unit);
  ctx.lineTo(x - 4 * size * unit, y + 4 * size * unit);
  ctx.stroke();
}

/** A text button for the user's files (UPLOAD FILE, OPEN FROM YOUR DEVICE), like v1's Randomise:
 * its label over an upload mark (an arrow out of a tray), in v1's 2 px line; hover underlines. */
export function drawUploadLink(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  base: number,
  hover: boolean,
): void {
  const unit = App.Unit,
    txt = App.Palette[App.ThemeManager.Txt],
    text = label.toUpperCase();
  App.FillColor(ctx, txt);
  App.StrokeColor(ctx, txt);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, base);
  ctx.lineWidth = 2;
  if (hover) {
    const textWidth = ctx.measureText(text).width;
    ctx.beginPath();
    ctx.moveTo(cx - textWidth / 2, base + 3 * unit);
    ctx.lineTo(cx + textWidth / 2, base + 3 * unit);
    ctx.stroke();
  }
  drawUploadMark(ctx, cx, base + 7 * unit);
}
/** The upload mark: an arrow (tip at (cx, top)) out of an open tray, 14 × 11 units, 2 px line. */
export function drawUploadMark(ctx: CanvasRenderingContext2D, cx: number, top: number): void {
  const unit = App.Unit,
    txt = App.Palette[App.ThemeManager.Txt];
  App.StrokeColor(ctx, txt);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * unit, top + 5 * unit);
  ctx.lineTo(cx - 7 * unit, top + 11 * unit);
  ctx.lineTo(cx + 7 * unit, top + 11 * unit);
  ctx.lineTo(cx + 7 * unit, top + 5 * unit);
  ctx.moveTo(cx, top + 8 * unit);
  ctx.lineTo(cx, top);
  ctx.moveTo(cx - 3.5 * unit, top + 3.5 * unit);
  ctx.lineTo(cx, top);
  ctx.lineTo(cx + 3.5 * unit, top + 3.5 * unit);
  ctx.stroke();
}
