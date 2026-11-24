// Patch v2 JSON → engine commands. Mirrors engine/patch/src/patch_loader.cpp exactly (golden tests compare both).
import { BLOCKS } from '../generated/blocks.gen.ts';
import { CommandType, type Command } from '../engine/wasmEngine.ts';

export interface PatchBlock {
  id: string;
  type: string;
  x?: number;
  y?: number;
  params?: Record<string, unknown>;
}
export interface Patch {
  format?: string;
  version?: number;
  seed?: number;
  tempo?: number;
  blocks: PatchBlock[];
  /** Sample references by `track` key (DATA-0005, SPEC-SHARING-BACKEND R12); the engine never reads them. */
  refs?: Record<string, unknown>;
  /** The order the connected pairs connected in, oldest first, as [block id, block id] (R4a: a source's effects run in
   * the order they connected, as in v1). Ordering only: connections still come from positions. */
  connectionOrder?: [string, string][];
  /** What is inside each Stage block (CHG-0021, SPEC-PATCH-FORMAT-V2 R7): one entry per Stage block, by its id. One
   * level only: an inner patch's own Stage blocks stay empty. */
  macros?: Macro[];
  /** Notes on the stage (CHG-0020, UI-0011): text at a grid position. The engine never reads them. */
  labels?: { id: string; text: string; x: number; y: number }[];
  /** The view it was saved at (owner, 2026-11-12, SPEC-PATCH-FORMAT-V2 R2): opening shows it. The engine ignores it. */
  view?: { x: number; y: number; zoom: number };
  /** Where its blocks came from (owner review 3, 2026-11-16; SPEC-PATCH-FORMAT-V2 R11): each saved patch INSERT brought
   * in, with the ids of the blocks it brought that are still here. With `parent` (a remix, kept by the server) and
   * each source's own `sources`, the patches a patch was made from can be followed all the way back. The engine
   * ignores it. */
  sources?: PatchSource[];
}
/** A shared patch (server id, and its revision then) whose blocks were inserted into this one. */
export interface PatchSource {
  id: string;
  rev?: number;
  title?: string;
  by?: string | null;
  blocks: string[];
}
export interface Macro {
  block: string;
  blocks: PatchBlock[];
  connectionOrder?: [string, string][];
  labels?: Patch['labels'];
  view?: Patch['view'];
}
export type ScriptOp =
  | { op: 'add'; atSample?: number; block: PatchBlock }
  | { op: 'move'; atSample?: number; block: string; x: number; y: number }
  | { op: 'remove'; atSample?: number; block: string }
  | { op: 'set'; atSample?: number; block: string; param: string; value: number | boolean }
  | {
      op: 'noteOn';
      atSample?: number;
      note: number;
      velocity?: number;
      controller?: string;
      channel?: number;
    }
  | {
      op: 'noteOff';
      atSample?: number;
      note: number;
      velocity?: number;
      controller?: string;
      channel?: number;
    }
  | { op: 'tempo'; atSample?: number; bpm: number; beat?: number }
  | {
      op: 'expression';
      atSample?: number;
      note: number;
      channel?: number;
      dim: 'bend' | 'pressure' | 'slide';
      value: number;
      controller?: string;
    };

export interface Loaded {
  seed: number;
  commands: Command[];
  ids: Map<string, number>;
  types: Map<number, number>;
  nextId: number;
  /** What was dropped to load the rest (R3: a param this build doesn't know, from a newer BlokDust). */ warnings: string[];
}

const typeIndex = new Map(BLOCKS.map((b, i) => [b.id, i]));
/** Command::Expression (engine.hpp). */
export const EXPRESSION = { bend: 0, pressure: 1, slide: 2 } as const;
const numeric = (v: unknown): number | null =>
  typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null;
const paramIndex = (type: number, key: string) =>
  BLOCKS[type].params.findIndex((p) => p.key === key);

function addBlock(b: PatchBlock, out: Loaded, at: number) {
  const t = typeIndex.get(b.type);
  if (t === undefined) throw new Error(`unknown block type ${b.type}`);
  if (out.ids.has(b.id)) throw new Error(`duplicate block id ${b.id}`);
  const id = out.nextId++;
  out.ids.set(b.id, id);
  out.types.set(id, t);
  out.commands.push({
    type: CommandType.AddBlock,
    id,
    blockType: t,
    x: b.x ?? 0,
    y: b.y ?? 0,
    atSample: at,
  });
  for (const [k, v] of Object.entries(b.params ?? {})) {
    const p = paramIndex(t, k);
    if (p < 0) {
      out.warnings.push(`unknown param ${k} on ${b.id}`);
      continue;
    } // R3: dropped, the rest loads
    // An LFO's target (AUDIO-0003): saved as "<block id>:<param key>"; engine ids are this session's (targetCommands).
    if (k === 'targetBlock' || k === 'targetParam' || k === 'target') continue;
    const n = numeric(v);
    if (n !== null)
      out.commands.push({ type: CommandType.SetParam, id, param: p, value: n, atSample: at });
  }
}

/** LFO targets (AUDIO-0003, the C++ loader's resolveTargets): each block's `target`, "<block id>:<param key>", as
 * SetParam targetBlock / targetParam. Unknown blocks or params are skipped (the LFO idles). */
