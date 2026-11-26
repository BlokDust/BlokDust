// On the website Audio In loads as a Microphone, which needs power (CHG-0041: unpowered, an FX
// patch played loud feedback). The plugins keep Audio In: the DAW track, needing no power.
import type { Patch, PatchBlock } from './loadPatch.ts';

const swap = (b: PatchBlock): PatchBlock =>
  b.type === 'source.audio-in' ? { ...b, type: 'source.microphone' } : b;

export function audioInAsMicrophone(patch: Patch): Patch {
  const has = (bs: PatchBlock[] | undefined) => !!bs?.some((b) => b.type === 'source.audio-in');
  if (!has(patch.blocks) && !patch.macros?.some((macro) => has(macro.blocks))) return patch;
  return {
    ...patch,
    blocks: patch.blocks.map(swap),
    ...(patch.macros
      ? { macros: patch.macros.map((macro) => ({ ...macro, blocks: macro.blocks.map(swap) })) }
      : {}),
  };
}
