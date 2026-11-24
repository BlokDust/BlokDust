// Insert: new blocks follow the pointer until a click (or a drag on touch) puts them down.
import { stage } from '../boot/pixi.ts';
import { moveBlock, removeBlock } from './deleteBlocks.ts';
import { pushUndo, uidsOf, undoStack } from './undoSteps.ts';
import { model } from '../model/patchModel.ts';

export let placing: {
  ids: number[];
  at: { x: number; y: number };
  touch: boolean;
  grabbed?: boolean;
} | null = null;

export let lastPointer: { x: number; y: number } | null = null;

export let lastPointerType = 'mouse';

export function startPlacing(ids: number[], touch: boolean, at: { x: number; y: number }): void {
  if (!ids.length) return;
  placing = { ids, at: { x: Math.round(at.x), y: Math.round(at.y) }, touch };
  stage.placing = new Set(ids);
  for (const id of ids) stage.toFront(id);
  pushUndo({ kind: 'add', uids: uidsOf(ids) });
  stage.redraw();
}

/** Move the placed blocks with the pointer, a whole grid cell at a time, as a drag does. */
export function placeAt(gx: number, gy: number): void {
  if (!placing) return;
  const x = Math.round(gx),
    y = Math.round(gy),
    dx = x - placing.at.x,
    dy = y - placing.at.y;
  if (!dx && !dy) return;
  for (const id of placing.ids) {
    const b = model.get(id);
    if (b) moveBlock(id, b.x + dx, b.y + dy);
  }
  placing.at = { x, y };
}

export function endPlacing(cancel: boolean): void {
  if (!placing) return;
  if (cancel) {
    const uids = new Set(placing.ids.map((id) => model.get(id)?.uid));
    for (const id of placing.ids) removeBlock(id);
    const top = undoStack.at(-1);
    if (top?.kind === 'add' && top.uids.every((uid) => uids.has(uid))) undoStack.pop();
  }
  placing = null;
  stage.placing = new Set();
  stage.redraw();
}

export function setLastPointerType<Value extends typeof lastPointerType>(value: Value): Value {
  lastPointerType = value;
  return value;
}

export function setLastPointer<Value extends typeof lastPointer>(value: Value): Value {
  lastPointer = value;
  return value;
}

export function init(): void {
  (window as unknown as { __bd_placing: () => unknown }).__bd_placing = () =>
    placing && { ids: [...placing.ids], touch: placing.touch };
}
