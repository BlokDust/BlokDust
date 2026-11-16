// Thin wrapper over the standalone engine WASM (engine/wasm/bindings.cpp). No DOM: runs in Node, the main thread
// and an AudioWorkletGlobalScope. Compile the module once (WebAssembly.compile) and pass it around.

// Plain objects, not enums: Node's type stripping (used by repo tools) cannot compile TS enums.
export const CommandType = { AddBlock: 0, RemoveBlock: 1, MoveBlock: 2, SetParam: 3, NoteOn: 4, NoteOff: 5, SetMaster: 6, Press: 7, NoteExpression: 8, Tempo: 9, WorldPower: 10, Relink: 11 } as const;
export type CommandType = (typeof CommandType)[keyof typeof CommandType];
export const EventType = { Emit: 0, Hit: 1, Absorb: 2, Expire: 3, GateOn: 4, GateOff: 5, Connect: 6, Disconnect: 7, Logic: 8, Pass: 9, Block: 10, Split: 11 } as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export interface Command {
  type: CommandType;
  id: number;
  blockType?: number;
  x?: number;
  y?: number;
  param?: number;
  value?: number;
  /** Apply at the first tick boundary at or after this sample; -1 = as soon as possible. */
  atSample?: number;
  /** The command is for the inner world of this Stage block (its engine id in the outer world; CHG-0021). */
  stage?: number;
  /** AddBlock in the plugin: the block's patch id (the processor keeps the patch; the engine ignores it). */
  key?: string;
}

export interface EngineEvent { sample: number; tick: number; type: EventType; block: number; other: number;
  /** Logic events, from the worklet: the block's first param after the quantum (a Toggle's on/off; CHG-0013). */
  value?: number }

interface Exports {
  memory: WebAssembly.Memory;
  _initialize(): void;
  bd_create(sr: number, seedLo: number, seedHi: number): number;
  bd_destroy(h: number): void;
  bd_push(h: number, type: number, id: number, blockType: number, x: number, y: number, param: number, value: number, at: number): number;
  bd_process(h: number, frames: number): void;
  bd_left(h: number): number;
  bd_alloc(floats: number): number;
  bd_default_impulse(left: number, right: number, frames: number, sampleRate: number): void;
  bd_free(p: number): void;
  bd_attach_sample(h: number, id: number, left: number, right: number, frames: number, sampleRate: number): number;
  bd_attach_sample_stage(h: number, stage: number, id: number, left: number, right: number, frames: number, sampleRate: number): number;
  bd_right(h: number): number;
  bd_max_frames(): number;
  bd_event_count(h: number): number;
  bd_event_field(h: number, i: number, field: number): number;
  bd_clear_events(h: number): void;
  bd_pack_particles(h: number): number;
  bd_particles(h: number): number;
  bd_pack_connections(h: number): number;
  bd_pairs(h: number): number;
  bd_block_gate(h: number, id: number): number;
  bd_block_param(h: number, id: number, param: number): number;
  bd_pack_powered(h: number): number;
  bd_powered(h: number): number;
  bd_process_input(h: number, frames: number): void;
  bd_input_left(h: number): number;
  bd_input_right(h: number): number;
  bd_fill_test_sine(h: number, start: number, frames: number, sr: number, freq: number, gain: number): void;
  bd_pack_beams(h: number): number;
  bd_beams(h: number): number;
  bd_pack_playheads(h: number): number;
  bd_playheads(h: number): number;
  bd_push_stage(h: number, stage: number, type: number, id: number, blockType: number, x: number, y: number, param: number, value: number, at: number): number;
  bd_view(h: number, stage: number): void;
  bd_pack_monitors(h: number): number;
  bd_monitors(h: number): number;
}

/** fx.convolver's built-in impulse response (engine makeDefaultImpulse), for its options-panel waveform. */
export function defaultImpulse(module: WebAssembly.Module, sampleRate: number, seconds = 2.5): { left: Float32Array; right: Float32Array } {
  const x = new WebAssembly.Instance(module, { env: { emscripten_notify_memory_growth: () => {} } }).exports as unknown as Exports;
  x._initialize();
  const n = Math.round(seconds * sampleRate), pl = x.bd_alloc(n), pr = x.bd_alloc(n);
  x.bd_default_impulse(pl, pr, n, sampleRate);
  return { left: new Float32Array(x.memory.buffer, pl, n).slice(), right: new Float32Array(x.memory.buffer, pr, n).slice() };
}

