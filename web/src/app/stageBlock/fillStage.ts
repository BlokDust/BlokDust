// Blocks going into a Stage block: wrapping a selection, or dropping onto one.
import { type Label } from '../../stage/labels.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { stage } from '../boot/pixi.ts';
import { removeBlock } from '../editing/deleteBlocks.ts';
import { type Snap, type XY, pushUndo, stageSnapOf } from '../editing/undoSteps.ts';
import { setSelection } from '../input/selection.ts';
import { addLabels, labelsChanged } from '../labels/labels.ts';
import {
  type ModelBlock,
  SESSION_PARAMS,
  connectionOrder,
  labels,
  model,
  nextId,
  selectedLabels,
} from '../model/patchModel.ts';
import { innerIds, innerSamples, inside, macros } from '../model/stageWorlds.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { enterStage, exitStage } from './lookInside.ts';

/** Browser-test hooks. */
declare global {
  interface Window {
    __bd_stage: { enter: typeof enterStage; exit: typeof exitStage; wrap: typeof wrapInStage };
  }
}

/** Can blocks `ids` go inside a Stage? All of them or none: not with a Stage among them (one level,
 * SCOPE-0006), so no block is left behind with its connections cut (owner, 2026-11-14). */
export const canGoInside = (ids: Iterable<number>, except?: number) =>
  !inside && [...ids].every((id) => id === except || model.get(id)?.type !== 'source.stage');

/** The audio of blocks going inside a Stage, by the patch id each has in there. */
export const audioOf = (ids: number[], uidOf: (b: ModelBlock) => string) =>
  new Map(
    ids.flatMap((id) => {
      const b = model.get(id),
        buf = samples.get(id);
      return b && buf ? [[uidOf(b), buf] as [string, AudioBuffer]] : [];
    }),
  );

/** What is going into a Stage, kept whole for undo: blocks where they were before a drag
 * (`from`), labels likewise. */
const keptWhole = (
  ids: number[],
  labelIds: string[],
  from?: Map<number, XY>,
  labelFrom?: Map<string, XY>,
): { gone: Snap[]; kept: Label[] } => ({
  gone: ids.flatMap((id) => {
    const b = model.get(id);
    return b ? [{ b: { ...structuredClone(b), ...from?.get(id) }, buf: samples.get(id) }] : [];
  }),
  kept: labels
    .filter((label) => labelIds.includes(label.id))
    .map((label) => ({ ...label, ...labelFrom?.get(label.id) })),
});

/** Selected blocks become what is inside a new Stage block at (x, y): they leave this stage and
 * carry on in there, with their audio. One undo step (owner, 2026-11-26). */
export function wrapInStage(
  ids: number[],
  x: number,
  y: number,
  labelIds: string[] = [],
): number | null {
  const picked = ids.filter((id) => model.has(id));
  if (!canGoInside(picked) || !picked.length) return null;
  const bs = picked.flatMap((id) => model.get(id) ?? []),
    uids = new Set(bs.map((b) => b.uid));
  const cx = Math.round(bs.reduce((a, b) => a + b.x, 0) / bs.length),
    cy = Math.round(bs.reduce((a, b) => a + b.y, 0) / bs.length);
  const order = connectionOrder.filter(([a, b]) => uids.has(a) && uids.has(b));
  const blocks = bs.map((b) => ({
    id: b.uid,
    type: b.type,
    x: b.x - cx,
    y: b.y - cy,
    params: Object.fromEntries(
      Object.entries(structuredClone(b.params)).filter(([k]) => !SESSION_PARAMS.has(k)),
    ),
  }));
  const audio = audioOf(picked, (b) => b.uid);
  const { gone, kept } = keptWhole(picked, labelIds);
  // selected labels go in too, where they were among the blocks
  const going = takeLabels(labelIds, -cx, -cy);
  for (const id of picked) removeBlock(id);
  const taken = new Set([...model.values()].map((b) => b.uid));
  let uid = `stage${nextId}`;
  for (let k = 2; taken.has(uid); k++) uid = `stage${nextId}_${k}`;
  macros.set(uid, {
    block: uid,
    blocks,
    ...(order.length ? { connectionOrder: order } : {}),
    ...(going.length ? { labels: going } : {}),
  });
  innerSamples.set(uid, audio);
  setSelection([]);
  const stageId = addBlock('source.stage', x, y, {}, uid);
  const after = stageSnapOf(uid);
  if (after) pushUndo({ kind: 'stage', gone, labels: kept, before: null, after });
  return stageId;
}

/** Labels `ids` leave this stage (for a Stage's inside), moved by (dx, dy). */
export function takeLabels(ids: string[], dx: number, dy: number): Label[] {
  const going = labels.filter((label) => ids.includes(label.id));
  if (!going.length) return [];
  for (const label of going) {
    labels.splice(labels.indexOf(label), 1);
    selectedLabels.delete(label.id);
  }
  labelsChanged();
  return going.map((label) => ({ ...label, x: label.x + dx, y: label.y + dy }));
}

