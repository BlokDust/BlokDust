// MAKE STAGE (UI-0012): beside selected blocks, a button puts them in a new Stage block. Looks like
// the plugin's Dust menu: one item on v1's panel layer, 13 px Dosis, lit in a menu colour on hover.
export interface ButtonBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The Dust menu's sizes, css px (`#dust-menu`): 13 px type, rows padded 5 × 14, menu padded 6. */
const FONT_PX = 13,
  PAD_X = 14,
  ROW_H = 13 + 2 * 5 + 6,
  PAD_Y = 6;
export const makeStageFont = (dpr: number) => `400 ${Math.round(FONT_PX * dpr)}px Dosis`;

function size(ctx: CanvasRenderingContext2D, dpr: number, text: string): { w: number; h: number } {
  ctx.save();
  ctx.font = makeStageFont(dpr);
  ctx.letterSpacing = `${0.05 * FONT_PX * dpr}px`;
  const width = ctx.measureText(text).width + 2 * PAD_X * dpr;
  ctx.restore();
  return { w: width, h: (ROW_H + 2 * PAD_Y) * dpr };
}

/** Where the button goes (device px): beside the selection `sel`'s top, right or else left, below
 * `top` and clear of `avoid`; top right if `all` blocks are selected and some are out of view. */
export function makeStageBox(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  unit: number,
  width: number,
  height: number,
  headerBottom: number,
  top: number,
  sel: Rect | null,
  all: boolean,
  avoid: ButtonBox[],
  text: string,
): ButtonBox {
  const { w, h } = size(ctx, dpr, text),
    gap = 8 * unit,
    margin = 20 * unit;
  const corner = { x: width - margin - w, y: top, w, h };
  const noneOnScreen = !sel || sel.x1 < 0 || sel.x0 > width || sel.y1 < top || sel.y0 > height;
  if (noneOnScreen) return corner;
  if (all && (sel.x0 < 0 || sel.x1 > width || sel.y0 < headerBottom || sel.y1 > height))
    return corner;
  let x = sel.x1 + gap;
  if (x + w > width - margin) x = sel.x0 - gap - w;
  if (x < margin) return corner; // no room either side
  const box = { x, y: Math.min(Math.max(sel.y0, top), height - margin - h), w, h };
  for (const avoided of avoid) if (overlap(avoided, box)) box.y = avoided.y + avoided.h + gap;
  return box;
}

export function drawMakeStage(
  ctx: CanvasRenderingContext2D,
  box: ButtonBox,
  dpr: number,
  unit: number,
  text: string,
  panel: string,
  txt: string,
  lit: string,
  hover: boolean,
): void {
  ctx.save();
  // v1's panel layer (OptionsPanel, Header): palette 2 at 16% 5 units lower, the panel over it at
  // 90%.
  ctx.fillStyle = panel;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(box.x, box.y, box.w, box.h + 5 * unit);
  ctx.globalAlpha = 0.9;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 1;
  if (hover) {
    ctx.fillStyle = lit;
    ctx.fillRect(box.x, box.y + PAD_Y * dpr, box.w, ROW_H * dpr);
  }
  ctx.font = makeStageFont(dpr);
  ctx.letterSpacing = `${0.05 * FONT_PX * dpr}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = txt;
  ctx.fillText(text, box.x + PAD_X * dpr, box.y + (PAD_Y + ROW_H / 2) * dpr);
  ctx.restore();
}

const overlap = (a: ButtonBox, b: ButtonBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const inBox = (box: ButtonBox, x: number, y: number): boolean =>
  x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
