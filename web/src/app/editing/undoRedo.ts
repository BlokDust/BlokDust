// Undo and redo, and the label moves they carry.
import { usage } from '../boot/sessionAnalytics.ts';
import { type Label } from '../../stage/labels.ts';
import { stage } from '../boot/pixi.ts';
import { moveBlock, removeBlock } from './deleteBlocks.ts';
import {
  type LabelMove,
  type XY,
  idOfUid,
  pushUndo,
  redoStack,
  restore,
  snapOf,
  undoStack,
} from './undoSteps.ts';
import { setSelection } from '../input/selection.ts';
import { addLabels, endLabelEdit, labelEdit, labelsChanged } from '../labels/labels.ts';
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
  for (const u of uids) {
    const id = idOfUid(u);
    if (id !== undefined) removeBlock(id);
  }
};

export const moveUids = (moves: { uid: string; from: XY; to: XY }[], to: boolean) => {
  for (const m of moves) {
    const id = idOfUid(m.uid),
      at = to ? m.to : m.from;
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
  } else {
    moveUids(step.moves, true);
    moveLabelSteps(step.labelMoves ?? [], true);
    undoStack.push(step);
  }
  setSelection([]);
  stage.redraw();
  return true;
}
