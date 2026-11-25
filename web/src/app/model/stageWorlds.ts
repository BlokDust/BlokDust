// Stage blocks (CHG-0021, SCOPE-0006): what is inside each, and the one being looked into.
import type { V1Block } from '../../v1ui/blocks/v1Block.ts';
import type { Macro, PatchBlock } from '../../patch/loadPatch.ts';
import type { Label } from '../../stage/labels.ts';
import { connectionOrder, labels, model, type ModelBlock } from './patchModel.ts';
import { currentView } from './view.ts';

/** What is inside each Stage, by the Stage block's patch id. */
export const macros = new Map<string, Macro>();
/** The engine ids each Stage's inner blocks have in this session. */
export const innerIds = new Map<string, { ids: Record<string, number>; nextId: number }>();
/** Each Stage's samplers' audio, by patch id: sent when its world is built, shown when looked
 * into. */
export const innerSamples = new Map<string, Map<string, AudioBuffer>>();
/** How often each Stage's inner world was built: audio for an older build is dropped. */
export const stageBuilds = new Map<string, number>();

/** The outer world, set aside while a Stage is looked into (the engine runs both all along). */
export interface Outer {
  model: Map<number, ModelBlock>;
  v1Blocks: Map<number, V1Block>;
  samples: Map<number, AudioBuffer>;
  missing: Set<number>;
  labels: Label[];
  connectionOrder: [string, string][];
  nextId: number;
  view: { x: number; y: number; zoom: number };
  undo: unknown[];
  redo: unknown[];
}

/** The Stage being looked into: the page shows and edits its inner world. */
export let inside: {
  stageId: number;
  stageUid: string;
  outer: Outer;
  image: HTMLCanvasElement;
  blockX: number;
  blockY: number;
  grid: number;
} | null = null;

export function setInside<Value extends typeof inside>(value: Value): Value {
  inside = value;
  return value;
}

/** A world as patch parts: its blocks, their connection order, its labels. */
export const worldParts = (
  blocks: Map<number, ModelBlock> = model,
  order = connectionOrder,
  worldLabels = labels,
) => {
  const uids = new Set([...blocks.values()].map((block) => block.uid));
  return {
    blocks: [...blocks.values()].map((block) => ({
      id: block.uid,
      type: block.type,
      x: block.x,
      y: block.y,
      params: block.params,
    })) as PatchBlock[],
    order: order.filter(([first, second]) => uids.has(first) && uids.has(second)),
    labels: worldLabels,
  };
};

/** What is inside the Stage being looked into, as it is now. */
export const innerMacro = (): Macro => {
  if (!inside) throw new Error('BlokDust: no Stage is open');
  const world = worldParts();
  return {
    block: inside.stageUid,
    blocks: world.blocks,
    ...(world.order.length ? { connectionOrder: world.order } : {}),
    ...(world.labels.length ? { labels: world.labels.map((label) => ({ ...label })) } : {}),
    view: currentView(),
  };
};
