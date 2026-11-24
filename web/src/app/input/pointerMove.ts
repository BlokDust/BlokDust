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
import { labelDrag, moveLabel } from '../labels/labels.ts';
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
    app.canvas.addEventListener('pointermove', (e) => {
      const overMake =
        !!makeStageAt &&
        e.pointerType === 'mouse' &&
        inBox(makeStageAt, e.offsetX * dpr(), e.offsetY * dpr());
      if (overMake !== makeStageHover) {
        setMakeStageHover(overMake);
        stage.redraw();
      }
      const overBy =
        !!cornerBoxes.by &&
        e.pointerType === 'mouse' &&
        inBox(cornerBoxes.by, e.offsetX * dpr(), e.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      const overMe =
        !!cornerBoxes.me &&
        e.pointerType === 'mouse' &&
        inBox(cornerBoxes.me, e.offsetX * dpr(), e.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      const overSave =
        !!cornerBoxes.save &&
        e.pointerType === 'mouse' &&
        inBox(cornerBoxes.save, e.offsetX * dpr(), e.offsetY * dpr()) &&
        !scene.PatchesPanel.Open;
      if (overBy !== byHover || overMe !== meHover || overSave !== saveHover) {
        setByHover(overBy);
        setMeHover(overMe);
        setSaveHover(overSave);
        app.canvas.style.cursor = overBy || overMe || overSave ? 'pointer' : '';
        stage.redraw();
      }
      if (padMove(scene.OptionsPanel, e.pointerId, e.offsetX * dpr(), e.offsetY * dpr(), padHost)) {
        stage.redraw();
        return;
      }
      if (labelDrag && (labelDrag.fresh || e.pointerId === labelDrag.pointer)) {
        moveLabel(e);
        if (!labelDrag.fresh) {
          // an existing label: the bin opens under it, as under a dragged block
          if (labelDrag.moved) {
            scene.IsDraggingABlock = true;
            scene.pointerMove(e.offsetX * dpr(), e.offsetY * dpr(), true, () => null, true);
          }
          return;
        }
      }
      if (touchAt.has(e.pointerId)) touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      const extra = extras.get(e.pointerId);
      if (extra) {
        extraMove(e, extra);
        return;
      }
      if (primaryId !== null && e.pointerId !== primaryId) return;
      if (pinch && (pinch.a === e.pointerId || pinch.b === e.pointerId)) {
        movePinch();
        stage.redraw();
        return;
      }
      if (wavePinch && (wavePinch.a === e.pointerId || wavePinch.b === e.pointerId)) {
        moveWave();
        stage.redraw();
        return;
      }
      if (primaryRole === 'gone') return;
      setLastPointerType(e.pointerType);
      const pointer = { x: 0, y: 0 };
      [pointer.x, pointer.y] = stage.cssToGrid(e.offsetX, e.offsetY);
      setLastPointer(pointer);
      if (placing) {
        if (!placing.touch || (pointerIsDown && placing.grabbed)) placeAt(pointer.x, pointer.y);
        stage.redraw();
        return;
      }
      if (
        longPress &&
        downAt &&
        Math.hypot(e.offsetX - downAt.x, e.offsetY - downAt.y) > STILL_PX
      ) {
        clearTimeout(longPress);
        setLongPress(null);
      }
      if (primaryRole === 'box' && box) {
        box.x1 = e.offsetX;
        box.y1 = e.offsetY;
        showBox();
        return;
      }
      if (primaryRole === 'select') return;
      let blockMoved = false;
      if (drag && e.altKey && !drag.moved && grouped()) {
        // Alt + drag on a selection copies all of it (v1's Alt-copy, for the group): the copies are dragged and selected.
        const ids = [...selection],
          made = copyBlocks(ids, 0, 0),
          first = made.get(drag.id),
          madeLabels = copyLabels(selLabels(), 0, 0);
        pushUndo({ kind: 'add', uids: uidsOf(made.values()), labels: madeLabels });
        send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
        const v = v1Blocks.get(drag.id);
        if (v) v.IsPressed = false;
        stage.held.clear();
        if (first !== undefined) {
          const grab = { x: drag.grabX, y: drag.grabY };
          setSelection(made.values(), madeLabels);
          startDrag(first, grab.x, grab.y, true);
          drag!.moved = true; // copied once per drag
          for (const id of selection) if (id !== first) stage.held.add(id);
          const cv = v1Blocks.get(first);
          if (cv) {
            scene.select(cv);
            cv.IsPressed = true;
            scene.IsDraggingABlock = true;
          }
        }
      }
      if (drag && e.altKey && !drag.moved && !grouped()) {
        // v1 Block.MouseMove: Alt (Option) + drag copies the block (same params) at the pointer and drags the copy;
        // the original is released where it was.
        const b = model.get(drag.id),
          v = v1Blocks.get(drag.id);
        if (b) {
          const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
          send([{ type: CommandType.Press, id: drag.id, value: 0 }]);
          if (v) v.IsPressed = false;
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
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        const x = Math.round(gx - drag.grabX),
          y = Math.round(gy - drag.grabY),
          b = model.get(drag.id);
        if (b && (x !== b.x || y !== b.y)) {
          const dx = x - b.x,
            dy = y - b.y;
          if (grouped()) {
            for (const id of selection) {
              const o = model.get(id);
              if (o) moveBlock(id, o.x + dx, o.y + dy);
            }
            for (const l of selLabels()) {
              l.x += dx;
              l.y += dy;
            }
          } else moveBlock(drag.id, x, y);
          drag.moved = blockMoved = true;
        }
        // Over a Stage block: let go and they go inside it (ringed while they would).
        stage.dropTarget = drag.moved
          ? dropStageAt(e.offsetX, e.offsetY, new Set(grouped() ? selection : [drag.id]))
          : null;
      } // stage panning: v1's MainSceneDragger inside the scene (setDrag)
      scene.pointerMove(
        e.offsetX * dpr(),
        e.offsetY * dpr(),
        pointerIsDown,
        () => v1At(e.offsetX, e.offsetY),
        blockMoved,
      );
      stage.redraw();
    });
}
