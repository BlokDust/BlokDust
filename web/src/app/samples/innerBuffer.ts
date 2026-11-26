// A sampler's audio from what the patch says of it, without it being on show (inside a Stage).
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import type { PatchBlock } from '../../patch/loadPatch.ts';
import {
  DEFAULT_SOUNDS,
  fetchFreesound,
  isDeadDefault,
  openRemembered,
  refKey,
} from '../../patch/samples.ts';
import { refs } from '../model/patchModel.ts';
import { generateBuffer } from './sampleGen.ts';
import { SAMPLERS } from './userSamples.ts';

/** The Convolver keeps 2.5 s of an impulse. */
const maxSecondsOf = (type: string) => (type === 'fx.convolver' ? 2.5 : undefined);

/** v1's default file is gone: v2's default Freesound sound takes its place, saved in the patch. */
async function defaultSoundBytes(block: PatchBlock, params: Record<string, unknown>) {
  const sound = DEFAULT_SOUNDS[block.type];
  if (!sound) return null;
  const ref = { ...sound };
  const bytes = await fetchFreesound(ref, maxSecondsOf(block.type));
  const key = refKey(ref);
  refs.set(key, ref);
  Object.assign(params, {
    track: key,
    trackName: ref.name.toUpperCase().slice(0, 30),
    user: ref.username,
    permalink: ref.url,
  });
  return bytes;
}

async function referencedBytes(block: PatchBlock, track: string): Promise<ArrayBuffer | null> {
  const ref = refs.get(track);
  if (track.startsWith('freesound:') && ref?.provider === 'freesound')
    return fetchFreesound(ref, maxSecondsOf(block.type));
  if (track.startsWith('file:') && ref?.provider === 'file' && ref.hash)
    return (await (await openRemembered(ref.hash, false))?.arrayBuffer()) ?? null;
  return null;
}

export async function innerBuffer(block: PatchBlock): Promise<AudioBuffer | null> {
  const params = (block.params ??= {});
  if (block.type === 'source.sample-gen') return generateBuffer(params);
  if (!SAMPLERS.has(block.type)) return null;
  const track =
    params.track ??
    BLOCKS_BY_ID.get(block.type)?.params.find((param) => param.key === 'track')?.default;
  let bytes: ArrayBuffer | null = null;
  if (isDeadDefault(track)) bytes = await defaultSoundBytes(block, params);
  else if (typeof track === 'string') bytes = await referencedBytes(block, track);
  return bytes ? new OfflineAudioContext(1, 1, 48000).decodeAudioData(bytes) : null;
}
