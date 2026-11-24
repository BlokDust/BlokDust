// Two-finger pinch zoom on the stage and on waveforms (CHG-0005 task 8).
import { type WavePinch, moveWavePinch } from '../../v1ui/waveZoom.ts';
import { stage } from '../boot/pixi.ts';
import { type XY } from '../editing/undoSteps.ts';
import { dpr } from './pointerState.ts';
import { ZOOM_MAX, ZOOM_MIN } from '../model/view.ts';
import { scene } from '../scene/scene.ts';

// ---- multi-touch (CHG-0005 task 8, owner): the first finger is v1's one pointer (menus, panels, selecting, dragging
// the stage). Each further finger takes what it lands on: a block (dragged by that finger, powered while held, as
// v1's pressed block), or a slider of the open options panel. A second finger while the first drags the stage
// turns it into a pinch: zoom about the fingers' midpoint, which stays put, and pan with it. ----
export type Extra =
  | { kind: 'block'; id: number; grabX: number; grabY: number; from: XY }
  | { kind: 'slider'; index: number }
  | { kind: 'pinch' }
  | { kind: 'wavepinch' }
  | { kind: 'idle' };

export let primaryId: number | null = null;

/** What the first finger is doing; 'gone': it was in a pinch that ended, so it does nothing until it lifts. */
export let primaryRole: 'ui' | 'block' | 'stage' | 'placing' | 'gone' | 'box' | 'select' | null =
  null;

export let extras!: Map<
  number,
  | { kind: 'block'; id: number; grabX: number; grabY: number; from: { x: number; y: number } }
  | { kind: 'slider'; index: number }
  | { kind: 'pinch' }
  | { kind: 'wavepinch' }
  | { kind: 'idle' }
>;

export const touchAt = new Map<number, { x: number; y: number }>();

// css px of every finger down
export let pinch: {
  a: number;
  b: number;
  z0: number;
  d0: number;
  w: { x: number; y: number };
} | null = null;

export function pinchState() {
  const a = touchAt.get(pinch!.a)!,
    b = touchAt.get(pinch!.b)!;
  return {
    mid: { x: ((a.x + b.x) / 2) * dpr(), y: ((a.y + b.y) / 2) * dpr() },
    dist: Math.hypot(a.x - b.x, a.y - b.y),
  };
}

export function startPinch(a: number, b: number): void {
  scene.endStageDrag();
  pinch = { a, b, z0: stage.zoom, d0: 1, w: { x: 0, y: 0 } };
  const { mid, dist } = pinchState(),
    m = stage.metrics;
  pinch.d0 = Math.max(dist, 1);
  // The stage point under the midpoint, in v1 units: (screen − centre) / (zoom · unit) − drag.
  pinch.w = {
    x: (mid.x - m.width / 2) / (stage.zoom * m.unit) - stage.drag.x,
    y: (mid.y - m.height / 2) / (stage.zoom * m.unit) - stage.drag.y,
  };
}

export function movePinch(): void {
  if (!pinch) return;
  const { mid, dist } = pinchState(),
    m = stage.metrics;
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (pinch.z0 * dist) / pinch.d0));
  const drag = {
    x: (mid.x - m.width / 2) / (zoom * m.unit) - pinch.w.x,
    y: (mid.y - m.height / 2) / (zoom * m.unit) - pinch.w.y,
  };
  scene.pinchView(zoom, drag);
  stage.setView(zoom, drag);
}

export function endPinch(): void {
  if (!pinch) return;
  for (const id of [pinch.a, pinch.b]) {
    if (id === primaryId) primaryRole = 'gone';
    else if (extras.has(id)) extras.set(id, { kind: 'idle' });
  }
  pinch = null;
  scene.pinchEnd();
}

// Two fingers on a waveform in the options panel (owner, 2026-11-15; waveZoom.ts): they zoom and slide that
// waveform, not the stage. The first finger's press may have moved a handle or the slider: that is put back.
export let wavePinch: (WavePinch & { a: number; b: number }) | null = null;

export let waveTouch: { row: number; undo: () => void } | null = null;

export function moveWave(): void {
  if (!wavePinch) return;
  const a = touchAt.get(wavePinch.a),
    b = touchAt.get(wavePinch.b);
  if (a && b)
    moveWavePinch(
      scene.OptionsPanel,
      wavePinch,
      ((a.x + b.x) / 2) * dpr(),
      Math.hypot(a.x - b.x, a.y - b.y),
    );
}

export function endWavePinch(): void {
  if (!wavePinch) return;
  for (const id of [wavePinch.a, wavePinch.b]) {
    if (id === primaryId) primaryRole = 'gone';
    else if (extras.has(id)) extras.set(id, { kind: 'idle' });
  }
  wavePinch = null;
}

export function setWaveTouch<Value extends typeof waveTouch>(value: Value): Value {
  waveTouch = value;
  return value;
}

export function setPrimaryRole<Value extends typeof primaryRole>(value: Value): Value {
  primaryRole = value;
  return value;
}

export function setWavePinch<Value extends typeof wavePinch>(value: Value): Value {
  wavePinch = value;
  return value;
}

export function setPrimaryId<Value extends typeof primaryId>(value: Value): Value {
  primaryId = value;
  return value;
}

export function init(): void {
  extras = new Map<number, Extra>();
}
