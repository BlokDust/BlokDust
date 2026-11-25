// The commands that build the whole patch in an engine.
import { stageCommands } from '../stageBlock/buildStage.ts';
import { type Command, CommandType } from '../../engine/wasmEngine.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { relinks } from '../../patch/loadPatch.ts';
import { targetSetParams } from '../blocks/lfoTargets.ts';
import {
  SESSION_PARAMS,
  connectionOrder,
  model,
  tempo,
  typeIndex,
  uidToId,
} from '../model/patchModel.ts';

// ---- engine ----
/** The engine starts from the model (blocks may have been added/moved before audio started). Engine
 * ids = model ids: add blocks with explicit ids, then their params. */
export function engineCommands(): Command[] {
  const commands: Command[] =
    tempo !== undefined ? [{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }] : [];
  for (const [id, b] of model) {
    const def = BLOCKS_BY_ID.get(b.type)!;
    commands.push({
      type: CommandType.AddBlock,
      id,
      blockType: typeIndex(b.type),
      x: b.x,
      y: b.y,
    });
    def.params.forEach((q, i) => {
      const v = b.params[q.key];
      if (!SESSION_PARAMS.has(q.key) && (typeof v === 'number' || typeof v === 'boolean'))
        commands.push({ type: CommandType.SetParam, id, param: i, value: Number(v) });
    });
  }
  // Looking into a Stage, the engine is running already; this builds the patch from scratch
  // (offline renders), so the outer world it is.
  return [
    ...commands,
    ...targetSetParams(),
    ...relinks({ connectionOrder }, uidToId()),
    ...[...model].flatMap(([id, b]) => (b.type === 'source.stage' ? stageCommands(id, b.uid) : [])),
  ];
}
