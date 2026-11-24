// The patch as the user sees it: autosaved, and what a share link encodes.
import { BLOCKS, type BlockDef } from '../../generated/blocks.gen.ts';
import type { PatchSource } from '../../patch/loadPatch.ts';
import type { SampleRef } from '../../patch/samples.ts';
import type { Label } from '../../stage/labels.ts';
import type { V1Block } from '../../v1ui/blocks.ts';

export interface ModelBlock {
  uid: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, unknown>;
}

/** The blocks on show, by engine id. */
export const model = new Map<number, ModelBlock>();
/** v1's options-panel view of each block, by engine id. */
export const v1Blocks = new Map<number, V1Block>();
/** Dust 1–8 (plugin): "<id>:<param>" → slot. */
export const automation = new Map<string, number>();
/** Dust slot → learned MIDI CC (CHG-0004 3.9). */
export const ccBySlot = new Map<number, number>();

export let seed = 1;
export let nextId = 1;
/** The patch tempo (SIMULATION-0003): saved only once set, so older patches stay byte-identical. */
export let tempo: number | undefined;
/** The account's running totals are counted (R16): on the website, not the plugin or embeds. */
export let countActivity = false;

/** Sample references by `track` key (DATA-0005): the patch keeps the ones its blocks use. */
export const refs = new Map<string, SampleRef>();

/** R4a: the order the pairs connected in, oldest first; a source's effects run in that order. */
// It follows the engine's snapshots; patches save it, and loading replays it (Relink).
export let connectionOrder: [string, string][] = [];

/** Labels (CHG-0020, UI-0011): words on the stage, kept in the patch. */
export const labels: Label[] = [];
/** Selected labels by id: they move, copy, delete and go into a Stage with the selected blocks. */
export const selectedLabels = new Set<string>();
export const selLabels = () => labels.filter((label) => selectedLabels.has(label.id));

/** SPEC-PATCH-FORMAT-V2 R11: the saved patches whose blocks were inserted into this one. */
export let sources: PatchSource[] = [];

export const uidToId = () => new Map([...model].map(([id, block]) => [block.uid, id]));
export const typeIndex = (type: string) => BLOCKS.findIndex((definition) => definition.id === type);

/** Params holding this session's engine ids (an LFO's resolved target): never taken from a patch. */
export const SESSION_PARAMS = new Set(['targetBlock', 'targetParam']);

/** v1's type names, and the post-2.0 blocks' menu ids. */
export const DEF_BY_V1 = new Map<string, BlockDef>();
for (const definition of BLOCKS) DEF_BY_V1.set(definition.menuId, definition);

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
