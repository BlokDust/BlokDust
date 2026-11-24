// On the website an Audio In block is the visitor's microphone, so it loads as a Microphone, which needs power (CHG-0041,
// owner 2026-11-19: a patch made in the FX plugin played the microphone, unpowered, as loud feedback). The plugins keep
// Audio In: there it is the DAW track and needs no power.
import type { Patch, PatchBlock } from './loadPatch.ts';

const swap = (b: PatchBlock): PatchBlock =>
  b.type === 'source.audio-in' ? { ...b, type: 'source.microphone' } : b;

export function audioInAsMicrophone(p: Patch): Patch {
  const has = (bs: PatchBlock[] | undefined) => !!bs?.some((b) => b.type === 'source.audio-in');
  if (!has(p.blocks) && !p.macros?.some((m) => has(m.blocks))) return p;
  return {
    ...p,
    blocks: p.blocks.map(swap),
    ...(p.macros ? { macros: p.macros.map((m) => ({ ...m, blocks: m.blocks.map(swap) })) } : {}),
  };
}
