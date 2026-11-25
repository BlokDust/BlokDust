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

// Trackpad pinch and mouse wheel zoom about the pointer (CHG-0010), as a touch pinch does (Chrome:
// ctrlKey wheels, Safari: gesture events); over v1's UI the wheel does nothing, as in v1.
export let gesture: { z0: number; w: { x: number; y: number } } | null = null;

export let waveGesture: WavePinch | null = null;

// Safari's trackpad pinch on a waveform
export let zoomSettle: ReturnType<typeof setTimeout> | undefined;

/** The stage point under device px (x, y), in v1 units (see startPinch). */
export const stageAt = (x: number, y: number) => {
  const metrics = stage.metrics;
  return {
    x: (x - metrics.width / 2) / (stage.zoom * metrics.unit) - stage.drag.x,
    y: (y - metrics.height / 2) / (stage.zoom * metrics.unit) - stage.drag.y,
  };
};

export function zoomAbout(
  x: number,
  y: number,
  zoomTo: number,
  anchor: { x: number; y: number },
): void {
  const metrics = stage.metrics,
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomTo));
  const drag = {
    x: (x - metrics.width / 2) / (zoom * metrics.unit) - anchor.x,
    y: (y - metrics.height / 2) / (zoom * metrics.unit) - anchor.y,
  };
  scene.pinchView(zoom, drag);
  stage.setView(zoom, drag);
  clearTimeout(zoomSettle);
  zoomSettle = setTimeout(() => {
    scene.pinchEnd();
  }, 250);
}

export let stageEl!: HTMLElement;

export type GestureEv = Event & { scale: number; clientX: number; clientY: number };

export const gestureAt = (gestureEv: GestureEv) => {
  const boundingClientRect = app.canvas.getBoundingClientRect();
  return {
    x: (gestureEv.clientX - boundingClientRect.left) * dpr(),
    y: (gestureEv.clientY - boundingClientRect.top) * dpr(),
  };
};

export function init(): void {
  if (!embedId)
    app.canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const x = event.offsetX * dpr(),
          y = event.offsetY * dpr();
        // Over a waveform in the options panel: zoom or slide it (waveZoom.ts), never the stage
        // under it.
        const row = waveRowAt(scene.OptionsPanel, x, y);
        if (row >= 0) {
          if (!pointerIsDown && !waveGesture && !wavePinch) {
            const k = event.deltaMode === 1 ? 16 : 1;
            wheelWave(
              scene.OptionsPanel,
              row,
              x,
              {
                deltaX: event.deltaX * k,
                deltaY: event.deltaY * k,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
              },
              dpr(),
            );
            stage.redraw();
          }
          return;
        }
        // a trackpad pinch elsewhere on the panel does nothing
        if (event.ctrlKey && scene.optionsPanelAt(x, y)) return;
        if (!event.ctrlKey && scene.uiAt(x, y)) {
          scene.wheel(event);
          return;
        }
        if (gesture || pinch || pointerIsDown) return;
        const dy = Math.max(
          -25,
          Math.min(25, event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY),
        );
        // A mouse wheel zooms at half a trackpad pinch's rate (owner, 2026-11-12: a notch is ×1.13,
        // not ×1.28).
        zoomAbout(x, y, stage.zoom * Math.exp(-dy * (event.ctrlKey ? 0.01 : 0.005)), stageAt(x, y));
      },
      { passive: false },
    );
  const stageElement = document.getElementById('stage');
  if (!stageElement) throw new Error('the page has no #stage');
  stageEl = stageElement;
  if (!embedId) {
    // iOS sends these for a two-finger touch too: there the touch pinch has it (fingers are down),
    // so they're ignored.
    stageEl.addEventListener('gesturestart', (event) => {
      // fingers on the Touchpad's pads play, never zoom
      if (touchAt.size || pointerIsDown || padNotes().length) return;
      const gestureEv = event as GestureEv,
        at = gestureAt(gestureEv),
        row = waveRowAt(scene.OptionsPanel, at.x, at.y);
      if (row >= 0) {
        waveGesture = startWavePinch(scene.OptionsPanel, row, at.x, 1);
        return;
      } // a waveform zooms instead
      if (scene.optionsPanelAt(at.x, at.y)) return;
      gesture = { z0: stage.zoom, w: stageAt(at.x, at.y) };
    });
    stageEl.addEventListener('gesturechange', (event) => {
      const gestureEv = event as GestureEv,
        at = gestureAt(gestureEv);
      if (waveGesture) {
        moveWavePinch(scene.OptionsPanel, waveGesture, at.x, gestureEv.scale);
        stage.redraw();
        return;
      }
      if (!gesture) return;
      zoomAbout(at.x, at.y, gesture.z0 * gestureEv.scale, gesture.w);
    });
    stageEl.addEventListener('gestureend', () => {
      gesture = null;
      waveGesture = null;
    });
  }
  if (embedId) setupEmbedChrome(embedId, start.title ?? '');
}
