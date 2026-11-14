// MAKE STAGE (owner, 2026-11-14; UI-0012): while several blocks are selected, a button under the header's right end
// puts them inside a new Stage block. Built from v1's MessagePanel button (a Palette[4] bar 30 units tall, its words
// in TxtMid 10 units in, a small triangle under it on hover), drawn on the stage's static canvas over v1's UI.
export interface ButtonBox { x: number; y: number; w: number; h: number }

/** Where the button is, in device px: under the header (ending at `headerBottom`), 20 units in from the right. */
export function makeStageBox(ctx: CanvasRenderingContext2D, width: number, unit: number, headerBottom: number, font: string, text: string): ButtonBox {
  ctx.save(); ctx.font = font;
  const w = ctx.measureText(text).width + 20 * unit;
  ctx.restore();
  return { x: width - 20 * unit - w, y: headerBottom + 20 * unit, w, h: 30 * unit };
}

export function drawMakeStage(ctx: CanvasRenderingContext2D, b: ButtonBox, unit: number, font: string, text: string, fill: string, txt: string, hover: boolean): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (hover) {
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.5 - 10 * unit, b.y + b.h - 1);
    ctx.lineTo(b.x + b.w * 0.5 + 10 * unit, b.y + b.h - 1);
    ctx.lineTo(b.x + b.w * 0.5, b.y + b.h + 10 * unit - 1);
    ctx.closePath(); ctx.fill();
  }
  ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = txt;
  ctx.fillText(text, b.x + 10 * unit, b.y + b.h * 0.5 + 5 * unit);
  ctx.restore();
}

export const inBox = (b: ButtonBox, x: number, y: number): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
