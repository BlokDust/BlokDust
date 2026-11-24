// Wheel and trackpad zoom.
import {
  type WavePinch,
  waveRowAt,
  wheelWave,
  startWavePinch,
  moveWavePinch,
} from '../../v1ui/waveZoom.ts';
import { padNotes } from '../../v1ui/touchpadPanel.ts';
import { setupEmbedChrome } from '../boot/embedChrome.ts';
import { embedId, start } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { pinch, touchAt, wavePinch } from './pinch.ts';
import { dpr, pointerIsDown } from './pointerState.ts';
import { ZOOM_MAX, ZOOM_MIN } from '../model/view.ts';
import { scene } from '../scene/scene.ts';

// Trackpad pinch (owner, 2026-11-11): zoom about the pointer, as a pinch on a touch screen does. Chrome and Firefox
// send it as wheel events with ctrlKey (so does Ctrl + a mouse wheel); Safari on macOS as gesture events. A plain
// mouse wheel zooms the same way (owner, 2026-11-12, CHG-0010; v1 had turned its stepped wheel zoom off), except over
// the UI (an open panel, the header, the options panel), where it stays v1's (which does nothing).
export let gesture: { z0: number; w: { x: number; y: number } } | null = null;

export let waveGesture: WavePinch | null = null;

// Safari's trackpad pinch on a waveform
export let zoomSettle: ReturnType<typeof setTimeout> | undefined;

/** The stage point under device px (x, y), in v1 units (see startPinch). */
export const stageAt = (x: number, y: number) => {
  const m = stage.metrics;
  return {
    x: (x - m.width / 2) / (stage.zoom * m.unit) - stage.drag.x,
    y: (y - m.height / 2) / (stage.zoom * m.unit) - stage.drag.y,
  };
};

export function zoomAbout(x: number, y: number, zoomTo: number, w: { x: number; y: number }): void {
  const m = stage.metrics,
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomTo));
  const drag = {
    x: (x - m.width / 2) / (zoom * m.unit) - w.x,
    y: (y - m.height / 2) / (zoom * m.unit) - w.y,
  };
  scene.pinchView(zoom, drag);
  stage.setView(zoom, drag);
  clearTimeout(zoomSettle);
  zoomSettle = setTimeout(() => scene.pinchEnd(), 250);
}

export let stageEl!: HTMLElement;

export type GestureEv = Event & { scale: number; clientX: number; clientY: number };

export const gestureAt = (e: GestureEv) => {
  const r = app.canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * dpr(), y: (e.clientY - r.top) * dpr() };
};

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const x = e.offsetX * dpr(),
          y = e.offsetY * dpr();
        // Over a waveform in the options panel: zoom or slide it (waveZoom.ts), never the stage under it.
        const row = waveRowAt(scene.OptionsPanel, x, y);
        if (row >= 0) {
          if (!pointerIsDown && !waveGesture && !wavePinch) {
            const k = e.deltaMode === 1 ? 16 : 1;
            wheelWave(
              scene.OptionsPanel,
              row,
              x,
              {
                deltaX: e.deltaX * k,
                deltaY: e.deltaY * k,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
              },
              dpr(),
            );
            stage.redraw();
          }
          return;
        }
        if (e.ctrlKey && scene.optionsPanelAt(x, y)) return; // a trackpad pinch elsewhere on the panel does nothing
        if (!e.ctrlKey && scene.uiAt(x, y)) {
          scene.wheel(e);
          return;
        }
        if (gesture || pinch || pointerIsDown) return;
        const dy = Math.max(-25, Math.min(25, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
        // A mouse wheel zooms at half a trackpad pinch's rate (owner, 2026-11-12: a notch is ×1.13, not ×1.28).
        zoomAbout(x, y, stage.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.005)), stageAt(x, y));
      },
      { passive: false },
    );
  stageEl = document.getElementById('stage')!;
  if (!embedId) {
    // iOS sends these for a two-finger touch too: there the touch pinch has it (fingers are down), so they're ignored.
    stageEl.addEventListener('gesturestart', (e) => {
      if (touchAt.size || pointerIsDown || padNotes().length) return; // fingers on the Touchpad's pads play, never zoom
      const g = e as GestureEv,
        at = gestureAt(g),
        row = waveRowAt(scene.OptionsPanel, at.x, at.y);
      if (row >= 0) {
        waveGesture = startWavePinch(scene.OptionsPanel, row, at.x, 1);
        return;
      } // a waveform zooms instead
      if (scene.optionsPanelAt(at.x, at.y)) return;
      gesture = { z0: stage.zoom, w: stageAt(at.x, at.y) };
    });
    stageEl.addEventListener('gesturechange', (e) => {
      const g = e as GestureEv,
        at = gestureAt(g);
      if (waveGesture) {
        moveWavePinch(scene.OptionsPanel, waveGesture, at.x, g.scale);
        stage.redraw();
        return;
      }
      if (!gesture) return;
      zoomAbout(at.x, at.y, gesture.z0 * g.scale, gesture.w);
    });
    stageEl.addEventListener('gestureend', () => {
      gesture = null;
      waveGesture = null;
    });
  }
  if (embedId) setupEmbedChrome(embedId, start.title ?? '');
}
