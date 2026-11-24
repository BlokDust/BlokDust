// Plays a patch in a fresh WASM engine, offline (SPEC-SHARING-VIDEO-EXPORT R1–R2, SHARING-0007): timed commands and
// samples, each given to the engine before the 128-frame quantum it is timed for, as the AudioWorklet does. Determinism
// (SIMULATION-0001) makes the same patch give the same audio and particles every time. No DOM: runs in Node too.
import { CommandType, WasmEngine, type Command } from '../engine/wasmEngine.ts';
import { BLOCKS, BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import type { StageBlock } from '../stage/drawWorld.ts';
import { starPos } from '../stage/starPos.ts';

/** The AudioWorklet's render quantum: the worklet hands the engine its commands only between quanta. */
export const QUANTUM = 128;

/** What the engine is given before the quantum that starts at `frame`: commands, or sample attachment `sample`. */
export type LogEntry = { frame: number; commands: Command[] } | { frame: number; sample: number };
export interface ReplaySample {
  id: number;
  stage: number;
  left: Float32Array;
  right?: Float32Array;
  sampleRate: number;
}
export interface ReplaySource {
  sampleRate: number;
  seed: number;
  /** In frame order. */
  entries: LogEntry[];
  /** The audio of sample attachment `seq`. */
  sample(seq: number): ReplaySample | undefined;
}

/** What the stage draws of the outer world, kept from the commands (a command for a Stage block's inside has `stage`). */
export function applyToBlocks(blocks: Map<number, StageBlock>, c: Command): StageBlock | undefined {
  if (c.stage) return undefined;
  if (c.type === CommandType.AddBlock) {
    const type = BLOCKS[c.blockType ?? -1]?.id;
    if (!type) return undefined;
    const b: StageBlock = {
      id: c.id,
      type,
      x: c.x ?? 0,
      y: c.y ?? 0,
      ...(type === 'power.void' ? { starPos: starPos(c.id) } : {}),
    };
    blocks.delete(c.id); // a re-added id goes on top, as the stage's map order does
    blocks.set(c.id, b);
    return b;
  }
  if (c.type === CommandType.MoveBlock) {
    const b = blocks.get(c.id);
    if (b) {
      b.x = c.x ?? b.x;
      b.y = c.y ?? b.y;
    }
    return b;
  }
  if (c.type === CommandType.RemoveBlock) blocks.delete(c.id);
  return undefined;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const extend = (r: Bounds, b: StageBlock) => {
  const o = BLOCKS_BY_ID.get(b.type)?.geometry.outline ?? [
    [-1, -1],
    [1, 1],
  ];
  for (const [x, y] of o) {
    r.x0 = Math.min(r.x0, b.x + x);
    r.y0 = Math.min(r.y0, b.y + y);
    r.x1 = Math.max(r.x1, b.x + x);
    r.y1 = Math.max(r.y1, b.y + y);
  }
};
/** Grid-unit box around every outer block on the stage at any time in [from, to] (R7). Null: no blocks. */
export function blockBounds(entries: LogEntry[], from: number, to: number): Bounds | null {
  const blocks = new Map<number, StageBlock>(),
    r: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let started = false;
  for (const e of entries) {
    if (e.frame > to) break;
    if (!started && e.frame > from) {
      started = true;
      for (const b of blocks.values()) extend(r, b);
    }
    if (!('commands' in e)) continue;
    for (const c of e.commands) {
      const b = applyToBlocks(blocks, c);
      if (started && b) extend(r, b);
    }
  }
  if (!started) for (const b of blocks.values()) extend(r, b);
  return Number.isFinite(r.x0) ? r : null;
}

export interface WorldSnapshot {
  particles: Float32Array;
  beams: Float32Array;
  powered: Uint32Array;
  connections: Uint32Array;
}

export class Replay {
  /** The engine frame the next quantum starts at. */
  frame = 0;
  /** The outer world's blocks now. */
  readonly blocks = new Map<number, StageBlock>();
  private next = 0;
  private readonly engine: WasmEngine;

  constructor(
    module: WebAssembly.Module,
    private readonly src: ReplaySource,
  ) {
    this.engine = WasmEngine.fromModule(module, src.sampleRate, src.seed);
  }

  /** Give the engine what it is given before the quantum at `this.frame`. */
  private feed(): void {
    const es = this.src.entries;
    while (this.next < es.length && es[this.next].frame <= this.frame) {
      const e = es[this.next++];
      if ('commands' in e)
        for (const c of e.commands) {
          this.engine.push(c);
          applyToBlocks(this.blocks, c);
        }
      else {
        const s = this.src.sample(e.sample);
        if (s) this.engine.attachSample(s.id, s.left, s.right, s.sampleRate, s.stage);
      }
    }
  }

  /** Render whole quanta until `this.frame >= to`. `audio` gets each quantum's output (views: copy what you keep). */
  run(to: number, audio?: (left: Float32Array, right: Float32Array) => void): void {
    while (this.frame < to) {
      this.feed();
      const out = this.engine.process(QUANTUM);
      audio?.(out.left, out.right);
      this.engine.drainEvents(); // as the worklet does every quantum, so the engine's event log never fills
      this.frame += QUANTUM;
    }
  }

  snapshot(): WorldSnapshot {
    return {
      particles: this.engine.particles(),
      beams: this.engine.beams(),
      powered: this.engine.powered(),
      connections: this.engine.connections(),
    };
  }

  dispose(): void {
    this.engine.dispose();
  }
}
