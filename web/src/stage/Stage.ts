// The BlokDust stage (CHG-0001 task 0.9): layers drawn to match v1 pixel-for-pixel (UI-0005).
// Renderer 'canvas' draws all of it into one opaque canvas in v1's display-list order.
import { Container, Graphics, Sprite, Texture, type Application } from 'pixi.js';
import { BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import type { Theme } from '../generated/palettes.gen.ts';
import { drawV1Chrome } from '../chrome/v1Chrome.ts';
import { computeMetrics, gridToPx, pxToGrid, type Metrics } from './metrics.ts';
import { pointInPolygon } from './polygon.ts';
import {
  placeBakedBlock,
  placeOverlay,
  placeVectorBlock,
  type BlockRenderer,
  type StageEntry,
} from './pixiBlocks.ts';
import {
  drawDropTarget,
  drawSelection,
  selectedBounds,
  type PixelRect,
} from './selectionOutlines.ts';
import { drawThumbnail, type ThumbnailCaption } from './thumbnail.ts';
import {
  drawBeams,
  drawBlocks,
  drawConnections,
  drawOverlays,
  drawParticles,
  type StageBlock,
} from './drawWorld.ts';

export type { BlockRenderer } from './pixiBlocks.ts';
export type { StageBlock } from './drawWorld.ts';

const PRESSED_ALPHA = 0.5;

function copyCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('no 2D canvas context');
  ctx.drawImage(source, 0, 0);
  return out;
}

export class Stage {
  readonly root = new Container();
  zoom = 1;
  drag = { x: 0, y: 0 };
  theme: Theme;
  private readonly app: Application;
  /** The static layer: connection lines, and in renderer 'canvas' everything else. */
  private readonly lineCanvas = document.createElement('canvas');
  private readonly lineSprite: Sprite;
  private readonly lineCtx: CanvasRenderingContext2D;
  private readonly blockLayer = new Container();
  private readonly overlayLayer = new Container();
  /** Pixi diamonds, every frame (bake-off renderers; 'canvas' draws particles under the UI). */
  private readonly particles = new Graphics();
  private readonly blocks = new Map<number, StageEntry>();
  private connections: Uint32Array = new Uint32Array();
  private powered = new Set<number>();
  private beams: Float32Array = new Float32Array();
  private particleData: Float32Array = new Float32Array();
  /** v1 beam width is 2·unit·(0.8 + rand·0.5) each frame; tests pin the random term. */
  beamJitter: number | null = null;
  private linesDirty = true;
  metrics: Metrics;
  readonly renderer: BlockRenderer;
  /** Draws v1's UI layer after the blocks (replaces the closed-state chrome). */
  drawUi: ((ctx: CanvasRenderingContext2D) => void) | null = null;
  /** Draw v1's header, zoom buttons, bin and + icon (needs loadV1Fonts first). */
  chrome = false;
  /** Manifest overlays drawn by live v1 UI instead (RecorderPanel draws 'recordButton'). */
  skipOverlays = new Set<string>();
  /** Block drawn at 50% while pressed and dragged (v1). */
  pressed: number | null = null;
  /** Blocks being placed after an Insert: drawn like a pressed block (CHG-0005). */
  placing = new Set<number>();
  /** Blocks held by other fingers (multi-touch, CHG-0005 task 8): drawn like the pressed block. */
  held = new Set<number>();
  /** Multi-select (CHG-0005 task 9): selected blocks get their outline traced. */
  selected = new Set<number>();
  /** The Stage block a drag would go into if let go now (CHG-0021): ringed solid. */
  dropTarget: number | null = null;
  /** The selection box being dragged, device px. */
  selectBox: PixelRect | null = null;
  /** Gates that are open (CHG-0032): drawn faded, so what passes shows through. */
  private openGates = new Set<number>();

  constructor(app: Application, theme: Theme, renderer: BlockRenderer = 'canvas') {
    this.app = app;
    this.theme = theme;
    this.renderer = renderer;
    // The context gets its final options first: later getContext calls (Pixi's included) reuse it.
    // Opaque in the canvas renderer, like v1's main canvas (Chrome rasterises text differently).
    const lineCtx = this.lineCanvas.getContext('2d', { alpha: renderer !== 'canvas' });
    if (!lineCtx) throw new Error('no 2D canvas context');
    this.lineCtx = lineCtx;
    this.lineSprite = new Sprite(
      renderer === 'canvas' ? Texture.EMPTY : Texture.from(this.lineCanvas),
    );
    if (renderer === 'canvas') this.showStaticCanvasOnPage();
    else this.root.addChild(this.lineSprite, this.blockLayer, this.overlayLayer, this.particles);
    app.stage.addChild(this.root);
    this.metrics = this.measure();
    this.resize();
  }

  /** The static layer on-page behind a transparent Pixi canvas, like v1's one canvas: as a texture
   * Chrome draws text heavier and each change re-uploads it; on-page it matches v1 exactly. */
  private showStaticCanvasOnPage(): void {
    const staticCanvas = this.lineCanvas;
    staticCanvas.style.position = 'absolute';
    staticCanvas.style.left = '0';
    staticCanvas.style.top = '0';
    this.app.canvas.parentElement?.insertBefore(staticCanvas, this.app.canvas);
    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.left = '0';
    this.app.canvas.style.top = '0';
  }

