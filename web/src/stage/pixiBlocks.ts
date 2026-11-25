// Block sprites for the UI-0005 bake-off renderers ('baked', 'msaa', 'ss2'). The shipping 'canvas'
// renderer draws blocks into the stage canvas instead (drawWorld.ts).
import {
  Graphics,
  RenderTexture,
  Sprite,
  Texture,
  type Application,
  type Container,
} from 'pixi.js';
import type { BlockDef } from '../generated/blocks.gen.ts';
import type { Theme } from '../generated/palettes.gen.ts';
import { bakeBlock, bakeOverlays, layerPoints } from '../render/bakeBlock.ts';
import type { StageBlock } from './drawWorld.ts';
import type { Metrics } from './metrics.ts';

/** UI-0005 bake-off: how block geometry is rasterised. */
export type BlockRenderer = 'baked' | 'msaa' | 'ss2' | 'canvas';

/** A block on the stage with its sprite; `key` names what the sprite's texture was drawn for. */
export interface StageEntry {
  block: StageBlock;
  def: BlockDef;
  sprite: Sprite;
  key: string;
  overlay?: Sprite;
}

/** Where a block's origin lands, device px. */
export interface BlockOrigin {
  ox: number;
  oy: number;
}

function replaceTexture(sprite: Sprite, texture: Texture): void {
  const old = sprite.texture;
  sprite.texture = texture;
  if (old !== Texture.EMPTY) old.destroy(true);
}

/** Renderer 'baked': a Canvas2D-baked sprite at v1's exact sub-pixel origin. */
export function placeBakedBlock(
  entry: StageEntry,
  metrics: Metrics,
  theme: Theme,
  { ox, oy }: BlockOrigin,
): void {
  const fracX = ox - Math.floor(ox),
    fracY = oy - Math.floor(oy);
  const star = entry.block.starPos;
  const key = `${theme.index}|${metrics.scaledGridSize}|${fracX}|${fracY}|${star?.x},${star?.y}`;
  if (key !== entry.key) {
    const baked = bakeBlock(entry.def, {
      colors: theme.colors,
      gridPx: metrics.scaledGridSize,
      fracX,
      fracY,
      starPos: star,
    });
    replaceTexture(entry.sprite, Texture.from(baked.canvas));
    entry.sprite.label = `${baked.offsetX},${baked.offsetY}`;
    entry.key = key;
  }
  const [offX, offY] = entry.sprite.label.split(',').map(Number);
  entry.sprite.scale.set(1 / metrics.dpr);
  entry.sprite.position.set(
    (Math.floor(ox) + offX) / metrics.dpr,
    (Math.floor(oy) + offY) / metrics.dpr,
  );
}

/** The block's idle manifest overlays as their own sprite in `overlayLayer`. */
export function placeOverlay(
  entry: StageEntry,
  metrics: Metrics,
  theme: Theme,
  { ox, oy }: BlockOrigin,
  overlayLayer: Container,
): void {
  if (!entry.def.geometry.overlays?.length) return;
  const baked = bakeOverlays(entry.def, 'idle', {
    colors: theme.colors,
    gridSize: metrics.gridSize,
    fracX: ox - Math.floor(ox),
    fracY: oy - Math.floor(oy),
  });
  if (!baked) return;
  entry.overlay?.destroy({ texture: true });
  const overlay = new Sprite(Texture.from(baked.canvas));
  overlay.scale.set(1 / metrics.dpr);
  overlay.position.set(
    (Math.floor(ox) + baked.offsetX) / metrics.dpr,
    (Math.floor(oy) + baked.offsetY) / metrics.dpr,
  );
  entry.overlay = overlay;
  overlayLayer.addChild(overlay);
}

/** Candidates A (msaa: Pixi Graphics, GPU antialiasing) and B (ss2: Graphics at 2×, downscaled). */
export function placeVectorBlock(
  entry: StageEntry,
  metrics: Metrics,
  theme: Theme,
  { ox, oy }: BlockOrigin,
  renderer: BlockRenderer,
  app: Application,
): void {
  const dpr = metrics.dpr;
  const key = `${renderer}|${theme.index}|${metrics.scaledGridSize}|${ox}|${oy}`;
  if (key === entry.key) return;
  entry.key = key;
  const graphics = new Graphics();
  const unitsPerGrid = entry.def.geometry.unitsPerGrid ?? 15;
  const supersample = renderer === 'ss2' ? 2 : 1;
  for (const geometryLayer of entry.def.geometry.layers) {
    const points = layerPoints(geometryLayer, unitsPerGrid, entry.block.starPos).flatMap(
      ([x, y]) => [
        ((ox + x * metrics.scaledGridSize) / dpr) * supersample,
        ((oy + y * metrics.scaledGridSize) / dpr) * supersample,
      ],
    );
    graphics.poly(points).fill(theme.colors[geometryLayer.palette]);
  }
  const sprite = entry.sprite;
  if (renderer === 'msaa') {
    replaceTexture(sprite, Texture.EMPTY);
    sprite.removeChildren().forEach((containerChild) => {
      containerChild.destroy();
    });
    sprite.position.set(0, 0);
    sprite.scale.set(1);
    sprite.addChild(graphics);
    return;
  }
  const bounds = graphics.getLocalBounds();
  const target = RenderTexture.create({
    width: Math.ceil(bounds.width) + 4,
    height: Math.ceil(bounds.height) + 4,
    resolution: dpr,
    antialias: true,
  });
  graphics.position.set(-Math.floor(bounds.x) + 2, -Math.floor(bounds.y) + 2);
  app.renderer.render({ container: graphics, target });
  graphics.destroy();
  replaceTexture(sprite, target);
  sprite.scale.set(1 / supersample);
  sprite.position.set(
    (Math.floor(bounds.x) - 2) / supersample,
    (Math.floor(bounds.y) - 2) / supersample,
  );
}
