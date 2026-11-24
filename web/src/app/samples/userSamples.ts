import {
  openRemembered,
  pickAudioFile,
  fingerprint,
  type FileRef,
  rememberHandle,
  isDeadDefault,
  DEFAULT_SOUNDS,
  fetchFreesound,
} from '../../patch/samples.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { Waveform } from '../../v1ui/ported/Core/Audio/Waveform';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { changed } from '../model/autosave.ts';
import { atStage, send, sendSample } from '../model/engineLink.ts';
import { model, refs, v1Blocks } from '../model/patchModel.ts';
import { useSample } from './useSample.ts';
import { scene } from '../scene/scene.ts';

// ---- samples: the user's own files, decoded here, attached in the engine; never uploaded (DATA-0005) ----
export const samples = new Map<number, AudioBuffer>();

export const missing = new Set<number>();

/** v1 App.AnimationsLayer.AddToList / RemoveFromList: the spinning loading bubble beside a block while its audio loads. */
export async function whileLoading<T>(id: number, work: () => Promise<T>): Promise<T> {
  const v1Block = v1Blocks.get(id);
  if (v1Block) {
    scene.AnimationsLayer.AddToList(v1Block);
    v1Block.RefreshOptionsPanel('animate');
    stage.redraw();
  }
  try {
    return await work();
  } finally {
    if (v1Block) {
      scene.AnimationsLayer.RemoveFromList(v1Block);
      if (scene.OptionsPanel.SelectedBlock === v1Block) v1Block.RefreshOptionsPanel();
      stage.redraw();
    }
  }
}

export const SAMPLERS = new Set(['source.sample', 'source.granular', 'fx.convolver']);

/**
 * Reverse a sampler (owner review 2026-11-07, bugs 2 + 3): the waveform flips at once (v1 SwitchBuffer) and the
 * start/end and loop points are mirrored, so the same stretch of audio stays selected and plays backwards (v1 kept the
 * numbers, which selected different audio). The engine reads the region in reversed time and restarts sounding voices.
 */
export function reverseSample(id: number, on: boolean): void {
  const b = model.get(id),
    v1Block = v1Blocks.get(id),
    dur = samples.get(id)?.duration ?? v1Block?.PrimaryBuffer?.duration;
  if (!b || !!b.params.reverse === on) return;
  const num = (k: string, d: number) => (typeof b.params[k] === 'number' ? b.params[k] : d);
  const mirrored = dur
    ? {
        startPosition: dur - num('endPosition', dur),
        endPosition: dur - num('startPosition', 0),
        loopStart: dur - num('loopEnd', dur),
        loopEnd: dur - num('loopStart', dur * 0.5),
      }
    : {};
  setParams(id, { ...mirrored, reverse: on });
  if (v1Block) {
    v1Block.WaveForm = [...v1Block.WaveForm].reverse();
    v1Block.RefreshOptionsPanel();
  }
  stage.redraw();
}

/** "Your file" (sample panel), drag-and-drop, or relinking a missing file: never uploaded (DATA-0005). */
export async function pickSample(id: number): Promise<void> {
  if (juce) {
    juce.emitEvent('bd_pickFile', { id, ...atStage() });
    return;
  } // plugin: a native chooser keeps the file's path
  const t = model.get(id)?.params.track,
    ref = typeof t === 'string' ? refs.get(t) : undefined;
  // A missing remembered file: this click is the user gesture the browser needs to allow reading it again.
  if (missing.has(id) && ref?.provider === 'file' && ref.hash) {
    const file = await openRemembered(ref.hash, true);
    if (file) {
      await useFile(id, file, null, false);
      return;
    }
  }
  const picked = await pickAudioFile();
  if (picked) await useFile(id, picked.file, picked.handle, !missing.has(id));
}

export async function useFile(
  id: number,
  file: File,
  handle: FileSystemFileHandle | null,
  fresh: boolean,
): Promise<void> {
  const fp = await fingerprint(file);
  const ref: FileRef = {
    provider: 'file',
    name: file.name,
    bytes: fp.bytes,
    durationSec: 0,
    hash: fp.hash,
  };
  if (handle) await rememberHandle(fp.hash, handle);
  await whileLoading(id, async () => useSample(id, ref, await file.arrayBuffer(), fresh));
}

/** A sampler whose reference can't be loaded here (someone else's file, or a sound that's gone): the options panel says
 * so, and the reference stays in the patch until the user picks another sample. */
