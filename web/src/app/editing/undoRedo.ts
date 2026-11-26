// Undo and redo, and the label moves they carry.
import { endLabelEdit, labelEdit } from '../labels/labelEditing.ts';
import { usage } from '../boot/sessionAnalytics.ts';
import { type Label } from '../../stage/labels.ts';
import { stage } from '../boot/pixi.ts';
import { moveBlock, removeBlock } from './deleteBlocks.ts';
import {
  type LabelMove,
  type StageSnap,
  type UndoStep,
  type XY,
  idOfUid,
  pushUndo,
  redoStack,
  restore,
  snapOf,
  stageSnapOf,
  undoStack,
} from './undoSteps.ts';
import { innerIds, innerSamples, macros } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';
import { setSelection } from '../input/selection.ts';
import { addLabels, labelsChanged } from '../labels/labels.ts';
import { labels, model, selectedLabels } from '../model/patchModel.ts';

/** A drag that ended: one move step for the blocks it moved. */
export function recordMove(
  ids: number[],
  from: Map<number, XY>,
  labelFrom?: Map<string, XY>,
): void {
  const moves = ids.flatMap((id) => {
    const b = model.get(id),
      point = from.get(id);
    return b && point && (b.x !== point.x || b.y !== point.y)
      ? [{ uid: b.uid, from: point, to: { x: b.x, y: b.y } }]
      : [];
  });
  const labelMoves = labelFrom ? labelMovesSince(labelFrom) : [];
  if (moves.length || labelMoves.length)
    pushUndo({ kind: 'move', moves, ...(labelMoves.length ? { labelMoves } : {}) });
}

export const removeUids = (uids: string[]) => {
  for (const uid of uids) {
    const id = idOfUid(uid);
    if (id !== undefined) removeBlock(id);
  }
};

export const moveUids = (moves: { uid: string; from: XY; to: XY }[], to: boolean) => {
  for (const move of moves) {
    const id = idOfUid(move.uid),
      at = to ? move.to : move.from;
    if (id !== undefined) moveBlock(id, at.x, at.y);
  }
};

export const labelSnapsOf = (ids: string[]) =>
  ids.flatMap((id) => {
    const label = labels.find((x) => x.id === id);
    return label ? [{ ...label }] : [];
  });

/** Labels out (undo, redo): as deleting them, without a step. */
export function takeOutLabels(ids: string[]): void {
  const gone = new Set(ids);
  if (!gone.size) return;
  for (let i = labels.length - 1; i >= 0; i--) if (gone.has(labels[i].id)) labels.splice(i, 1);
  for (const id of gone) selectedLabels.delete(id);
  if (labelEdit && gone.has(labelEdit.id)) endLabelEdit(false);
  labelsChanged();
}

/** Labels back (undo, redo), with the ids they had. */
export function putBackLabels(list: Label[]): void {
  if (!list.length) return;
  addLabels(list.map((label) => ({ ...label })));
  labelsChanged();
}

export function moveLabelSteps(moves: LabelMove[], to: boolean): void {
  if (!moves.length) return;
  for (const move of moves) {
    const label = labels.find((x) => x.id === move.id);
    if (label) {
      const at = to ? move.to : move.from;
      label.x = at.x;
      label.y = at.y;
    }
  }
  labelsChanged();
}

/** Where labels `ids` stand now (the start of a drag). */
export const labelPlaces = (ids: Iterable<string>) =>
  new Map(
    [...ids].flatMap((id) => {
      const label = labels.find((x) => x.id === id);
      return label ? [[id, { x: label.x, y: label.y }] as [string, XY]] : [];
    }),
  );

/** Label moves since `from`, for a move step. */
export const labelMovesSince = (from: Map<string, XY>): LabelMove[] =>
  [...from].flatMap(([id, point]) => {
    const label = labels.find((x) => x.id === id);
    return label && (label.x !== point.x || label.y !== point.y)
      ? [{ id, from: point, to: { x: label.x, y: label.y } }]
      : [];
  });

