// LFO targets (AUDIO-0003): a patch names one "<block id>:<param key>"; the engine gets this
// session's ids, again whenever blocks come or go (a target not there idles the LFO).
import { type Command, CommandType } from '../../engine/wasmEngine.ts';
import { targetCommands } from '../../patch/loadPatch.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { send } from '../model/engineLink.ts';
import { model, uidToId } from '../model/patchModel.ts';

export let targetsQueued = false;

export function syncTargets(): void {
  if (targetsQueued) return;
  targetsQueued = true;
  queueMicrotask(() => {
    targetsQueued = false;
    send(targetSetParams());
  });
}

export function targetSetParams(): Command[] {
  const blocks = [...model.values()].map((block) => ({
    id: block.uid,
    type: block.type,
    params: block.params,
  }));
  const set = targetCommands(blocks, uidToId());
  const aimed = new Set(set.map((command) => command.id));
  for (const [id, block] of model) {
    // An LFO whose target is gone (or was never set) aims at nothing.
    const targetParam =
      BLOCKS_BY_ID.get(block.type)?.params.findIndex((param) => param.key === 'targetBlock') ?? -1;
    if (targetParam >= 0 && !aimed.has(id))
      set.push({ type: CommandType.SetParam, id, param: targetParam, value: 0 });
  }
  return set;
}
