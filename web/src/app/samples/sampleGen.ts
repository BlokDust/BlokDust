import { SAMPLE_GEN } from '../../v1ui/ported/SampleGenData';
import { noteToFrequency } from '../../v1ui/noteToFrequency.ts';
import { withSound } from '../../v1ui/blocks.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { Waveform } from '../../v1ui/ported/Core/Audio/Waveform';
import { changed } from '../model/autosave.ts';
import { model, v1Blocks } from '../model/patchModel.ts';
import { samples, useBuffer } from './userSamples.ts';

// v1 SampleGen's own generator (ported verbatim) renders a random arpeggio, its recipe saved. With
// a SOUND number (CHG-0035) the random is seeded by it; without, the saved recipe plays as in v1.

/** The sound each SampleGen's wave was last made from (a release on the same number makes nothing
 * new). */
export const soundMade = new Map<number, number>();

/** v1's SampleGen methods, run on an object holding its state and our PopulateBuffer. */
interface SampleGenRun {
  DataToBuffer(): void;
}
function sampleGenRun<State extends object>(state: State): SampleGenRun & State {
  return Object.assign(Object.create(SAMPLE_GEN) as SampleGenRun, state);
}
/** Renders the run's buffer on a timeout, as v1 does, with Math.random seeded by `sound`. */
function renderLater(run: SampleGenRun, sound: number): void {
  setTimeout(() => {
    withSound(sound, () => {
      run.DataToBuffer();
    });
  }, 16);
}

export function generateSample(id: number, fromSeed: boolean): void {
  const v1Block = v1Blocks.get(id);
  if (!v1Block) return;
  v1Block.WaveForm = [];
  v1Block.RefreshOptionsPanel();
  const sound = Number(v1Block.Params.sound) || 0;
  if (sound) soundMade.set(id, sound);
  const run = sampleGenRun({
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
  renderLater(run, sound);
}

/** v1 SampleGen for a block that is not on show (inside a Stage): its saved recipe, or a new one
 * kept in `params`. */
export function generateBuffer(params: Record<string, unknown>): Promise<AudioBuffer> {
  const def = BLOCKS_BY_ID.get('source.sample-gen');
  if (!def) throw new Error('no source.sample-gen manifest');
  const Params = {
    ...Object.fromEntries(def.params.map((param) => [param.key, param.default])),
    ...params,
  };
  return new Promise((res) => {
    const sound = Number(Params.sound) || 0;
    const run = sampleGenRun({
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
    renderLater(run, sound);
  });
}

/** A block's audio as it was (looking into a Stage): shown in its panel, not sent (the engine has
 * it). */
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
