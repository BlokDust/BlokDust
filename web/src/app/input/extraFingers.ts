// Fingers after the first: they pinch, or play the Touchpad.
import { padNotes } from '../../v1ui/touchpadPanel.ts';
import { startWavePinch } from '../../v1ui/waveZoom.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { stage } from '../boot/pixi.ts';
import { moveBlock } from '../editing/deleteBlocks.ts';
import { placing } from '../editing/placing.ts';
import { recordMove } from '../editing/undoRedo.ts';
import {
  type Extra,
  endPinch,
  endWavePinch,
  extras,
  movePinch,
  moveWave,
  pinch,
  primaryId,
  primaryRole,
  setPrimaryRole,
  setWavePinch,
  setWaveTouch,
  startPinch,
  touchAt,
  wavePinch,
  waveTouch,
} from './pinch.ts';
import { dpr, drag } from './pointerState.ts';
import { send } from '../model/engineLink.ts';
import { model } from '../model/patchModel.ts';
import { scene } from '../scene/scene.ts';

export function extraDown(e: PointerEvent): void {
  const x = e.offsetX,
    y = e.offsetY;
  if (pinch || wavePinch || placing || padNotes().length) {
    extras.set(e.pointerId, { kind: 'idle' });
    return;
  } // not while the pads are played
  const first = primaryId !== null ? touchAt.get(primaryId) : undefined;
  if (primaryRole === 'ui' && waveTouch && first) {
    const { row, undo } = waveTouch;
    setWaveTouch(null);
    undo();
    setPrimaryRole('gone');
    extras.set(e.pointerId, { kind: 'wavepinch' });
    setWavePinch({
      a: primaryId!,
      b: e.pointerId,
      ...startWavePinch(
        scene.OptionsPanel,
        row,
        ((first.x + x) / 2) * dpr(),
        Math.hypot(first.x - x, first.y - y),
      ),
    });
    stage.redraw();
    return;
  }
  if (primaryRole === 'stage' && primaryId !== null && touchAt.has(primaryId)) {
    extras.set(e.pointerId, { kind: 'pinch' });
    startPinch(primaryId, e.pointerId);
    return;
  }
  const slider = scene.sliderIndexAt(x * dpr(), y * dpr());
  if (slider >= 0) {
    extras.set(e.pointerId, { kind: 'slider', index: slider });
    scene.setSlider(slider, x * dpr());
    stage.redraw();
    return;
  }
  const hit = stage.hitTest(x, y);
  const taken = (id: number) =>
    drag?.id === id || [...extras.values()].some((t) => t.kind === 'block' && t.id === id);
  if (hit && !taken(hit.id) && !scene.uiAt(x * dpr(), y * dpr())) {
    const [gx, gy] = stage.cssToGrid(x, y);
    extras.set(e.pointerId, {
      kind: 'block',
      id: hit.id,
      grabX: gx - hit.x,
      grabY: gy - hit.y,
      from: { x: hit.x, y: hit.y },
    });
    stage.held.add(hit.id);
    stage.toFront(hit.id);
    send([{ type: CommandType.Press, id: hit.id, value: 1 }]);
    stage.redraw();
    return;
  }
  extras.set(e.pointerId, { kind: 'idle' });
}

export function extraMove(e: PointerEvent, t: Extra): void {
  if (t.kind === 'pinch') {
    movePinch();
    stage.redraw();
    return;
  }
  if (t.kind === 'wavepinch') {
    moveWave();
    stage.redraw();
    return;
  }
  if (t.kind === 'slider') {
    scene.setSlider(t.index, e.offsetX * dpr());
    stage.redraw();
    return;
  }
  if (t.kind === 'block') {
    const [gx, gy] = stage.cssToGrid(e.offsetX, e.offsetY),
      b = model.get(t.id);
    const x = Math.round(gx - t.grabX),
      y = Math.round(gy - t.grabY);
    if (b && (x !== b.x || y !== b.y)) {
      moveBlock(t.id, x, y);
      stage.redraw();
    }
  }
}

export function extraUp(id: number): void {
  const t = extras.get(id);
  extras.delete(id);
  if (!t) return;
  if (t.kind === 'pinch') endPinch();
  if (t.kind === 'wavepinch') endWavePinch();
  if (t.kind === 'block') {
    stage.held.delete(t.id);
    if (model.has(t.id)) {
      send([{ type: CommandType.Press, id: t.id, value: 0 }]);
      recordMove([t.id], new Map([[t.id, t.from]]));
    }
  }
  stage.redraw();
}

export function init(): void {
  /** Tests: what each finger is doing. */
  (window as unknown as { __bd_touch?: unknown }).__bd_touch = () => ({
    primaryId,
    primaryRole,
    extras: [...extras.entries()],
    pinch: !!pinch,
  });
}
