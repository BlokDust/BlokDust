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

export function applyPluginSample(pluginSampleInfo: PluginSampleInfo): void {
  // A sampler in a world not on show (CHG-0038).
  if ((pluginSampleInfo.stage ?? 0) !== (inside?.stageId ?? 0)) return;
  const b = model.get(pluginSampleInfo.id),
    v1Block = v1Blocks.get(pluginSampleInfo.id);
  if (!b || !v1Block) return;
  if (pluginSampleInfo.loading) {
    scene.AnimationsLayer.AddToList(v1Block);
    v1Block.WaveForm = [];
    v1Block._WaveForm = [];
  } // v1: the loading square until it arrives
  else scene.AnimationsLayer.RemoveFromList(v1Block);
  if (pluginSampleInfo.ref && pluginSampleInfo.track)
    refs.set(pluginSampleInfo.track, pluginSampleInfo.ref);
  if (pluginSampleInfo.params) {
    Object.assign(b.params, pluginSampleInfo.params);
    Object.assign(v1Block.Params, pluginSampleInfo.params);
  }
  if (pluginSampleInfo.missing) {
    samples.delete(pluginSampleInfo.id);
    markMissing(pluginSampleInfo.id);
    stage.redraw();
    return;
  }
  if (pluginSampleInfo.preview && pluginSampleInfo.duration) {
    // A stand-in buffer: v1's Waveform reads getChannelData/numberOfChannels; panels read duration.
    const data = Float32Array.from(pluginSampleInfo.preview),
      dur = pluginSampleInfo.duration;
    const buf = {
      duration: dur,
      length: data.length,
      numberOfChannels: 1,
      sampleRate: data.length / dur,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
    samples.set(pluginSampleInfo.id, buf);
    missing.delete(pluginSampleInfo.id);
    const wave = new Waveform().GetWaveformFromBuffer(buf, 200, 5, 95);
    v1Block.PrimaryBuffer = buf; // GetDuration (Granular's LOCATION slider spans the file)
    if (b.type === 'source.granular' || b.type === 'fx.convolver') v1Block._WaveForm = wave;
    else v1Block.WaveForm = b.params.reverse ? wave.reverse() : wave;
  }
  v1Block.RefreshOptionsPanel(pluginSampleInfo.loading ? 'animate' : undefined);
  stage.redraw();
}
