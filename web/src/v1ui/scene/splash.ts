// v1's Splash: the start button and the intro, and the tour's first question.
import { App, TWEEN } from '../shim.ts';
import { Splash } from '../ported/Splash';
import { tourSkipped } from '../tutorial.ts';
import { V1ScenePanels } from './panels.ts';

export abstract class V1SceneSplash extends V1ScenePanels {
  // ---- v1's Splash (owner, 2026-11-11), ported verbatim: the start button (v1 showed it on iOS; v2 everywhere, as a
  // click must start the audio), then on START its intro (panels sliding to BLOKDUST) and the stage revealed. ----
  protected splash: Splash | null = null;
  /** Show the start button (web app only: not the plugin, embeds or the visual harness). */
  showSplash(): void {
    const s = new Splash();
    s.Init(this);
    this.splash = s;
  }
  /** START pressed: v1 Splash.StartButtonPressed (its audio unlock is v2's click). `done` once the stage shows. */
  startSplash(done: () => void): void {
    const s = this.splash;
    if (!s) {
      done();
      return;
    }
    let finished = false;
    this.splashDone = () => {
      if (finished) return;
      finished = true;
      done();
    };
    s.AnimationFinished.on(() => {
      if (finished) return;
      s.TransitionOut();
      this.splashDone!();
    });
    const before = new Set(TWEEN.getAll());
    s.StartButtonPressed();
    this.splashTweens = TWEEN.getAll().filter((tween) => !before.has(tween));
    if (this.skipRequested) this.skipSplash();
  }
  protected splashDone: (() => void) | null = null;
  protected splashTweens: ReturnType<typeof TWEEN.getAll> = [];
  protected skipRequested = false;
  /** A click or touch during the intro skips it (owner, PR #1 review 2026-11-12): its tweens stop, the splash is
   * cleared and `done` runs now. Before the intro has begun (START pressed, engine still starting) it skips as soon
   * as the intro starts. v1's pending timers find the splash finished and do nothing more. */
  skipSplash(): void {
    const s = this.splash;
    if (!s || s.IsTransitionFinished) return;
    if (!this.splashDone) {
      this.skipRequested = true;
      return;
    }
    for (const tween of this.splashTweens) tween.stop();
    this.splashTweens = [];
    s.IsAnimationFinished = true;
    s.IsTransitionFinished = true;
    this.splashDone();
  }
  /** v1 MainScene: on a first visit (no link opened), ask whether to take the tour (CHG-0035). Its welcome reads
   * v1's "Welcome to BlokDust." even over the demo; taking the tour clears the stage as v1's did. */
  launchTour(): void {
    if (App.IsPlugin || tourSkipped()) return;
    const text = (this.Tutorial as any).Text,
      s2 = text.Splash2;
    text.Splash2 = { ...text.Splash1 };
    const close = this.Tutorial.CloseSplash.bind(this.Tutorial);
    this.Tutorial.CloseSplash = () => {
      text.Splash2 = s2;
      this.Tutorial.CloseSplash = close;
      close();
    };
    this.Tutorial.CheckLaunch();
  }
  /** v1 MainScene.Begin (Splash calls it on START: v1 faded its audio in there; v2's starts in the click). */
  Begin(): void {}
  /** True while the splash still covers the stage (input waits, as v1 MainScene._PointerDown). */
  get splashing(): boolean {
    return !!this.splash && !this.splash.IsAnimationFinished;
  }
  /** True while the splash still draws (the loop keeps redrawing). */
  get splashDrawing(): boolean {
    return !!this.splash && !this.splash.IsTransitionFinished;
  }
}