export class WasmEngine {
  readonly maxFrames: number;
  private readonly x: Exports;
  private readonly h: number;
  /** Output views, re-created if WASM memory grew (sample buffers are allocated in it). */
  private get left(): Float32Array { return new Float32Array(this.x.memory.buffer, this.x.bd_left(this.h), this.maxFrames); }
  private get right(): Float32Array { return new Float32Array(this.x.memory.buffer, this.x.bd_right(this.h), this.maxFrames); }
  private samples = new Map<string, number[]>();  // "<stage>:<block id>" → WASM pointers to free

  private constructor(x: Exports, sampleRate: number, seed: number) {
    this.x = x;
    this.h = x.bd_create(sampleRate, seed >>> 0, Math.floor(seed / 2 ** 32) >>> 0);
    this.maxFrames = x.bd_max_frames();
  }

  /** Synchronous instantiation from a compiled module (works inside an AudioWorklet). */
  static fromModule(module: WebAssembly.Module, sampleRate: number, seed = 1): WasmEngine {
    // Memory can grow (sample buffers): the standalone module only asks to be told; views are re-created on access.
    const instance = new WebAssembly.Instance(module, { env: { emscripten_notify_memory_growth: () => {} } });
    const x = instance.exports as unknown as Exports;
    x._initialize();
    return new WasmEngine(x, sampleRate, seed);
  }

  /** Give a source.sample block its decoded audio (copied into WASM memory; the previous buffer is freed). `stage`:
   * the block is inside that Stage block (CHG-0021). */
  attachSample(blockId: number, left: Float32Array, right: Float32Array | undefined, sampleRate: number, stage = 0): boolean {
    const frames = left.length;
    const pl = this.x.bd_alloc(frames), pr = right ? this.x.bd_alloc(frames) : 0;
    if (!pl || (right && !pr)) return false;
    new Float32Array(this.x.memory.buffer, pl, frames).set(left);
    if (right) new Float32Array(this.x.memory.buffer, pr, frames).set(right.subarray(0, frames));
    const ok = (stage ? this.x.bd_attach_sample_stage(this.h, stage, blockId, pl, pr, frames, sampleRate) : this.x.bd_attach_sample(this.h, blockId, pl, pr, frames, sampleRate)) === 1;
    const key = `${stage}:${blockId}`;
    for (const p of this.samples.get(key) ?? []) this.x.bd_free(p);
    this.samples.set(key, ok ? [pl, ...(pr ? [pr] : [])] : []);
    if (!ok) { this.x.bd_free(pl); if (pr) this.x.bd_free(pr); }
    return ok;
  }

  push(c: Command): boolean {
    // A Stage block's inner world (CHG-0021) is made and attached the first time a command names it.
    if (c.stage) return this.x.bd_push_stage(this.h, c.stage, c.type, c.id, c.blockType ?? 0, c.x ?? 0, c.y ?? 0, c.param ?? 0, c.value ?? 0, c.atSample ?? -1) === 1;
    return this.x.bd_push(this.h, c.type, c.id, c.blockType ?? 0, c.x ?? 0, c.y ?? 0, c.param ?? 0, c.value ?? 0, c.atSample ?? -1) === 1;
  }

  /** Render `frames` (<= maxFrames) samples; returns views valid until the next call. With `input`, feeds Audio In. */
  process(frames: number, input?: { left: Float32Array; right?: Float32Array }): { left: Float32Array; right: Float32Array } {
    if (input) {
      new Float32Array(this.x.memory.buffer, this.x.bd_input_left(this.h), frames).set(input.left.subarray(0, frames));
      new Float32Array(this.x.memory.buffer, this.x.bd_input_right(this.h), frames).set((input.right ?? input.left).subarray(0, frames));
      this.x.bd_process_input(this.h, frames);
    } else this.x.bd_process(this.h, frames);
    return { left: this.left.subarray(0, frames), right: this.right.subarray(0, frames) };
  }

  /** Render with the golden-fixture test sine as input (identical samples to the native CLI). */
  processTestSine(frames: number, startSample: number, sampleRate: number, frequency: number, gain: number) {
    this.x.bd_fill_test_sine(this.h, startSample, frames, sampleRate, frequency, gain);
    this.x.bd_process_input(this.h, frames);
    return { left: this.left.subarray(0, frames), right: this.right.subarray(0, frames) };
  }

