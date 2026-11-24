// The stage's world, drawn in v1's display-list order (UI-0005): connection lines, blocks, laser beams, overlays,
// particles. The live Stage (Stage.ts) and the video renderer (web/src/video, SPEC-SHARING-VIDEO-EXPORT R6) both draw
// with these, so a video looks exactly like the stage. Device px; `m` places the grid.
import type { BlockDef } from '../generated/blocks.gen.ts';
import type { Theme } from '../generated/palettes.gen.ts';
import { layerPoints } from '../render/bakeBlock.ts';
import { flatLayers } from '../render/flatLayers.ts';
import { routeConnection } from './connectionRoute.ts';
import { gridToPx, type Metrics } from './metrics.ts';

export interface StageBlock {
  id: number;
  type: string;
  x: number;
  y: number;
  starPos?: { x: number; y: number };
}
export interface DrawnBlock {
  block: StageBlock;
  def: BlockDef;
}

// The Gate (CHG-0032) takes power as a source does: its lines run from it, thick while it is powered.
const isSourceKind = (d: BlockDef) =>
  d.kind === 'audio-source' || d.kind === 'power-source' || d.kind === 'gate';

/** v1 ConnectionLines: palette[15], 1 px unpowered then 2 px powered, each line routed source → effect. */
export function drawConnections(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  theme: Theme,
  blocks: ReadonlyMap<number, DrawnBlock>,
  pairs: Uint32Array,
  powered: ReadonlySet<number>,
): void {
  ctx.strokeStyle = theme.colors[15];
  for (const on of [false, true]) {
    ctx.lineWidth = on ? 2 : 1;
    ctx.beginPath();
    for (let i = 0; i < pairs.length; i += 2) {
      let s = blocks.get(pairs[i]),
        t = blocks.get(pairs[i + 1]);
      if (!s || !t) continue;
      if (!isSourceKind(s.def)) [s, t] = [t, s]; // lines run source → effect
      if (powered.has(s.block.id) !== on) continue;
      routeConnection(s.block.x, s.block.y, t.block.x, t.block.y).forEach(([gx, gy], k) => {
        const [px, py] = gridToPx(m, gx, gy);
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
    }
    ctx.stroke();
  }
}

function poly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string,
  alpha = 1,
): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** One fill of several closed paths (a flattened layer: no seams between its pieces). */
function paths(ctx: CanvasRenderingContext2D, ps: [number, number][][], fill: string): void {
  ctx.beginPath();
  for (const pts of ps) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Every block's layers, in the map's order (last drawn on top). `alpha`: v1 draws a pressed block at 50% (each layer
 * as v1 drew it, the ones beneath showing through); at full opacity the layers are flattened (render/flatLayers.ts:
 * no hairline of a hidden face along the outer edge, owner 2026-11-20). */
export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  theme: Theme,
  blocks: Iterable<DrawnBlock>,
  alpha: (id: number) => number = () => 1,
  open: (id: number) => boolean = () => false,
): void {
  for (const { block, def } of blocks) {
    const upg = def.geometry.unitsPerGrid ?? 15,
      a = alpha(block.id);
    // An open Gate draws its open look (SIMULATION-0011): no Void colour, no stars.
    const layers =
      def.geometry.openLayers && open(block.id) ? def.geometry.openLayers : def.geometry.layers;
    if (a >= 1) {
      for (const l of flatLayers(layers, upg, block.starPos))
        paths(
          ctx,
          l.paths.map((ps) => ps.map(([x, y]) => gridToPx(m, block.x + x, block.y + y))),
          theme.colors[l.palette],
        );
      continue;
    }
    for (const l of layers)
      poly(
        ctx,
        layerPoints(l, upg, block.starPos).map(([x, y]) => gridToPx(m, block.x + x, block.y + y)),
        theme.colors[l.palette],
        a,
      );
  }
}

/** v1 LaserBeams.Draw: width 2·unit·(0.8 + jitter·0.5), jitter in [0, 1) (v1: Math.random() every frame). */
export function drawBeams(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  theme: Theme,
  beams: Float32Array,
  jitter: number,
): void {
  if (!beams.length) return;
  ctx.strokeStyle = theme.colors[theme.roles.power];
  ctx.lineWidth = m.scaledUnit * 2 * (0.8 + jitter * 0.5);
  ctx.beginPath();
  for (let i = 0; i < beams.length; i += 4) {
    const [x0, y0] = gridToPx(m, beams[i], beams[i + 1]),
      [x1, y1] = gridToPx(m, beams[i + 2], beams[i + 3]);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
}

/** Manifest overlays in their idle state (e.g. the Recorder's button), unless drawn by live UI instead (`skip`). */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  theme: Theme,
  blocks: Iterable<DrawnBlock>,
  skip: ReadonlySet<string> = new Set(),
): void {
  for (const { block, def } of blocks) {
    const [bx, by] = gridToPx(m, block.x, block.y);
    for (const o of def.geometry.overlays ?? [])
      if (!skip.has(o.name))
        for (const l of o.states.idle ?? [])
          poly(
            ctx,
            l.points.map(
              ([x, y]) => [bx + x * m.gridSize, by + y * m.gridSize] as [number, number],
            ),
            theme.colors[l.palette],
            l.alpha,
          );
  }
}

/** v1 ParticleLayer.Draw: one diamond path per particle, packed [x, y, size]* in grid units. */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  theme: Theme,
  p: Float32Array,
): void {
  if (!p.length) return;
  ctx.fillStyle = theme.colors[theme.roles.power];
  ctx.globalAlpha = 1;
  for (let i = 0; i < p.length; i += 3) {
    const [sx, sy] = gridToPx(m, p[i], p[i + 1]),
      size = p[i + 2] * m.scaledUnit;
    ctx.beginPath();
    ctx.moveTo(sx - size, sy);
    ctx.lineTo(sx, sy - size);
    ctx.lineTo(sx + size, sy);
    ctx.lineTo(sx, sy + size);
    ctx.closePath();
    ctx.fill();
  }
}
