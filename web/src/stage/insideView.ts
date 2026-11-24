// The inside of a Stage block (CHG-0021, UI-0009): the inner stage shows in a window shaped like v1's options panel,
// over the outer stage (a dimmed picture of it), with the Stage block itself in the margin and the panel's pointer
// running to it. On a phone the block sits in a strip under the header and the pointer points down from it.
// Everything here is drawn onto the stage's static canvas, after the inner world's blocks and before v1's UI.
export interface InsideFrame {
  /** The window, in device px. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where the Stage block's centre is drawn. */
  blockX: number;
  blockY: number;
  /** The close ×'s hit box. */
  closeX: number;
  closeY: number;
  closeR: number;
  phone: boolean;
}

/** Lay the window out for a canvas of `width` × `height` device px; `unit` is v1's unit, `headerBottom` where the
 * header ends. `block`: the Stage block's centre on the outer stage as it was shown, so it moves as little as it can. */
export function frameFor(
  width: number,
  height: number,
  unit: number,
  headerBottom: number,
  block: { x: number; y: number },
): InsideFrame {
  const u = unit,
    phone = height > width * 1.3;
  if (phone) {
    const x = 8 * u,
      y = headerBottom + 96 * u,
      w = width - 16 * u,
      h = height - y - 70 * u;
    return {
      x,
      y,
      w,
      h,
      blockX: width / 2,
      blockY: headerBottom + 44 * u,
      closeX: x + w - 20 * u,
      closeY: y,
      closeR: 16 * u,
      phone,
    };
  }
  const x = 100 * u,
    y = headerBottom + 36 * u,
    w = width - x - 22 * u,
    h = height - y - 22 * u;
  return {
    x,
    y,
    w,
    h,
    blockX: 50 * u,
    blockY: Math.max(y + 60 * u, Math.min(y + h - 60 * u, block.y)),
    closeX: x + w - 20 * u,
    closeY: y,
    closeR: 16 * u,
    phone,
  };
}

/** The window's outline, added to the current path (v1 OptionsPanel.panelDraw: a name tab and a close tab rising 20
 * units, with 45° sides). */
function windowPath(
  ctx: CanvasRenderingContext2D,
  insideFrame: InsideFrame,
  u: number,
  nameW: number,
): void {
  const m = insideFrame.x + 44 * u,
    r = insideFrame.x + insideFrame.w,
    b = insideFrame.y + insideFrame.h;
  ctx.moveTo(insideFrame.x, insideFrame.y);
  ctx.lineTo(m - 25 * u, insideFrame.y);
  ctx.lineTo(m - 5 * u, insideFrame.y - 20 * u);
  ctx.lineTo(m + 5 * u + nameW, insideFrame.y - 20 * u);
  ctx.lineTo(m + 25 * u + nameW, insideFrame.y);
  ctx.lineTo(r - 40 * u, insideFrame.y);
  ctx.lineTo(r - 20 * u, insideFrame.y - 20 * u);
  ctx.lineTo(r, insideFrame.y);
  ctx.lineTo(r, b);
  ctx.lineTo(insideFrame.x, b);
  ctx.closePath();
}

/**
 * Draw the frame round the inner stage. `outer`: a picture of the outer stage (same size as the canvas), where the
 * Stage block's centre is in it, and the block's layers and grid size in px. `colors`: the theme's; `txt`: its text colour index.
 */
export function drawInside(
  ctx: CanvasRenderingContext2D,
  insideFrame: InsideFrame,
  u: number,
  name: string,
  outer: {
    image: HTMLCanvasElement;
    blockX: number;
    blockY: number;
    layers: { palette: number; points: number[][] }[];
    grid: number;
  },
  colors: string[],
  txt: number,
  font: string,
): void {
  const W = ctx.canvas.width,
    H = ctx.canvas.height;
  ctx.save();
  ctx.font = font;
  const nameW = ctx.measureText(name).width;
  // Everything outside the window: the outer stage, moved so its Stage block is at the pointer's tip, and dimmed.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  windowPath(ctx, insideFrame, u, nameW);
  ctx.clip('evenodd');
  const dx = insideFrame.blockX - outer.blockX,
    dy = insideFrame.blockY - outer.blockY;
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(outer.image, dx, dy);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.restore();
  // The Stage block itself stays bright: drawn again from its layers, at the size it had on the outer stage.
  for (const l of outer.layers) {
    ctx.beginPath();
    l.points.forEach(([x, y], i) => {
      const px = insideFrame.blockX + x * outer.grid,
        py = insideFrame.blockY + y * outer.grid;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = colors[l.palette];
    ctx.fill();
  }
  // The pointer from the window to its block (v1's options-panel pointer; down from the block on a phone).
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  if (insideFrame.phone) {
    ctx.moveTo(insideFrame.blockX - 22 * u, insideFrame.y);
    ctx.lineTo(insideFrame.blockX, insideFrame.blockY + 22 * u);
    ctx.lineTo(insideFrame.blockX + 22 * u, insideFrame.y);
  } else {
    ctx.moveTo(insideFrame.x, insideFrame.blockY - 30 * u);
    ctx.lineTo(insideFrame.blockX + 22 * u, insideFrame.blockY);
    ctx.lineTo(insideFrame.x, insideFrame.blockY + 30 * u);
  }
  ctx.closePath();
  ctx.fill();
  // The name tab and the close tab, in the stage's own colour (the window is the inner stage).
  const m = insideFrame.x + 44 * u,
    r = insideFrame.x + insideFrame.w;
  ctx.beginPath();
  ctx.moveTo(m - 25 * u, insideFrame.y + 1);
  ctx.lineTo(m - 5 * u, insideFrame.y - 20 * u);
  ctx.lineTo(m + 5 * u + nameW, insideFrame.y - 20 * u);
  ctx.lineTo(m + 25 * u + nameW, insideFrame.y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r - 40 * u, insideFrame.y + 1);
  ctx.lineTo(r - 20 * u, insideFrame.y - 20 * u);
  ctx.lineTo(r, insideFrame.y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors[txt];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, m, insideFrame.y);
  ctx.strokeStyle = colors[txt];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(insideFrame.closeX - 4 * u, insideFrame.closeY - 4 * u);
  ctx.lineTo(insideFrame.closeX + 4 * u, insideFrame.closeY + 4 * u);
  ctx.moveTo(insideFrame.closeX + 4 * u, insideFrame.closeY - 4 * u);
  ctx.lineTo(insideFrame.closeX - 4 * u, insideFrame.closeY + 4 * u);
  ctx.stroke();
  ctx.restore();
}

/** Is device px (x, y) inside the window (its body, not the margin)? */
export const inWindow = (insideFrame: InsideFrame, x: number, y: number): boolean =>
  x >= insideFrame.x &&
  x <= insideFrame.x + insideFrame.w &&
  y >= insideFrame.y &&
  y <= insideFrame.y + insideFrame.h;
/** Is it on the close ×? */
export const onClose = (insideFrame: InsideFrame, x: number, y: number): boolean =>
  Math.abs(x - insideFrame.closeX) <= insideFrame.closeR &&
  Math.abs(y - insideFrame.closeY) <= insideFrame.closeR;
