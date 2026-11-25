// Link-preview images of the stage (SHARING-0002) and the share card (SPEC-SHARING-BACKEND R9).
import type { Theme } from '../generated/palettes.gen.ts';
import { gridToPx, type Metrics } from './metrics.ts';

export interface ThumbnailCaption {
  title: string;
  author?: string | null;
}

interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Blocks' bounding box in canvas px (a block spans about ±2 cells from its anchor, + margin). */
function blocksBox(
  blockAnchors: Iterable<{ x: number; y: number }>,
  metrics: Metrics,
  source: HTMLCanvasElement,
): PixelBox {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const anchor of blockAnchors) {
    const [ax, ay] = gridToPx(metrics, anchor.x - 3, anchor.y - 3),
      [bx, by] = gridToPx(metrics, anchor.x + 3, anchor.y + 3);
    box.x0 = Math.min(box.x0, ax);
    box.y0 = Math.min(box.y0, ay);
    box.x1 = Math.max(box.x1, bx);
    box.y1 = Math.max(box.y1, by);
  }
  if (!Number.isFinite(box.x0)) return { x0: 0, y0: 0, x1: source.width, y1: source.height };
  return box;
}

function canvas2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas context');
  return ctx;
}

/** The stage picture `source` cropped around the blocks to the output's aspect ratio, scaled to
 * width × height. With `caption`, the share card: "TITLE — BY AUTHOR" and "BLOKDUST" in Dosis. */
export function drawThumbnail(
  source: HTMLCanvasElement,
  blockAnchors: Iterable<{ x: number; y: number }>,
  metrics: Metrics,
  theme: Theme,
  size: { width: number; height: number },
  caption?: ThumbnailCaption,
): HTMLCanvasElement {
  const { width, height } = size;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const { x0, y0, x1, y1 } = blocksBox(blockAnchors, metrics, source);
  const aspect = width / height;
  let cropWidth = Math.max(x1 - x0, (y1 - y0) * aspect, source.width * 0.5),
    cropHeight = cropWidth / aspect;
  if (cropWidth > source.width) {
    cropWidth = source.width;
    cropHeight = cropWidth / aspect;
  }
  if (cropHeight > source.height) {
    cropHeight = source.height;
    cropWidth = cropHeight * aspect;
  }
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  const sx = Math.min(Math.max(cx - cropWidth / 2, 0), source.width - cropWidth),
    sy = Math.min(Math.max(cy - cropHeight / 2, 0), source.height - cropHeight);
  const ctx = canvas2d(out);
  ctx.fillStyle = theme.colors[0];
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, cropWidth, cropHeight, 0, 0, width, height);
  if (caption)
    drawCaption(ctx, width, height, theme.colors[theme.roles.txt], caption.title, caption.author);
  return out;
}

/** The share card's caption, sized for 1200 px wide (the chosen mock-up: layout C). */
function drawCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colour: string,
  title: string,
  author?: string | null,
): void {
  const scale = width / 1200,
    size = Math.round(30 * scale),
    margin = Math.round(44 * scale),
    y = height - Math.round(36 * scale);
  ctx.save();
  ctx.fillStyle = colour;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(2 * scale)}px`;
  const font = (weight: number) => `${weight} ${size}px Dosis, Arial, Helvetica, sans-serif`;
  ctx.font = font(200);
  ctx.globalAlpha = 0.55;
  ctx.textAlign = 'right';
  const mark = 'BLOKDUST';
  ctx.fillText(mark, width - margin, y);
  const room = width - 2 * margin - ctx.measureText(mark).width - margin;
  ctx.textAlign = 'left';
  const name = title.trim().toUpperCase(),
    by = author ? ` — BY ${author.toUpperCase()}` : '';
  const fit = (text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text;
    let shortened = text;
    while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > max)
      shortened = shortened.slice(0, -1);
    return `${shortened.trimEnd()}…`;
  };
  if (!name) {
    ctx.restore();
    return;
  } // untitled: the BLOKDUST mark alone
  ctx.font = font(200);
  const byWidth = Math.min(ctx.measureText(by).width, room / 2);
  ctx.font = font(400);
  ctx.globalAlpha = 1;
  const shown = fit(name, room - byWidth);
  ctx.fillText(shown, margin, y);
  if (by) {
    const x = margin + ctx.measureText(shown).width;
    ctx.font = font(200);
    ctx.globalAlpha = 0.7;
    ctx.fillText(fit(by, room - (x - margin)), x, y);
  }
  ctx.restore();
}
