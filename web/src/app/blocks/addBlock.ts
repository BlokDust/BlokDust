// Adding one block to the world on show.
import { setTableModule } from '../../v1ui/newBlocks/liveRows.ts';
import { SOUND_MAX } from '../../v1ui/blocks/sampleGenSound.ts';
import { V1Block } from '../../v1ui/blocks/v1Block.ts';
import { buildStage } from '../stageBlock/buildStage.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { starPos } from '../../stage/starPos.ts';
import { engineModule } from '../../audio/engineNode.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { listen, needsInput } from '../audio/microphone.ts';
import { syncTargets } from './lfoTargets.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { changed } from '../model/autosave.ts';
import { send } from '../model/engineLink.ts';
import {
  SESSION_PARAMS,
  model,
  nextId,
  setNextId,
  typeIndex,
  v1Blocks,
} from '../model/patchModel.ts';
import { innerSamples, inside } from '../model/stageWorlds.ts';
import { generateSample } from '../samples/sampleGen.ts';
import { showBuiltInImpulse } from '../samples/useSample.ts';
import { resolveSample } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';

export function addBlock(
  type: string,
  x: number,
  y: number,
  initialParams: Record<string, unknown>,
  uid?: string,
  quiet = false,
): number {
  let params = initialParams;
  const id = setNextId(nextId + 1) - 1;
  // A new SampleGen starts on a sound of its own (CHG-0035): a number, so it can be found again.
  if (
    type === 'source.sample-gen' &&
    !quiet &&
    !Number(params.sound) &&
    !(params.seed as { waveVoices?: unknown } | undefined)?.waveVoices
  )
    params = { ...params, sound: 1 + Math.floor(Math.random() * SOUND_MAX) };
  const def = BLOCKS_BY_ID.get(type);
  if (!def) throw new Error(`BlokDust: no block type ${type}`);
  // Patch id `b<id>`, unless a loaded block has it (a loaded project's ids are renumbered).
  if (uid === undefined) {
    const taken = new Set([...model.values()].map((b) => b.uid));
    uid = `b${id}`;
    for (let k = 2; taken.has(uid); k++) uid = `b${id}_${k}`;
  }
  model.set(id, { uid, type, x, y, params: { ...params } });
  v1Blocks.set(id, new V1Block(id, def, x, y, params));
  stage.upsertBlock({ id, type, x, y, starPos: type === 'power.void' ? starPos(id) : undefined });
  // One the user puts down opens the microphone; a loaded one may have to ask (CHG-0041).
  if (needsInput(type)) listen(!quiet);
  // Plugin: a SampleGen saved as a file is played by the processor, not generated again.
  const savedFile = !!juce && typeof params.track === 'string' && params.track.startsWith('file:');
  // Looking into a Stage: shown from what it has.
  const known = quiet && inside && innerSamples.get(inside.stageUid)?.has(uid);
  if (type === 'source.sample-gen' && !savedFile && !known)
    generateSample(id, !!(params.seed as { waveVoices?: unknown } | undefined)?.waveVoices);
  if (type === 'fx.convolver') void showBuiltInImpulse(id);
  // The Wavetable's panel draws its frames with the engine module (CHG-0031).
  if (type === 'source.wavetable')
    void engineModule().then(
      (module) => {
        setTableModule(module);
        v1Blocks.get(id)?.RefreshOptionsPanel();
      },
      () => {},
    );
  if (!quiet) {
    void resolveSample(id, true);
    send([
      { type: CommandType.AddBlock, id, blockType: typeIndex(type), x, y, key: uid },
      ...def.params.flatMap((param, index) =>
        !SESSION_PARAMS.has(param.key) &&
        (typeof params[param.key] === 'number' || typeof params[param.key] === 'boolean')
          ? [{ type: CommandType.SetParam, id, param: index, value: Number(params[param.key]) }]
          : [],
      ),
    ]);
    if (type === 'source.stage' && !inside) buildStage(id, uid); // what is inside it (CHG-0021)
    syncTargets();
    scene.setBlocks([...v1Blocks.values()]);
    changed();
  }
  return id;
}
