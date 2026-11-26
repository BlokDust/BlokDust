// v1's Splash: the start button and the intro, and the tour's first question.
import { App, type NullstoneEvent, TWEEN } from '../shim.ts';
import { Splash } from '../ported/Splash';
import { tourSkipped } from '../tutorial.ts';
import { V1ScenePanels } from './panels.ts';

export abstract class V1SceneSplash extends V1ScenePanels {
  // v1's Splash, ported verbatim: the start button (v1's iOS one, everywhere: a click starts the
  // audio), then START's intro (panels sliding to BLOKDUST) revealing the stage.
  protected splash: Splash | null = null;
  /** Show the start button (web app only: not the plugin, embeds or the visual harness). */
  showSplash(): void {
    const startScreen = new Splash();
    startScreen.Init(this);
    this.splash = startScreen;
  }
  /** START pressed: v1 Splash.StartButtonPressed (its audio unlock is v2's click); `done` once the
   * stage shows. */
  startSplash(done: () => void): void {
    const startScreen = this.splash;
    if (!startScreen) {
      done();
      return;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done();
    };
    this.splashDone = finish;
    (startScreen.AnimationFinished as NullstoneEvent<unknown>).on(() => {
      if (finished) return;
      startScreen.TransitionOut();
      finish();
    });
    const before = new Set(TWEEN.getAll());
    startScreen.StartButtonPressed();
    this.splashTweens = TWEEN.getAll().filter((tween) => !before.has(tween));
    if (this.skipRequested) this.skipSplash();
  }
  protected splashDone: (() => void) | null = null;
  protected splashTweens: ReturnType<typeof TWEEN.getAll> = [];
  protected skipRequested = false;
  /** A press during the intro skips it: tweens stop, `done` runs now (v1's timers find it over);
   * pressed before the intro begins (the engine still starting), it skips once it starts. */
  skipSplash(): void {
    const startScreen = this.splash;
    if (!startScreen || startScreen.IsTransitionFinished) return;
    if (!this.splashDone) {
      this.skipRequested = true;
      return;
    }
    for (const tween of this.splashTweens) tween.stop();
    this.splashTweens = [];
    startScreen.IsAnimationFinished = true;
    startScreen.IsTransitionFinished = true;
    this.splashDone();
  }
  /** v1 MainScene: a first visit (no link) asks about the tour (CHG-0035), welcoming with v1's
   * "Welcome to BlokDust." even over the demo; taking it clears the stage as v1's did. */
  launchTour(): void {
    if (App.IsPlugin || tourSkipped()) return;
    // the Tutorial's Text is this object (v1 Tutorial reads App.L10n.UI.Tutorial)
    const text = App.L10n.UI.Tutorial,
      secondSplash = text.Splash2;
    text.Splash2 = { ...text.Splash1 };
    const close = this.Tutorial.CloseSplash.bind(this.Tutorial);
    this.Tutorial.CloseSplash = () => {
      text.Splash2 = secondSplash;
      this.Tutorial.CloseSplash = close;
      close();
    };
    this.Tutorial.CheckLaunch();
  }
  /** v1 MainScene.Begin, which Splash calls on START (v1 faded its audio in). */
  Begin(): void {
    // v2's audio starts in the click
  }
  /** True while the splash still covers the stage (input waits, as v1 MainScene._PointerDown). */
  get splashing(): boolean {
    return !!this.splash && !this.splash.IsAnimationFinished;
  }
  /** True while the splash still draws (the loop keeps redrawing). */
  get splashDrawing(): boolean {
    return !!this.splash && !this.splash.IsTransitionFinished;
  }
}
