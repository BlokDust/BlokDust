// Looking into a Stage block (CHG-0021, UI-0009).
import { endLabelEdit } from '../labels/labelEditing.ts';
import { frameFor } from '../../stage/insideView.ts';
import { gridToPx } from '../../stage/metrics.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { frameBlocks } from '../../stage/frameBlocks.ts';
import { setMenuHidden } from '../../v1ui/newBlocks.ts';
import { starPos } from '../../stage/starPos.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { embedId, juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { endPlacing } from '../editing/placing.ts';
import { redoStack, undoStack } from '../editing/undoSteps.ts';
import { addLabels, readLabels } from '../labels/labels.ts';
import { changed } from '../model/autosave.ts';
import { viewWorld } from '../model/engineLink.ts';
import {
  connectionOrder,
  labels,
  model,
  nextId,
  selectedLabels,
  setConnectionOrder,
  setNextId,
  v1Blocks,
} from '../model/patchModel.ts';
import {
  type Outer,
  innerIds,
  innerMacro,
  innerSamples,
  inside,
  macros,
  setInside,
} from '../model/stageWorlds.ts';
import { applyView, currentView } from '../model/view.ts';
import { showBuffer } from '../samples/sampleGen.ts';
import { missing, resolveSample, samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { setUiSync } from '../stage/overlays.ts';

// Inside a Stage block (CHG-0021, UI-0009).

/** Menu items not offered inside a Stage: Stage itself (one level, SCOPE-0006). Stage In is offered
 * only there. */
export const INSIDE_HIDDEN = new Set(['Stage']),
  OUTSIDE_HIDDEN = new Set(['StageIn']);

export const insideFrame = () => {
  if (!inside) throw new Error('not inside a Stage block');
  const metrics = stage.metrics,
    header = scene.Header as unknown as { Height: number; Rows?: number };
  const headerBottom = header.Height * (header.Rows ?? 1) * metrics.unit;
  return frameFor(metrics.width, metrics.height, metrics.unit, headerBottom, {
    x: inside.blockX,
    y: inside.blockY,
  });
};

/** What v1ui/scene/cancellableOpen.ts adds to v1's Options panel. */
const cancellableOptions = () => scene.OptionsPanel as unknown as { CancelOpen(): void };

export function clearWorld(): void {
  for (const id of [...model.keys()]) {
    model.delete(id);
    v1Blocks.delete(id);
    stage.removeBlock(id);
  }
  samples.clear();
  missing.clear();
  labels.length = 0;
  stage.selected.clear();
  selectedLabels.clear();
  stage.held.clear();
}

/** Look into Stage block `id`: its inner world takes the page (in a window over the outer stage).
 * The plugins too (CHG-0038). */
export function enterStage(id: number): void {
  const b = model.get(id);
  if (inside || embedId || b?.type !== 'source.stage') return;
  endLabelEdit(true);
  endPlacing(false);
  // a double click's first click set the panel on its way open: it stays shut
  cancellableOptions().CancelOpen();
  scene.OptionsPanel.Close();
  const [bx, by] = gridToPx(stage.metrics, b.x, b.y),
    image = stage.snapshot();
  const outer: Outer = {
    model: new Map(model),
    v1Blocks: new Map(v1Blocks),
    samples: new Map(samples),
    missing: new Set(missing),
    labels: labels.slice(),
    connectionOrder,
    nextId,
    view: currentView(),
    undo: undoStack.slice(),
    redo: redoStack.slice(),
  };
  clearWorld();
  undoStack.length = 0;
  redoStack.length = 0;
  setInside({
    stageId: id,
    stageUid: b.uid,
    outer,
    image,
    blockX: bx,
    blockY: by,
    grid: stage.metrics.scaledGridSize,
  });
  const macro = macros.get(b.uid) ?? { block: b.uid, blocks: [] },
    known = innerIds.get(b.uid);
  setNextId(1);
  for (const blk of macro.blocks)
    if (BLOCKS_BY_ID.has(blk.type)) {
      const fixed = known?.ids[blk.id];
      if (fixed !== undefined) setNextId(fixed);
      addBlock(blk.type, blk.x ?? 0, blk.y ?? 0, structuredClone(blk.params ?? {}), blk.id, true);
    }
  setNextId(Math.max(nextId, known?.nextId ?? 1, ...[...model.keys()].map((k) => k + 1)));
  const audio = innerSamples.get(b.uid); // the inner world has it already: shown, not sent again
  for (const [iid, blk] of model) {
    const buf = audio?.get(blk.uid);
    if (buf) showBuffer(iid, buf);
    else void resolveSample(iid);
  }
  setConnectionOrder([...(macro.connectionOrder ?? [])]);
  addLabels(readLabels(macro.labels));
  viewWorld(id);
  // the processor reports the inner samplers' sounds
  if (juce) juce.emitEvent('bd_samplesHello', {});
  const metrics = stage.metrics; // opening it shows its blocks
  applyView(
    frameBlocks([...model.values()], macro.view, {
      width: metrics.width,
      height: metrics.height,
      unit: metrics.unit,
      area: insideFrame(),
    }),
  );
  setMenuHidden(INSIDE_HIDDEN);
  scene.setBlocks([...v1Blocks.values()]);
  setUiSync(true);
  stage.redraw();
}

/** Back to the outer world. `keep`: what is inside is kept as the Stage's macro (not when the patch
 * is being replaced). */
export function leaveStage(keep: boolean): void {
  const i = inside;
  if (!i) return;
  endLabelEdit(true);
  endPlacing(false);
  scene.OptionsPanel.Close();
  if (keep) {
    macros.set(i.stageUid, innerMacro());
    innerIds.set(i.stageUid, {
      ids: Object.fromEntries([...model].map(([id, b]) => [b.uid, id])),
      nextId,
    });
    innerSamples.set(
      i.stageUid,
      new Map(
        [...samples].flatMap(([id, buf]) => {
          const b = model.get(id);
          return b ? [[b.uid, buf] as [string, AudioBuffer]] : [];
        }),
      ),
    );
  }
  clearWorld();
  setInside(null);
  viewWorld(0);
  const outer = i.outer;
  for (const [id, b] of outer.model) {
    model.set(id, b);
    stage.upsertBlock({
      id,
      type: b.type,
      x: b.x,
      y: b.y,
      starPos: b.type === 'power.void' ? starPos(id) : undefined,
    });
  }
  for (const [id, v1Block] of outer.v1Blocks) v1Blocks.set(id, v1Block);
  for (const [id, buffer] of outer.samples) samples.set(id, buffer);
  for (const id of outer.missing) missing.add(id);
  labels.push(...outer.labels);
  setConnectionOrder(outer.connectionOrder);
  setNextId(outer.nextId);
  undoStack.length = 0;
  redoStack.length = 0;
  undoStack.push(...(outer.undo as typeof undoStack));
  redoStack.push(...(outer.redo as typeof redoStack));
  applyView(outer.view);
  setMenuHidden(OUTSIDE_HIDDEN);
  scene.setBlocks([...v1Blocks.values()]);
  setUiSync(true);
  stage.redraw();
}

export function exitStage(): void {
  if (!inside) return;
  leaveStage(true);
  changed();
}