  private measure(): Metrics {
    // app.screen is in CSS px; the renderer resolution is the device pixel ratio (autoDensity).
    const { width, height } = this.app.screen;
    return computeMetrics({
      cssWidth: width,
      cssHeight: height,
      dpr: this.app.renderer.resolution,
      zoom: this.zoom,
      drag: this.drag,
    });
  }

  resize(): void {
    this.metrics = this.measure();
    this.lineCanvas.width = Math.round(this.metrics.width);
    this.lineCanvas.height = Math.round(this.metrics.height);
    this.lineCanvas.style.width = `${this.app.screen.width}px`;
    this.lineCanvas.style.height = `${this.app.screen.height}px`;
    if (this.renderer !== 'canvas')
      this.lineSprite.texture.source.resize(this.lineCanvas.width, this.lineCanvas.height);
    this.lineSprite.scale.set(1 / this.metrics.dpr);
    for (const entry of this.blocks.values()) this.placeBlock(entry);
    this.linesDirty = true;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    // The canvas renderer draws the background in the static layer.
    if (this.renderer !== 'canvas') this.app.renderer.background.color = theme.colors[0];
    this.resize();
  }
  setView(zoom: number, drag: { x: number; y: number }): void {
    this.zoom = zoom;
    this.drag = drag;
    this.resize();
  }

  upsertBlock(block: StageBlock): void {
    const def = BLOCKS_BY_ID.get(block.type);
    if (!def) throw new Error(`unknown block type ${block.type}`);
    let entry = this.blocks.get(block.id);
    if (entry) entry.block = block;
    else {
      const sprite = new Sprite();
      this.blockLayer.addChild(sprite);
      entry = { block, def, sprite, key: '' };
      this.blocks.set(block.id, entry);
    }
    this.placeBlock(entry);
    this.linesDirty = true;
  }

  removeBlock(id: number): void {
    const entry = this.blocks.get(id);
    if (!entry) return;
    entry.sprite.destroy({ texture: true });
    entry.overlay?.destroy({ texture: true });
    this.blocks.delete(id);
    this.linesDirty = true;
  }

  block(id: number): StageBlock | undefined {
    return this.blocks.get(id)?.block;
  }
  /** v1 MainScene.BlockToFront: draw (and hit-test) the block last. */
  toFront(id: number): void {
    const entry = this.blocks.get(id);
    if (!entry) return;
    this.blocks.delete(id);
    this.blocks.set(id, entry);
    this.linesDirty = true;
  }
  allBlocks(): StageBlock[] {
    return [...this.blocks.values()].map((entry) => entry.block);
  }

  /** Topmost block whose outline contains the css-px point (v1 hit order: last created on top). */
  hitTest(cssX: number, cssY: number, skip?: (id: number) => boolean): StageBlock | undefined {
    const [gx, gy] = this.cssToGrid(cssX, cssY);
    const list = [...this.blocks.values()];
    for (let i = list.length - 1; i >= 0; i--) {
      const { block, def } = list[i];
      if (skip?.(block.id)) continue;
      if (pointInPolygon(gx, gy, def.geometry.outline, block.x, block.y)) return block;
    }
    return undefined;
  }

  private selectedEntries(): StageEntry[] {
    return [...this.selected].flatMap((id) => this.blocks.get(id) ?? []);
  }

  /** The selected blocks' dashed rings together (device px), or null with nothing selected. */
  selectedBounds(): PixelRect | null {
    return selectedBounds(this.selectedEntries(), this.metrics);
  }
  cssToGrid(cssX: number, cssY: number): [number, number] {
    return pxToGrid(this.metrics, cssX * this.metrics.dpr, cssY * this.metrics.dpr);
  }

  setConnections(pairs: Uint32Array): void {
    this.connections = pairs;
    this.linesDirty = true;
  }
  setOpenGates(ids: number[]): void {
    if (ids.length !== this.openGates.size || ids.some((id) => !this.openGates.has(id))) {
      this.openGates = new Set(ids);
      this.linesDirty = true;
    }
  }
  setPowered(ids: Uint32Array): void {
    const next = new Set(ids);
    if (next.size !== this.powered.size || [...next].some((id) => !this.powered.has(id))) {
      this.powered = next;
      this.linesDirty = true;
    }
  }

  /** Laser beams packed [x0, y0, x1, y1]* in grid units (drawn between blocks and overlays). */
  setBeams(beams: Float32Array): void {
    // v1 beams flicker: redraw every frame while any is on.
    if (beams.length || this.beams.length) this.linesDirty = true;
    this.beams = beams;
  }

