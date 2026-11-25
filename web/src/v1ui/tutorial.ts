// v1's tour (ported verbatim; CHG-0035), set up for v2: the owner's last step, asked on a first
// visit only, menu hotspots found by block name, the power on, and steady step checks.
import { App } from './shim.ts';
import type { Tutorial } from './ported/UI/Tutorial';
import type { TutorialHotspots } from './ported/UI/TutorialHotspots';
import type { MenuCategory } from './ported/UI/MenuCategory';

/** v1's last step, in the owner's words (both tours: keys and touch). */
export const TOUR_LAST =
  'Explore and experiment for yourself, or click PATCHES to see what other people have made in the gallery. ' +
  'When you’ve made something cool, click SAVE and ADD TO GALLERY to get a unique URL to let others see what you’ve made!';

/** The tour's words (v1 l10n UI.Tutorial), as Tutorial.Text holds them. */
export interface TourText {
  Scenes: { Intro: string; Task: string }[];
  Splash1: Record<string, string>;
  Splash2: Record<string, string>;
}
export const tourText = (tutorial: Tutorial): TourText => tutorial.Text as TourText;

/** v1's Skip flag (App.SkipTutorial, kept in local storage as v1 did). */
const SKIP_KEY = 'bd.skipTour';
export function tourSkipped(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}
function setSkipped(): void {
  try {
    localStorage.setItem(SKIP_KEY, '1');
  } catch {
    // a private window: asked again next time
  }
}

/** The block each v1 GutterCheck call was for, by (menu category index, v1 slot). */
const SLOT_BLOCK: Partial<Record<string, string>> = {
  '0:0': 'Tone',
  '3:0': 'Computer Keyboard',
  '1:3': 'Chopper',
  '2:0': 'Particle Emitter',
  '2:1': 'Power',
};
/** NextScene slides for 0.4 s: a check passing again meanwhile must not skip a step. */
const STEP_SLIDE_MS = 450;

export function installTour(tutorial: Tutorial, hotspots: TutorialHotspots): void {
  for (const text of [App.L10n.UI.Tutorial, App.L10n.UI.TutorialTouch]) {
    const last = text.Scenes[text.Scenes.length - 1];
    last.Intro = TOUR_LAST;
  }
  tutorial.Debug = false;
  Object.defineProperty(App, 'SkipTutorial', {
    configurable: true,
    get: tourSkipped,
    set: (skip: boolean) => {
      if (skip) setSkipped();
    },
  });
  // Answering the welcome either way, or finishing, is remembered (v1 remembered only SKIP).
  const splashDown = tutorial.SplashMouseDown.bind(tutorial);
  tutorial.SplashMouseDown = (point: unknown) => {
    const open = tutorial.SplashOpen;
    splashDown(point);
    if (open && !tutorial.SplashOpen) setSkipped();
  };
  // The menu item's slot: where the block is in v2's order.
  tutorial.GutterCheck = (slot: number, width: number, category: MenuCategory, units: number) => {
    const header = App.MainScene.Header,
      categoryIndex = header.MenuItems.indexOf(category);
    const name = SLOT_BLOCK[`${categoryIndex}:${slot}`];
    const i = name
      ? category.Items.findIndex((item) => item.Name.toLowerCase() === name.toLowerCase())
      : -1;
    const v2Slot = i >= 0 ? i % header.ItemsPerPage : slot;
    return category.Pages === 0 ? width * (v2Slot + 0.5) + 20 * units : width * (v2Slot + 1);
  };
  // The tour plays what it builds: with the power off, step 7's emitter never fired.
  const openPanel = tutorial.OpenPanel.bind(tutorial);
  tutorial.OpenPanel = () => {
    openPanel();
    if (!App.MainScene.worldPower) App.MainScene.setWorldPower(true);
  };
  let moving = false;
  const next = tutorial.NextScene.bind(tutorial);
  tutorial.NextScene = () => {
    if (moving) return;
    moving = true;
    next();
    setTimeout(() => {
      moving = false;
    }, STEP_SLIDE_MS);
  };
  hotspots.Points = [];
}

/** While the tour is open, run v1's step check a few times a second. The options step is
 * checked as v1 did, when the options panel closes (OptionsPanel.Close calls it). */
let lastCheck = 0;
export function checkTour(tutorial: Tutorial, now: number, optionsOpen: boolean): void {
  if (!tutorial.Open || now - lastCheck < 250) return;
  lastCheck = now;
  if (optionsOpen) return;
  tutorial.CheckTask();
}
