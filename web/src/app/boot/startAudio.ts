// START: the engine is built from what was prepared at load, and the stage shows once audio runs.
import { flushAnalytics, track } from '../../analytics/client.ts';
import { EngineNode } from '../../audio/engineNode.ts';
import { setAudioSession } from '../../audio/session';
import { App } from '../../v1ui/shim.ts';
import { keepAwake } from '../audio/keepAwake.ts';
import { guarded, listen, needsInput } from '../audio/microphone.ts';
import { engineCommands } from '../engine/engineCommands.ts';
import { onSnapshot, overlay } from '../engine/snapshots.ts';
import { afterStart, setEngine } from '../model/engineLink.ts';
import { model, seed } from '../model/patchModel.ts';
import { fillStageSamples } from '../model/stageWorlds.ts';
import { samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { probe } from '../testing/probe.ts';
import { audio, embedId, juce, missingNote, params, start } from './page.ts';
import { stage } from './pixi.ts';
import { measureFps } from './sessionAnalytics.ts';

export let begun = false;
export let startCtx: AudioContext | null = null;

export const resume = () => {
  void startCtx?.resume().catch(() => {});
};

function errorName(error: unknown): string {
  const name = (error as { name?: unknown } | null | undefined)?.name;
  return typeof name === 'string' && name !== '' ? name : 'error';
}

function untilRunning(ctx: AudioContext): Promise<void> {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (ctx.state !== 'running') return;
      ctx.removeEventListener('statechange', check);
      resolve();
    };
    ctx.addEventListener('statechange', check);
    check();
  });
}

async function startEngine(ctx: AudioContext): Promise<void> {
  let module: Awaited<ReturnType<typeof EngineNode.prepare>>;
  try {
    module = await (audio?.module ?? EngineNode.prepare(ctx));
  } catch (error) {
    track('audio_failed', { reason: errorName(error) });
    flushAnalytics();
    throw error;
  }
  const engine = EngineNode.build(ctx, module, { seed, commands: engineCommands() });
  setEngine(engine);
  engine.onSnapshot(onSnapshot);
  for (const [id, buffer] of samples) if (model.has(id)) engine.sendSample(id, buffer);
  engine.setGuard(guarded); // someone else's patch: the safety limit (CHG-0041)
  if ([...model.values()].some((block) => needsInput(block.type))) listen();
  // Each Stage's inner world was built with the engine: now its samplers' audio.
  for (const [id, block] of model)
    if (block.type === 'source.stage') void fillStageSamples(id, block.uid);
}

/** START on the press (v1 Splash.MouseDown): the intro plays while the engine starts. */
export async function begin(showsSplash: boolean): Promise<void> {
  begun = true;
  let introShown = !showsSplash;
  let audioReady = false;
  // A first visit is offered v1's tour (CHG-0035); automated browsers only with `tour=1`.
  const offerTour =
    !juce &&
    !embedId &&
    start.source === 'demo' &&
    (!navigator.webdriver || params.get('tour') === '1');
  const reveal = () => {
    if (!(introShown && audioReady && overlay.isConnected)) return;
    overlay.remove();
    if (offerTour) {
      scene.launchTour();
      stage.redraw();
    }
    if (missingNote) scene.message(missingNote, { seconds: 6 });
  };
  if (showsSplash) {
    scene.startSplash(() => {
      introShown = true;
      reveal();
    });
    stage.redraw();
  }
  // Before the context exists, or iOS's silent switch mutes it.
  if (!audio) setAudioSession('playback');
  const ctx = (startCtx = audio?.ctx ?? new AudioContext({ latencyHint: 'interactive' }));
  const running = untilRunning(ctx);
  void ctx.resume().catch(() => {}); // a mouse press may start audio
  App.Audio.sampleRate = ctx.sampleRate;
  await startEngine(ctx);
  await running;
  keepAwake(ctx);
  probe.started = true;
  audioReady = true;
  reveal();
  for (const run of afterStart.splice(0)) requestAnimationFrame(run);
  track('audio_started', undefined, { seconds: Math.round(performance.now() / 100) / 10 });
  measureFps();
}
