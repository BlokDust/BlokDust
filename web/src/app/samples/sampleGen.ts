import { SAMPLE_GEN } from '../../v1ui/ported/SampleGenData';
import { noteToFrequency } from '../../v1ui/noteToFrequency.ts';
import { withSound } from '../../v1ui/blocks.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { Waveform } from '../../v1ui/ported/Core/Audio/Waveform';
import { changed } from '../model/autosave.ts';
import { model, v1Blocks } from '../model/patchModel.ts';
import { samples, useBuffer } from './userSamples.ts';

// ---- v1 SampleGen: v1's own generator (ported verbatim) renders a random arpeggio; its recipe is saved ----
// SOUND (CHG-0035): a SampleGen with a sound number makes its wave from that number (v1's generator on a seeded
// random); one without (v1 patches, and v2 ones from before) plays its saved recipe as v1 did.
/** The sound each SampleGen's wave was last made from (a release on the same number makes nothing new). */
export const soundMade = new Map<number, number>();

export function generateSample(id: number, fromSeed: boolean): void {
  const v1Block = v1Blocks.get(id);
  if (!v1Block) return;
  v1Block.WaveForm = [];
  v1Block.RefreshOptionsPanel();
  const sound = Number(v1Block.Params.sound) || 0;
  if (sound) soundMade.set(id, sound);
  const ctx = Object.assign(Object.create(SAMPLE_GEN), {
    Params: v1Block.Params,
    _LoadFromShare: fromSeed && !sound,
    _SeedLoad: true,
    _WaveVoices: [] as unknown[],
    Sources: [{ noteToFrequency: (note: string) => noteToFrequency(note) }],
    PopulateBuffer(this: { _BufferData: Float32Array<ArrayBuffer> }, sr: number) {
      const data = this._BufferData;
      const buf = new AudioBuffer({ numberOfChannels: 1, length: data.length, sampleRate: sr });
      buf.copyToChannel(data, 0);
      const b = model.get(id);
      if (b) {
        b.params.seed = v1Block.Params.seed;
        changed();
      }
      useBuffer(id, buf, fromSeed ? 'keep' : 'reset');
    },
  });
  setTimeout(() => withSound(sound, () => ctx.DataToBuffer()), 16); // v1 runs it on a timeout too
}

/** v1 SampleGen for a block that is not on show (inside a Stage): its saved recipe, or a new one kept in `params`. */
export function generateBuffer(params: Record<string, unknown>): Promise<AudioBuffer> {
  const def = BLOCKS_BY_ID.get('source.sample-gen')!;
  const Params = {
    ...Object.fromEntries(def.params.map((param) => [param.key, param.default])),
    ...params,
  };
  return new Promise((res) => {
    const sound = Number(Params.sound) || 0;
    const ctx = Object.assign(Object.create(SAMPLE_GEN), {
      Params,
      _LoadFromShare: !sound && !!(params.seed as { waveVoices?: unknown } | undefined)?.waveVoices,
      _SeedLoad: true,
      _WaveVoices: [] as unknown[],
      Sources: [{ noteToFrequency: (note: string) => noteToFrequency(note) }],
      PopulateBuffer(this: { _BufferData: Float32Array<ArrayBuffer> }, sr: number) {
        const buf = new AudioBuffer({
          numberOfChannels: 1,
          length: this._BufferData.length,
          sampleRate: sr,
        });
        buf.copyToChannel(this._BufferData, 0);
        params.seed = Params.seed;
        res(buf);
      },
    });
    setTimeout(() => withSound(sound, () => ctx.DataToBuffer()), 16);
  });
}

/** A block's audio as it was (looking into a Stage): shown in its panel, not sent (the engine has it). */
export function showBuffer(id: number, buffer: AudioBuffer): void {
  const b = model.get(id),
    v1Block = v1Blocks.get(id);
  if (!b) return;
  samples.set(id, buffer);
  if (!v1Block) return;
  const wave = new Waveform().GetWaveformFromBuffer(
    buffer,
    200,
    b.type === 'source.recorder' ? 2 : 5,
    95,
  );
  v1Block.PrimaryBuffer = buffer;
  if (b.type === 'source.granular' || b.type === 'fx.convolver') v1Block._WaveForm = wave;
  else v1Block.WaveForm = b.params.reverse ? wave.reverse() : wave;
}
