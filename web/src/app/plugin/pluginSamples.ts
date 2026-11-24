import { type SampleRef } from '../../patch/samples.ts';
import { Waveform } from '../../v1ui/ported/Core/Audio/Waveform';
import { stage } from '../boot/pixi.ts';
import { model, refs, v1Blocks } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { markMissing, missing, samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';

// ---- plugin samples: shown from the processor's reports (the UI never holds the audio there) ----
export interface PluginSampleInfo {
  id: number;
  stage?: number;
  loading: boolean;
  missing: boolean;
  duration?: number;
  sampleRate?: number;
  preview?: number[];
  params?: Record<string, unknown>;
  ref?: SampleRef;
  track?: string;
}

export function applyPluginSample(s: PluginSampleInfo): void {
  if ((s.stage ?? 0) !== (inside?.stageId ?? 0)) return; // a sampler of a world not on show (CHG-0038)
  const b = model.get(s.id),
    v = v1Blocks.get(s.id);
  if (!b || !v) return;
  if (s.loading) {
    scene.AnimationsLayer.AddToList(v);
    v.WaveForm = [];
    v._WaveForm = [];
  } // v1: the loading square until it arrives
  else scene.AnimationsLayer.RemoveFromList(v);
  if (s.ref && s.track) refs.set(s.track, s.ref);
  if (s.params) {
    Object.assign(b.params, s.params);
    Object.assign(v.Params, s.params);
  }
  if (s.missing) {
    samples.delete(s.id);
    markMissing(s.id);
    stage.redraw();
    return;
  }
  if (s.preview && s.duration) {
    // A stand-in buffer: v1's Waveform reads getChannelData/numberOfChannels; panels read duration.
    const data = Float32Array.from(s.preview),
      dur = s.duration;
    const buf = {
      duration: dur,
      length: data.length,
      numberOfChannels: 1,
      sampleRate: data.length / dur,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
    samples.set(s.id, buf);
    missing.delete(s.id);
    const wave = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95);
    v.PrimaryBuffer = buf; // GetDuration (Granular's LOCATION slider spans the file)
    if (b.type === 'source.granular' || b.type === 'fx.convolver') v._WaveForm = wave;
    else v.WaveForm = b.params.reverse ? wave.reverse() : wave;
  }
  v.RefreshOptionsPanel(s.loading ? 'animate' : undefined);
  stage.redraw();
}
