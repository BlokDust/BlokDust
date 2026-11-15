// What a video replays (SPEC-SHARING-VIDEO-EXPORT R1–R5): the worklet's session log (JUST PLAYED) or the patch as it is
// now from a fresh engine (FROM START).
import type { Command } from '../engine/wasmEngine.ts';
import type { LogEntry, SessionLog } from '../audio/protocol.ts';
import type { SentSample } from '../audio/engineNode.ts';
import { QUANTUM, type ReplaySample, type ReplaySource } from './replay.ts';

const toReplay = (s: SentSample | undefined): ReplaySample | undefined => s && {
  id: s.id, stage: s.stage, left: s.buffer.getChannelData(0), right: s.buffer.numberOfChannels > 1 ? s.buffer.getChannelData(1) : undefined, sampleRate: s.buffer.sampleRate,
};

export type Window = { from: number; to: number } | { error: string };

/** JUST PLAYED: the last `seconds` of the session (all of it if shorter), refused if it can't be replayed (R3, R4). */
export function playedWindow(log: SessionLog, seconds: number): Window {
  if (log.overflow) return { error: 'This session is too long to replay. Choose FROM START.' };
  if (log.inputFrom >= 0 && log.inputFrom < log.frame) return { error: 'Live input (Microphone, Audio In) can’t be replayed. Choose FROM START.' };
  const to = log.frame - (log.frame % QUANTUM);
  const from = Math.max(0, to - Math.ceil((seconds * log.sampleRate) / QUANTUM) * QUANTUM);
  if (to - from < log.sampleRate) return { error: 'Play for a moment first.' };
  return { from, to };
}

export function playedSource(log: SessionLog, sent: readonly SentSample[]): ReplaySource {
  return { sampleRate: log.sampleRate, seed: log.seed, entries: log.entries, sample: seq => toReplay(sent[seq]) };
}

/**
 * FROM START: the engine built from the patch (`commands`, as the worklet is at START), its samples attached after the
 * first quantum, when their blocks exist (as the app's offline render does).
 */
export function startSource(sampleRate: number, seed: number, commands: Command[], samples: readonly SentSample[]): ReplaySource {
  const entries: LogEntry[] = [{ frame: 0, commands }, ...samples.map((_, i) => ({ frame: QUANTUM, sample: i }))];
  return { sampleRate, seed, entries, sample: seq => toReplay(samples[seq]) };
}
