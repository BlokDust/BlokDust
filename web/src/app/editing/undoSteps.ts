// Undo steps and the stacks that hold them.
import { type Label } from '../../stage/labels.ts';
import { activity } from '../../account/activity.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { type ModelBlock, countActivity, model } from '../model/patchModel.ts';
import { samples, useBuffer } from '../samples/userSamples.ts';

/** Undo and redo (owner, 2026-11-10/11, and 2026-11-12 CHG-0010): adding blocks (from the menu, Insert, Cmd/Ctrl+D,
 * Alt-drag copies), moving and deleting them, each one step however many blocks it took. Steps name blocks by
 * their patch id, which a block keeps when undo or redo brings it back; a removed block is kept whole (settings,
 * place, its sound). A new action clears what could be redone. Param changes are not steps. */
export type XY = { x: number; y: number };

export type Snap = { b: ModelBlock; buf?: AudioBuffer };

// Labels (owner, 2026-11-14) are in the same steps, by label id: made (with the blocks made), removed (kept whole) and
// moved. Their words are not steps (as params are not).
export type LabelMove = { id: string; from: XY; to: XY };

export type UndoStep =
  | { kind: 'add'; uids: string[]; snaps?: Snap[]; labels?: string[]; labelSnaps?: Label[] }
  | { kind: 'remove'; snaps: Snap[]; labels?: Label[] }
  | { kind: 'move'; moves: { uid: string; from: XY; to: XY }[]; labelMoves?: LabelMove[] };

export const undoStack: UndoStep[] = [],
  redoStack: UndoStep[] = [];

export const pushUndo = (u: UndoStep) => {
  if (u.kind === 'add' && countActivity) activity.blockAdded(u.uids.length);
  undoStack.push(u);
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
};

export const idOfUid = (uid: string) => {
  for (const [id, b] of model) if (b.uid === uid) return id;
  return undefined;
};

export const uidsOf = (ids: Iterable<number>) =>
  [...ids].flatMap((id) => {
    const b = model.get(id);
    return b ? [b.uid] : [];
  });

export const snapOf = (uid: string): Snap | null => {
  const id = idOfUid(uid),
    b = id === undefined ? undefined : model.get(id);
  return b ? { b: structuredClone(b), buf: samples.get(id!) } : null;
};

export function restore(s: Snap): void {
  const id = addBlock(
    s.b.type,
    s.b.x,
    s.b.y,
    structuredClone(s.b.params),
    idOfUid(s.b.uid) === undefined ? s.b.uid : undefined,
  );
  if (s.buf && s.b.type !== 'source.sample-gen') useBuffer(id, s.buf, 'keep');
}
