// Visual test harness (CHG-0001 0.10): render a v1 composition through the real v2 Stage, and benchmark renderers.
import { Application } from 'pixi.js';
import { engineModule } from './audio/engineNode.ts';
import { WasmEngine } from './engine/wasmEngine.ts';
import { BLOCKS_BY_ID } from './generated/blocks.gen.ts';
import { THEMES } from './generated/palettes.gen.ts';
import { importV1, type V1Composition } from './patch/importV1.ts';
import { loadPatch } from './patch/loadPatch.ts';
import { Stage, type BlockRenderer } from './stage/Stage.ts';
import { gridToPx } from './stage/metrics.ts';
import { loadV1Fonts } from './chrome/v1Chrome.ts';
import { V1Scene } from './v1ui/scene.ts';

interface FixtureInput {
  composition: V1Composition;
  starPos?: { type: string; x: number; y: number; starPos: { x: number; y: number } }[];
  renderer?: BlockRenderer;
  beamJitter?: number;
  chrome?: boolean;
}

async function makeApp(themeIndex: number, transparent = true) {
  const app = new Application();
  // The 'canvas' renderer draws the static stage on an on-page canvas behind Pixi, so Pixi must be transparent.
  await app.init({
    resizeTo: window,
    resolution: devicePixelRatio,
    autoDensity: true,
    antialias: true,
    background: transparent ? 0x000000 : THEMES[themeIndex].colors[0],
    backgroundAlpha: transparent ? 0 : 1,
  }); // transparent must clear to black: the page composites premultiplied
  document.getElementById('stage')!.appendChild(app.canvas);
  return app;
}
const frames = (n: number) =>
  new Promise<void>((resolve) => {
    let k = 0;
    const f = () => (++k >= n ? resolve() : requestAnimationFrame(f));
    requestAnimationFrame(f);
  });

