// Inside a Stage block (CHG-0021, UI-0009): the inner stage in a window as v1's options panel
// over the dimmed outer stage, its pointer to the block in the margin (on a phone, a strip above).
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

/** The window for a `width` × `height` device-px canvas below `headerBottom`; `block`: the Stage
 * block's centre as shown on the outer stage, so it moves as little as it can. */
export function frameFor(
  width: number,
  height: number,
  unit: number,
  headerBottom: number,
  block: { x: number; y: number },
): InsideFrame {
  const phone = height > width * 1.3;
  if (phone) {
    const x = 8 * unit,
      y = headerBottom + 96 * unit,
      windowWidth = width - 16 * unit,
      windowHeight = height - y - 70 * unit;
    return {
      x,
      y,
      w: windowWidth,
      h: windowHeight,
      blockX: width / 2,
      blockY: headerBottom + 44 * unit,
      closeX: x + windowWidth - 20 * unit,
      closeY: y,
      closeR: 16 * unit,
      phone,
    };
  }
  const x = 100 * unit,
    y = headerBottom + 36 * unit,
    windowWidth = width - x - 22 * unit,
    windowHeight = height - y - 22 * unit;
  return {
    x,
    y,
    w: windowWidth,
    h: windowHeight,
    blockX: 50 * unit,
    blockY: Math.max(y + 60 * unit, Math.min(y + windowHeight - 60 * unit, block.y)),
    closeX: x + windowWidth - 20 * unit,
    closeY: y,
    closeR: 16 * unit,
    phone,
  };
}

/** The window's outline, added to the current path (v1 OptionsPanel.panelDraw: a name tab and a
 * close tab rising 20 units, with 45° sides). */
function windowPath(
  ctx: CanvasRenderingContext2D,
  insideFrame: InsideFrame,
  unit: number,
  nameW: number,
): void {
  const nameLeft = insideFrame.x + 44 * unit,
    right = insideFrame.x + insideFrame.w,
    bottom = insideFrame.y + insideFrame.h;
  ctx.moveTo(insideFrame.x, insideFrame.y);
  ctx.lineTo(nameLeft - 25 * unit, insideFrame.y);
  ctx.lineTo(nameLeft - 5 * unit, insideFrame.y - 20 * unit);
  ctx.lineTo(nameLeft + 5 * unit + nameW, insideFrame.y - 20 * unit);
  ctx.lineTo(nameLeft + 25 * unit + nameW, insideFrame.y);
  ctx.lineTo(right - 40 * unit, insideFrame.y);
  ctx.lineTo(right - 20 * unit, insideFrame.y - 20 * unit);
  ctx.lineTo(right, insideFrame.y);
  ctx.lineTo(right, bottom);
  ctx.lineTo(insideFrame.x, bottom);
  ctx.closePath();
}

/** The frame round the inner stage, drawn after its blocks and before v1's UI. `outer`: the outer
 * stage's picture, the Stage block's centre in it, its layers and grid px; `txt`: text colour. */
export function drawInside(
  ctx: CanvasRenderingContext2D,
  insideFrame: InsideFrame,
  unit: number,
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
  const canvasWidth = ctx.canvas.width,
    canvasHeight = ctx.canvas.height;
  ctx.save();
  ctx.font = font;
  const nameW = ctx.measureText(name).width;
  // Outside the window: the outer stage, moved so its Stage block is at the pointer's tip, dimmed.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  windowPath(ctx, insideFrame, unit, nameW);
  ctx.clip('evenodd');
  const dx = insideFrame.blockX - outer.blockX,
    dy = insideFrame.blockY - outer.blockY;
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(outer.image, dx, dy);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.globalAlpha = 1;
  ctx.restore();
  // The Stage block stays bright: drawn again from its layers, at its size on the outer stage.
  for (const layer of outer.layers) {
    ctx.beginPath();
    layer.points.forEach(([x, y], i) => {
      const px = insideFrame.blockX + x * outer.grid,
        py = insideFrame.blockY + y * outer.grid;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = colors[layer.palette];
    ctx.fill();
  }
  // The pointer from the window to its block (v1's options-panel pointer; down from it on a phone).
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  if (insideFrame.phone) {
    ctx.moveTo(insideFrame.blockX - 22 * unit, insideFrame.y);
    ctx.lineTo(insideFrame.blockX, insideFrame.blockY + 22 * unit);
    ctx.lineTo(insideFrame.blockX + 22 * unit, insideFrame.y);
  } else {
    ctx.moveTo(insideFrame.x, insideFrame.blockY - 30 * unit);
    ctx.lineTo(insideFrame.blockX + 22 * unit, insideFrame.blockY);
    ctx.lineTo(insideFrame.x, insideFrame.blockY + 30 * unit);
  }
  ctx.closePath();
  ctx.fill();
  // The name and close tabs, in the stage's own colour (the window is the inner stage).
  const nameLeft = insideFrame.x + 44 * unit,
    right = insideFrame.x + insideFrame.w;
  ctx.beginPath();
  ctx.moveTo(nameLeft - 25 * unit, insideFrame.y + 1);
  ctx.lineTo(nameLeft - 5 * unit, insideFrame.y - 20 * unit);
  ctx.lineTo(nameLeft + 5 * unit + nameW, insideFrame.y - 20 * unit);
  ctx.lineTo(nameLeft + 25 * unit + nameW, insideFrame.y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(right - 40 * unit, insideFrame.y + 1);
  ctx.lineTo(right - 20 * unit, insideFrame.y - 20 * unit);
  ctx.lineTo(right, insideFrame.y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors[txt];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, nameLeft, insideFrame.y);
  ctx.strokeStyle = colors[txt];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(insideFrame.closeX - 4 * unit, insideFrame.closeY - 4 * unit);
  ctx.lineTo(insideFrame.closeX + 4 * unit, insideFrame.closeY + 4 * unit);
  ctx.moveTo(insideFrame.closeX + 4 * unit, insideFrame.closeY - 4 * unit);
  ctx.lineTo(insideFrame.closeX - 4 * unit, insideFrame.closeY + 4 * unit);
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
