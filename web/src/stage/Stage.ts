// The BlokDust stage (CHG-0001 task 0.9): Pixi composites layers drawn to match v1 pixel-for-pixel (UI-0005).
//   lines     Canvas2D layer, redrawn on topology/position/power changes (v1 ConnectionLines: palette[15], 1 px / 2 px)
//             (renderer 'canvas': this one opaque Canvas2D layer also holds background, blocks and overlays, in v1 order)
//   blocks    Canvas2D-baked sprites at v1's exact sub-pixel origin
//   particles Pixi Graphics diamonds (palette power role), every frame; renderer 'canvas' draws them into the static
//             layer instead, in v1's display-list order (under the UI: menus and panels cover them)
import { selectionRing } from './ring.ts';
import { Container, Graphics, RenderTexture, Sprite, Texture, type Application } from 'pixi.js';
import { BLOCKS_BY_ID, type BlockDef } from '../generated/blocks.gen.ts';
import type { Theme } from '../generated/palettes.gen.ts';
import { bakeBlock, bakeOverlays, layerPoints } from '../render/bakeBlock.ts';
import { routeConnection } from './connectionRoute.ts';
import { computeMetrics, gridToPx, pxToGrid, type Metrics } from './metrics.ts';
import { drawV1Chrome } from '../chrome/v1Chrome.ts';

/** UI-0005 bake-off: how block geometry is rasterised. */
export type BlockRenderer = 'baked' | 'msaa' | 'ss2' | 'canvas';

export interface StageBlock { id: number; type: string; x: number; y: number; starPos?: { x: number; y: number } }

const isSourceKind = (d: BlockDef) => d.kind === 'audio-source' || d.kind === 'power-source';

