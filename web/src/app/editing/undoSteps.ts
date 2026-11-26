// Undo steps and the stacks that hold them.
import { type Label } from '../../stage/labels.ts';
import { activity } from '../../account/activity.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { type ModelBlock, countActivity, model } from '../model/patchModel.ts';
import { samples, useBuffer } from '../samples/userSamples.ts';

// A step adds, moves or deletes blocks (however many) and labels; params and words are not steps.
// Blocks are named by patch id, kept when they come back; a removed block is kept whole.
export interface XY {
  x: number;
  y: number;
}

export interface Snap {
  b: ModelBlock;
  buf?: AudioBuffer;
}

export interface LabelMove {
  id: string;
  from: XY;
  to: XY;
}

export type UndoStep =
  | { kind: 'add'; uids: string[]; snaps?: Snap[]; labels?: string[]; labelSnaps?: Label[] }
  | { kind: 'remove'; snaps: Snap[]; labels?: Label[] }
  | { kind: 'move'; moves: { uid: string; from: XY; to: XY }[]; labelMoves?: LabelMove[] };

const MAX_UNDO_STEPS = 100;
export const undoStack: UndoStep[] = [];
export const redoStack: UndoStep[] = [];

/** A new action clears what could be redone. */
export const pushUndo = (step: UndoStep) => {
  if (step.kind === 'add' && countActivity) activity.blockAdded(step.uids.length);
  undoStack.push(step);
  if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
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
  const id = idOfUid(uid);
  const block = id === undefined ? undefined : model.get(id);
  return id !== undefined && block ? { b: structuredClone(block), buf: samples.get(id) } : null;
};

export function restore(snap: Snap): void {
  const id = addBlock(
    snap.b.type,
    snap.b.x,
    snap.b.y,
    structuredClone(snap.b.params),
    idOfUid(snap.b.uid) === undefined ? snap.b.uid : undefined,
  );
  if (snap.buf && snap.b.type !== 'source.sample-gen') useBuffer(id, snap.buf, 'keep');
}
