// Removing and deleting blocks.
import { usage } from '../boot/sessionAnalytics.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { releaseInputIfUnused } from '../audio/microphone.ts';
import { syncTargets } from '../blocks/lfoTargets.ts';
import { stage } from '../boot/pixi.ts';
import { labelSnapsOf } from './undoRedo.ts';
import { type XY, pushUndo } from './undoSteps.ts';
import { changed } from '../model/autosave.ts';
import { send } from '../model/engineLink.ts';
import { model, v1Blocks } from '../model/patchModel.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { deleteLabels } from '../stageBlock/fillStage.ts';

export function removeBlock(id: number): void {
  if (!model.has(id)) return;
  model.delete(id);
  v1Blocks.delete(id);
  stage.selected.delete(id);
  stage.held.delete(id);
  stage.removeBlock(id);
  send([{ type: CommandType.RemoveBlock, id }]);
  syncTargets();
  scene.setBlocks([...v1Blocks.values()]);
  changed();
  releaseInputIfUnused();
}

/** Delete blocks as one undoable step. */
export function deleteBlocks(
  ids: number[],
  from?: Map<number, { x: number; y: number }>,
  labelIds: string[] = [],
  labelFrom?: Map<string, XY>,
): void {
  usage.blocksDeleted += ids.length;
  // Kept where they were before the drag that took them to the trash.
  const snaps = ids.flatMap((id) => {
    const b = model.get(id);
    return b ? [{ b: { ...structuredClone(b), ...from?.get(id) }, buf: samples.get(id) }] : [];
  });
  const gone = labelSnapsOf(labelIds).map((label) => ({ ...label, ...labelFrom?.get(label.id) }));
  if (!snaps.length && !gone.length) return;
  for (const id of ids) removeBlock(id);
  deleteLabels(gone.map((label) => label.id));
  pushUndo({ kind: 'remove', snaps, ...(gone.length ? { labels: gone } : {}) });
}

export function moveBlock(id: number, x: number, y: number): void {
  const b = model.get(id),
    sb = stage.block(id);
  if (!b || !sb) return;
  b.x = x;
  b.y = y;
  const v1Block = v1Blocks.get(id);
  if (v1Block) {
    v1Block.Position.x = x;
    v1Block.Position.y = y;
  }
  stage.upsertBlock({ ...sb, x, y });
  send([{ type: CommandType.MoveBlock, id, x, y }]);
  changed();
}
