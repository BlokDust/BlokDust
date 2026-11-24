// The start screen: v1's Splash, drawn by the scene, under #start, which takes the click.
import { overlay } from '../engine/snapshots.ts';
import { scene } from '../scene/scene.ts';
import { linkArrival } from './linkApproval.ts';
import { embedId, juce, params, signInReturn } from './page.ts';
import { stage } from './pixi.ts';
import { begin, begun, resume } from './startAudio.ts';

/** The intro plays (automated browsers skip it unless the URL has `splash=1`). */
export let splash = false;

/** Back from signing in: no start screen; the first press or key starts the sound too. */
function startOnFirstInput(): void {
  overlay.remove();
  const inputs = ['pointerdown', 'keydown'] as const;
  const first = () => {
    for (const input of inputs) window.removeEventListener(input, first, true);
    if (!begun) void begin(splash);
  };
  for (const input of inputs) window.addEventListener(input, first, true);
}

export function init(): void {
  splash =
    !juce &&
    !embedId &&
    !signInReturn &&
    linkArrival === null &&
    (!navigator.webdriver || params.get('splash') === '1');
  if (splash) {
    scene.showSplash();
    stage.redraw();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        overlay.style.background = 'transparent';
      }),
    );
  } else if (!embedId) overlay.style.background = 'transparent';
  // A touch may start audio only when it lifts: the release and click resume the context too.
  overlay.addEventListener('pointerdown', () => {
    if (!begun) {
      void begin(splash);
      return;
    }
    resume();
    if (splash) {
      scene.skipSplash(); // a press after START skips the intro
      stage.redraw();
    }
  });
  overlay.addEventListener('pointerup', resume);
  overlay.addEventListener('click', () => {
    if (!begun) void begin(splash);
    else resume();
  });
  if ((signInReturn || linkArrival !== null) && !juce && !embedId) startOnFirstInput();
}
