import { editLabel } from '../labels/labelEditing.ts';
import { labelDrag, setLabelDrag } from '../labels/labelDrag.ts';
import { padUp } from '../../v1ui/touchpadPanel.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { deleteBlocks } from '../editing/deleteBlocks.ts';
import { endPlacing, placing } from '../editing/placing.ts';
import { recordMove } from '../editing/undoRedo.ts';
import { extraUp } from './extraFingers.ts';
import {
  endPinch,
  endWavePinch,
  extras,
  pinch,
  primaryId,
  primaryRole,
  setPrimaryId,
  setPrimaryRole,
  setWaveTouch,
  touchAt,
  wavePinch,
} from './pinch.ts';
import {
  dpr,
  drag,
  dragFrom,
  labelDragFrom,
  setDrag,
  setPointerIsDown,
  setStageClick,
  setSwallowUp,
  stageClick,
  swallowUp,
} from './pointerState.ts';
import {
  STILL_PX,
  box,
  downAt,
  finishBox,
  grouped,
  longPress,
  selection,
  setBox,
  setDownAt,
  setLongPress,
  setSelection,
  showBox,
} from './selection.ts';
import { padHost } from './touchpad.ts';
import { labelsChanged } from '../labels/labels.ts';
import { send } from '../model/engineLink.ts';
import { model, selectedLabels } from '../model/patchModel.ts';
import { scene } from '../scene/scene.ts';
import { addToStage } from '../stageBlock/fillStage.ts';
import { enterStage } from '../stageBlock/lookInside.ts';

export const pointerEnd = (event: PointerEvent) => {
  touchAt.delete(event.pointerId);
  if (extras.has(event.pointerId)) {
    extraUp(event.pointerId);
    return true;
  }
  if (primaryId !== null && event.pointerId !== primaryId) return true;
  if (pinch && (pinch.a === event.pointerId || pinch.b === event.pointerId)) endPinch();
  if (wavePinch && (wavePinch.a === event.pointerId || wavePinch.b === event.pointerId))
    endWavePinch();
  setPrimaryId(null);
  setWaveTouch(null);
  if (primaryRole === 'gone') {
    setPrimaryRole(null);
    setPointerIsDown(false);
    scene.pointerUp(-1, -1, true);
    stage.redraw();
    return true;
  }
  setPrimaryRole(null);
  return false;
};

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener('pointercancel', (event) => {
      if (padUp(scene.OptionsPanel, event.pointerId, padHost)) {
        stage.redraw();
        return;
      }
      if (event.pointerId === labelDrag?.pointer && !labelDrag.fresh) {
        setLabelDrag(null);
        scene.IsDraggingABlock = false;
        stage.redraw();
        return;
      }
      if (longPress) {
        clearTimeout(longPress);
        setLongPress(null);
      }
      if (pointerEnd(event)) return;
      setPointerIsDown(false);
      setSwallowUp(false);
      setDownAt(null);
      if (box) {
        setBox(null);
        showBox();
      }
      stage.held.clear();
      scene.pointerUp(-1, -1, true);
      if (drag) send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
      setDrag(null);
      stage.pressed = null;
      stage.dropTarget = null;
      stage.redraw();
    });
  if (!embedId)
    app.canvas.addEventListener('pointerup', (event) => {
      if (padUp(scene.OptionsPanel, event.pointerId, padHost)) {
        stage.redraw();
        return;
      }
      if (labelDrag && (labelDrag.fresh || event.pointerId === labelDrag.pointer)) {
        const dropped = labelDrag;
        setLabelDrag(null);
        // Dropped from the menu: type its words. A finger: now, inside the touch (iOS opens the
        // keyboard only for a focus made while handling it); a mouse: after v1's own mouse-up.
        if (dropped.fresh) {
          if (event.pointerType === 'touch') editLabel(dropped.id);
          else
            setTimeout(() => {
              editLabel(dropped.id);
            }, 0);
        } else {
          const binned =
            dropped.moved &&
            scene.pointerUp(event.offsetX * dpr(), event.offsetY * dpr(), true) === 'delete';
          scene.IsDraggingABlock = false;
          stage.held.clear();
          if (dropped.group) {
            // the selection, led by this label: binned all together, or one move step
            if (binned) {
              deleteBlocks(
                [...dropped.group.keys()],
                dropped.group,
                [...selectedLabels],
                dropped.labelFrom,
              );
              setSelection([]);
            } else if (dropped.moved) {
              recordMove([...dropped.group.keys()], dropped.group, dropped.labelFrom);
              labelsChanged();
            }
          } else if (binned) deleteBlocks([], undefined, [dropped.id], dropped.labelFrom);
          else if (dropped.moved) {
            recordMove([], new Map(), dropped.labelFrom);
            labelsChanged();
          }
          // A click (no move) edits the words, and a selection holding it is let go (as a click on
          // a selected block).
          if (!dropped.moved) {
            if (dropped.group || selectedLabels.has(dropped.id)) setSelection([]);
            editLabel(dropped.id);
          }
          stage.redraw();
          return;
        }
      }
      const role = primaryRole,
        wasGroup = grouped(),
        still =
          !!downAt && Math.hypot(event.offsetX - downAt.x, event.offsetY - downAt.y) <= STILL_PX;
      if (longPress) {
        clearTimeout(longPress);
        setLongPress(null);
      }
      if (pointerEnd(event)) return;
      setPointerIsDown(false);
      setDownAt(null);
      if (swallowUp) {
        setSwallowUp(false);
        if (placing?.touch) endPlacing(false);
        stage.redraw();
        return;
      }
      if (role === 'box') {
        finishBox();
        return;
      }
      if (role === 'select') {
        stage.redraw();
        return;
      }
      const moved = drag?.moved ?? false;
      const result = scene.pointerUp(event.offsetX * dpr(), event.offsetY * dpr(), moved);
      stage.held.clear();
      const into = drag && moved && result !== 'delete' ? stage.dropTarget : null;
      stage.dropTarget = null;
      if (result === 'delete' && drag)
        deleteBlocks(
          wasGroup ? [...selection] : [drag.id],
          dragFrom,
          wasGroup ? [...selectedLabels] : [],
          labelDragFrom,
        );
      else if (drag) {
        send([{ type: CommandType.Press, id: drag.id, value: 0 }]); // v1 MouseUp → RemovePower
        if (into !== null) {
          addToStage(
            into,
            wasGroup ? [...selection] : [drag.id],
            wasGroup ? [...selectedLabels] : [],
          );
          setDrag(null);
          stage.pressed = null;
          stage.redraw();
          return;
        }
        if (moved && !drag.fresh)
          recordMove(
            wasGroup ? [...selection] : [drag.id],
            dragFrom,
            wasGroup ? labelDragFrom : undefined,
          );
        if (moved && wasGroup && selectedLabels.size) labelsChanged();
      }
      // A double click on a Stage block looks inside it (the panel's OPEN STAGE does the same;
      // CHG-0021).
      if (drag && !moved && !event.shiftKey && model.get(drag.id)?.type === 'source.stage') {
        const now = performance.now(),
          id = drag.id;
        if (stageClick?.id === id && now - stageClick.t < 450) {
          setStageClick(null);
          setTimeout(() => {
            enterStage(id);
          }, 0);
        } else setStageClick({ id, t: now });
      }
      // A click on a selected block (no move) is v1's click: its options panel, and the group is
      // let go.
      if (drag && !moved && wasGroup && !event.shiftKey) setSelection([]);
      if (role === 'stage' && still) setSelection([]); // a tap on the stage clears the selection
      setDrag(null);
      stage.pressed = null;
      stage.redraw();
    });
}