  /** Laser beams as a packed [x0, y0, x1, y1]* copy (grid units). */
  beams(): Float32Array {
    const n = this.x.bd_pack_beams(this.h);
    return new Float32Array(this.x.memory.buffer, this.x.bd_beams(this.h), n * 4).slice();
  }

  /** Where samplers are playing, packed [blockId, seconds]* (one per sounding voice / grain). */
  /** Snapshots (particles, connections, powered, beams, monitors) come from Stage block `stage`'s inner world; 0: the
   * outer world. */
  setView(stage: number): void { this.x.bd_view(this.h, stage); }
  /** Live readouts for open panels, packed [blockId, v0, v1, v2, v3]* (Engine::monitors). */
  monitors(): Float32Array {
    const n = this.x.bd_pack_monitors(this.h);
    return new Float32Array(this.x.memory.buffer, this.x.bd_monitors(this.h), n * 5).slice();
  }
  playheads(): Float32Array {
    const n = this.x.bd_pack_playheads(this.h);
    return new Float32Array(this.x.memory.buffer, this.x.bd_playheads(this.h), n * 2).slice();
  }

  /** Read and clear events logged since the last drain. */
  drainEvents(): EngineEvent[] {
    const n = this.x.bd_event_count(this.h);
    const out: EngineEvent[] = [];
    for (let i = 0; i < n; i++) {
      const f = (k: number) => this.x.bd_event_field(this.h, i, k);
      out.push({ sample: f(0), tick: f(1), type: f(2) as EventType, block: f(3), other: f(4) });
    }
    this.x.bd_clear_events(this.h);
    return out;
  }

  /** Particles as a packed [x, y, size]* copy (grid units). */
  particles(): Float32Array {
    const n = this.x.bd_pack_particles(this.h);
    return new Float32Array(this.x.memory.buffer, this.x.bd_particles(this.h), n * 3).slice();
  }

  /** Connected block-id pairs as a packed [a, b]* copy. */
  connections(): Uint32Array {
    const n = this.x.bd_pack_connections(this.h);
    return new Uint32Array(this.x.memory.buffer, this.x.bd_pairs(this.h), n * 2).slice();
  }

  gate(id: number): boolean { return this.x.bd_block_gate(this.h, id) === 1; }
  /** A block's current param value (state the engine changes itself, e.g. a Toggle's on/off). */
  param(id: number, param: number): number { return this.x.bd_block_param(this.h, id, param); }

  /** Ids of blocks currently receiving power (copy). */
  powered(): Uint32Array {
    const n = this.x.bd_pack_powered(this.h);
    return new Uint32Array(this.x.memory.buffer, this.x.bd_powered(this.h), n).slice();
  }

  dispose(): void { this.x.bd_destroy(this.h); }
}

// ---- canonical hashes (must match engine/include/blokdust/hash.hpp) ----
const FNV_OFFSET = 0xcbf29ce484222325n, FNV_PRIME = 0x100000001b3n, MASK = 0xffffffffffffffffn;
export function fnv1a(bytes: Uint8Array, h = FNV_OFFSET): bigint {
  for (let i = 0; i < bytes.length; i++) h = ((h ^ BigInt(bytes[i])) * FNV_PRIME) & MASK;
  return h;
}
export function hashAudio(left: Float32Array, h = FNV_OFFSET): bigint {
  return fnv1a(new Uint8Array(left.buffer, left.byteOffset, left.byteLength), h);
}
/** Combine the two channel hashes (engine/include/blokdust/hash.hpp hash::stereo). */
export function hashStereo(hl: bigint, hr: bigint): bigint {
  const b = new Uint8Array(8);
  for (let i = 0; i < 8; i++) b[i] = Number((hr >> BigInt(8 * i)) & 0xffn);
  return fnv1a(b, hl);
}
export function hashEvents(events: EngineEvent[], h = FNV_OFFSET): bigint {
  const buf = new DataView(new ArrayBuffer(40));
  for (const e of events) {
    [e.sample, e.tick, e.type, e.block, e.other].forEach((v, k) => buf.setBigInt64(k * 8, BigInt(v), true));
    h = fnv1a(new Uint8Array(buf.buffer), h);
  }
  return h;
}
export const hex = (h: bigint) => h.toString(16).padStart(16, '0');
export { FNV_OFFSET };
