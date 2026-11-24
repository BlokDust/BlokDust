// The patch as the user sees it (autosaved; the share link encodes it).
import type { V1Block } from '../../v1ui/blocks.ts';
import { type SampleRef } from '../../patch/samples.ts';
import { type Label } from '../../stage/labels.ts';
import { type PatchSource, type Patch } from '../../patch/loadPatch.ts';
import { BLOCKS, type BlockDef } from '../../generated/blocks.gen.ts';
import { innerMacro, inside, macros, worldParts } from './stageWorlds.ts';
import { currentView } from './view.ts';

// ---- model: the patch as the user sees it (autosaved; the share link encodes it) ----
export let model!: Map<number, ModelBlock>;

export const automation = new Map<string, number>();

// Dust 1–8 (plugin): "<id>:<param>" → slot
export const ccBySlot = new Map<number, number>();

// Dust slot → learned MIDI CC (CHG-0004 3.9)
export const v1Blocks = new Map<number, V1Block>();

export let seed = 1,
  nextId = 1;

/** The patch tempo (SIMULATION-0003): saved only once set, so older patches stay byte-identical. */
export let tempo: number | undefined;

/** The account's running totals are counted (SPEC-SHARING-ACCOUNTS R16): the website, not the plugin or embeds. */
export let countActivity = false;

/** Sample references by `track` key (DATA-0005): the patch keeps the ones its blocks use. */
export const refs = new Map<string, SampleRef>();

/** R4a (owner, 2026-11-12): the order the connected pairs connected in, as patch ids, oldest first. A source's
 * effects run in that order (v1). It starts from the opened patch and then follows the engine (each snapshot that
 * carries connections lists them oldest first); patches save it, and loading replays it (Relink). */
export let connectionOrder: [string, string][] = [];

/** Labels (CHG-0020, UI-0011): notes on the stage, kept in the patch. */
export const labels: Label[] = [];

/** Labels in the multi-selection, by id (owner, 2026-11-14): they move, copy, delete and go into a Stage with the
 * selected blocks (stage.selected holds the blocks). */
export const selectedLabels = new Set<string>();

export const selLabels = () => labels.filter((label) => selectedLabels.has(label.id));

export const uidToId = () => new Map([...model].map(([id, b]) => [b.uid, id]));

/** The whole patch: the outer world, with what is inside each of its Stage blocks (R7). Looking into a Stage, the
 * inner world on screen is folded into its macro first. */
/** SPEC-PATCH-FORMAT-V2 R11: the saved patches whose blocks were inserted into this one (owner review 3). */
export let sources: PatchSource[] = [];

/** The sources that still have blocks here, with only those blocks. */
export const SOURCES_MAX = 32;

// the newest; older ones are still reachable through the newer sources' own lists
export const liveSources = (ids: Set<string>) =>
  sources
    .map((source) => ({ ...source, blocks: source.blocks.filter((b) => ids.has(b)) }))
    .filter((s) => s.blocks.length)
    .slice(-SOURCES_MAX);

export const readSources = (v: unknown): PatchSource[] =>
  Array.isArray(v)
    ? v
        .filter((s): s is PatchSource => !!s && typeof s.id === 'string' && Array.isArray(s.blocks))
        .map((source) => ({
          id: source.id,
          ...(typeof source.rev === 'number' ? { rev: source.rev } : {}),
          ...(typeof source.title === 'string' ? { title: source.title } : {}),
          ...(typeof source.by === 'string' ? { by: source.by } : {}),
          blocks: source.blocks.filter((b) => typeof b === 'string'),
        }))
    : [];

export const toPatch = (): Patch => {
  if (inside) macros.set(inside.stageUid, innerMacro());
  const w = inside
    ? worldParts(inside.outer.model, inside.outer.connectionOrder, inside.outer.labels)
    : worldParts();
  const stages = new Set(w.blocks.filter((b) => b.type === 'source.stage').map((b) => b.id));
  const ms = [...macros.values()].filter(
    (macro) => stages.has(macro.block) && (macro.blocks.length || macro.labels?.length),
  );
  const used = new Set(
    [...w.blocks, ...ms.flatMap((macro) => macro.blocks)]
      .map((b) => b.params?.track)
      .filter((t): t is string => typeof t === 'string'),
  );
  const r = Object.fromEntries([...refs].filter(([k]) => used.has(k)));
  const src = liveSources(new Set(w.blocks.map((b) => b.id).filter((id): id is string => !!id)));
  return {
    format: 'blokdust.patch',
    version: 2,
    seed,
    ...(tempo !== undefined ? { tempo } : {}),
    blocks: w.blocks,
    ...(Object.keys(r).length ? { refs: r } : {}),
    ...(w.order.length ? { connectionOrder: w.order } : {}),
    ...(w.labels.length ? { labels: w.labels.map((label) => ({ ...label })) } : {}),
    ...(ms.length ? { macros: ms } : {}),
    ...(src.length ? { sources: src } : {}),
    view: inside ? inside.outer.view : currentView(),
  };
};

export interface ModelBlock {
  uid: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, unknown>;
}

export const typeIndex = (type: string) => BLOCKS.findIndex((b) => b.id === type);

/** Params that hold engine ids of this session (an LFO's resolved target, AUDIO-0003): never taken from a patch. */
export const SESSION_PARAMS = new Set(['targetBlock', 'targetParam']);

export const DEF_BY_V1 = new Map<string, BlockDef>();
for (const definition of BLOCKS) DEF_BY_V1.set(definition.menuId, definition); // v1's type names, plus the post-2.0 blocks' menu ids

export function setTempo<Value extends typeof tempo>(value: Value): Value {
  tempo = value;
  return value;
}

export function setSources<Value extends typeof sources>(value: Value): Value {
  sources = value;
  return value;
}

export function setNextId<Value extends typeof nextId>(value: Value): Value {
  nextId = value;
  return value;
}

export function setConnectionOrder<Value extends typeof connectionOrder>(value: Value): Value {
  connectionOrder = value;
  return value;
}

export function setSeed<Value extends typeof seed>(value: Value): Value {
  seed = value;
  return value;
}

export function setCountActivity<Value extends typeof countActivity>(value: Value): Value {
  countActivity = value;
  return value;
}

export function init(): void {
  model = new Map<number, ModelBlock>();
}
