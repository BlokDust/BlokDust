import { measure } from '../labels/labelEditing.ts';
import { labelDrag, setLabelDrag } from '../labels/labelDrag.ts';
import { inBox } from '../../stage/makeStageButton.ts';
import { padDown } from '../../v1ui/touchpadPanel.ts';
import { onClose, inWindow } from '../../stage/insideView.ts';
import { labelAt } from '../../stage/labels.ts';
import { App } from '../../v1ui/shim.ts';
import { waveRowAt, snapshotWave } from '../../v1ui/waveZoom.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { endPlacing, placing, setLastPointer, setLastPointerType } from '../editing/placing.ts';
import { labelPlaces } from '../editing/undoRedo.ts';
import { type XY } from '../editing/undoSteps.ts';
import { extraDown } from './extraFingers.ts';
import {
  pinch,
  primaryId,
  primaryRole,
  setPrimaryId,
  setPrimaryRole,
  setWaveTouch,
  touchAt,
} from './pinch.ts';
import { dpr, drag, setPointerIsDown, setSwallowUp, startDrag, v1At } from './pointerState.ts';
import {
  LONG_PRESS_MS,
  grouped,
  selection,
  selectionSize,
  setBox,
  setDownAt,
  setLongPress,
  setSelection,
  showBox,
} from './selection.ts';
import { padHost } from './touchpad.ts';
import { labels, model, selectedLabels } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';
import { cornerPress } from '../stage/corners.ts';
import { makeStage, makeStageAt } from '../stage/makeStage.ts';
import { exitStage, insideFrame } from '../stageBlock/lookInside.ts';

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener('pointerdown', (event) => {
      // Only the main button works the stage (owner, 2026-11-19): a right-click's press began a pan that never ended
      // (the menu it opened took the release), so moving to the menu dragged the stage away. Right-clicks have their own
      // handler (contextmenu).
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      app.canvas.setPointerCapture(event.pointerId);
      if (primaryId === null && cornerPress(event.offsetX * dpr(), event.offsetY * dpr())) {
        setPrimaryId(event.pointerId);
        setPrimaryRole('gone');
        return;
      }
      if (
        makeStageAt &&
        primaryId === null &&
        inBox(makeStageAt, event.offsetX * dpr(), event.offsetY * dpr())
      ) {
        makeStage();
        setPrimaryId(event.pointerId);
        setPrimaryRole('gone');
        return;
      }
      if (
        !placing &&
        padDown(
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
      // Inside a Stage (UI-0009): the × or a press outside its window (not on the header, a panel or the bottom
      // controls) goes back out.
      if (inside && !placing) {
        const f = insideFrame(),
          x = event.offsetX * dpr(),
          y = event.offsetY * dpr(),
          m = stage.metrics;
        if (
          onClose(f, x, y) ||
          (!inWindow(f, x, y) &&
            !scene.uiAt(x, y) &&
            y < m.height - 75 * m.unit &&
            y > f.y - 24 * m.unit)
        ) {
          exitStage();
          setPrimaryId(event.pointerId);
          setPrimaryRole('gone');
          return; // this press does nothing more
        }
      }
      // A label (CHG-0020): where no panel or block is in the way, a press on one takes the pointer until it lifts.
      if (
        !placing &&
        !labelDrag &&
        labels.length &&
        !scene.uiAt(event.offsetX * dpr(), event.offsetY * dpr()) &&
        !stage.hitTest(event.offsetX, event.offsetY)
      ) {
        const label = labelAt(
          measure,
          stage.metrics,
          labels,
          event.offsetX * dpr(),
          event.offsetY * dpr(),
        );
        if (label) {
          const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
          scene.OptionsPanel.Close();
          // Shift: add the label to the selection (and drag it with the rest at once) or take it out (owner, 2026-11-14).
          if (event.shiftKey && selectedLabels.has(label.id)) {
            selectedLabels.delete(label.id);
            setPrimaryId(event.pointerId);
            setPrimaryRole('select');
            setPointerIsDown(true);
            setDownAt({ x: event.offsetX, y: event.offsetY });
            stage.redraw();
            return;
          }
          if (event.shiftKey) selectedLabels.add(label.id);
          else if (!selectedLabels.has(label.id) && selectionSize()) setSelection([]); // another label: the selection is let go
          const group =
            selectedLabels.has(label.id) && selectionSize() > 1
              ? new Map(
                  [...selection].flatMap((id) => {
                    const b = model.get(id);
                    return b ? [[id, { x: b.x, y: b.y }] as [number, XY]] : [];
                  }),
                )
              : undefined;
          setLabelDrag({
            id: label.id,
            pointer: event.pointerId,
            grabX: gx - label.x,
            grabY: gy - label.y,
            moved: !!event.shiftKey,
            fresh: false,
            downX: event.offsetX,
            downY: event.offsetY,
            group,
            labelFrom: labelPlaces(group ? selectedLabels : [label.id]),
          });
          if (group) for (const id of group.keys()) stage.held.add(id);
          stage.redraw();
          return;
        }
      }
      if (event.pointerType === 'touch')
        touchAt.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      if (primaryId !== null && event.pointerId !== primaryId) {
        if (event.pointerType === 'touch') extraDown(event);
        return;
      }
      setPrimaryId(event.pointerId);
      setPrimaryRole(null);
      setLastPointerType(event.pointerType);
      setLastPointer((([x, y]) => ({ x, y }))(stage.cssToGrid(event.offsetX, event.offsetY)));
      App.PointerInputManager.TouchAssumed = event.pointerType === 'touch'; // v1: which tour (keys or touch) to give
      if (placing) {
        // Placing inserted blocks: a click puts them down; a finger drags them (from wherever it lands) and lifting it
        // puts them down. Nothing else takes this press.
        if (!placing.touch && event.pointerType === 'mouse') {
          endPlacing(false);
          setSwallowUp(true);
          return;
        }
        placing.touch = true;
        const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
        placing.at = { x: Math.round(gx), y: Math.round(gy) };
        placing.grabbed = true;
        setPointerIsDown(true);
        setSwallowUp(true);
        setPrimaryRole('placing');
        return;
      }
      setPointerIsDown(true);
      const pressedAt = setDownAt({ x: event.offsetX, y: event.offsetY });
      if (event.shiftKey && !scene.uiAt(event.offsetX * dpr(), event.offsetY * dpr())) {
        // Shift: add or remove a block (a block just added can be dragged straight away, with the others), or draw a box.
        const hit = stage.hitTest(event.offsetX, event.offsetY);
        scene.OptionsPanel.Close();
        if (hit && selection.has(hit.id)) {
          selection.delete(hit.id);
          setPrimaryRole('select');
        } else if (hit) {
          selection.add(hit.id);
          const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
          startDrag(hit.id, gx - hit.x, gy - hit.y);
          for (const id of selection) if (id !== hit.id) stage.held.add(id);
          setPrimaryRole('block');
        } else {
          setBox({
            x0: event.offsetX,
            y0: event.offsetY,
            x1: event.offsetX,
            y1: event.offsetY,
            add: true,
          });
          showBox();
          setPrimaryRole('box');
        }
        stage.redraw();
        return;
      }
      setWaveTouch(null);
      if (event.pointerType === 'touch') {
        // on a waveform: what to put back if a second finger makes this a pinch
        const row = waveRowAt(scene.OptionsPanel, event.offsetX * dpr(), event.offsetY * dpr()),
          undo = row >= 0 ? snapshotWave(scene.OptionsPanel, row) : null;
        if (undo) setWaveTouch({ row, undo });
      }
      const tookUi = scene.pointerDown(event.offsetX * dpr(), event.offsetY * dpr(), () =>
        v1At(event.offsetX, event.offsetY),
      );
      if (!tookUi && !drag) {
        const hit = stage.hitTest(event.offsetX, event.offsetY);
        if (hit) {
          const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY);
          startDrag(hit.id, gx - hit.x, gy - hit.y);
        }
      }
      setPrimaryRole(tookUi ? 'ui' : drag ? 'block' : 'stage');
      if (drag && !selection.has(drag.id) && selection.size) setSelection([]); // another block: back to v1's one
      if (grouped()) for (const id of selection) if (id !== drag!.id) stage.held.add(id);
      // A finger held still on the stage starts a box instead of moving the stage.
      if (primaryRole === 'stage' && event.pointerType === 'touch') {
        const id = event.pointerId,
          at = pressedAt;
        setLongPress(
          setTimeout(() => {
            setLongPress(null);
            if (primaryId !== id || primaryRole !== 'stage' || pinch) return;
            scene.endStageDrag();
            setBox({ x0: at.x, y0: at.y, x1: at.x, y1: at.y, add: false });
            setPrimaryRole('box');
            showBox();
          }, LONG_PRESS_MS),
        );
      }
      stage.redraw();
    });
}
