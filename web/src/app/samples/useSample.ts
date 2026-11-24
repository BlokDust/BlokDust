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

// ---- fx.convolver: the built-in impulse response's waveform (v1 showed its loaded response) ----
export async function showBuiltInImpulse(id: number): Promise<void> {
  const v = v1Blocks.get(id);
  if (!v || samples.has(id)) return;
  const { left, right } = defaultImpulse(await engineModule(), 48000);
  const buf = new AudioBuffer({ numberOfChannels: 2, length: left.length, sampleRate: 48000 });
  buf.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
  if (!samples.has(id)) {
    v._WaveForm = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95);
    v.RefreshOptionsPanel();
  }
}

/**
 * Decoded audio for a sampler (Sample, Granular, Convolver) with its reference. `fresh`: a newly chosen sample (v1
 * LoadTrack / SetBuffers: region reset); otherwise a saved one being restored (its region params are kept).
 */
export async function useSample(
  id: number,
  ref: SampleRef,
  bytes: ArrayBuffer,
  fresh = true,
  display?: { trackName: string; user: string; permalink: string },
): Promise<void> {
  const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes);
  const b = model.get(id),
    v = v1Blocks.get(id);
  if (!b) return;
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
  if (v) Object.assign(v.Params, meta);
  changed();
  if (b.type === 'source.granular' || b.type === 'fx.convolver') {
    // Granular: the LOCATION slider draws the file and the grains play it. Convolver: the impulse response (v1 SetBuffer).
    // v1 Granular: a new sound puts the spawn point half way (a saved one keeps its own); the LOCATION slider spans
    // the file (v1 GetDuration of its first buffer), so the spawn and spread lines and dragging work.
    if (b.type === 'source.granular' && (fresh || typeof b.params.region !== 'number'))
      setParams(id, { region: buffer.duration * 0.5 });
    if (v) {
      v.PrimaryBuffer = buffer;
      v._WaveForm = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95);
      v.RefreshOptionsPanel();
    }
    sendSample(id, buffer); // Granular plays it (CHG-0004 3.8); Convolver uses it as the impulse response
    stage.redraw();
    return;
  }
  // v1 Sample.SetBuffers: a new sample resets the region (start 0, end = length, loop from half way). It lives in
  // the patch and goes to the engine, so playback loops exactly what the panel shows (owner review 2026-11-07, bug 1).
  // A restored patch that never saved a region gets the same defaults.
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
  if (v) {
    v.PrimaryBuffer = buffer;
    const wave = new Waveform().GetWaveformFromBuffer(buffer, 200, 5, 95); // v1 SamplerBase
    v.WaveForm = b.params.reverse ? wave.reverse() : wave; // v1 shows the reversed buffer's waveform
    v.RefreshOptionsPanel();
  }
  sendSample(id, buffer);
  stage.redraw();
}

export function init(): void {
  // Tests: attach a file without a picker.
  (window as unknown as { __bd_loadSample: unknown }).__bd_loadSample = (
    id: number,
    name: string,
    bytes: ArrayBuffer,
  ) =>
    useSample(
      id,
      { provider: 'file', name, bytes: bytes.byteLength, durationSec: 0, hash: '' },
      bytes,
      true,
    );
}
