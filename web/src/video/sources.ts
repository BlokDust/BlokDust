// What a video plays (SPEC-SHARING-VIDEO-EXPORT R1–R2): the patch as it is now, from a fresh engine, as it plays when
// it has just loaded (owner, 2026-11-15).
import type { Command } from '../engine/wasmEngine.ts';
import { QUANTUM, type LogEntry, type ReplaySource } from './replay.ts';

/** A sample a block plays: its engine id, the Stage it is inside (0: none), and the audio. */
export interface PatchSample { id: number; stage: number; buffer: AudioBuffer }

/**
 * The engine built from the patch (`commands`, as the worklet is at START), its samples attached after the first
 * quantum, when their blocks exist (as the app's offline render does).
 */
export function startSource(sampleRate: number, seed: number, commands: Command[], samples: readonly PatchSample[]): ReplaySource {
  const entries: LogEntry[] = [{ frame: 0, commands }, ...samples.map((_, i) => ({ frame: QUANTUM, sample: i }))];
  return {
    sampleRate, seed, entries,
    sample: i => {
      const s = samples[i];
      return s && { id: s.id, stage: s.stage, left: s.buffer.getChannelData(0), right: s.buffer.numberOfChannels > 1 ? s.buffer.getChannelData(1) : undefined, sampleRate: s.buffer.sampleRate };
    },
  };
}
