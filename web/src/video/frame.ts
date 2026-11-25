// One video frame (SPEC-SHARING-VIDEO-EXPORT R6–R9): the world drawn by the stage code through a
// fixed camera on the blocks, then the end card. Any 2D context (a canvas or an OffscreenCanvas).
import { BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import type { Theme } from '../generated/palettes.gen.ts';
import {
  drawBeams,
  drawBlocks,
  drawConnections,
  drawOverlays,
  drawParticles,
  type DrawnBlock,
  type StageBlock,
} from '../stage/drawWorld.ts';
import { drawLabels, type Label } from '../stage/labels.ts';
import { UNITS_PER_GRID, type Metrics } from '../stage/metrics.ts';
import type { Bounds, WorldSnapshot } from './replay.ts';

export type Shape = 'portrait' | 'square' | 'wide';
/** R9: Instagram/TikTok portrait, square, and 16:9. */
export const SHAPES: Record<Shape, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  wide: { width: 1920, height: 1080 },
};
export const FPS = 30;
/** The end card's length (R8). */
export const END_SECONDS = 3;

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const as2d = (ctx: Ctx) => ctx as CanvasRenderingContext2D;

/** The fixed camera (R7): every block in `bounds` (grid) in view with 2 cells of margin, centred; a
 * cell is at most width/14 (a lone block would fill the frame otherwise). */
export function cameraFor(
  bounds: Bounds | null,
  width: number,
  height: number,
  labels: Label[] = [],
): Metrics {
  const box = bounds ? { ...bounds } : { x0: -3, y0: -3, x1: 3, y1: 3 };
  for (const label of labels) {
    box.x0 = Math.min(box.x0, label.x);
    box.y0 = Math.min(box.y0, label.y);
    box.x1 = Math.max(box.x1, label.x + Math.max(2, label.text.length * 0.6));
    box.y1 = Math.max(box.y1, label.y);
  }
  const margin = 2,
    spanX = box.x1 - box.x0 + margin * 2,
    spanY = box.y1 - box.y0 + margin * 2;
  const grid = Math.min(width / spanX, height / spanY, width / 14);
  const unit = grid / UNITS_PER_GRID,
    cx = (box.x0 + box.x1) / 2,
    cy = (box.y0 + box.y1) / 2;
  return {
    dpr: 1,
    width,
    height,
    unit,
    gridSize: grid,
    scaledUnit: unit,
    scaledGridSize: grid,
    originX: width / 2 - cx * grid,
    originY: height / 2 - cy * grid,
  };
}

/** The outer world's blocks with their manifests, in draw order. */
export function drawnBlocks(blocks: Map<number, StageBlock>): Map<number, DrawnBlock> {
  const out = new Map<number, DrawnBlock>();
  for (const [id, block] of blocks) {
    const def = BLOCKS_BY_ID.get(block.type);
    if (def) out.set(id, { block, def });
  }
  return out;
}

/** R6: the stage as the live canvas renderer draws it (Stage.drawLines + drawBlocksAndOverlays),
 * without the UI. */
export function drawWorldFrame(
  ctx: Ctx,
  metrics: Metrics,
  theme: Theme,
  blocks: Map<number, DrawnBlock>,
  worldSnapshot: WorldSnapshot,
  labels: Label[],
  jitter: number,
): void {
  const canvas2d = as2d(ctx);
  canvas2d.fillStyle = theme.colors[0];
  canvas2d.fillRect(0, 0, metrics.width, metrics.height);
  drawConnections(
    canvas2d,
    metrics,
    theme,
    blocks,
    worldSnapshot.connections,
    new Set(worldSnapshot.powered),
  );
  drawBlocks(canvas2d, metrics, theme, blocks.values());
  drawBeams(canvas2d, metrics, theme, worldSnapshot.beams, jitter);
  drawOverlays(canvas2d, metrics, theme, blocks.values());
  drawParticles(canvas2d, metrics, theme, worldSnapshot.particles);
  if (labels.length) drawLabels(canvas2d, metrics, labels, theme.colors[theme.roles.txt], null);
}

export interface Credit {
  name: string;
  user: string;
  license: string;
}
export interface EndCard {
  title: string;
  link: string;
  credits: Credit[];
}

/** Fill `text` at (x, y), narrowed to `max` px wide if it is longer (as the Patches panel's heading
 * does). */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
): void {
  const textWidth = ctx.measureText(text).width;
  if (textWidth <= max) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(max / textWidth, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** R8: the end card over the last world frame; as `progress` runs 0 → 1 (its first half second) the
 * world fades to the background and the card in. Dosis 200 for the title, 400 for the rest. */
export function drawEndCard(
  ctx: Ctx,
  width: number,
  height: number,
  theme: Theme,
  card: EndCard,
  progress: number,
): void {
  const canvas2d = as2d(ctx),
    alpha = Math.min(1, Math.max(0, progress)),
    unit = Math.min(width, height) / 475; // v1's phone unit at this width
  canvas2d.save();
  canvas2d.globalAlpha = alpha * 0.92;
  canvas2d.fillStyle = theme.colors[0];
  canvas2d.fillRect(0, 0, width, height);
  canvas2d.globalAlpha = alpha;
  canvas2d.fillStyle = theme.colors[theme.roles.txt];
  canvas2d.textAlign = 'center';
  canvas2d.textBaseline = 'alphabetic';
  const max = width - 40 * unit,
    lines = card.credits.slice(0, 8);
  let y = height / 2 - (lines.length ? 40 + lines.length * 8 : 0) * unit;
  canvas2d.font = `200 ${Math.round(36 * unit)}px Dosis`;
  fitText(canvas2d, card.title.toUpperCase(), width / 2, y, max);
  y += 26 * unit;
  canvas2d.font = `400 ${Math.round(12 * unit)}px Dosis`;
  fitText(canvas2d, 'MADE WITH BLOKDUST', width / 2, y, max);
  y += 18 * unit;
  fitText(
    canvas2d,
    card.link
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toUpperCase(),
    width / 2,
    y,
    max,
  );
  if (lines.length) {
    y += 34 * unit;
    canvas2d.font = `400 ${Math.round(9 * unit)}px Dosis`;
    fitText(canvas2d, 'SOUNDS FROM FREESOUND.ORG', width / 2, y, max);
    for (const credit of lines) {
      y += 15 * unit;
      fitText(
        canvas2d,
        `${credit.name} BY ${credit.user} (${credit.license})`.toUpperCase(),
        width / 2,
        y,
        max,
      );
    }
    if (card.credits.length > lines.length) {
      y += 15 * unit;
      fitText(canvas2d, `AND ${card.credits.length - lines.length} MORE`, width / 2, y, max);
    }
  }
  canvas2d.restore();
}

/** A seeded beam jitter per frame (R12): v1 draws a random width each frame; the video must be
 * repeatable. */
export function jitterAt(frame: number): number {
  let hash = (Math.imul(frame, 2654435761) + 0x9e3779b9) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
