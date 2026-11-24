// MAKE STAGE (owner, 2026-11-14; UI-0012): while blocks are selected, a button puts them inside a new Stage block.
// It sits beside the selection's top (makeStageBox). It looks like the plugin's Dust menu (right-click a slider,
// main.ts): a one-item menu on v1's panel layer, 13 px Dosis, the row lit in a menu colour under the mouse.
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

/** The Dust menu's sizes, css px (main.ts `#dust-menu`): 13 px type, rows padded 5 × 14, the menu 6 above and below. */
const FONT_PX = 13,
  PAD_X = 14,
  ROW_H = 13 + 2 * 5 + 6,
  PAD_Y = 6;
export const makeStageFont = (dpr: number) => `400 ${Math.round(FONT_PX * dpr)}px Dosis`;

function size(ctx: CanvasRenderingContext2D, dpr: number, text: string): { w: number; h: number } {
  ctx.save();
  ctx.font = makeStageFont(dpr);
  ctx.letterSpacing = `${0.05 * FONT_PX * dpr}px`;
  const w = ctx.measureText(text).width + 2 * PAD_X * dpr;
  ctx.restore();
  return { w, h: (ROW_H + 2 * PAD_Y) * dpr };
}

/** Where the button goes, device px. `sel`: the selection's bounds (blocks and labels); `all`: every block is
 * selected; `headerBottom`: where the stage shows from; `top`: the lowest y it may start at (under the corner text);
 * `avoid`: corner text to keep clear of. Beside the selection's top (right, or left with no room on the right); at the
 * stage's top right when every block is selected and some are out of view, or when no place beside it is on screen. */
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
  if (!sel || sel.x1 < 0 || sel.x0 > width || sel.y1 < top || sel.y0 > height) return corner; // none of it on screen
  if (all && (sel.x0 < 0 || sel.x1 > width || sel.y0 < headerBottom || sel.y1 > height))
    return corner;
  let x = sel.x1 + gap;
  if (x + w > width - margin) x = sel.x0 - gap - w;
  if (x < margin) return corner; // no room either side
  const b = { x, y: Math.min(Math.max(sel.y0, top), height - margin - h), w, h };
  for (const a of avoid) if (overlap(a, b)) b.y = a.y + a.h + gap;
  return b;
}

export function drawMakeStage(
  ctx: CanvasRenderingContext2D,
  b: ButtonBox,
  dpr: number,
  unit: number,
  text: string,
  panel: string,
  txt: string,
  lit: string,
  hover: boolean,
): void {
  ctx.save();
  // v1's panel layer (OptionsPanel, Header): palette 2 at 16% reaching 5 units lower, the panel over it at 90%.
  ctx.fillStyle = panel;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(b.x, b.y, b.w, b.h + 5 * unit);
  ctx.globalAlpha = 0.9;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 1;
  if (hover) {
    ctx.fillStyle = lit;
    ctx.fillRect(b.x, b.y + PAD_Y * dpr, b.w, ROW_H * dpr);
  }
  ctx.font = makeStageFont(dpr);
  ctx.letterSpacing = `${0.05 * FONT_PX * dpr}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = txt;
  ctx.fillText(text, b.x + PAD_X * dpr, b.y + (PAD_Y + ROW_H / 2) * dpr);
  ctx.restore();
}

const overlap = (a: ButtonBox, b: ButtonBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const inBox = (b: ButtonBox, x: number, y: number): boolean =>
  x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
