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
  | { type: 'sample'; id: number; left: Float32Array; right?: Float32Array; sampleRate: number }
  /** v1 Recorder (RecorderJS on the master output): start / stop capturing the engine's output. */
  | { type: 'record'; on: boolean };

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
export interface Recording { type: 'recording'; left: Float32Array; right: Float32Array; sampleRate: number }
export type FromWorklet = Snapshot | Recording;