export function markMissing(id: number): void {
  const b = model.get(id),
    v1Block = v1Blocks.get(id),
    t = b?.params.track;
  if (!b || !v1Block || typeof t !== 'string') return;
  missing.add(id);
  const ref = refs.get(t);
  const name = ref?.provider === 'freesound' ? ref.name : (ref?.name ?? t.replace(/^file:/, ''));
  Object.assign(v1Block.Params, {
    trackName: `MISSING · ${name.toUpperCase().slice(0, 24)}`,
    user: ref?.provider === 'freesound' ? 'Freesound' : 'Local file',
  });
  v1Block.RefreshOptionsPanel();
}

/** The Convolver only uses its impulse response's first kMaxImpulseSeconds (engine config.hpp): download just that. */
export const maxSecondsFor = (id: number) =>
  model.get(id)?.type === 'fx.convolver' ? 2.5 : undefined;

/** Load a block's saved reference (patch open, share link): Freesound from its preview, a file from its remembered handle. */
export async function resolveSample(id: number, isNew = false): Promise<void> {
  if (juce) {
    if (isNew) juce.emitEvent('bd_samplesHello', {});
    return;
  } // plugin: the processor restores samples
  const b = model.get(id);
  if (!b || !SAMPLERS.has(b.type) || samples.has(id)) return;
  const t =
    b.params.track ??
    BLOCKS_BY_ID.get(b.type)?.params.find((param) => param.key === 'track')?.default;
  if (isDeadDefault(t)) {
    // v2's default sound (DEFAULT_SOUNDS) for a new block, or one still on v1's default (v1 import, Phase 1 patch).
    const d = DEFAULT_SOUNDS[b.type];
    if (!d) return;
    try {
      const ref = { ...d },
        bytes = await whileLoading(id, () => fetchFreesound(ref, maxSecondsFor(id)));
      // Something else was chosen meanwhile (a file, a search result): it wins.
      if (samples.has(id) || !model.has(id) || !isDeadDefault(model.get(id)!.params.track)) return;
      await useSample(id, ref, bytes, isNew);
    } catch (error) {
      console.warn('BlokDust: default sound unavailable', error);
    }
    return;
  }
  if (typeof t !== 'string') return;
  const ref = refs.get(t);
  if (t.startsWith('freesound:')) {
    if (ref?.provider !== 'freesound') {
      markMissing(id);
      return;
    }
    try {
      await whileLoading(id, async () =>
        useSample(id, ref, await fetchFreesound(ref, maxSecondsFor(id)), false),
      );
    } catch (error) {
      console.warn('BlokDust: Freesound sound unavailable', error);
      markMissing(id);
    }
  } else if (t.startsWith('file:')) {
    const file =
      ref?.provider === 'file' && ref.hash ? await openRemembered(ref.hash, false) : null;
    if (file && ref?.provider === 'file')
      await whileLoading(id, async () => useSample(id, ref, await file.arrayBuffer(), false));
    else markMissing(id);
  }
}

/** Update params in the model, the v1 block and the engine (numbers and switches only reach the engine). */
export function setParams(id: number, values: Record<string, unknown>): void {
  const b = model.get(id),
    v1Block = v1Blocks.get(id),
    def = b && BLOCKS_BY_ID.get(b.type);
  if (!b || !def) return;
  Object.assign(b.params, values);
  if (v1Block) Object.assign(v1Block.Params, values);
  send(
    Object.entries(values).flatMap(([k, val]) => {
      const i = def.params.findIndex((param) => param.key === k);
      return i >= 0 && (typeof val === 'number' || typeof val === 'boolean')
        ? [{ type: CommandType.SetParam, id, param: i, value: Number(val) }]
        : [];
    }),
  );
  changed();
}

/** A sampler's new audio (v1 SamplerBase.SetBuffers / Recorder.SetBuffers / SampleGen.PopulateBuffer). */
export function useBuffer(
  id: number,
  buffer: AudioBuffer,
  region: 'keep' | 'reset' | 'half',
  waveDetail = 5,
): void {
  // Plugin: the processor plays it, from a file it saves (a reopened project needs no editor); its report shows it.
  if (juce) {
    juce.emitEvent('bd_sampleData', {
      id,
      sampleRate: buffer.sampleRate,
      data: Array.from(buffer.getChannelData(0)),
      ...atStage(),
    });
    return;
  }
  samples.set(id, buffer);
  const v1Block = v1Blocks.get(id),
    dur = buffer.duration;
  if (region === 'reset')
    setParams(id, {
      startPosition: 0,
      endPosition: dur,
      loopStart: 0,
      loopEnd: dur,
      reverse: false,
    });
  if (region === 'half')
    setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur });
  if (v1Block) {
    v1Block.PrimaryBuffer = buffer;
    v1Block.WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, waveDetail, 95);
    v1Block.RefreshOptionsPanel();
  }
  sendSample(id, buffer);
  stage.redraw();
}
