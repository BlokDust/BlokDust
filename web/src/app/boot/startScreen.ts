// START (v1's Splash): audio starts on the press.
import { setAudioSession } from '../../audio/session';
import { App } from '../../v1ui/shim.ts';
import { EngineNode } from '../../audio/engineNode.ts';
import { track, flushAnalytics } from '../../analytics/client.ts';
import { keepAwake } from '../audio/keepAwake.ts';
import { guarded, listen, needsInput } from '../audio/microphone.ts';
import {
  audio,
  embedId,
  juce,
  linkArrival,
  missingNote,
  params,
  signInReturn,
  start,
} from './page.ts';
import { stage } from './pixi.ts';
import { engineCommands } from '../engine/engineCommands.ts';
import { onSnapshot, overlay } from '../engine/snapshots.ts';
import { afterStart, setEngine } from '../model/engineLink.ts';
import { model, seed } from '../model/patchModel.ts';
import { fillStageSamples } from '../model/stageWorlds.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { probe } from '../testing/probe.ts';

// The start button is v1's Splash, drawn by the scene (owner, 2026-11-11); #start is a clear layer over it that takes
// the click (an AudioContext must start in one) and holds input back until the intro has shown the stage, as v1 did.
// Automated browsers skip the intro (their screenshots expect the stage) unless the URL asks for it (`splash=1`).
export let splash!: boolean;

// START begins on the press (v1 Splash.MouseDown), not the release: the intro starts at once and the engine is built
// from what was prepared at load. A mouse press may start audio; a touch may not until it lifts, so the release and
// the click resume the context too (a press that never ends in a click leaves the start layer for the next tap).
// After START, a press on the intro skips it (owner, PR #1 review 2026-11-12); the START press itself never does.
export let begun = false,
  startCtx: AudioContext | null = null;

export const resume = () => {
  void startCtx?.resume().catch(() => {});
};

export async function begin(): Promise<void> {
  begun = true;
  let shown = !splash,
    ready = false;
  // A first visit (no link, nothing kept) is asked whether to take v1's tour once the stage shows (CHG-0035). Automated
  // browsers are not, unless the URL asks (`tour=1`).
  const tour =
    !juce &&
    !embedId &&
    start.source === 'demo' &&
    (!navigator.webdriver || params.get('tour') === '1');
  const reveal = () => {
    if (!(shown && ready && overlay.isConnected)) return;
    overlay.remove();
    if (tour) {
      scene.launchTour();
      stage.redraw();
    }
    if (missingNote) scene.message(missingNote, { seconds: 6 });
  };
  if (splash) {
    scene.startSplash(() => {
      shown = true;
      reveal();
    });
    stage.redraw();
  }
  if (!audio) setAudioSession('playback'); // before the context exists, or iOS's silent switch mutes it
  const ctx = (startCtx = audio?.ctx ?? new AudioContext({ latencyHint: 'interactive' }));
  const running = new Promise<void>((res) => {
    const check = () => {
      if (ctx.state === 'running') {
        ctx.removeEventListener('statechange', check);
        res();
      }
    };
    ctx.addEventListener('statechange', check);
    check();
  });
  void ctx.resume().catch(() => {}); // in the press: a mouse press is allowed to start audio
  App.Audio.sampleRate = ctx.sampleRate;
  let module: Awaited<ReturnType<typeof EngineNode.prepare>>;
  try {
    module = await (audio?.module ?? EngineNode.prepare(ctx));
  } catch (e) {
    track('audio_failed', { reason: (e as Error)?.name || 'error' });
    flushAnalytics();
    throw e;
  }
  const built = EngineNode.build(ctx, module, { seed, commands: engineCommands() });
  setEngine(built);
  built.onSnapshot(onSnapshot);
  for (const [id, buf] of samples) if (model.has(id)) built.sendSample(id, buf);
  built.setGuard(guarded); // someone else's patch: the safety limit (CHG-0041)
  if ([...model.values()].some((b) => needsInput(b.type))) listen();
  for (const [id, b] of model) if (b.type === 'source.stage') void fillStageSamples(id, b.uid); // its inner world was built with the engine
  await running;
  keepAwake(ctx);
  probe.started = true;
  ready = true;
  reveal();
  for (const run of afterStart.splice(0)) requestAnimationFrame(run);
  track('audio_started', undefined, { seconds: Math.round(performance.now() / 100) / 10 });
  measureFps();
}

/** perf (SPEC-SHARING-USAGE-ANALYTICS): the frame rate over 10 s of running, as a bucket. */
export function measureFps(): void {
  let frames = 0;
  const t0 = performance.now(),
    tick = () => {
      frames++;
      const t = performance.now() - t0;
      if (t < 10_000) {
        requestAnimationFrame(tick);
        return;
      }
      if (document.visibilityState !== 'visible') return; // a hidden tab says nothing about speed
      const fps = frames / (t / 1000);
      track('perf', { fps: fps < 20 ? '<20' : fps < 40 ? '20-40' : fps < 55 ? '40-55' : '55+' });
    };
  requestAnimationFrame(tick);
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
  overlay.addEventListener('pointerdown', () => {
    if (!begun) {
      void begin();
      return;
    }
    resume();
    if (splash) {
      scene.skipSplash();
      stage.redraw();
    }
  });
  overlay.addEventListener('pointerup', resume);
  overlay.addEventListener('click', () => {
    if (!begun) void begin();
    else resume();
  });
  // Back from Google sign-in (owner, 2026-11-15): no start screen and no intro. The stage takes input at once and the
  // first press or key starts the sound (browsers start audio only in a user gesture); that press still does its job.
  if ((signInReturn || linkArrival !== null) && !juce && !embedId) {
    overlay.remove();
    const first = () => {
      for (const t of ['pointerdown', 'keydown'] as const)
        window.removeEventListener(t, first, true);
      if (!begun) void begin();
    };
    for (const t of ['pointerdown', 'keydown'] as const) window.addEventListener(t, first, true);
  }
}
