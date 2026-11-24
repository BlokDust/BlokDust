// Small v1-style marks the panels draw: the like chevron, the bin, the upload mark.
import { App } from '../shim.ts';

/** The gallery (CHG-0024). */
/** The like control (owner review 3, 2026-11-16: chosen from three; the star didn't read as an up vote and its angles
 * aren't BlokDust's 45°): the first peak of v1's triangle-wave icon (OptionButton "wave", 2) as an open up chevron,
 * centred on x, y, `s` wide, in v1's 2 px line; liked, in the options colour. */
export function drawUpArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  liked: boolean,
  colour: string,
  on: string,
): void {
  const h = s / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - h, y + h / 2);
  ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x + h, y + h / 2);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2;
  ctx.strokeStyle = liked ? on : colour;
  ctx.stroke();
  ctx.restore();
}

/** v1's trash can (UI/TrashCan.Draw: a tapering bin with a cross), at `scale` and centred on (x, y). */
export function drawBin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const unit = App.Unit,
    s = scale;
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11 * s * unit, y - 11 * s * unit);
  ctx.lineTo(x + 11 * s * unit, y - 11 * s * unit);
  ctx.lineTo(x + 8 * s * unit, y + 11 * s * unit);
  ctx.lineTo(x - 8 * s * unit, y + 11 * s * unit);
  ctx.closePath();
  ctx.moveTo(x - 4 * s * unit, y - 4 * s * unit);
  ctx.lineTo(x + 4 * s * unit, y + 4 * s * unit);
  ctx.moveTo(x + 4 * s * unit, y - 4 * s * unit);
  ctx.lineTo(x - 4 * s * unit, y + 4 * s * unit);
  ctx.stroke();
}

/**
 * A text button for the user's files (UPLOAD FILE in the sample panel, OPEN FROM YOUR DEVICE here), like v1's
 * Randomise button: its label (v1 mid type), then the usual upload mark under it (owner, 2026-11-10: an open tray with
 * an arrow out of it), in v1's 2 px line. Hovered, the label is underlined, so it reads as a button.
 */
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
    const w = ctx.measureText(text).width;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, base + 3 * unit);
    ctx.lineTo(cx + w / 2, base + 3 * unit);
    ctx.stroke();
  }
  drawUploadMark(ctx, cx, base + 7 * unit);
}
/** The upload mark: an arrow (its tip at (cx, top)) out of an open tray, 14 × 11 units, in v1's 2 px text-colour line. */
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