  /** Particles packed [x, y, size]* in grid units. */
  setParticles(samples: Float32Array): void {
    if (this.renderer === 'canvas') {
      // drawn with the static layer (v1 order: …, LaserBeams, Particles, ToolTip, …)
      if (samples.length || this.particleData.length) this.linesDirty = true;
      this.particleData = samples;
      return;
    }
    const graphics = this.particles,
      metrics = this.metrics,
      dpr = metrics.dpr;
    graphics.clear();
    const color = this.theme.colors[this.theme.roles.power];
    for (let i = 0; i < samples.length; i += 3) {
      const [px, py] = gridToPx(metrics, samples[i], samples[i + 1]);
      const size = samples[i + 2] * metrics.scaledUnit;
      graphics.poly([
        (px - size) / dpr,
        py / dpr,
        px / dpr,
        (py - size) / dpr,
        (px + size) / dpr,
        py / dpr,
        px / dpr,
        (py + size) / dpr,
      ]);
    }
    if (samples.length) graphics.fill(color);
  }

  /** Force the static layer to redraw (e.g. after fonts load or the canvas is first shown). */
  redraw(): void {
    this.linesDirty = true;
    this.update();
  }

  /** Call once per frame. */
  update(): void {
    if (this.linesDirty) this.drawLines();
  }

  /** The static layer redrawn without v1's UI layer while `use` reads it. */
  private withoutUi<T>(use: (staticCanvas: HTMLCanvasElement) => T): T {
    const drawUi = this.drawUi;
    this.drawUi = null;
    this.redraw();
    try {
      return use(this.lineCanvas);
    } finally {
      this.drawUi = drawUi;
      this.redraw();
    }
  }

  /** The stage now, without v1's UI layer (behind a Stage block's window, CHG-0021). Device px. */
  snapshot(): HTMLCanvasElement {
    return this.withoutUi(copyCanvas);
  }
  /** A link-preview image of the stage (SHARING-0002) without the UI, cropped around the blocks.
   * Canvas renderer only. With `caption`, the share card (SPEC-SHARING-BACKEND R9). */
  thumbnail(width: number, height: number, caption?: ThumbnailCaption): HTMLCanvasElement {
    return this.withoutUi((staticCanvas) =>
      drawThumbnail(
        staticCanvas,
        [...this.blocks.values()].map((entry) => entry.block),
        this.metrics,
        this.theme,
        { width, height },
        caption,
      ),
    );
  }

  private placeBlock(entry: StageEntry): void {
    if (this.renderer === 'canvas') {
      this.linesDirty = true;
      return;
    }
    const [ox, oy] = gridToPx(this.metrics, entry.block.x, entry.block.y);
    placeOverlay(entry, this.metrics, this.theme, { ox, oy }, this.overlayLayer);
    if (this.renderer === 'baked') placeBakedBlock(entry, this.metrics, this.theme, { ox, oy });
    else placeVectorBlock(entry, this.metrics, this.theme, { ox, oy }, this.renderer, this.app);
  }

  private isPressedLook(id: number): boolean {
    return id === this.pressed || this.placing.has(id) || this.held.has(id);
  }

  /** Renderer 'canvas': blocks then overlays drawn into the opaque stage canvas, as v1 does. */
  private drawBlocksAndOverlays(ctx: CanvasRenderingContext2D): void {
    const metrics = this.metrics;
    // v1 Block.Draw: pressed + selected → 50%
    drawBlocks(
      ctx,
      metrics,
      this.theme,
      this.blocks.values(),
      (id) => (this.isPressedLook(id) ? PRESSED_ALPHA : 1),
      (id) => this.openGates.has(id),
    );
    if (this.selected.size || this.selectBox)
      drawSelection(ctx, metrics, this.theme, this.selectedEntries(), this.selectBox);
    const dropTarget = this.dropTarget === null ? undefined : this.blocks.get(this.dropTarget);
    if (dropTarget) drawDropTarget(ctx, metrics, this.theme, dropTarget);
    // v1 LaserBeams.Draw
    drawBeams(ctx, metrics, this.theme, this.beams, this.beamJitter ?? Math.random());
    drawOverlays(ctx, metrics, this.theme, this.blocks.values(), this.skipOverlays);
    drawParticles(ctx, metrics, this.theme, this.particleData); // v1 ParticleLayer.Draw
    // v1's chrome and panels (web/src/v1ui), drawn after the blocks as in v1's display list
    if (this.drawUi) this.drawUi(ctx);
    else if (this.chrome)
      drawV1Chrome({
        ctx,
        theme: this.theme,
        width: this.lineCanvas.width,
        height: this.lineCanvas.height,
        units: metrics.unit,
        cssWidth: this.app.screen.width,
        cssHeight: this.app.screen.height,
        blockCount: this.blocks.size,
      });
  }

  private drawLines(): void {
    const ctx = this.lineCtx;
    ctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    if (this.renderer === 'canvas') {
      ctx.fillStyle = this.theme.colors[0];
      ctx.fillRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    }
    drawConnections(ctx, this.metrics, this.theme, this.blocks, this.connections, this.powered);
    if (this.renderer === 'canvas') this.drawBlocksAndOverlays(ctx);
    else this.lineSprite.texture.source.update();
    this.linesDirty = false;
  }
}
