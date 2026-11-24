// One video frame (SPEC-SHARING-VIDEO-EXPORT R6–R9): the world drawn by the stage's own code (drawWorld.ts) through a
// fixed camera framed on the blocks, then the end card. Works on any 2D context (a canvas or an OffscreenCanvas).
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

/**
 * The fixed camera (R7): every block in `b` (grid units) in view with 2 cells of margin, centred. Blocks are never drawn
 * bigger than a cell of width/14 (a lone block would fill the frame otherwise).
 */
export function cameraFor(
  b: Bounds | null,
  width: number,
  height: number,
  labels: Label[] = [],
): Metrics {
  const r = b ? { ...b } : { x0: -3, y0: -3, x1: 3, y1: 3 };
  for (const l of labels) {
    r.x0 = Math.min(r.x0, l.x);
    r.y0 = Math.min(r.y0, l.y);
    r.x1 = Math.max(r.x1, l.x + Math.max(2, l.text.length * 0.6));
    r.y1 = Math.max(r.y1, l.y);
  }
  const margin = 2,
    w = r.x1 - r.x0 + margin * 2,
    h = r.y1 - r.y0 + margin * 2;
  const grid = Math.min(width / w, height / h, width / 14);
  const unit = grid / UNITS_PER_GRID,
    cx = (r.x0 + r.x1) / 2,
    cy = (r.y0 + r.y1) / 2;
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

/** R6: the stage as the live canvas renderer draws it (Stage.drawLines + drawBlocksAndOverlays), without the UI. */
export function drawWorldFrame(
  ctx: Ctx,
  m: Metrics,
  theme: Theme,
  blocks: Map<number, DrawnBlock>,
  s: WorldSnapshot,
  labels: Label[],
  jitter: number,
): void {
  const c = as2d(ctx);
  c.fillStyle = theme.colors[0];
  c.fillRect(0, 0, m.width, m.height);
  drawConnections(c, m, theme, blocks, s.connections, new Set(s.powered));
  drawBlocks(c, m, theme, blocks.values());
  drawBeams(c, m, theme, s.beams, jitter);
  drawOverlays(c, m, theme, blocks.values());
  drawParticles(c, m, theme, s.particles);
  if (labels.length) drawLabels(c, m, labels, theme.colors[theme.roles.txt], null);
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

/** Fill `text` at (x, y), narrowed to `max` px wide if it is longer (as the Patches panel's heading does). */
function fitText(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
): void {
  const w = c.measureText(text).width;
  if (w <= max) {
    c.fillText(text, x, y);
    return;
  }
  c.save();
  c.translate(x, y);
  c.scale(max / w, 1);
  c.fillText(text, 0, 0);
  c.restore();
}

/**
 * R8: the end card over the last world frame. `t` runs 0 → 1 over its first half second: the world fades to the
 * background colour and the card fades in. v1's type: Dosis 200 for the title, Dosis 400 for the rest.
 */
export function drawEndCard(
  ctx: Ctx,
  width: number,
  height: number,
  theme: Theme,
  card: EndCard,
  t: number,
): void {
  const c = as2d(ctx),
    a = Math.min(1, Math.max(0, t)),
    u = Math.min(width, height) / 475; // v1's phone unit at this width
  c.save();
  c.globalAlpha = a * 0.92;
  c.fillStyle = theme.colors[0];
  c.fillRect(0, 0, width, height);
  c.globalAlpha = a;
  c.fillStyle = theme.colors[theme.roles.txt];
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const max = width - 40 * u,
    lines = card.credits.slice(0, 8);
  let y = height / 2 - (lines.length ? 40 + lines.length * 8 : 0) * u;
  c.font = `200 ${Math.round(36 * u)}px Dosis`;
  fitText(c, card.title.toUpperCase(), width / 2, y, max);
  y += 26 * u;
  c.font = `400 ${Math.round(12 * u)}px Dosis`;
  fitText(c, 'MADE WITH BLOKDUST', width / 2, y, max);
  y += 18 * u;
  fitText(
    c,
    card.link
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toUpperCase(),
    width / 2,
    y,
    max,
  );
  if (lines.length) {
    y += 34 * u;
    c.font = `400 ${Math.round(9 * u)}px Dosis`;
    fitText(c, 'SOUNDS FROM FREESOUND.ORG', width / 2, y, max);
    for (const cr of lines) {
      y += 15 * u;
      fitText(c, `${cr.name} BY ${cr.user} (${cr.license})`.toUpperCase(), width / 2, y, max);
    }
    if (card.credits.length > lines.length) {
      y += 15 * u;
      fitText(c, `AND ${card.credits.length - lines.length} MORE`, width / 2, y, max);
    }
  }
  c.restore();
}

/** A seeded beam jitter per frame (R12): v1 draws a random width each frame; the video must be repeatable. */
export function jitterAt(frame: number): number {
  let s = (Math.imul(frame, 2654435761) + 0x9e3779b9) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
  s ^= s >>> 16;
  return (s >>> 0) / 4294967296;
}
