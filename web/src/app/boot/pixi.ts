// The Pixi application and the stage it draws.
import { Application } from 'pixi.js';
import { Stage } from '../../stage/Stage.ts';
import { fitToWindow } from '../fitWindow.ts';
import { loadV1Fonts } from '../../chrome/v1Chrome.ts';
import { theme } from './theme.ts';

export let app!: Application<import('pixi.js').Renderer>;

export let stage!: Stage;

export async function init(): Promise<void> {
  app = new Application();
  // Transparent: the static stage is an on-page Canvas2D layer behind Pixi (Stage 'canvas' renderer, UI-0005).
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: devicePixelRatio,
    autoDensity: true,
    antialias: true,
    background: 0x000000,
    backgroundAlpha: 0,
  });
  document.getElementById('stage')!.appendChild(app.canvas);
  fitToWindow(app);
  // iOS Safari's long-press magnifier and double-tap recognisers run on the touch stream, under Pointer Events:
  // cancelling pointerdown does not stop them, cancelling touchstart does (Funputs #45). Only the stage: text
  // fields and menus keep their defaults. The stage is driven by pointer events alone, so nothing is lost.
  document.getElementById('stage')!.addEventListener(
    'touchstart',
    (e) => {
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  // Two fingers on the stage are BlokDust's pinch zoom (CHG-0005 task 8), not Safari's page zoom (its gesture events
  // bypass touch-action on older iOS).
  document.getElementById('stage')!.addEventListener('gesturestart', (e) => e.preventDefault(), {
    passive: false,
  } as AddEventListenerOptions);
  stage = new Stage(app, theme);
  stage.setTheme(theme);
  await loadV1Fonts();
}
