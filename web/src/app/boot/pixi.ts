// The Pixi application and the stage it draws.
import { Application } from 'pixi.js';
import { loadV1Fonts } from '../../chrome/v1Chrome.ts';
import { Stage } from '../../stage/Stage.ts';
import { fitToWindow } from '../fitWindow.ts';
import { theme } from './theme.ts';

export let app!: Application;
export let stage!: Stage;

function stageElement(): HTMLElement {
  const element = document.getElementById('stage');
  if (!element) throw new Error('BlokDust: the page has no #stage element');
  return element;
}

/** Touches on the stage are BlokDust's: no long-press magnifier, double-tap or page zoom. */
function keepTouchesForTheStage(element: HTMLElement): void {
  // iOS starts those on touchstart, which cancelling pointerdown doesn't stop (Funputs #45).
  element.addEventListener(
    'touchstart',
    (event) => {
      if (event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
  // Two fingers are the stage's pinch zoom (CHG-0005 task 8); older iOS zooms the page on gestures.
  element.addEventListener(
    'gesturestart',
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );
}

export async function init(): Promise<void> {
  app = new Application();
  // Transparent: the static stage is a Canvas2D layer behind Pixi (UI-0005).
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: devicePixelRatio,
    autoDensity: true,
    antialias: true,
    background: 0x000000,
    backgroundAlpha: 0,
  });
  const element = stageElement();
  element.appendChild(app.canvas);
  fitToWindow(app);
  keepTouchesForTheStage(element);
  stage = new Stage(app, theme);
  stage.setTheme(theme);
  await loadV1Fonts();
}
