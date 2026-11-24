import { CommandType } from '../../engine/wasmEngine.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { labelPlaces } from '../editing/undoRedo.ts';
import { type XY } from '../editing/undoSteps.ts';
import { send } from '../model/engineLink.ts';
import { model, selectedLabels, v1Blocks } from '../model/patchModel.ts';

// ---- input: v1 MainScene order (UI first, then blocks, then stage drag) ----
export const dpr = () => stage.metrics.dpr;

export let drag: {
  id: number;
  grabX: number;
  grabY: number;
  moved: boolean;
  fresh?: boolean;
} | null = null;

/** Where every block was when the drag began: Undo puts blocks dragged to the trash back there. */
export let dragFrom = new Map<number, { x: number; y: number }>();

export let labelDragFrom!: Map<string, { x: number; y: number }>;

// where the selected labels were when a block drag began
export let pointerIsDown = false;

/** The press that ended (or is) a placement: its release goes nowhere else. */
export let swallowUp = false;

export let stageClick: { id: number; t: number } | null = null;

export const v1At = (cssX: number, cssY: number) => {
  const hit = stage.hitTest(cssX, cssY);
  return hit ? (v1Blocks.get(hit.id) ?? null) : null;
};

/** `fresh`: the block was just made (menu, Alt-copy): its add step covers where it is put, so no move step. */
export function startDrag(id: number, grabX: number, grabY: number, fresh = false): void {
  drag = { id, grabX, grabY, moved: false, fresh };
  dragFrom = new Map([...model].map(([i, b]) => [i, { x: b.x, y: b.y }]));
  labelDragFrom = labelPlaces(selectedLabels);
  stage.pressed = id;
  stage.toFront(id);
  send([{ type: CommandType.Press, id, value: 1 }]); // v1 Block.MouseDown: a held source powers itself
}

export function setPointerIsDown<Value extends typeof pointerIsDown>(value: Value): Value {
  pointerIsDown = value;
  return value;
}

export function setSwallowUp<Value extends typeof swallowUp>(value: Value): Value {
  swallowUp = value;
  return value;
}

export function setDrag<Value extends typeof drag>(value: Value): Value {
  drag = value;
  return value;
}

export function setStageClick<Value extends typeof stageClick>(value: Value): Value {
  stageClick = value;
  return value;
}

export function init(): void {
  labelDragFrom = new Map<string, XY>();
  if (embedId) {
    // Player: pressing a block powers it while held (v1 Source.MouseDown); nothing moves or opens.
    let pressed: number | null = null;
    app.canvas.addEventListener('pointerdown', (e) => {
      app.canvas.setPointerCapture(e.pointerId);
      const hit = stage.hitTest(e.offsetX, e.offsetY);
      if (hit) {
        pressed = hit.id;
        send([{ type: CommandType.Press, id: hit.id, value: 1 }]);
      }
    });
    app.canvas.addEventListener('pointerup', () => {
      if (pressed !== null) send([{ type: CommandType.Press, id: pressed, value: 0 }]);
      pressed = null;
    });
    app.canvas.addEventListener('pointercancel', () => {
      if (pressed !== null) send([{ type: CommandType.Press, id: pressed, value: 0 }]);
      pressed = null;
    });
  }
}
