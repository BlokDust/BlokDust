// Main thread ⇄ AudioWorklet messages (ARCHITECTURE-0004: MessagePort only, SharedArrayBuffer optional).
import type { Command, EngineEvent } from '../engine/wasmEngine.ts';

export interface ProcessorOptions {
  module: WebAssembly.Module; seed: number; commands: Command[];
  /** Golden-fixture input for Audio In (tests); real input comes from the node's audio input. */
  testInput?: { frequency: number; gain: number };
}

export type ToWorklet =
  | { type: 'commands'; commands: Command[] }
  /** Decoded audio for a source.sample block (the user's own file, DATA-0005); copied into WASM memory. */
  | { type: 'sample'; id: number; left: Float32Array; right?: Float32Array; sampleRate: number; /** Inside this Stage block (CHG-0021). */ stage?: number;
      /** The main thread's number for this attachment: the session log names it (SPEC-SHARING-VIDEO-EXPORT R1). */ seq?: number }
  /** v1 Recorder (RecorderJS on the master output): start / stop capturing the engine's output. */
  | { type: 'record'; on: boolean }
  /** Snapshots come from this Stage block's inner world (CHG-0021); 0: the outer world. */
  | { type: 'view'; stage: number }
  /** Send the session log (video export, SPEC-SHARING-VIDEO-EXPORT R1). */
  | { type: 'log' };

export interface Snapshot {
  type: 'snapshot';
  /** Engine sample clock at the end of the quantum this snapshot was taken after. */
  frame: number;
  /** Packed [x, y, size]* in grid units. */
  particles: Float32Array;
  /** Packed connected block-id pairs [a, b]*; only sent when the topology changed. */
  connections?: Uint32Array;
  /** Laser beams, packed [x0, y0, x1, y1]* (grid units). */
  beams: Float32Array;
  /** Ids of blocks with power > 0. */
  powered: Uint32Array;
  /** Sampler playheads, packed [blockId, seconds]* (the open panel's playback lines). */
  playheads?: Float32Array;
  /** Live readouts for open panels, packed [blockId, v0, v1, v2, v3]* (Engine::monitors: a Compressor's level and gain
   * reduction, …). */
  monitors?: Float32Array;
  /** UI-relevant events since the previous snapshot. */
  events: EngineEvent[];
  /** Output RMS since the previous snapshot (meters / tests). */
  rms: number;
}
/** The master output captured between record on/off (v1 Recorder). */
export interface Recording { type: 'recording'; left: Float32Array; right: Float32Array; sampleRate: number; /** The engine frame of the first sample. */ startFrame: number }
/** One entry of the session log: what the engine was given before the quantum that starts at `frame`. */
export type LogEntry = { frame: number; commands: Command[] } | { frame: number; sample: number };
/** The session log (SPEC-SHARING-VIDEO-EXPORT R1–R4): replaying `entries` in a fresh engine from frame 0 gives what the
 * worklet played up to `frame`. */
export interface SessionLog {
  type: 'log'; frame: number; sampleRate: number; seed: number; entries: LogEntry[];
  /** More than the cap was logged: the log was dropped (R4). */
  overflow: boolean;
  /** The first frame live input (Microphone, Audio In) reached the engine, or -1 (R3). */
  inputFrom: number;
}
export type FromWorklet = Snapshot | Recording | SessionLog;
