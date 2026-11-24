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
import { labelDrag, measure, setLabelDrag } from '../labels/labels.ts';
import { labels, model, selectedLabels } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';
import { cornerPress } from '../stage/corners.ts';
import { makeStage, makeStageAt } from '../stage/makeStage.ts';
import { exitStage, insideFrame } from '../stageBlock/lookInside.ts';

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener('pointerdown', (e) => {
      // Only the main button works the stage (owner, 2026-11-19): a right-click's press began a pan that never ended
      // (the menu it opened took the release), so moving to the menu dragged the stage away. Right-clicks have their own
      // handler (contextmenu).
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      app.canvas.setPointerCapture(e.pointerId);
      if (primaryId === null && cornerPress(e.offsetX * dpr(), e.offsetY * dpr())) {
        setPrimaryId(e.pointerId);
        setPrimaryRole('gone');
        return;
      }
      if (
        makeStageAt &&
        primaryId === null &&
        inBox(makeStageAt, e.offsetX * dpr(), e.offsetY * dpr())
      ) {
        makeStage();
        setPrimaryId(e.pointerId);
        setPrimaryRole('gone');
        return;
      }
      if (
        !placing &&
        padDown(scene.OptionsPanel, e.pointerId, e.offsetX * dpr(), e.offsetY * dpr(), padHost)
      ) {
        stage.redraw();
        return;
      }
      // Inside a Stage (UI-0009): the × or a press outside its window (not on the header, a panel or the bottom
      // controls) goes back out.
      if (inside && !placing) {
        const f = insideFrame(),
          x = e.offsetX * dpr(),
          y = e.offsetY * dpr(),
          m = stage.metrics;
        if (
          onClose(f, x, y) ||
          (!inWindow(f, x, y) &&
            !scene.uiAt(x, y) &&
            y < m.height - 75 * m.unit &&
            y > f.y - 24 * m.unit)
        ) {
          exitStage();
          setPrimaryId(e.pointerId);
          setPrimaryRole('gone');
          return; // this press does nothing more
        }
      }
      // A label (CHG-0020): where no panel or block is in the way, a press on one takes the pointer until it lifts.
      if (
        !placing &&
        !labelDrag &&
        labels.length &&
        !scene.uiAt(e.offsetX * dpr(), e.offsetY * dpr()) &&
        !stage.hitTest(e.offsetX, e.offsetY)
      ) {
        const l = labelAt(measure, stage.metrics, labels, e.offsetX * dpr(), e.offsetY * dpr());
        if (l) {
          const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
          scene.OptionsPanel.Close();
          // Shift: add the label to the selection (and drag it with the rest at once) or take it out (owner, 2026-11-14).
          if (e.shiftKey && selectedLabels.has(l.id)) {
            selectedLabels.delete(l.id);
            setPrimaryId(e.pointerId);
            setPrimaryRole('select');
            setPointerIsDown(true);
            setDownAt({ x: e.offsetX, y: e.offsetY });
            stage.redraw();
            return;
          }
          if (e.shiftKey) selectedLabels.add(l.id);
          else if (!selectedLabels.has(l.id) && selectionSize()) setSelection([]); // another label: the selection is let go
          const group =
            selectedLabels.has(l.id) && selectionSize() > 1
              ? new Map(
                  [...selection].flatMap((id) => {
                    const b = model.get(id);
                    return b ? [[id, { x: b.x, y: b.y }] as [number, XY]] : [];
                  }),
                )
              : undefined;
          setLabelDrag({
            id: l.id,
            pointer: e.pointerId,
            grabX: gx - l.x,
            grabY: gy - l.y,
            moved: !!e.shiftKey,
            fresh: false,
            downX: e.offsetX,
            downY: e.offsetY,
            group,
            labelFrom: labelPlaces(group ? selectedLabels : [l.id]),
          });
          if (group) for (const id of group.keys()) stage.held.add(id);
          stage.redraw();
          return;
        }
      }
      if (e.pointerType === 'touch') touchAt.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (primaryId !== null && e.pointerId !== primaryId) {
        if (e.pointerType === 'touch') extraDown(e);
        return;
      }
      setPrimaryId(e.pointerId);
      setPrimaryRole(null);
      setLastPointerType(e.pointerType);
      setLastPointer((([x, y]) => ({ x, y }))(stage.cssToGrid(e.offsetX, e.offsetY)));
      App.PointerInputManager.TouchAssumed = e.pointerType === 'touch'; // v1: which tour (keys or touch) to give
      if (placing) {
        // Placing inserted blocks: a click puts them down; a finger drags them (from wherever it lands) and lifting it
        // puts them down. Nothing else takes this press.
        if (!placing.touch && e.pointerType === 'mouse') {
          endPlacing(false);
          setSwallowUp(true);
          return;
        }
        placing.touch = true;
        const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
        placing.at = { x: Math.round(gx), y: Math.round(gy) };
        placing.grabbed = true;
        setPointerIsDown(true);
        setSwallowUp(true);
        setPrimaryRole('placing');
        return;
      }
      setPointerIsDown(true);
      const pressedAt = setDownAt({ x: e.offsetX, y: e.offsetY });
      if (e.shiftKey && !scene.uiAt(e.offsetX * dpr(), e.offsetY * dpr())) {
        // Shift: add or remove a block (a block just added can be dragged straight away, with the others), or draw a box.
        const hit = stage.hitTest(e.offsetX, e.offsetY);
        scene.OptionsPanel.Close();
        if (hit && selection.has(hit.id)) {
          selection.delete(hit.id);
          setPrimaryRole('select');
        } else if (hit) {
          selection.add(hit.id);
          const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
          startDrag(hit.id, gx - hit.x, gy - hit.y);
          for (const id of selection) if (id !== hit.id) stage.held.add(id);
          setPrimaryRole('block');
        } else {
          setBox({ x0: e.offsetX, y0: e.offsetY, x1: e.offsetX, y1: e.offsetY, add: true });
          showBox();
          setPrimaryRole('box');
        }
        stage.redraw();
        return;
      }
      setWaveTouch(null);
      if (e.pointerType === 'touch') {
        // on a waveform: what to put back if a second finger makes this a pinch
        const row = waveRowAt(scene.OptionsPanel, e.offsetX * dpr(), e.offsetY * dpr()),
          undo = row >= 0 ? snapshotWave(scene.OptionsPanel, row) : null;
        if (undo) setWaveTouch({ row, undo });
      }
      const tookUi = scene.pointerDown(e.offsetX * dpr(), e.offsetY * dpr(), () =>
        v1At(e.offsetX, e.offsetY),
      );
      if (!tookUi && !drag) {
        const hit = stage.hitTest(e.offsetX, e.offsetY);
        if (hit) {
          const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY);
          startDrag(hit.id, gx - hit.x, gy - hit.y);
        }
      }
      setPrimaryRole(tookUi ? 'ui' : drag ? 'block' : 'stage');
      if (drag && !selection.has(drag.id) && selection.size) setSelection([]); // another block: back to v1's one
      if (grouped()) for (const id of selection) if (id !== drag!.id) stage.held.add(id);
      // A finger held still on the stage starts a box instead of moving the stage.
      if (primaryRole === 'stage' && e.pointerType === 'touch') {
        const id = e.pointerId,
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
