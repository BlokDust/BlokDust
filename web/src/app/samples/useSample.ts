// A sampler's audio: a loaded file, or the Convolver's built-in impulse.
import { defaultImpulse } from '../../engine/wasmEngine.ts';
import { engineModule } from '../../audio/engineNode.ts';
import { Waveform } from '../../v1ui/ported/Core/Audio/Waveform';
import { type SampleRef, DEFAULT_SOUNDS, refKey } from '../../patch/samples.ts';
import { track } from '../../analytics/client.ts';
import { stage } from '../boot/pixi.ts';
import { changed } from '../model/autosave.ts';
import { sendSample } from '../model/engineLink.ts';
import { model, refs, v1Blocks } from '../model/patchModel.ts';
import { missing, samples, setParams } from './userSamples.ts';

/** Browser-test hooks. */
declare global {
  interface Window {
    /** Attach a file without a picker. */
    __bd_loadSample: (id: number, name: string, bytes: ArrayBuffer) => ReturnType<typeof useSample>;
  }
}

/** fx.convolver: the built-in impulse response's waveform (v1 showed its loaded response). */
export async function showBuiltInImpulse(id: number): Promise<void> {
  const v1Block = v1Blocks.get(id);
  if (!v1Block || samples.has(id)) return;
  const { left, right } = defaultImpulse(await engineModule(), 48000);
  const buf = new AudioBuffer({ numberOfChannels: 2, length: left.length, sampleRate: 48000 });
  buf.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
  if (!samples.has(id)) {
    v1Block._WaveForm = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95);
    v1Block.RefreshOptionsPanel();
  }
}

/** Decoded audio for a sampler with its reference, unless a newer pick replaced it (`isNewest`).
 * `fresh`: newly chosen (v1 LoadTrack/SetBuffers: region reset); otherwise a saved one restored. */
export async function useSample(
  id: number,
  ref: SampleRef,
  bytes: ArrayBuffer,
  fresh = true,
  isNewest = () => true,
  display?: { trackName: string; user: string; permalink: string },
): Promise<void> {
  const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes);
  const b = model.get(id),
    v1Block = v1Blocks.get(id);
  if (!b || !isNewest()) return;
  if (ref.provider === 'file') ref.durationSec = Math.round(buffer.duration * 1000) / 1000;
  if (fresh)
    track('sample_loaded', {
      source:
        ref.provider === 'file'
          ? 'file'
          : DEFAULT_SOUNDS[b.type]?.id === ref.id
            ? 'default'
            : 'freesound',
    });
  const key = refKey(ref);
  refs.set(key, ref);
  missing.delete(id);
  samples.set(id, buffer);
  const shown =
    display ??
    (ref.provider === 'freesound'
      ? { trackName: ref.name.toUpperCase().slice(0, 30), user: ref.username, permalink: ref.url }
      : { trackName: ref.name, user: 'Local file', permalink: '' });
  // Saved display text stays when restoring; a new sample shows its own.
  const meta =
    fresh || b.params.track !== key
      ? { track: key, ...shown }
      : {
          track: key,
          trackName: b.params.trackName ?? shown.trackName,
          user: b.params.user ?? shown.user,
          permalink: b.params.permalink ?? shown.permalink,
        };
  Object.assign(b.params, meta);
  if (v1Block) Object.assign(v1Block.Params, meta);
  changed();
  if (b.type === 'source.granular' || b.type === 'fx.convolver') {
    // Granular: grains play it and LOCATION spans it (v1 GetDuration), a new sound spawning half
    // way. Convolver: the impulse response (v1 SetBuffer).
    if (b.type === 'source.granular' && (fresh || typeof b.params.region !== 'number'))
      setParams(id, { region: buffer.duration * 0.5 });
    if (v1Block) {
      v1Block.PrimaryBuffer = buffer;
      v1Block._WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95);
      v1Block.RefreshOptionsPanel();
    }
    // Granular plays it (CHG-0004 3.8); Convolver uses it as the impulse response
    sendSample(id, buffer);
    stage.redraw();
    return;
  }
  // v1 Sample.SetBuffers: a new or never-saved region is the whole sample, looping from half way;
  // the patch and the engine hold it, so playback loops exactly what the panel shows.
  const dur = buffer.duration;
  if (fresh)
    setParams(id, {
      startPosition: 0,
      endPosition: dur,
      loopStart: dur * 0.5,
      loopEnd: dur,
      reverse: false,
    });
  else if (typeof b.params.endPosition !== 'number' || b.params.endPosition <= 0)
    setParams(id, { startPosition: 0, endPosition: dur, loopStart: dur * 0.5, loopEnd: dur });
  if (v1Block) {
    v1Block.PrimaryBuffer = buffer;
    const wave = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95); // v1 SamplerBase
    // v1 shows the reversed buffer's waveform
    v1Block.WaveForm = b.params.reverse ? wave.reverse() : wave;
    v1Block.RefreshOptionsPanel();
  }
  sendSample(id, buffer);
  stage.redraw();
}

export function init(): void {
  window.__bd_loadSample = (id: number, name: string, bytes: ArrayBuffer) =>
    useSample(
      id,
      { provider: 'file', name, bytes: bytes.byteLength, durationSec: 0, hash: '' },
      bytes,
      true,
    );
}
