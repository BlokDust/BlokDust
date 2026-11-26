import { labelDrag, moveLabel } from '../labels/labelDrag.ts';
import { inBox } from '../../stage/makeStageButton.ts';
import { padMove } from '../../v1ui/touchpadPanel.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { moveBlock } from '../editing/deleteBlocks.ts';
import { placeAt, placing, setLastPointer, setLastPointerType } from '../editing/placing.ts';
import { pushUndo, uidsOf } from '../editing/undoSteps.ts';
import { extraMove } from './extraFingers.ts';
import {
  extras,
  movePinch,
  moveWave,
  pinch,
  primaryId,
  primaryRole,
  touchAt,
  wavePinch,
} from './pinch.ts';
import { dpr, drag, pointerIsDown, startDrag, v1At } from './pointerState.ts';
import {
  STILL_PX,
  box,
  copyBlocks,
  downAt,
  grouped,
  longPress,
  selection,
  setLongPress,
  setSelection,
  showBox,
} from './selection.ts';
import { padHost } from './touchpad.ts';
import { send } from '../model/engineLink.ts';
import { model, selLabels, v1Blocks } from '../model/patchModel.ts';
import { samples, useBuffer } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import {
  byHover,
  cornerBoxes,
  meHover,
  saveHover,
  setByHover,
  setMeHover,
  setSaveHover,
} from '../stage/corners.ts';
import { makeStageAt, makeStageHover, setMakeStageHover } from '../stage/makeStage.ts';
import { copyLabels, dropStageAt } from '../stageBlock/fillStage.ts';

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener('pointermove', (event) => {
      const overMake =
        !!makeStageAt &&
        event.pointerType === 'mouse' &&
        inBox(makeStageAt, event.offsetX * dpr(), event.offsetY * dpr());
      if (overMake !== makeStageHover) {
        setMakeStageHover(overMake);
        stage.redraw();
      }
      const overBy =
        !!cornerBoxes.by &&
        event.pointerType === 'mouse' &&
        inBox(cornerBoxes.by, event.offsetX * dpr(), event.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      const overMe =
        !!cornerBoxes.me &&
        event.pointerType === 'mouse' &&
        inBox(cornerBoxes.me, event.offsetX * dpr(), event.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      const overSave =
        !!cornerBoxes.save &&
        event.pointerType === 'mouse' &&
        inBox(cornerBoxes.save, event.offsetX * dpr(), event.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      if (overBy !== byHover || overMe !== meHover || overSave !== saveHover) {
        setByHover(overBy);
        setMeHover(overMe);
        setSaveHover(overSave);
        app.canvas.style.cursor = overBy || overMe || overSave ? 'pointer' : '';
        stage.redraw();
      }
      if (
        padMove(
          scene.OptionsPanel,
          event.pointerId,
          event.offsetX * dpr(),
          event.offsetY * dpr(),
          padHost,
        )
      ) {
        stage.redraw();
        return;
      }
      if (labelDrag && (labelDrag.fresh || event.pointerId === labelDrag.pointer)) {
        moveLabel(event);
        if (!labelDrag.fresh) {
          // an existing label: the bin opens under it, as under a dragged block
          if (labelDrag.moved) {
            scene.IsDraggingABlock = true;
            scene.pointerMove(event.offsetX * dpr(), event.offsetY * dpr(), true, () => null, true);
          }
          return;
        }
      }
      if (touchAt.has(event.pointerId))
        touchAt.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      const extra = extras.get(event.pointerId);
      if (extra) {
        extraMove(event, extra);
        return;
      }
      if (primaryId !== null && event.pointerId !== primaryId) return;
      if (pinch && (pinch.a === event.pointerId || pinch.b === event.pointerId)) {
        movePinch();
        stage.redraw();
        return;
      }
      if (wavePinch && (wavePinch.a === event.pointerId || wavePinch.b === event.pointerId)) {
        moveWave();
        stage.redraw();
        return;
      }
      if (primaryRole === 'gone') return;
      setLastPointerType(event.pointerType);
      const pointer = { x: 0, y: 0 };
      [pointer.x, pointer.y] = stage.cssToGrid(event.offsetX, event.offsetY);
      setLastPointer(pointer);
      if (placing) {
        if (!placing.touch || (pointerIsDown && placing.grabbed)) placeAt(pointer.x, pointer.y);
        stage.redraw();
        return;
      }
      if (
        longPress &&
        downAt &&
        Math.hypot(event.offsetX - downAt.x, event.offsetY - downAt.y) > STILL_PX
      ) {
        clearTimeout(longPress);
        setLongPress(null);
      }
      if (primaryRole === 'box' && box) {
        box.x1 = event.offsetX;
        box.y1 = event.offsetY;
        showBox();
        return;
      }
      if (primaryRole === 'select') return;
      let blockMoved = false;
      if (drag && event.altKey && !drag.moved && grouped()) {
        // Alt + drag on a selection copies all of it (v1's Alt-copy, for the group): the copies are
        // dragged and selected.
        const ids = [...selection],
          made = copyBlocks(ids, 0, 0),
          first = made.get(drag.id),
          madeLabels = copyLabels(selLabels(), 0, 0);
        pushUndo({ kind: 'add', uids: uidsOf(made.values()), labels: madeLabels });
        send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
        const v1Block = v1Blocks.get(drag.id);
        if (v1Block) v1Block.IsPressed = false;
        stage.held.clear();
        if (first !== undefined) {
          const grab = { x: drag.grabX, y: drag.grabY };
          setSelection(made.values(), madeLabels);
          startDrag(first, grab.x, grab.y, true);
          drag.moved = true; // copied once per drag
          for (const id of selection) if (id !== first) stage.held.add(id);
          const cv = v1Blocks.get(first);
          if (cv) {
            scene.select(cv);
            cv.IsPressed = true;
            scene.IsDraggingABlock = true;
          }
        }
      }
      if (drag && event.altKey && !drag.moved && !grouped()) {
        // v1 Block.MouseMove: Alt (Option) + drag copies the block (same params) at the pointer and
        // drags the copy; the original is released where it was.
        const b = model.get(drag.id),
          v1Block = v1Blocks.get(drag.id);
        if (b) {
          const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
          send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
          if (v1Block) v1Block.IsPressed = false;
          const copy = addBlock(b.type, Math.round(gx), Math.round(gy), structuredClone(b.params));
          const buf = samples.get(drag.id);
          if (buf && b.type !== 'source.sample-gen') useBuffer(copy, buf, 'keep');
          pushUndo({ kind: 'add', uids: uidsOf([copy]) });
          startDrag(copy, 0, 0, true);
          drag.moved = true;
          const cv = v1Blocks.get(copy);
          if (cv) {
            scene.select(cv);
            cv.IsPressed = true;
            scene.IsDraggingABlock = true;
          }
        }
      }
      if (drag) {
        const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
        const x = Math.round(gx - drag.grabX),
          y = Math.round(gy - drag.grabY),
          b = model.get(drag.id);
        if (b && (x !== b.x || y !== b.y)) {
          const dx = x - b.x,
            dy = y - b.y;
          if (grouped()) {
            for (const id of selection) {
              const block = model.get(id);
              if (block) moveBlock(id, block.x + dx, block.y + dy);
            }
            for (const label of selLabels()) {
              label.x += dx;
              label.y += dy;
            }
          } else moveBlock(drag.id, x, y);
          drag.moved = blockMoved = true;
        }
        // Over a Stage block: let go and they go inside it (ringed while they would).
        stage.dropTarget = drag.moved
          ? dropStageAt(event.offsetX, event.offsetY, new Set(grouped() ? selection : [drag.id]))
          : null;
      } // stage panning: v1's MainSceneDragger inside the scene (setDrag)
      scene.pointerMove(
        event.offsetX * dpr(),
        event.offsetY * dpr(),
        pointerIsDown,
        () => v1At(event.offsetX, event.offsetY),
        blockMoved,
      );
      stage.redraw();
    });
}
