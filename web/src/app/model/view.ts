// The view (zoom and offset): saved with the patch, and never opening on an empty stage.
import type { Patch } from '../../patch/loadPatch.ts';
import { frameBlocks } from '../../stage/frameBlocks.ts';
import { gridToPx } from '../../stage/metrics.ts';
import { stage } from '../boot/pixi.ts';
import { scene } from '../scene/scene.ts';
import { setUiSync } from '../stage/overlays.ts';
import { model } from './patchModel.ts';

/** v1 ZoomButtons' range, out to 0.15 (CHG-0035). */
export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 4;

export const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** The view a patch is saved with: zoom and the stage offset, in grid units. */
export const currentView = () => ({
  x: round3(stage.drag.x),
  y: round3(stage.drag.y),
  zoom: round3(stage.zoom),
});

interface V1Dragger {
  MainSceneDragger?: { Destination: { x: number; y: number } };
}

/** Show a patch's saved view (opening it, or the plugin's patch arriving). */
export function applyView(view: Patch['view']): void {
  if (!view || !Number.isFinite(view.zoom) || !Number.isFinite(view.x) || !Number.isFinite(view.y))
    return;
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.zoom));
  const drag = { x: view.x, y: view.y };
  stage.setView(zoom, drag);
  scene.setView(zoom, drag);
  const dragger = (scene as unknown as V1Dragger).MainSceneDragger;
  if (dragger) {
    dragger.Destination.x = drag.x;
    dragger.Destination.y = drag.y;
  }
  scene.pinchEnd(); // the zoom buttons step on from the nearest of v1's levels
  setUiSync(true);
}

/** A saved view with every block out of sight frames them, as opening a Stage does. */
export function keepBlocksInView(): void {
  const metrics = stage.metrics;
  const blocks = [...model.values()];
  if (!blocks.length || !metrics.width || !metrics.height) return;
  const anyInSight = blocks.some((block) => {
    const [x, y] = gridToPx(metrics, block.x, block.y);
    return x > 0 && x < metrics.width && y > 0 && y < metrics.height;
  });
  if (anyInSight) return;
  applyView(
    frameBlocks(blocks, undefined, {
      width: metrics.width,
      height: metrics.height,
      unit: metrics.unit,
      area: { x: 0, y: 0, w: metrics.width, h: metrics.height },
    }),
  );
}