/** Crossing-number test, grid units (same rule as the engine). */
function pointInPolygon(px: number, py: number, poly: [number, number][], ox: number, oy: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = ox + poly[i][0], yi = oy + poly[i][1], xj = ox + poly[j][0], yj = oy + poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class Stage {
  readonly root = new Container();
  zoom = 1;
  drag = { x: 0, y: 0 };
  theme: Theme;
  private readonly app: Application;
  private readonly lineCanvas = document.createElement('canvas');
  private readonly lineSprite: Sprite;
  private readonly lineCtx: CanvasRenderingContext2D;
  private readonly blockLayer = new Container();
  private readonly overlayLayer = new Container();
  private readonly particles = new Graphics();
  private readonly blocks = new Map<number, { block: StageBlock; def: BlockDef; sprite: Sprite; key: string; overlay?: Sprite }>();
  private connections: Uint32Array = new Uint32Array();
  private powered = new Set<number>();
  private beams: Float32Array = new Float32Array();
  private particleData: Float32Array = new Float32Array();
  /** v1 draws beams with width 2·unit·(0.8 + rand·0.5) each frame; tests pin the random term (v1 captures pin it too). */
  beamJitter: number | null = null;
  private linesDirty = true;
  metrics!: Metrics;
  readonly renderer: BlockRenderer;
  /** Draw v1's header, zoom buttons, bin and + icon into the stage canvas (needs loadV1Fonts first). */
  /** Draws v1's UI layer onto the static canvas after the blocks (set by the app; replaces the closed-state chrome). */
  drawUi: ((ctx: CanvasRenderingContext2D) => void) | null = null;
  chrome = false;
  /** Manifest overlays drawn by live v1 UI instead (the app's ported RecorderPanel draws 'recordButton' with its
   * hover and recording states; the visual harness keeps the baked idle overlay). */
  skipOverlays = new Set<string>();

  constructor(app: Application, theme: Theme, renderer: BlockRenderer = 'canvas') {
    this.app = app;
    this.theme = theme;
    this.renderer = renderer;
    // Create the 2D context first, with its final options: later getContext calls (Pixi's Texture.from included) return
    // the existing context. Opaque in the canvas renderer, like v1's main canvas (Chrome rasterises text differently).
    this.lineCtx = this.lineCanvas.getContext('2d', { alpha: renderer !== 'canvas' })!;
    this.lineSprite = new Sprite(renderer === 'canvas' ? Texture.EMPTY : Texture.from(this.lineCanvas));
    if (renderer === 'canvas') {
      // The static layer is a *visible* canvas behind a transparent Pixi canvas (particles only), like v1's single
      // on-screen canvas. As a texture source Chrome rasterises text differently (heavier), and every change would
      // re-upload a full-screen texture; drawn on-page it matches v1 bit for bit and costs no upload.
      const el = this.lineCanvas;
      el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0';
      app.canvas.parentElement?.insertBefore(el, app.canvas);
      app.canvas.style.position = 'absolute'; app.canvas.style.left = '0'; app.canvas.style.top = '0';
    } else {
      this.root.addChild(this.lineSprite, this.blockLayer, this.overlayLayer, this.particles);
    }
    app.stage.addChild(this.root);
    this.resize();
  }

  resize(): void {
    // app.screen is in CSS px; the renderer resolution is the device pixel ratio (autoDensity).
    const { width, height } = this.app.screen;
    this.metrics = computeMetrics({ cssWidth: width, cssHeight: height, dpr: this.app.renderer.resolution, zoom: this.zoom, drag: this.drag });
    this.lineCanvas.width = Math.round(this.metrics.width);
    this.lineCanvas.height = Math.round(this.metrics.height);
    this.lineCanvas.style.width = `${this.app.screen.width}px`;
    this.lineCanvas.style.height = `${this.app.screen.height}px`;
    if (this.renderer !== 'canvas') this.lineSprite.texture.source.resize(this.lineCanvas.width, this.lineCanvas.height);
    this.lineSprite.scale.set(1 / this.metrics.dpr);
    for (const b of this.blocks.values()) this.placeBlock(b.block.id);
    this.linesDirty = true;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    if (this.renderer !== 'canvas') this.app.renderer.background.color = theme.colors[0];  // canvas: drawn by the static layer
    this.resize();
  }
  setView(zoom: number, drag: { x: number; y: number }): void { this.zoom = zoom; this.drag = drag; this.resize(); }

  upsertBlock(b: StageBlock): void {
    const def = BLOCKS_BY_ID.get(b.type);
    if (!def) throw new Error(`unknown block type ${b.type}`);
    const existing = this.blocks.get(b.id);
    if (existing) existing.block = b;
    else {
      const sprite = new Sprite();
      this.blockLayer.addChild(sprite);
      this.blocks.set(b.id, { block: b, def, sprite, key: '' });
    }
    this.placeBlock(b.id);
    this.linesDirty = true;
  }

  removeBlock(id: number): void {
    const b = this.blocks.get(id);
    if (!b) return;
    b.sprite.destroy({ texture: true });
    b.overlay?.destroy({ texture: true });
    this.blocks.delete(id);
    this.linesDirty = true;
  }

  block(id: number): StageBlock | undefined { return this.blocks.get(id)?.block; }
  /** v1 MainScene.BlockToFront: draw (and hit-test) the block last. */
  toFront(id: number): void {
    const b = this.blocks.get(id);
    if (!b) return;
    this.blocks.delete(id); this.blocks.set(id, b);
    this.linesDirty = true;
  }
  /** Block drawn at 50% while pressed and dragged (v1). */
  pressed: number | null = null;
  /** Blocks being placed after an Insert: drawn like a pressed block (CHG-0005, owner 2026-11-10). */
  placing = new Set<number>();
  /** Blocks held by other fingers (multi-touch, CHG-0005 task 8): drawn like the pressed block. */
  held = new Set<number>();
  /** Multi-select (CHG-0005 task 9): selected blocks get their outline traced; the box being dragged, device px. */
  selected = new Set<number>();
  selectBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
  allBlocks(): StageBlock[] { return [...this.blocks.values()].map(b => b.block); }

  /** Topmost block whose outline contains the css-px point (v1 hit order: last created on top). */
  hitTest(cssX: number, cssY: number): StageBlock | undefined {
    const [gx, gy] = pxToGrid(this.metrics, cssX * this.metrics.dpr, cssY * this.metrics.dpr);
    const list = [...this.blocks.values()];
    for (let i = list.length - 1; i >= 0; i--) {
      const { block, def } = list[i];
      if (pointInPolygon(gx, gy, def.geometry.outline, block.x, block.y)) return block;
    }
    return undefined;
  }

  cssToGrid(cssX: number, cssY: number): [number, number] { return pxToGrid(this.metrics, cssX * this.metrics.dpr, cssY * this.metrics.dpr); }

  setConnections(pairs: Uint32Array): void { this.connections = pairs; this.linesDirty = true; }
  setPowered(ids: Uint32Array): void {
    const next = new Set(ids);
    if (next.size !== this.powered.size || [...next].some(id => !this.powered.has(id))) { this.powered = next; this.linesDirty = true; }
  }

  /** Laser beams packed [x0, y0, x1, y1]* in grid units (canvas renderer draws them between blocks and overlays). */
  setBeams(b: Float32Array): void {
    if (b.length || this.beams.length) this.linesDirty = true;  // v1 beams flicker: redraw every frame while any is on
    this.beams = b;
  }

  /** Particles packed [x, y, size]* in grid units. */
  setParticles(p: Float32Array): void {
    if (this.renderer === 'canvas') {  // drawn with the static layer (v1 order: …, LaserBeams, Particles, ToolTip, …)
      if (p.length || this.particleData.length) this.linesDirty = true;
      this.particleData = p;
      return;
    }
    const g = this.particles, m = this.metrics, d = m.dpr;
    g.clear();
    const color = this.theme.colors[this.theme.roles.power];
    for (let i = 0; i < p.length; i += 3) {
      const [px, py] = gridToPx(m, p[i], p[i + 1]);
      const s = p[i + 2] * m.scaledUnit;
      g.poly([(px - s) / d, py / d, px / d, (py - s) / d, (px + s) / d, py / d, px / d, (py + s) / d]);
    }
    if (p.length) g.fill(color);
  }

  /** Force the static layer to redraw (e.g. after fonts load or the canvas is first shown). */
  redraw(): void { this.linesDirty = true; this.update(); }

  /** Call once per frame. */
  update(): void { if (this.linesDirty) this.drawLines(); }

  /** A picture of the stage as it is now, without v1's UI layer (the outer stage behind a Stage block's window,
   * CHG-0021). Same size as the canvas, device px. */
  snapshot(): HTMLCanvasElement {
    const ui = this.drawUi, out = document.createElement('canvas');
    this.drawUi = null; this.redraw();
    try {
      out.width = this.lineCanvas.width; out.height = this.lineCanvas.height;
      out.getContext('2d')!.drawImage(this.lineCanvas, 0, 0);
    } finally { this.drawUi = ui; this.redraw(); }
    return out;
  }
  /**
   * A link-preview image of the stage (SHARING-0002): blocks, lines and particles without the UI, cropped around the
   * blocks to the output's aspect ratio and scaled to width × height. Canvas renderer only.
   */
  thumbnail(width: number, height: number): HTMLCanvasElement {
    const ui = this.drawUi;
    this.drawUi = null; this.redraw();
    const src = this.lineCanvas, m = this.metrics, out = document.createElement('canvas');
    out.width = width; out.height = height;
    try {
      // Bounding box of the blocks in canvas px (a block spans about ±2 cells from its anchor), plus a margin.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const { block } of this.blocks.values()) {
        const [ax, ay] = gridToPx(m, block.x - 3, block.y - 3), [bx, by] = gridToPx(m, block.x + 3, block.y + 3);
        x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
      }
      if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = src.width; y1 = src.height; }
      const aspect = width / height;
      let w = Math.max(x1 - x0, (y1 - y0) * aspect, src.width * 0.5), h = w / aspect;
      if (w > src.width) { w = src.width; h = w / aspect; }
      if (h > src.height) { h = src.height; w = h * aspect; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const sx = Math.min(Math.max(cx - w / 2, 0), src.width - w), sy = Math.min(Math.max(cy - h / 2, 0), src.height - h);
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = this.theme.colors[0];
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, sx, sy, w, h, 0, 0, width, height);
    } finally {
      this.drawUi = ui; this.redraw();
    }
    return out;
  }

  private placeBlock(id: number): void {
    const b = this.blocks.get(id)!;
    const m = this.metrics;
    const [ox, oy] = gridToPx(m, b.block.x, b.block.y);
    if (this.renderer === 'canvas') { this.linesDirty = true; return; }
    this.placeOverlay(b, ox, oy);
    if (this.renderer !== 'baked') { this.placeVector(b, ox, oy); return; }
    const fx = ox - Math.floor(ox), fy = oy - Math.floor(oy);
    const key = `${this.theme.index}|${m.scaledGridSize}|${fx}|${fy}|${b.block.starPos?.x},${b.block.starPos?.y}`;
    if (key !== b.key) {
      const baked = bakeBlock(b.def, { colors: this.theme.colors, gridPx: m.scaledGridSize, fracX: fx, fracY: fy, starPos: b.block.starPos });
      const old = b.sprite.texture;
      b.sprite.texture = Texture.from(baked.canvas);
      if (old && old !== Texture.EMPTY) old.destroy(true);
      b.sprite.label = `${baked.offsetX},${baked.offsetY}`;
      b.key = key;
    }
    const [offX, offY] = b.sprite.label.split(',').map(Number);
    b.sprite.scale.set(1 / m.dpr);
    b.sprite.position.set((Math.floor(ox) + offX) / m.dpr, (Math.floor(oy) + offY) / m.dpr);
  }

  private placeOverlay(b: { def: BlockDef; overlay?: Sprite }, ox: number, oy: number): void {
    if (!b.def.geometry.overlays?.length) return;
    const m = this.metrics;
    const baked = bakeOverlays(b.def, 'idle', { colors: this.theme.colors, gridSize: m.gridSize, fracX: ox - Math.floor(ox), fracY: oy - Math.floor(oy) });
    if (!baked) return;
    b.overlay?.destroy({ texture: true });
    b.overlay = new Sprite(Texture.from(baked.canvas));
    b.overlay.scale.set(1 / m.dpr);
    b.overlay.position.set((Math.floor(ox) + baked.offsetX) / m.dpr, (Math.floor(oy) + baked.offsetY) / m.dpr);
    this.overlayLayer.addChild(b.overlay);
  }

  /** Bake-off candidates A (msaa: Pixi Graphics, GPU antialiasing) and B (ss2: Graphics at 2× into a texture, downsampled). */
  private placeVector(b: { block: StageBlock; def: BlockDef; sprite: Sprite; key: string }, ox: number, oy: number): void {
    const m = this.metrics, d = m.dpr;
    const key = `${this.renderer}|${this.theme.index}|${m.scaledGridSize}|${ox}|${oy}`;
    if (key === b.key) return;
    b.key = key;
    const g = new Graphics();
    const upg = b.def.geometry.unitsPerGrid ?? 15;
    const ss = this.renderer === 'ss2' ? 2 : 1;
    for (const l of b.def.geometry.layers) {
      const pts = layerPoints(l, upg, b.block.starPos).flatMap(([x, y]) => [(ox + x * m.scaledGridSize) / d * ss, (oy + y * m.scaledGridSize) / d * ss]);
      g.poly(pts).fill(this.theme.colors[l.palette]);
    }
    const old = b.sprite.texture;
    if (this.renderer === 'msaa') {
      b.sprite.texture = Texture.EMPTY;
      b.sprite.removeChildren().forEach(c => c.destroy());
      b.sprite.position.set(0, 0); b.sprite.scale.set(1);
      b.sprite.addChild(g);
    } else {
      const bounds = g.getLocalBounds();
      const rt = RenderTexture.create({ width: Math.ceil(bounds.width) + 4, height: Math.ceil(bounds.height) + 4, resolution: d, antialias: true });
      g.position.set(-Math.floor(bounds.x) + 2, -Math.floor(bounds.y) + 2);
      this.app.renderer.render({ container: g, target: rt });
      g.destroy();
      b.sprite.texture = rt;
      b.sprite.scale.set(1 / ss);
      b.sprite.position.set((Math.floor(bounds.x) - 2) / ss, (Math.floor(bounds.y) - 2) / ss);
    }
    if (old && old !== Texture.EMPTY) old.destroy(true);
  }

  /** Renderer 'canvas': blocks then overlays drawn straight into the opaque stage canvas, exactly as v1 does. */
  private drawBlocksAndOverlays(ctx: CanvasRenderingContext2D): void {
    const m = this.metrics;
    const poly = (pts: [number, number][], fill: string, alpha = 1) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.fillStyle = fill; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
    };
    for (const { block, def } of this.blocks.values()) {
      const upg = def.geometry.unitsPerGrid ?? 15;
      const alpha = block.id === this.pressed || this.placing.has(block.id) || this.held.has(block.id) ? 0.5 : 1;  // v1 Block.Draw: pressed + selected → 50%
      for (const l of def.geometry.layers)
        poly(layerPoints(l, upg, block.starPos).map(([x, y]) => gridToPx(m, block.x + x, block.y + y)), this.theme.colors[l.palette], alpha);
    }
    // Multi-select (not in v1): each selected block ringed by its outline moved out 4 units on every side, and the box,
    // dashed in the text colour at half strength (owner, 2026-11-11: quieter than a solid line).
    if (this.selected.size || this.selectBox) {
      ctx.save();
      ctx.strokeStyle = this.theme.colors[this.theme.roles.txt]; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      ctx.setLineDash([4 * m.unit, 3 * m.unit]);
      ctx.beginPath();
      for (const id of this.selected) {
        const e = this.blocks.get(id); if (!e) continue;
        offsetPolygon(selectionRing(e.def).map(([x, y]) => gridToPx(m, e.block.x + x, e.block.y + y)), 4 * m.scaledUnit)
          .forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
      }
      if (this.selectBox) { const b = this.selectBox; ctx.rect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); }
      ctx.stroke();
      ctx.restore();
    }
    if (this.beams.length) {  // v1 LaserBeams.Draw
      ctx.strokeStyle = this.theme.colors[this.theme.roles.power];
      ctx.lineWidth = m.scaledUnit * 2 * (0.8 + (this.beamJitter ?? Math.random()) * 0.5);
      ctx.beginPath();
      for (let i = 0; i < this.beams.length; i += 4) {
        const [x0, y0] = gridToPx(m, this.beams[i], this.beams[i + 1]), [x1, y1] = gridToPx(m, this.beams[i + 2], this.beams[i + 3]);
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    for (const { block, def } of this.blocks.values()) {
      const [bx, by] = gridToPx(m, block.x, block.y);
      for (const o of def.geometry.overlays ?? []) if (!this.skipOverlays.has(o.name)) for (const l of o.states.idle ?? [])
        poly(l.points.map(([x, y]) => [bx + x * m.gridSize, by + y * m.gridSize] as [number, number]), this.theme.colors[l.palette], l.alpha);
    }
    if (this.particleData.length) {  // v1 ParticleLayer.Draw: one diamond path per particle
      const p = this.particleData;
      ctx.fillStyle = this.theme.colors[this.theme.roles.power];
      ctx.globalAlpha = 1;
      for (let i = 0; i < p.length; i += 3) {
        const [sx, sy] = gridToPx(m, p[i], p[i + 1]), size = p[i + 2] * m.scaledUnit;
        ctx.beginPath();
        ctx.moveTo(sx - size, sy); ctx.lineTo(sx, sy - size); ctx.lineTo(sx + size, sy); ctx.lineTo(sx, sy + size);
        ctx.closePath(); ctx.fill();
      }
    }
    if (this.drawUi) this.drawUi(ctx);  // v1 chrome/panels (web/src/v1ui), drawn after blocks as in v1's display list
    else if (this.chrome) drawV1Chrome({ ctx, theme: this.theme, width: this.lineCanvas.width, height: this.lineCanvas.height, units: m.unit,
      cssWidth: this.app.screen.width, cssHeight: this.app.screen.height, blockCount: this.blocks.size });
  }

  private drawLines(): void {
    const ctx = this.lineCtx;
    const m = this.metrics;
    ctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    if (this.renderer === 'canvas') { ctx.fillStyle = this.theme.colors[0]; ctx.fillRect(0, 0, this.lineCanvas.width, this.lineCanvas.height); }
    ctx.strokeStyle = this.theme.colors[15];
    for (const powered of [false, true]) {
      ctx.lineWidth = powered ? 2 : 1;
      ctx.beginPath();
      for (let i = 0; i < this.connections.length; i += 2) {
        let s = this.blocks.get(this.connections[i]), t = this.blocks.get(this.connections[i + 1]);
        if (!s || !t) continue;
        if (!isSourceKind(s.def)) [s, t] = [t, s];  // lines run source → effect
        if (this.powered.has(s.block.id) !== powered) continue;
        routeConnection(s.block.x, s.block.y, t.block.x, t.block.y).forEach(([gx, gy], k) => {
          const [px, py] = gridToPx(m, gx, gy);
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        });
      }
      ctx.stroke();
    }
    if (this.renderer === 'canvas') this.drawBlocksAndOverlays(ctx);
    if (this.renderer !== 'canvas') this.lineSprite.texture.source.update();
    this.linesDirty = false;
  }
}

