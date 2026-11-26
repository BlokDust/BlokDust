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

/** Browser-test hooks. */
declare global {
  interface Window {
    /** What each finger is doing. */
    __bd_touch: () => {
      primaryId: number | null;
      primaryRole: string | null;
      extras: [number, unknown][];
      pinch: boolean;
    };
  }
}

export function extraDown(event: PointerEvent): void {
  const x = event.offsetX,
    y = event.offsetY;
  if (pinch || wavePinch || placing || padNotes().length) {
    extras.set(event.pointerId, { kind: 'idle' });
    return;
  } // not while the pads are played
  const first = primaryId !== null ? touchAt.get(primaryId) : undefined;
  if (primaryRole === 'ui' && waveTouch && first && primaryId !== null) {
    const { row, undo } = waveTouch;
    setWaveTouch(null);
    undo();
    setPrimaryRole('gone');
    extras.set(event.pointerId, { kind: 'wavepinch' });
    setWavePinch({
      a: primaryId,
      b: event.pointerId,
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
    extras.set(event.pointerId, { kind: 'pinch' });
    startPinch(primaryId, event.pointerId);
    return;
  }
  const slider = scene.sliderIndexAt(x * dpr(), y * dpr());
  if (slider >= 0) {
    extras.set(event.pointerId, { kind: 'slider', index: slider });
    scene.setSlider(slider, x * dpr());
    stage.redraw();
    return;
  }
  const hit = stage.hitTest(x, y);
  const taken = (id: number) =>
    drag?.id === id ||
    [...extras.values()].some((touch) => touch.kind === 'block' && touch.id === id);
  if (hit && !taken(hit.id) && !scene.uiAt(x * dpr(), y * dpr())) {
    const [gx, gy] = stage.cssToGrid(x, y);
    extras.set(event.pointerId, {
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
  extras.set(event.pointerId, { kind: 'idle' });
}

export function extraMove(event: PointerEvent, extra: Extra): void {
  if (extra.kind === 'pinch') {
    movePinch();
    stage.redraw();
    return;
  }
  if (extra.kind === 'wavepinch') {
    moveWave();
    stage.redraw();
    return;
  }
  if (extra.kind === 'slider') {
    scene.setSlider(extra.index, event.offsetX * dpr());
    stage.redraw();
    return;
  }
  if (extra.kind === 'block') {
    const [gx, gy] = stage.cssToGrid(event.offsetX, event.offsetY),
      b = model.get(extra.id);
    const x = Math.round(gx - extra.grabX),
      y = Math.round(gy - extra.grabY);
    if (b && (x !== b.x || y !== b.y)) {
      moveBlock(extra.id, x, y);
      stage.redraw();
    }
  }
}

export function extraUp(id: number): void {
  const extra = extras.get(id);
  extras.delete(id);
  if (!extra) return;
  if (extra.kind === 'pinch') endPinch();
  if (extra.kind === 'wavepinch') endWavePinch();
  if (extra.kind === 'block') {
    stage.held.delete(extra.id);
    if (model.has(extra.id)) {
      send([{ type: CommandType.Press, id: extra.id, value: 0 }]);
      recordMove([extra.id], new Map([[extra.id, extra.from]]));
    }
  }
  stage.redraw();
}

export function init(): void {
  window.__bd_touch = () => ({
    primaryId,
    primaryRole,
    extras: [...extras.entries()],
    pinch: !!pinch,
  });
}
