// A Stage block's inner world in the engine: built from its macro, then given its samplers' audio.
import { CommandType, type Command } from '../../engine/wasmEngine.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { loadPatch } from '../../patch/loadPatch.ts';
import { listen, needsInput } from '../audio/microphone.ts';
import { juce } from '../boot/page.ts';
import { engine, sendRaw } from '../model/engineLink.ts';
import { syncMacros } from '../model/macroSync.ts';
import { innerIds, innerSamples, macros, stageBuilds } from '../model/stageWorlds.ts';
import { innerBuffer } from '../samples/innerBuffer.ts';

/** Engine commands that build what is inside Stage block `id` (patch id `uid`), keeping its ids. */
export function stageCommands(id: number, uid: string): Command[] {
  const macro = macros.get(uid);
  const blocks = (macro?.blocks ?? []).filter((block) => BLOCKS_BY_ID.has(block.type));
  if (!macro || !blocks.length) return [];
  try {
    const loaded = loadPatch({ blocks, connectionOrder: macro.connectionOrder });
    innerIds.set(uid, { ids: Object.fromEntries(loaded.ids), nextId: loaded.nextId });
    // The plugin keeps the inner blocks' patch ids.
    const uidOf = new Map([...loaded.ids].map(([blockUid, blockId]) => [blockId, blockUid]));
    return loaded.commands.map((command) => ({
      ...command,
      stage: id,
      ...(command.type === CommandType.AddBlock && uidOf.has(command.id)
        ? { key: uidOf.get(command.id) }
        : {}),
    }));
  } catch (error) {
    console.warn('BlokDust: a Stage block could not be filled', error);
    return [];
  }
}

/** Its samplers get their audio, and its Microphone its input. */
export function buildStage(id: number, uid: string): void {
  sendRaw(stageCommands(id, uid));
  void fillStageSamples(id, uid);
  syncMacros();
}

/** What was loaded already, else from their references; looking in shows the same audio. */
export async function fillStageSamples(id: number, uid: string): Promise<void> {
  const macro = macros.get(uid);
  const ids = innerIds.get(uid)?.ids;
  if (juce || !engine || !macro || !ids) return;
  const build = (stageBuilds.get(uid) ?? 0) + 1;
  stageBuilds.set(uid, build);
  const audio = innerSamples.get(uid) ?? new Map<string, AudioBuffer>();
  innerSamples.set(uid, audio);
  if (macro.blocks.some((block) => needsInput(block.type))) listen();
  await Promise.all(
    macro.blocks.map(async (block) => {
      const innerId = ids[block.id] as number | undefined;
      if (innerId === undefined) return;
      const buffer =
        audio.get(block.id) ??
        (await innerBuffer(block).catch((error: unknown) => {
          console.warn('BlokDust: a sampler inside a Stage has no audio', error);
          return null;
        }));
      if (!buffer || stageBuilds.get(uid) !== build) return; // built again meanwhile
      audio.set(block.id, buffer);
      engine?.sendSample(innerId, buffer, id);
    }),
  );
}
