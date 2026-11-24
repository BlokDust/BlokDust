// Blocks from v1's menus and panels: create, delete, set params, connections and LFO targets.
import { usage } from '../boot/sessionAnalytics.ts';
import { count } from '../../analytics/client.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { LABEL_MENU_ID } from '../../v1ui/newBlocks.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { syncTargets } from '../blocks/lfoTargets.ts';
import { deleteBlocks } from '../editing/deleteBlocks.ts';
import { idOfUid, pushUndo, uidsOf } from '../editing/undoSteps.ts';
import { drag, startDrag } from '../input/pointerState.ts';
import { selection } from '../input/selection.ts';
import { newLabel } from '../labels/labels.ts';
import { changed } from '../model/autosave.ts';
import { send } from '../model/engineLink.ts';
import { DEF_BY_V1, model, selectedLabels, v1Blocks } from '../model/patchModel.ts';
import { wrapInStage } from '../stageBlock/fillStage.ts';
import { enterStage } from '../stageBlock/lookInside.ts';
import { probe } from '../testing/probe.ts';
import type { SceneHostPart } from './hostParts.ts';

// A new Emitter, Pulse or Stereo Delay starts in tempo sync (owner, CHG-0004).
const STARTS_SYNCED = new Set(['power.emitter', 'power.pulse', 'fx.stereo-delay']);

function createBlock(v1Type: string, gridX: number, gridY: number): number | null {
  if (v1Type === LABEL_MENU_ID) {
    newLabel(gridX, gridY);
    return null;
  }
  // A Stage made while several blocks are selected takes them inside (CHG-0021).
  if (v1Type === 'Stage' && selection.size > 1) {
    const stageId = wrapInStage([...selection], gridX, gridY, [...selectedLabels]);
    if (stageId !== null) {
      startDrag(stageId, 0, 0, true);
      return stageId;
    }
  }
  const definition = DEF_BY_V1.get(v1Type);
  if (!definition) return null;
  const id = addBlock(
    definition.id,
    gridX,
    gridY,
    STARTS_SYNCED.has(definition.id) ? { sync: true } : {},
  );
  pushUndo({ kind: 'add', uids: uidsOf([id]) });
  count('block_added', definition.id);
  usage.blocksMax = Math.max(usage.blocksMax, model.size);
  startDrag(id, 0, 0, true);
  return id;
}

function setParam(id: number, key: string, value: number): void {
  const block = model.get(id);
  const paramIndex = block
    ? (BLOCKS_BY_ID.get(block.type)?.params.findIndex((param) => param.key === key) ?? -1)
    : -1;
  if (!block || paramIndex < 0) return;
  block.params[key] = value;
  send([{ type: CommandType.SetParam, id, param: paramIndex, value }]);
  changed();
}

function connectedIds(id: number): number[] {
  const connected: number[] = [];
  const pairs = probe.connections;
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    if (pairs[i] === id) connected.push(pairs[i + 1]);
    else if (pairs[i + 1] === id) connected.push(pairs[i]);
  }
  return connected;
}

/** An LFO's target is saved as "<block uid>:<param key>" (AUDIO-0003). */
function targetOf(id: number): { id: number; param: string } | null {
  const saved = model.get(id)?.params.target;
  if (typeof saved !== 'string') return null;
  const colon = saved.lastIndexOf(':');
  if (colon < 0) return null;
  const targetId = idOfUid(saved.slice(0, colon));
  return targetId === undefined ? null : { id: targetId, param: saved.slice(colon + 1) };
}

function setTarget(id: number, target: { id: number; param: string } | null): void {
  const block = model.get(id);
  if (!block) return;
  const targetBlock = target ? model.get(target.id) : undefined;
  const text = target && targetBlock ? `${targetBlock.uid}:${target.param}` : '';
  block.params.target = text;
  const v1Block = v1Blocks.get(id);
  if (v1Block) v1Block.Params.target = text;
  syncTargets();
  changed();
}

export function blockHost(): SceneHostPart<
  | 'openStage'
  | 'resetCounter'
  | 'createBlock'
  | 'deleteBlock'
  | 'setParam'
  | 'connectedIds'
  | 'targetOf'
  | 'setTarget'
> {
  return {
    openStage: (id) => {
      enterStage(id);
    },
    resetCounter: (id) => {
      send([{ type: CommandType.Reset, id }]);
    },
    createBlock,
    // A drop on the trash is deleted by pointerup, with its group, as one step.
    deleteBlock: (id) => {
      if (!drag) deleteBlocks([id]);
    },
    setParam,
    connectedIds,
    targetOf,
    setTarget,
  };
}
