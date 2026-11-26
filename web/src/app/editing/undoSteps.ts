// Undo steps and the stacks that hold them.
import { type Label } from '../../stage/labels.ts';
import type { Macro } from '../../patch/loadPatch.ts';
import { activity } from '../../account/activity.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { type ModelBlock, countActivity, model } from '../model/patchModel.ts';
import { innerSamples, macros } from '../model/stageWorlds.ts';
import { samples, useBuffer } from '../samples/userSamples.ts';

// A step adds, moves, deletes or puts in a Stage blocks and labels; params and words are not.
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

/** A Stage block kept whole: the block, what is inside it and its samplers' audio. */
export interface StageSnap {
  snap: Snap;
  macro: Macro;
  audio: Map<string, AudioBuffer>;
}

export type UndoStep =
  | { kind: 'add'; uids: string[]; snaps?: Snap[]; labels?: string[]; labelSnaps?: Label[] }
  | { kind: 'remove'; snaps: Snap[]; labels?: Label[] }
  | { kind: 'move'; moves: { uid: string; from: XY; to: XY }[]; labelMoves?: LabelMove[] }
  /** Blocks and labels taken into a Stage (MAKE STAGE, Cmd/Ctrl+G, a drop onto one): what went
   * in, kept whole; the Stage before (a drop onto one already there) and after. */
  | { kind: 'stage'; gone: Snap[]; labels: Label[]; before: StageSnap | null; after: StageSnap };

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

/** Stage block `uid` as it is now, kept whole; null when it is not on this stage. */
export const stageSnapOf = (uid: string): StageSnap | null => {
  const snap = snapOf(uid);
  return snap
    ? {
        snap,
        macro: structuredClone(macros.get(uid) ?? { block: uid, blocks: [] }),
        audio: new Map(innerSamples.get(uid)),
      }
    : null;
};
