// Blocks going into a Stage block: wrapping a selection, or dropping onto one.
import { type Label } from '../../stage/labels.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { stage } from '../boot/pixi.ts';
import { removeBlock } from '../editing/deleteBlocks.ts';
import { redoStack, undoStack } from '../editing/undoSteps.ts';
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

/** Can blocks `ids` go inside a Stage? All of them or none: not with a Stage among them (one level, SCOPE-0006), so
 * no block is left behind with its connections cut (owner, 2026-11-14). */
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

/** Selected blocks become what is inside a new Stage block at (x, y): they leave this stage and carry on in there,
 * with their audio. Not undoable. */
export function wrapInStage(
  ids: number[],
  x: number,
  y: number,
  labelIds: string[] = [],
): number | null {
  const picked = ids.filter((id) => model.has(id));
  if (!canGoInside(picked) || !picked.length) return null;
  const bs = picked.map((id) => model.get(id)!),
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
  const going = takeLabels(labelIds, -cx, -cy); // selected labels go in too, where they were among the blocks
  for (const id of picked) removeBlock(id);
  undoStack.length = 0;
  redoStack.length = 0;
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
  return addBlock('source.stage', x, y, {}, uid);
}

/** Blocks dropped onto Stage block `stageId` go inside it (owner, 2026-11-14), to the right of what is there, keeping
 * their layout and their connections. Its inner world starts again. Not undoable (as wrapping). */
/** Labels `ids` leave this stage (for a Stage's inside), moved by (dx, dy). */
export function takeLabels(ids: string[], dx: number, dy: number): Label[] {
  const going = labels.filter((l) => ids.includes(l.id));
  if (!going.length) return [];
  for (const l of going) {
    labels.splice(labels.indexOf(l), 1);
    selectedLabels.delete(l.id);
  }
  labelsChanged();
  return going.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy }));
}

/** Copies of labels, moved by (dx, dy); returns the copies' ids. */
export function copyLabels(list: Label[], dx: number, dy: number): string[] {
  const n = labels.length;
  addLabels(list.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })));
  const ids = labels.slice(n).map((l) => l.id);
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

export function addToStage(stageId: number, ids: number[], labelIds: string[] = []): void {
  const s = model.get(stageId);
  const picked = ids.filter((id) => id !== stageId && model.has(id));
  if (!s || s.type !== 'source.stage' || !canGoInside(picked) || !picked.length) return;
  const was = macros.get(s.uid) ?? { block: s.uid, blocks: [] };
  const bs = picked.map((id) => model.get(id)!),
    taken = new Set(was.blocks.map((b) => b.id)),
    rename = new Map<string, string>();
  for (const b of bs) {
    let u = b.uid;
    for (let k = 2; taken.has(u); k++) u = `${b.uid}_${k}`;
    taken.add(u);
    rename.set(b.uid, u);
  }
  const mean = (v: number[]) => Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  const minX = Math.min(...bs.map((b) => b.x)),
    maxX = Math.max(...bs.map((b) => b.x)),
    gy = mean(bs.map((b) => b.y));
  const there = was.blocks.map((b) => ({ x: b.x ?? 0, y: b.y ?? 0 }));
  const ox = there.length
    ? Math.max(...there.map((p) => p.x)) + 4 - minX
    : -Math.round((minX + maxX) / 2);
  const oy = there.length ? mean(there.map((p) => p.y)) - gy : -gy;
  const moved = bs.map((b) => {
    const params = Object.fromEntries(
      Object.entries(structuredClone(b.params)).filter(([k]) => !SESSION_PARAMS.has(k)),
    );
    if (typeof params.target === 'string') {
      const [u, k] = params.target.split(':');
      if (rename.has(u)) params.target = `${rename.get(u)}:${k}`;
    } // an LFO going in with its target
    return { id: rename.get(b.uid)!, type: b.type, x: b.x + ox, y: b.y + oy, params };
  });
  const order = [
    ...(was.connectionOrder ?? []),
    ...connectionOrder
      .filter(([a, b]) => rename.has(a) && rename.has(b))
      .map(([a, b]) => [rename.get(a)!, rename.get(b)!] as [string, string]),
  ];
  const audio = new Map([
    ...(innerSamples.get(s.uid) ?? []),
    ...audioOf(picked, (b) => rename.get(b.uid)!),
  ]);
  const going = takeLabels(labelIds, ox, oy);
  for (const id of picked) removeBlock(id);
  const { uid, x, y, params } = s;
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
  undoStack.length = 0;
  redoStack.length = 0;
  setSelection([]);
  addBlock('source.stage', x, y, params, uid);
  stage.redraw();
}

/** The Stage block under css (x, y) that the blocks `moving` would go into, or null. */
export function dropStageAt(x: number, y: number, moving: Set<number>): number | null {
  if (!canGoInside(moving)) return null;
  const t = stage.hitTest(x, y, (id) => moving.has(id));
  return t && model.get(t.id)?.type === 'source.stage' ? t.id : null;
}

export function init(): void {
  (window as unknown as { __bd_stage?: unknown }).__bd_stage = {
    enter: enterStage,
    exit: exitStage,
    wrap: wrapInStage,
  };
}