/** Copies of labels, moved by (dx, dy); returns the copies' ids. */
export function copyLabels(list: Label[], dx: number, dy: number): string[] {
  const lengthValue = labels.length;
  addLabels(list.map((label) => ({ ...label, x: label.x + dx, y: label.y + dy })));
  const ids = labels.slice(lengthValue).map((label) => label.id);
  if (ids.length) labelsChanged();
  return ids;
}

/** Delete labels (the bin, Delete): not undoable, as a label binned alone. */
export function deleteLabels(ids: Iterable<string>): void {
  const gone = new Set(ids);
  if (!gone.size) return;
  for (let i = labels.length - 1; i >= 0; i--) if (gone.has(labels[i].id)) labels.splice(i, 1);
  for (const id of gone) selectedLabels.delete(id);
  labelsChanged();
}

/** Blocks dropped onto Stage block `stageId` go inside it, right of what is there, with their
 * connections; one undo step, which puts them back at `from` and `labelFrom` (the drag's start). */
export function addToStage(
  stageId: number,
  ids: number[],
  labelIds: string[] = [],
  from?: Map<number, XY>,
  labelFrom?: Map<string, XY>,
): void {
  const stageBlock = model.get(stageId);
  const picked = ids.filter((id) => id !== stageId && model.has(id));
  if (stageBlock?.type !== 'source.stage' || !canGoInside(picked) || !picked.length) return;
  const was = macros.get(stageBlock.uid) ?? { block: stageBlock.uid, blocks: [] };
  const bs = picked.flatMap((id) => model.get(id) ?? []),
    taken = new Set(was.blocks.map((b) => b.id)),
    rename = new Map<string, string>();
  for (const b of bs) {
    let innerUid = b.uid;
    for (let k = 2; taken.has(innerUid); k++) innerUid = `${b.uid}_${k}`;
    taken.add(innerUid);
    rename.set(b.uid, innerUid);
  }
  // Every picked block's uid is in `rename`.
  const renamed = (outerUid: string) => rename.get(outerUid) ?? outerUid;
  const mean = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const minX = Math.min(...bs.map((b) => b.x)),
    maxX = Math.max(...bs.map((b) => b.x)),
    gy = mean(bs.map((b) => b.y));
  const there = was.blocks.map((b) => ({ x: b.x ?? 0, y: b.y ?? 0 }));
  const ox = there.length
    ? Math.max(...there.map((point) => point.x)) + 4 - minX
    : -Math.round((minX + maxX) / 2);
  const oy = there.length ? mean(there.map((point) => point.y)) - gy : -gy;
  const moved = bs.map((b) => {
    const params = Object.fromEntries(
      Object.entries(structuredClone(b.params)).filter(([k]) => !SESSION_PARAMS.has(k)),
    );
    if (typeof params.target === 'string') {
      const [key, k] = params.target.split(':');
      if (rename.has(key)) params.target = `${rename.get(key)}:${k}`;
    } // an LFO going in with its target
    return { id: renamed(b.uid), type: b.type, x: b.x + ox, y: b.y + oy, params };
  });
  const order = [
    ...(was.connectionOrder ?? []),
    ...connectionOrder
      .filter(([a, b]) => rename.has(a) && rename.has(b))
      .map(([a, b]) => [renamed(a), renamed(b)] as [string, string]),
  ];
  const audio = new Map([
    ...(innerSamples.get(stageBlock.uid) ?? []),
    ...audioOf(picked, (b) => renamed(b.uid)),
  ]);
  const before = stageSnapOf(stageBlock.uid);
  const { gone, kept } = keptWhole(picked, labelIds, from, labelFrom);
  const going = takeLabels(labelIds, ox, oy);
  for (const id of picked) removeBlock(id);
  const { uid, x, y, params } = stageBlock;
  scene.OptionsPanel.Close();
  removeBlock(stageId);
  macros.set(uid, {
    ...was,
    blocks: [...was.blocks, ...moved],
    ...(order.length ? { connectionOrder: order } : {}),
    ...(going.length ? { labels: [...(was.labels ?? []), ...going] } : {}),
  });
  innerIds.delete(uid);
  innerSamples.set(uid, audio);
  setSelection([]);
  addBlock('source.stage', x, y, params, uid);
  const after = stageSnapOf(uid);
  if (after) pushUndo({ kind: 'stage', gone, labels: kept, before, after });
  stage.redraw();
}

/** The Stage block under css (x, y) that the blocks `moving` would go into, or null. */
export function dropStageAt(x: number, y: number, moving: Set<number>): number | null {
  if (!canGoInside(moving)) return null;
  const stageBlock = stage.hitTest(x, y, (id) => moving.has(id));
  return stageBlock && model.get(stageBlock.id)?.type === 'source.stage' ? stageBlock.id : null;
}

export function init(): void {
  window.__bd_stage = {
    enter: enterStage,
    exit: exitStage,
    wrap: wrapInStage,
  };
}
