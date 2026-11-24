// What the stage draws over the blocks: corners, MAKE STAGE, labels.
import { drawLabels, labelRect } from '../../stage/labels.ts';
import { drawInside } from '../../stage/insideView.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import {
  type Rect,
  type ButtonBox,
  makeStageBox,
  drawMakeStage,
} from '../../stage/makeStageButton.ts';
import { embedId } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { theme } from '../boot/theme.ts';
import { labelEdit, measure } from '../labels/labels.ts';
import { labels, model, selLabels, selectedLabels, v1Blocks } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';
import { cornerBoxes, drawCorners } from './corners.ts';
import { MAKE_STAGE, makeStageHover, offerMakeStage, setMakeStageAt } from './makeStage.ts';
import { insideFrame } from '../stageBlock/lookInside.ts';

export let uiSync = true;

export function setUiSync<Value extends typeof uiSync>(value: Value): Value {
  uiSync = value;
  return value;
}

export function init(): void {
  stage.skipOverlays = new Set(['recordButton']);
  // the ported RecorderPanel draws it (with hover/recording states)
  // The embed player (SHARING-0002, `/embed/<id>`) shows the stage only: no menus, panels or editing.
  stage.drawUi = (ctx) => {
    if (labels.length)
      drawLabels(ctx, stage.metrics, labels, theme.colors[theme.roles.txt], labelEdit?.id ?? null); // embeds show them too
    if (selectedLabels.size && !embedId) {
      // selected labels: dashed as selected blocks are (stage.ts)
      const m = stage.metrics;
      ctx.save();
      ctx.strokeStyle = theme.colors[theme.roles.txt];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4 * m.unit, 3 * m.unit]);
      ctx.beginPath();
      for (const l of selLabels()) {
        const r = labelRect(measure, m, l);
        ctx.rect(r.x, r.y, r.w, r.h);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (embedId) return;
    if (inside)
      drawInside(
        ctx,
        insideFrame(),
        stage.metrics.unit,
        'STAGE',
        {
          image: inside.image,
          blockX: inside.blockX,
          blockY: inside.blockY,
          grid: inside.grid,
          layers: BLOCKS_BY_ID.get('source.stage')!.geometry.layers.filter(
            (l) => l.units !== 'unit',
          ),
        },
        theme.colors,
        theme.roles.txt,
        `400 ${Math.round(10 * stage.metrics.unit)}px Dosis`,
      );
    if (uiSync) {
      uiSync = false;
      scene.sync(ctx, theme, stage.zoom, stage.drag, [...v1Blocks.values()]);
    }
    scene.setView(stage.zoom, stage.drag);
    drawCorners(ctx); // after the scene's sync (v1's type sizes), before its panels
    scene.draw();
    setMakeStageAt(null);
    if (offerMakeStage()) {
      const m = stage.metrics,
        h = scene.Header as unknown as { Height: number; Rows?: number };
      // Its top-right place is under the SIGNED IN AS line (that line's baseline is 22 units under the header).
      const headerBottom = h.Height * (h.Rows ?? 1) * m.unit,
        top = headerBottom + 32 * m.unit;
      let sel: Rect | null = stage.selectedBounds();
      for (const l of selLabels()) {
        const r = labelRect(measure, m, l);
        sel = sel
          ? {
              x0: Math.min(sel.x0, r.x),
              y0: Math.min(sel.y0, r.y),
              x1: Math.max(sel.x1, r.x + r.w),
              y1: Math.max(sel.y1, r.y + r.h),
            }
          : { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h };
      }
      const avoid = [cornerBoxes.me, cornerBoxes.credit, cornerBoxes.like].filter(
        (b): b is ButtonBox => !!b,
      );
      const makeStageButton = setMakeStageAt(
        makeStageBox(
          ctx,
          m.dpr,
          m.unit,
          m.width,
          m.height,
          headerBottom,
          top,
          sel,
          stage.selected.size >= model.size,
          avoid,
          MAKE_STAGE,
        ),
      );
      drawMakeStage(
        ctx,
        makeStageButton,
        m.dpr,
        m.unit,
        MAKE_STAGE,
        theme.colors[2],
        theme.colors[theme.roles.txt],
        theme.colors[theme.roles.menu[1]],
        makeStageHover,
      );
    }
  };
}