/** Returns the region of interest (device px) covering all blocks, overlays and connection lines. */
async function renderFixture(input: FixtureInput) {
  const { patch, view } = importV1(input.composition);
  const theme = THEMES[view.theme] ?? THEMES[0];
  const app = await makeApp(theme.index, (input.renderer ?? 'canvas') === 'canvas');
  const stage = new Stage(app, theme, input.renderer ?? 'canvas');
  if (input.chrome) {
    await loadV1Fonts();
    // The real v1 UI (ported, web/src/v1ui) in its closed state: Header, ZoomButtons, TrashCan, CreateNew…
    const scene = new V1Scene({
      createBlock: () => null,
      deleteBlock() {},
      setParam() {},
      setTheme() {},
      setZoom() {},
      setDrag() {},
      setMasterDb() {},
      setWorldPower() {},
      loadSample() {},
      searchSamples: async () => [],
      loadFreesound() {},
      hasLocalFiles: () => false,
      reverseSample() {},
      setText() {},
      tempo: () => 120,
      setTempo() {},
      resetScene() {},
      toggleRecording() {},
      downloadRecording() {},
      generateSample() {},
      setSound() {},
      share: async () => '',
      themes: () => THEMES,
      listPatches: async () => [],
      savePatch: async () => false,
      openPatch() {},
      pickPatchFile() {},
      usePickedFile() {},
      isDirty: () => false,
      removePatch: async () => {},
      removeLine: () => '',
      hasBlocks: () => false,
      links: null,
      video: null,
      account: null,
      gallery: null,
      signedIn: () => false,
      connectedIds: () => [],
      targetOf: () => null,
      setTarget() {},
      openStage() {},
      resetCounter() {},
    });
    scene.drawRecorderPanel = false;
    const blocks = [...Array(patch.blocks.length)].map(() => ({}) as any);
    let synced = false;
    stage.drawUi = (ctx) => {
      if (!synced) {
        synced = true;
        scene.sync(ctx, theme, view.zoom, view.drag, blocks);
        // Settle v1's start-up tweens (header drop-down, CreateNew margin…) the way the references were captured.
        for (let t = 0, i = 0; i < 200 && (scene.update(t) || i < 2); t += 50, i++) {
          /* advance */
        }
      }
      scene.draw();
    };
  }
  stage.setTheme(theme);
  stage.setView(view.zoom, view.drag);
  const loaded = loadPatch(patch);
  for (const b of patch.blocks) {
    const def = BLOCKS_BY_ID.get(b.type)!;
    const sp = input.starPos?.find(
      (starPo) => def.v1Type === starPo.type && starPo.x === b.x && starPo.y === b.y,
    )?.starPos;
    stage.upsertBlock({
      id: loaded.ids.get(b.id)!,
      type: b.type,
      x: b.x ?? 0,
      y: b.y ?? 0,
      starPos: sp,
    });
  }
  // Connections and power come from the engine itself (main-thread instance; no audio needed).
  const engine = WasmEngine.fromModule(await engineModule(), 48000, loaded.seed);
  for (const command of loaded.commands) engine.push(command);
  engine.process(1);
  stage.setConnections(engine.connections());
  stage.setPowered(engine.powered());
  stage.beamJitter = input.beamJitter ?? 0.5; // v1 captures pin Math.random to the same value
  stage.setBeams(engine.beams());
  stage.update();
  await frames(3);
  stage.redraw(); // draw again once the canvas is on screen (GPU raster), as v1 does every frame
  await frames(2);
  const m = stage.metrics;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const b of stage.allBlocks()) {
    const def = BLOCKS_BY_ID.get(b.type)!;
    const pts = [
      ...def.geometry.layers.flatMap((layer) => (layer.units === 'unit' ? [] : layer.points)),
    ];
    for (const [gx, gy] of pts) {
      const [px, py] = gridToPx(m, b.x + gx, b.y + gy);
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
    for (const overlay of def.geometry.overlays ?? [])
      for (const geometryLayer of overlay.states.idle ?? [])
        for (const [ux, uy] of geometryLayer.points) {
          const [bx, by] = gridToPx(m, b.x, b.y);
          const px = bx + ux * m.gridSize,
            py = by + uy * m.gridSize;
          x0 = Math.min(x0, px);
          y0 = Math.min(y0, py);
          x1 = Math.max(x1, px);
          y1 = Math.max(y1, py);
        }
  }
  const beams = engine.beams();
  for (let i = 0; i < beams.length; i += 2) {
    const [px, py] = gridToPx(m, beams[i], beams[i + 1]);
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  return {
    roi: [x0, y0, x1, y1],
    blocks: stage.allBlocks().length,
    connections: engine.connections().length / 2,
    beams: beams.length / 4,
    dpr: m.dpr,
  };
}

/** Frame-time micro-benchmark (defaults: 100 blocks, 5 moved per frame, 2000 particles). Used by bd visual bakeoff and bd perf. */
async function benchmark(
  renderer: BlockRenderer,
  iterations = 120,
  blocks = 100,
  nParticles = 2000,
  moves = 5,
) {
  const app = await makeApp(0, renderer === 'canvas');
  app.ticker.stop();
  const stage = new Stage(app, THEMES[0], renderer);
  const ids = [...BLOCKS_BY_ID.keys()];
  let s = 12345;
  const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let i = 1; i <= blocks; i++)
    stage.upsertBlock({
      id: i,
      type: ids[i % ids.length],
      x: Math.round(rnd() * 40 - 20),
      y: Math.round(rnd() * 24 - 12),
    });
  const particles = new Float32Array(nParticles * 3);
  const times: number[] = [];
  const gl = (app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
  for (let f = 0; f < iterations; f++) {
    const t0 = performance.now();
    for (let k = 0; k < moves; k++) {
      const id = 1 + Math.floor(rnd() * blocks);
      const b = stage.block(id)!;
      stage.upsertBlock({ ...b, x: b.x + (rnd() < 0.5 ? 1 : -1) });
    }
    for (let i = 0; i < particles.length; i += 3) {
      particles[i] = rnd() * 40 - 20;
      particles[i + 1] = rnd() * 24 - 12;
      particles[i + 2] = 2.5;
    }
    stage.setParticles(particles);
    stage.update();
    app.render();
    gl?.finish();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const glRenderer = (() => {
    try {
      const extension = gl?.getExtension('WEBGL_debug_renderer_info');
      return extension ? String(gl!.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    } catch {
      return 'unknown';
    }
  })();
  return {
    renderer,
    glRenderer,
    blocks,
    particles: nParticles,
    moves,
    meanMs: +mean.toFixed(2),
    medianMs: +times[Math.floor(times.length / 2)].toFixed(2),
    p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2),
  };
}

Object.assign(window, { renderFixture, benchmark });
document.title += ' (ready)';
