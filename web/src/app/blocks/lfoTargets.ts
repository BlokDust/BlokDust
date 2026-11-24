// LFO targets (AUDIO-0003): resolved to this session's engine ids.
import { type Command, CommandType } from '../../engine/wasmEngine.ts';
import { targetCommands } from '../../patch/loadPatch.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { send } from '../model/engineLink.ts';
import { model, uidToId } from '../model/patchModel.ts';

/**
 * LFO targets (AUDIO-0003): the patch names a target as "<block id>:<param key>"; the engine is told this session's
 * ids. Sent again whenever blocks come or go (a target not there idles the LFO).
 */
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
  const blocks = [...model.values()].map((b) => ({ id: b.uid, type: b.type, params: b.params })),
    ids = uidToId();
  const set = targetCommands(blocks, ids),
    aimed = new Set(set.map((c) => c.id));
  for (const [id, b] of model) {
    // an LFO whose target is gone (or was never set) aims at nothing
    const p = BLOCKS_BY_ID.get(b.type)!.params.findIndex((q) => q.key === 'targetBlock');
    if (p >= 0 && !aimed.has(id)) set.push({ type: CommandType.SetParam, id, param: p, value: 0 });
  }
  return set;
}