/**
 * A polygon moved out by `d` on every side (each edge shifted along its outward normal, corners where the shifted
 * edges meet), so the gap is the same everywhere. A very sharp corner is capped at 3·d from the original vertex.
 */
export function offsetPolygon(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length;
  if (n < 3) return pts;
  let area = 0;
  for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; area += x0 * y1 - x1 * y0; }
  const sign = area > 0 ? 1 : -1;  // outward normal side for this winding (screen y points down)
  const normal = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [sign * dy / l, -sign * dx / l];
  };
  // Drop repeated points (zero-length edges have no normal).
  const p = pts.filter((q, i) => { const r = pts[(i + n - 1) % n]; return Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-6; });
  const m = p.length;
  return p.map((v, i) => {
    const a = p[(i + m - 1) % m], c = p[(i + 1) % m], n1 = normal(a, v), n2 = normal(v, c);
    const bx = n1[0] + n2[0], by = n1[1] + n2[1], dot = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    if (dot < 1e-6) return [v[0] + n1[0] * d, v[1] + n1[1] * d] as [number, number];
    // Miter: v + (n1 + n2)·d / (1 + n1·n2) puts the corner d from both shifted edges; capped at 3·d.
    const len = Math.hypot(bx, by), scale = Math.min(d / dot, (3 * d) / len);
    return [v[0] + bx * scale, v[1] + by * scale] as [number, number];
  });
}
