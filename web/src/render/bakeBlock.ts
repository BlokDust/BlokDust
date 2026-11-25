// Rasterise a block with Canvas2D exactly as v1's BlockSprites does (UI-0005), as a Pixi texture:
// the same path calls at the same sub-pixel position match pixel for pixel (`pnpm bd v1 verify`).
import type { BlockDef, GeometryLayer } from '../generated/blocks.gen.ts';

export interface BakedBlock {
  canvas: HTMLCanvasElement;
  /** Add to floor(origin) to place the canvas so pixels land exactly where v1 draws them. */
  offsetX: number;
  offsetY: number;
}

export interface BakeOptions {
  /** Theme colours (v1 palette, resolved CSS strings). */
  colors: readonly string[];
  /** Device pixels per grid cell (v1 App.ScaledGridSize). */
  gridPx: number;
  /** Fractional part of the block origin in device pixels, so baked edges anti-alias identically to
   * v1. */
  fracX?: number;
  fracY?: number;
  /** Void's per-instance star position (v1 units). */
  starPos?: { x: number; y: number };
}

/** Layer points in grid units (pixel layers are stored in v1 units, optionally anchored to the
 * random star). */
export function layerPoints(
  layer: GeometryLayer,
  unitsPerGrid: number,
  starPos?: { x: number; y: number },
): [number, number][] {
  if (layer.units !== 'unit') return layer.points;
  const ax = layer.anchor === 'randomStar' ? (starPos?.x ?? 0) : 0;
  const ay = layer.anchor === 'randomStar' ? (starPos?.y ?? 0) : 0;
  return layer.points.map(([x, y]) => [(x + ax) / unitsPerGrid, (y + ay) / unitsPerGrid]);
}

interface Poly {
  fill: string;
  alpha?: number;
  points: [number, number][];
} // points in device px relative to origin

/** Rasterise polygons (device px relative to an origin with fractional part fx, fy) exactly like
 * v1's Canvas2D calls. */
function bakePolys(polys: Poly[], fx: number, fy: number): BakedBlock {
  const xs = polys.flatMap((poly) => poly.points.map((point) => point[0])),
    ys = polys.flatMap((poly) => poly.points.map((point) => point[1]));
  const pad = 2;
  const minX = Math.floor(Math.min(...xs) + fx) - pad,
    minY = Math.floor(Math.min(...ys) + fy) - pad;
  const maxX = Math.ceil(Math.max(...xs) + fx) + pad,
    maxY = Math.ceil(Math.max(...ys) + fy) + pad;
  const canvas = document.createElement('canvas');
  canvas.width = maxX - minX;
  canvas.height = maxY - minY;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas context');
  for (const poly of polys) {
    ctx.beginPath();
    poly.points.forEach(([x, y], i) => {
      const px = x + fx - minX,
        py = y + fy - minY;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = poly.fill;
    ctx.globalAlpha = poly.alpha ?? 1;
    ctx.fill();
  }
  return { canvas, offsetX: minX, offsetY: minY };
}

export function bakeBlock(def: BlockDef, opts: BakeOptions): BakedBlock {
  const upg = def.geometry.unitsPerGrid ?? 15;
  return bakePolys(
    def.geometry.layers.map((layer) => ({
      fill: opts.colors[layer.palette],
      points: layerPoints(layer, upg, opts.starPos).map(
        ([x, y]) => [x * opts.gridPx, y * opts.gridPx] as [number, number],
      ),
    })),
    opts.fracX ?? 0,
    opts.fracY ?? 0,
  );
}

/** Screen-scaled block overlays (e.g. Recorder's record button): sized by the *unscaled* grid,
 * drawn after all blocks. */
export function bakeOverlays(
  def: BlockDef,
  state: string,
  opts: { colors: readonly string[]; gridSize: number; fracX?: number; fracY?: number },
): BakedBlock | null {
  const layers = (def.geometry.overlays ?? []).flatMap((overlay) => overlay.states[state] ?? []);
  if (!layers.length) return null;
  return bakePolys(
    layers.map((layer) => ({
      fill: opts.colors[layer.palette],
      alpha: layer.alpha,
      points: layer.points.map(
        ([x, y]) => [x * opts.gridSize, y * opts.gridSize] as [number, number],
      ),
    })),
    opts.fracX ?? 0,
    opts.fracY ?? 0,
  );
}
