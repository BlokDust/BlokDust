// The view (zoom and offset): saved with the patch, kept in the plugin, never empty.
import { type Patch } from '../../patch/loadPatch.ts';
import { gridToPx } from '../../stage/metrics.ts';
import { frameBlocks } from '../../stage/frameBlocks.ts';
import { saveLocal } from '../../patch/share.ts';
import { embedId, juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { autosaveIsThis } from './autosave.ts';
import { model, toPatch } from './patchModel.ts';
import { scene } from '../scene/scene.ts';
import { setUiSync } from '../stage/overlays.ts';
import { probe } from '../testing/probe.ts';

export const ZOOM_MIN = 0.15,
  ZOOM_MAX = 4;

// v1 ZoomButtons' range, out to 0.15 (owner, 2026-11-17, CHG-0035)
export const round3 = (v: number) => Math.round(v * 1000) / 1000;

// The view settles (owner, 2026-11-12): the plugin's processor keeps it with the DAW project (bd_view); the website's
// autosave keeps it (not an unsaved change). Checked twice a second, sent once it stops changing.
// The autosave is only rewritten while it holds this patch (restored from it, or edited since): opening a link must
// not replace the user's own unsaved work.
export let viewSent = '',
  viewSeen = '';

/** The view a patch is saved with (owner, 2026-11-12): zoom and the stage offset, in grid units. */
export const currentView = () => ({
  x: round3(stage.drag.x),
  y: round3(stage.drag.y),
  zoom: round3(stage.zoom),
});

/** Show a patch's saved view (opening it, or the plugin's patch arriving). */
export function applyView(v: Patch['view']): void {
  if (!v || !Number.isFinite(v.zoom) || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return;
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom)),
    drag = { x: v.x, y: v.y };
  stage.setView(zoom, drag);
  scene.setView(zoom, drag);
  const dragger = (
    scene as unknown as { MainSceneDragger?: { Destination: { x: number; y: number } } }
  ).MainSceneDragger;
  if (dragger) {
    dragger.Destination.x = drag.x;
    dragger.Destination.y = drag.y;
  }
  scene.pinchEnd(); // the zoom buttons step on from the nearest of v1's levels
  setUiSync(true);
}

/** A patch never opens with every block out of sight (owner, 2026-11-19: a saved view far from its blocks played
 * with an empty stage): then the view frames them, as opening a Stage does (frameBlocks). */
export function keepBlocksInView(): void {
  const m = stage.metrics,
    bs = [...model.values()];
  if (!bs.length || !m.width || !m.height) return;
  const seen = bs.some((b) => {
    const [x, y] = gridToPx(m, b.x, b.y);
    return x > 0 && x < m.width && y > 0 && y < m.height;
  });
  if (!seen)
    applyView(
      frameBlocks(bs, undefined, {
        width: m.width,
        height: m.height,
        unit: m.unit,
        area: { x: 0, y: 0, w: m.width, h: m.height },
      }),
    );
}

export function init(): void {
  setInterval(() => {
    try {
      if (embedId || !probe.started) return;
      const v = JSON.stringify(currentView());
      if (v !== viewSeen) {
        viewSeen = v;
        return;
      } // still moving
      if (v === viewSent) return;
      viewSent = v;
      if (juce) juce.emitEvent('bd_view', JSON.parse(v));
      else if (autosaveIsThis) saveLocal(toPatch());
    } catch {
      /* main() still starting */
    }
  }, 500);
}
