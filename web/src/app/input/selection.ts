import { addBlock } from '../blocks/addBlock.ts';
import { stage } from '../boot/pixi.ts';
import { dpr, drag } from './pointerState.ts';
import { labels, model, selLabels, selectedLabels } from '../model/patchModel.ts';
import { buildStage, innerSamples, macros } from '../model/stageWorlds.ts';
import { samples, useBuffer } from '../samples/userSamples.ts';

// ---- multi-select (CHG-0005 task 9, owner): Shift+click adds or removes a block; Shift+drag on the stage (or, on a
// touch screen, holding a finger still on the stage for a moment, then dragging) draws a box that selects the blocks
// in it. Dragging a selected block moves them all; Alt+drag copies them all; dropping them on the trash, or
// Delete/Backspace, deletes them; Cmd/Ctrl+D duplicates them, Cmd/Ctrl+A selects everything, Esc or a tap on the stage
// clears it. v1 had one selected block (its options panel); that is unchanged. ----
export let selection!: Set<number>;

export let box: { x0: number; y0: number; x1: number; y1: number; add: boolean } | null = null;

export let downAt: { x: number; y: number } | null = null;

export let longPress: ReturnType<typeof setTimeout> | null = null;

export const LONG_PRESS_MS = 450,
  STILL_PX = 8;

export function setSelection(ids: Iterable<number>, labelIds: Iterable<string> = []): void {
  selection.clear();
  selectedLabels.clear();
  for (const id of ids) if (model.has(id)) selection.add(id);
  for (const id of labelIds) if (labels.some((label) => label.id === id)) selectedLabels.add(id);
  stage.redraw();
}

/** Blocks and labels selected. */
export const selectionSize = () => selection.size + selLabels().length;

export const grouped = () => !!drag && selection.has(drag.id) && selectionSize() > 1;

export function showBox(): void {
  stage.selectBox = box && {
    x0: box.x0 * dpr(),
    y0: box.y0 * dpr(),
    x1: box.x1 * dpr(),
    y1: box.y1 * dpr(),
  };
  stage.redraw();
}

export function finishBox(): void {
  if (!box) return;
  const [ax, ay] = stage.cssToGrid(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1));
  const [bx, by] = stage.cssToGrid(Math.max(box.x0, box.x1), Math.max(box.y0, box.y1));
  const inside = [...model.entries()]
    .filter(([, b]) => b.x >= ax && b.x <= bx && b.y >= ay && b.y <= by)
    .map(([id]) => id);
  const insideLabels = labels
    .filter((label) => label.x >= ax && label.x <= bx && label.y >= ay && label.y <= by)
    .map((label) => label.id); // by the dot
  setSelection(
    box.add ? [...selection, ...inside] : inside,
    box.add ? [...selectedLabels, ...insideLabels] : insideLabels,
  );
  box = null;
  showBox();
}

/** Copies of the selected blocks (same params and audio), offset by (dx, dy); returns the copies' ids by original. */
export function copyBlocks(ids: number[], dx: number, dy: number): Map<number, number> {
  const made = new Map<number, number>();
  for (const id of ids) {
    const b = model.get(id);
    if (!b) continue;
    const copy = addBlock(b.type, b.x + dx, b.y + dy, structuredClone(b.params));
    if (b.type === 'source.stage' && macros.has(b.uid)) {
      // a copy of a Stage has a copy of what is inside
      const uid = model.get(copy)!.uid;
      macros.set(uid, { ...structuredClone(macros.get(b.uid)!), block: uid });
      if (innerSamples.has(b.uid)) innerSamples.set(uid, new Map(innerSamples.get(b.uid)));
      buildStage(copy, uid);
    }
    const buf = samples.get(id);
    if (buf && b.type !== 'source.sample-gen') useBuffer(copy, buf, 'keep');
    made.set(id, copy);
  }
  return made;
}

export function setDownAt<Value extends typeof downAt>(value: Value): Value {
  downAt = value;
  return value;
}

export function setBox<Value extends typeof box>(value: Value): Value {
  box = value;
  return value;
}

export function setLongPress<Value extends typeof longPress>(value: Value): Value {
  longPress = value;
  return value;
}

export function init(): void {
  selection = stage.selected;
  (window as unknown as { __bd_selection?: unknown }).__bd_selection = () => [...selection];
  (window as unknown as { __bd_label_selection?: unknown }).__bd_label_selection = () => [
    ...selectedLabels,
  ];
}
