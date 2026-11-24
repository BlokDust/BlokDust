// v1's tour (Tutorial + TutorialHotspots, ported verbatim; CHG-0035, owner 2026-11-17), set up for v2:
//  - v1's last step pointed at the BlokDust Guide (gone) and SHARE (now PATCHES › SAVE / SHARE): the owner's words.
//  - v1 asked every visit (its Debug flag was left on). v2 asks on a first visit only: SKIP FOR NOW, TAKE THE TOUR or
//    finishing it is remembered, and Settings › TOUR asks again whenever you like.
//  - v1 pointed at menu slots by their place in its own menu order; v2's menus are ordered differently (MENU_ORDER),
//    so the hotspot over a menu item is found by the block's name.
//  - Starting it turns the world's power on, so its emitter fires.
//  - Its checks ran in v1's _Invalidate; v2's connections come from the engine a frame or two later, so they run a few
//    times a second while the tour is open.
import { App } from './shim.ts';
import type { Tutorial } from './ported/UI/Tutorial';
import type { TutorialHotspots } from './ported/UI/TutorialHotspots';

/** v1's last step, in the owner's words (both tours: keys and touch). */
export const TOUR_LAST =
  'Explore and experiment for yourself, or click PATCHES to see what other people have made in the gallery. ' +
  'When you’ve made something cool, click SAVE and ADD TO GALLERY to get a unique URL to let others see what you’ve made!';

/** v1's Skip flag (App.SkipTutorial, kept in local storage as v1 did). */
const KEY = 'bd.skipTour';
export function tourSkipped(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
function setSkipped(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private window: asked again next time */
  }
}

/** The block each v1 GutterCheck call was for, by (menu category index, v1 slot). */
const SLOT_BLOCK: Record<string, string> = {
  '0:0': 'Tone',
  '3:0': 'Computer Keyboard',
  '1:3': 'Chopper',
  '2:0': 'Particle Emitter',
  '2:1': 'Power',
};

export function installTour(tutorial: Tutorial, hotspots: TutorialHotspots): void {
  const tut = tutorial as any;
  for (const text of [App.L10n.UI.Tutorial, App.L10n.UI.TutorialTouch] as any[]) {
    const last = text.Scenes[text.Scenes.length - 1];
    last.Intro = TOUR_LAST;
  }
  tut.Debug = false;
  Object.defineProperty(App, 'SkipTutorial', {
    configurable: true,
    get: tourSkipped,
    set: (v: boolean) => {
      if (v) setSkipped();
    },
  });
  // Answering the welcome either way, or finishing, is remembered (v1 remembered only SKIP).
  const splashDown = tut.SplashMouseDown.bind(tut);
  tut.SplashMouseDown = (p: unknown) => {
    const open = tut.SplashOpen;
    splashDown(p);
    if (open && !tut.SplashOpen) setSkipped();
  };
  // The menu item's slot: where the block is in v2's order.
  tut.GutterCheck = (n: number, w: number, cat: any, units: number) => {
    const header = App.MainScene.Header,
      ci = header.MenuItems.indexOf(cat);
    const name = SLOT_BLOCK[`${ci}:${n}`],
      items = cat.Items ?? [];
    const i = name
      ? items.findIndex((it: any) => String(it.Name).toLowerCase() === name.toLowerCase())
      : -1;
    const slot = i >= 0 ? i % header.ItemsPerPage : n;
    return cat.Pages === 0 ? w * (slot + 0.5) + 20 * units : w * (slot + 1);
  };
  // The tour plays what it builds: the world's power goes on when it starts (owner, 2026-11-17: with it off, the
  // emitter of step 7 never fired, a silent ending).
  const openPanel = tut.OpenPanel.bind(tut);
  tut.OpenPanel = () => {
    openPanel();
    if (!App.MainScene.worldPower) App.MainScene.setWorldPower(true);
  };
  // One step at a time: a check that passes again during NextScene's 0.4 s slide does not skip the next step.
  let moving = false;
  const next = tut.NextScene.bind(tut);
  tut.NextScene = () => {
    if (moving) return;
    moving = true;
    next();
    setTimeout(() => {
      moving = false;
    }, 450);
  };
  hotspots.Points = [];
}

/** While the tour is open, run v1's step check a few times a second. The options step is checked as v1 did, when the
 * options panel closes (OptionsPanel.Close calls it): the step says "close the options panel when you're done". */
let lastCheck = 0;
export function checkTour(tutorial: Tutorial, now: number, optionsOpen: boolean): void {
  const tut = tutorial as any;
  if (!tut.Open || now - lastCheck < 250) return;
  lastCheck = now;
  if (optionsOpen) return;
  tut.CheckTask();
}
