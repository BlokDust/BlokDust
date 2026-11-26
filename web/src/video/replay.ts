// Plays a patch offline in a fresh WASM engine (SPEC-SHARING-VIDEO-EXPORT R1–R2): each command
// and sample before its 128-frame quantum, as the worklet does. Deterministic (SIMULATION-0001).
import { CommandType, WasmEngine, type Command } from '../engine/wasmEngine.ts';
import { BLOCKS, BLOCKS_BY_ID } from '../generated/blocks.gen.ts';
import type { StageBlock } from '../stage/drawWorld.ts';
import { starPos } from '../stage/starPos.ts';

/** The AudioWorklet's render quantum: the worklet hands the engine its commands only between
 * quanta. */
export const QUANTUM = 128;

/** What the engine is given before the quantum that starts at `frame`: commands, or sample
 * attachment `sample`. */
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

/** What the stage draws of the outer world, kept from the commands (a command for a Stage block's
 * inside has `stage`). */
export function applyToBlocks(
  blocks: Map<number, StageBlock>,
  command: Command,
): StageBlock | undefined {
  if (command.stage) return undefined;
  if (command.type === CommandType.AddBlock) {
    const type = BLOCKS[command.blockType ?? -1]?.id;
    if (!type) return undefined;
    const b: StageBlock = {
      id: command.id,
      type,
      x: command.x ?? 0,
      y: command.y ?? 0,
      ...(type === 'power.void' ? { starPos: starPos(command.id) } : {}),
    };
    blocks.delete(command.id); // a re-added id goes on top, as the stage's map order does
    blocks.set(command.id, b);
    return b;
  }
  if (command.type === CommandType.MoveBlock) {
    const b = blocks.get(command.id);
    if (b) {
      b.x = command.x ?? b.x;
      b.y = command.y ?? b.y;
    }
    return b;
  }
  if (command.type === CommandType.RemoveBlock) blocks.delete(command.id);
  return undefined;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const extend = (bounds: Bounds, b: StageBlock) => {
  const outline = BLOCKS_BY_ID.get(b.type)?.geometry.outline ?? [
    [-1, -1],
    [1, 1],
  ];
  for (const [x, y] of outline) {
    bounds.x0 = Math.min(bounds.x0, b.x + x);
    bounds.y0 = Math.min(bounds.y0, b.y + y);
    bounds.x1 = Math.max(bounds.x1, b.x + x);
    bounds.y1 = Math.max(bounds.y1, b.y + y);
  }
};
/** Grid-unit box around every outer block on the stage at any time in [from, to] (R7). Null: no
 * blocks. */
export function blockBounds(entries: LogEntry[], from: number, to: number): Bounds | null {
  const blocks = new Map<number, StageBlock>(),
    bounds: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  let started = false;
  for (const logEntry of entries) {
    if (logEntry.frame > to) break;
    if (!started && logEntry.frame > from) {
      started = true;
      for (const b of blocks.values()) extend(bounds, b);
    }
    if (!('commands' in logEntry)) continue;
    for (const command of logEntry.commands) {
      const b = applyToBlocks(blocks, command);
      if (started && b) extend(bounds, b);
    }
  }
  if (!started) for (const b of blocks.values()) extend(bounds, b);
  return Number.isFinite(bounds.x0) ? bounds : null;
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
      const logEntry = es[this.next++];
      if ('commands' in logEntry)
        for (const command of logEntry.commands) {
          this.engine.push(command);
          applyToBlocks(this.blocks, command);
        }
      else {
        const replaySample = this.src.sample(logEntry.sample);
        if (replaySample)
          this.engine.attachSample(
            replaySample.id,
            replaySample.left,
            replaySample.right,
            replaySample.sampleRate,
            replaySample.stage,
          );
      }
    }
  }

  /** Render whole quanta until `this.frame >= to`. `audio` gets each quantum's output (views: copy
   * what you keep). */
  run(to: number, audio?: (left: Float32Array, right: Float32Array) => void): void {
    while (this.frame < to) {
      this.feed();
      const out = this.engine.process(QUANTUM);
      audio?.(out.left, out.right);
      // as the worklet does every quantum, so the engine's event log never fills
      this.engine.drainEvents();
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