export function targetCommands(blocks: PatchBlock[], ids: Map<string, number>): Command[] {
  const out: Command[] = [],
    types = new Map(blocks.map((b) => [b.id, typeIndex.get(b.type)]));
  for (const b of blocks) {
    const text = b.params?.target,
      own = types.get(b.id),
      id = ids.get(b.id);
    if (typeof text !== 'string' || own === undefined || id === undefined) continue;
    const colon = text.lastIndexOf(':');
    if (colon < 0) continue;
    const uid = text.slice(0, colon),
      target = ids.get(uid),
      theirs = types.get(uid);
    if (target === undefined || theirs === undefined) continue;
    const tb = paramIndex(own, 'targetBlock'),
      tp = paramIndex(own, 'targetParam'),
      idx = paramIndex(theirs, text.slice(colon + 1));
    if (tb < 0 || tp < 0 || idx < 0) continue;
    out.push(
      { type: CommandType.SetParam, id, param: tb, value: target },
      { type: CommandType.SetParam, id, param: tp, value: idx },
    );
  }
  return out;
}

/** Relink commands replaying a patch's `connectionOrder` (the C++ loader does the same). */
export function relinks(
  patch: Pick<Patch, 'connectionOrder'>,
  ids: Map<string, number>,
): Command[] {
  const out: Command[] = [];
  for (const p of Array.isArray(patch.connectionOrder) ? patch.connectionOrder : []) {
    if (!Array.isArray(p) || p.length !== 2) continue;
    const a = ids.get(p[0]),
      b = ids.get(p[1]);
    if (a !== undefined && b !== undefined) out.push({ type: CommandType.Relink, id: a, value: b });
  }
  return out;
}

export function loadPatch(patch: Patch, script: ScriptOp[] = []): Loaded {
  if (!Array.isArray(patch.blocks)) throw new Error('patch needs a blocks array');
  if (patch.version !== undefined && patch.version !== 2)
    throw new Error('unsupported patch version');
  const out: Loaded = {
    seed: patch.seed ?? 1,
    commands: [],
    ids: new Map(),
    types: new Map(),
    nextId: 1,
    warnings: [],
  };
  // The patch's tempo (SIMULATION-0003), only when set (older patches keep exactly their command list).
  if (typeof patch.tempo === 'number')
    out.commands.push({ type: CommandType.Tempo, id: 0, value: patch.tempo, x: -1, atSample: -1 });
  for (const b of patch.blocks) addBlock(b, out, -1);
  for (const c of targetCommands(patch.blocks, out.ids)) out.commands.push({ ...c, atSample: -1 });
  for (const r of relinks(patch, out.ids)) out.commands.push({ ...r, atSample: -1 });
  // Stage blocks' inner patches (R7; the C++ loader's `stages`): their commands carry the Stage block's engine id, and
  // come after the outer patch's, so the block exists when its inner world is made (WasmEngine.push).
  const inner: Command[] = [],
    filled = new Set<number>();
  for (const m of Array.isArray(patch.macros) ? patch.macros : []) {
    const stage = m && typeof m.block === 'string' ? out.ids.get(m.block) : undefined;
    // One inner world per Stage, the first entry's (as the C++ loader; security review, PR 13).
    if (stage === undefined || !Array.isArray(m.blocks) || filled.has(stage)) continue;
    filled.add(stage);
    for (const c of loadPatch({ blocks: m.blocks, connectionOrder: m.connectionOrder }).commands)
      inner.push({ ...c, stage });
  }
  for (const s of script) {
    const at = s.atSample ?? -1;
    if (s.op === 'add') {
      addBlock(s.block, out, at);
      continue;
    }
    if (s.op === 'tempo') {
      out.commands.push({
        type: CommandType.Tempo,
        id: 0,
        value: s.bpm,
        x: s.beat ?? -1,
        atSample: at,
      });
      continue;
    }
    if (s.op === 'noteOn' || s.op === 'noteOff' || s.op === 'expression') {
      const t = typeIndex.get(s.controller ?? 'input.midi-controller');
      if (t === undefined) throw new Error('bad controller type');
      const x = s.channel ?? 0; // MIDI channel 0–15 (MPE: the note's own channel, PLUGIN-0004)
      if (s.op === 'expression') {
        const y = EXPRESSION[s.dim];
        if (y === undefined) throw new Error(`bad expression dim ${s.dim}`);
        out.commands.push({
          type: CommandType.NoteExpression,
          id: 0,
          blockType: t,
          param: s.note,
          x,
          y,
          value: s.value,
          atSample: at,
        });
      } else
        out.commands.push({
          type: s.op === 'noteOn' ? CommandType.NoteOn : CommandType.NoteOff,
          id: 0,
          blockType: t,
          param: s.note,
          x,
          value: s.op === 'noteOn' ? (s.velocity ?? 1) : 0,
          atSample: at,
        });
      continue;
    }
    const id = out.ids.get(s.block);
    if (id === undefined) throw new Error(`script refers to unknown block ${s.block}`);
    if (s.op === 'move')
      out.commands.push({ type: CommandType.MoveBlock, id, x: s.x, y: s.y, atSample: at });
    else if (s.op === 'remove')
      out.commands.push({ type: CommandType.RemoveBlock, id, atSample: at });
    else {
      const p = paramIndex(out.types.get(id)!, s.param),
        n = numeric(s.value);
      if (p < 0 || n === null) throw new Error(`bad set op for ${s.block}`);
      out.commands.push({ type: CommandType.SetParam, id, param: p, value: n, atSample: at });
    }
  }
  // Same ordering rule as the C++ loader: stable by due sample (immediate first).
  const due = (c: Command) => Math.max(c.atSample ?? -1, -1);
  out.commands = out.commands
    .map((c, i) => ({ c, i }))
    .sort((a, b) => due(a.c) - due(b.c) || a.i - b.i)
    .map((x) => x.c);
  out.commands.push(...inner);
  return out;
}
