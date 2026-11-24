// Undo and redo, and the label moves they carry.
import { type Label } from '../../stage/labels.ts';
import { usage } from '../boot/page.ts';
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
      f = from.get(id);
    return b && f && (b.x !== f.x || b.y !== f.y)
      ? [{ uid: b.uid, from: f, to: { x: b.x, y: b.y } }]
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
    const l = labels.find((x) => x.id === id);
    return l ? [{ ...l }] : [];
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
  addLabels(list.map((l) => ({ ...l })));
  labelsChanged();
}

export function moveLabelSteps(moves: LabelMove[], to: boolean): void {
  if (!moves.length) return;
  for (const m of moves) {
    const l = labels.find((x) => x.id === m.id);
    if (l) {
      const at = to ? m.to : m.from;
      l.x = at.x;
      l.y = at.y;
    }
  }
  labelsChanged();
}

/** Where labels `ids` stand now (the start of a drag). */
export const labelPlaces = (ids: Iterable<string>) =>
  new Map(
    [...ids].flatMap((id) => {
      const l = labels.find((x) => x.id === id);
      return l ? [[id, { x: l.x, y: l.y }] as [string, XY]] : [];
    }),
  );

/** Label moves since `from`, for a move step. */
export const labelMovesSince = (from: Map<string, XY>): LabelMove[] =>
  [...from].flatMap(([id, f]) => {
    const l = labels.find((x) => x.id === id);
    return l && (l.x !== f.x || l.y !== f.y) ? [{ id, from: f, to: { x: l.x, y: l.y } }] : [];
  });

/** Undo the last step; false when there is none. */
export function undo(): boolean {
  const u = undoStack.pop();
  if (u) usage.undos++;
  if (!u) return false;
  if (u.kind === 'add') {
    const snaps = u.uids.flatMap((uid) => {
      const s = snapOf(uid);
      return s ? [s] : [];
    });
    const labelSnaps = labelSnapsOf(u.labels ?? []);
    removeUids(u.uids);
    takeOutLabels(u.labels ?? []);
    redoStack.push({ kind: 'add', uids: u.uids, snaps, labels: u.labels, labelSnaps });
  } else if (u.kind === 'remove') {
    for (const s of u.snaps) restore(s);
    putBackLabels(u.labels ?? []);
    redoStack.push(u);
  } else {
    moveUids(u.moves, false);
    moveLabelSteps(u.labelMoves ?? [], false);
    redoStack.push(u);
  }
  setSelection([]);
  stage.redraw();
  return true;
}

/** Redo the last undone step; false when there is none. */
export function redo(): boolean {
  const u = redoStack.pop();
  if (!u) return false;
  if (u.kind === 'add') {
    for (const s of u.snaps ?? []) restore(s);
    putBackLabels(u.labelSnaps ?? []);
    undoStack.push({ kind: 'add', uids: u.uids, labels: u.labels });
  } else if (u.kind === 'remove') {
    const snaps = u.snaps.flatMap((s) => {
      const now = snapOf(s.b.uid);
      return now ? [now] : [];
    });
    const ids = (u.labels ?? []).map((l) => l.id),
      labelsNow = labelSnapsOf(ids);
    removeUids(u.snaps.map((s) => s.b.uid));
    takeOutLabels(ids);
    undoStack.push({ kind: 'remove', snaps, labels: labelsNow });
  } else {
    moveUids(u.moves, true);
    moveLabelSteps(u.labelMoves ?? [], true);
    undoStack.push(u);
  }
  setSelection([]);
  stage.redraw();
  return true;
}