/** Stage block `uid` out (its inside forgotten), then `put` in its place when given. */
function swapStage(uid: string, put: StageSnap | null): void {
  const id = idOfUid(uid);
  if (id !== undefined) {
    scene.OptionsPanel.Close();
    removeBlock(id);
  }
  macros.delete(uid);
  innerIds.delete(uid);
  innerSamples.delete(uid);
  if (!put) return;
  macros.set(uid, structuredClone(put.macro));
  innerSamples.set(uid, new Map(put.audio));
  restore(put.snap);
}

/** Undo a Stage step: the Stage as it was before, and what went in back out where it was. */
function undoStage(step: Extract<UndoStep, { kind: 'stage' }>): void {
  const uid = step.after.snap.b.uid,
    // as it is now (moved, or changed inside, since), for redo
    now = stageSnapOf(uid) ?? step.after;
  swapStage(uid, step.before);
  for (const snap of step.gone) restore(snap);
  putBackLabels(step.labels);
  redoStack.push({ ...step, after: now });
}

/** Redo a Stage step: what went in goes in again (as it is now), and the Stage is as it was. */
function redoStage(step: Extract<UndoStep, { kind: 'stage' }>): void {
  const uid = step.after.snap.b.uid;
  const gone = step.gone.flatMap((snap) => {
    const now = snapOf(snap.b.uid);
    return now ? [now] : [];
  });
  const labelsNow = labelSnapsOf(step.labels.map((label) => label.id));
  const before = step.before ? stageSnapOf(uid) : null;
  removeUids(step.gone.map((snap) => snap.b.uid));
  takeOutLabels(step.labels.map((label) => label.id));
  swapStage(uid, step.after);
  undoStack.push({ ...step, gone, labels: labelsNow, before });
}

/** Undo the last step; false when there is none. */
export function undo(): boolean {
  const step = undoStack.pop();
  if (step) usage.undos++;
  if (!step) return false;
  if (step.kind === 'add') {
    const snaps = step.uids.flatMap((uid) => {
      const snap = snapOf(uid);
      return snap ? [snap] : [];
    });
    const labelSnaps = labelSnapsOf(step.labels ?? []);
    removeUids(step.uids);
    takeOutLabels(step.labels ?? []);
    redoStack.push({ kind: 'add', uids: step.uids, snaps, labels: step.labels, labelSnaps });
  } else if (step.kind === 'remove') {
    for (const snap of step.snaps) restore(snap);
    putBackLabels(step.labels ?? []);
    redoStack.push(step);
  } else if (step.kind === 'stage') {
    undoStage(step);
  } else {
    moveUids(step.moves, false);
    moveLabelSteps(step.labelMoves ?? [], false);
    redoStack.push(step);
  }
  setSelection([]);
  stage.redraw();
  return true;
}

/** Redo the last undone step; false when there is none. */
export function redo(): boolean {
  const step = redoStack.pop();
  if (!step) return false;
  if (step.kind === 'add') {
    for (const snap of step.snaps ?? []) restore(snap);
    putBackLabels(step.labelSnaps ?? []);
    undoStack.push({ kind: 'add', uids: step.uids, labels: step.labels });
  } else if (step.kind === 'remove') {
    const snaps = step.snaps.flatMap((snap) => {
      const now = snapOf(snap.b.uid);
      return now ? [now] : [];
    });
    const ids = (step.labels ?? []).map((label) => label.id),
      labelsNow = labelSnapsOf(ids);
    removeUids(step.snaps.map((snap) => snap.b.uid));
    takeOutLabels(ids);
    undoStack.push({ kind: 'remove', snaps, labels: labelsNow });
  } else if (step.kind === 'stage') {
    redoStage(step);
  } else {
    moveUids(step.moves, true);
    moveLabelSteps(step.labelMoves ?? [], true);
    undoStack.push(step);
  }
  setSelection([]);
  stage.redraw();
  return true;
}
