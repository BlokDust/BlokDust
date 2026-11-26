// Dragging a label (onto the bin deletes it); a selected one moves the whole selection.
import { stage } from '../boot/pixi.ts';
import { moveBlock } from '../editing/deleteBlocks.ts';
import type { XY } from '../editing/undoSteps.ts';
import { STILL_PX } from '../input/selection.ts';
import { labels, model, selLabels } from '../model/patchModel.ts';

export interface LabelDrag {
  id: string;
  pointer: number;
  grabX: number;
  grabY: number;
  moved: boolean;
  fresh: boolean;
  downX: number;
  downY: number;
  /** With a selection: where its blocks started (they move in whole cells, as blocks do). */
  group?: Map<number, XY>;
  /** Where the dragged labels were at the start (undo). */
  labelFrom?: Map<string, XY>;
}

export let labelDrag: LabelDrag | null = null;

export function setLabelDrag<Value extends typeof labelDrag>(value: Value): Value {
  labelDrag = value;
  return value;
}

function moveSelection(
  drag: LabelDrag & { group: Map<number, XY> },
  cellsX: number,
  cellsY: number,
) {
  for (const label of selLabels()) {
    label.x += cellsX;
    label.y += cellsY;
  }
  for (const id of drag.group.keys()) {
    const block = model.get(id);
    if (block) moveBlock(id, block.x + cellsX, block.y + cellsY);
  }
}

export function moveLabel(event: PointerEvent): void {
  const drag = labelDrag;
  const label = drag && labels.find((candidate) => candidate.id === drag.id);
  if (!drag || !label) return;
  if (!drag.moved && Math.hypot(event.offsetX - drag.downX, event.offsetY - drag.downY) > STILL_PX)
    drag.moved = true;
  if (!drag.moved) return;
  const [gridX, gridY] = stage.cssToGrid(event.offsetX, event.offsetY);
  if (drag.group) {
    const cellsX = Math.round(gridX - drag.grabX - label.x);
    const cellsY = Math.round(gridY - drag.grabY - label.y);
    if (cellsX || cellsY) moveSelection({ ...drag, group: drag.group }, cellsX, cellsY);
    stage.redraw();
    return;
  }
  // Half cells: tidy, but free enough.
  label.x = Math.round((gridX - drag.grabX) * 2) / 2;
  label.y = Math.round((gridY - drag.grabY) * 2) / 2;
  stage.redraw();
}
