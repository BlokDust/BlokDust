// Adding one block to the world on show.
import { SOUND_MAX, V1Block } from '../../v1ui/blocks.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { starPos } from '../../stage/starPos.ts';
import { engineModule } from '../../audio/engineNode.ts';
import { setTableModule } from '../../v1ui/newBlocks.ts';
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
import { buildStage, innerSamples, inside } from '../model/stageWorlds.ts';
import { generateSample } from '../samples/sampleGen.ts';
import { showBuiltInImpulse } from '../samples/useSample.ts';
import { resolveSample } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';

export function addBlock(
  type: string,
  x: number,
  y: number,
  p: Record<string, unknown>,
  uid?: string,
  quiet = false,
): number {
  const id = setNextId(nextId + 1) - 1;
  // A new SampleGen starts on a sound of its own (CHG-0035): a number, so it can be found again.
  if (
    type === 'source.sample-gen' &&
    !quiet &&
    !Number(p.sound) &&
    !(p.seed as { waveVoices?: unknown } | undefined)?.waveVoices
  )
    p = { ...p, sound: 1 + Math.floor(Math.random() * SOUND_MAX) };
  const def = BLOCKS_BY_ID.get(type)!;
  // A new block's patch id: `b<id>`, unless a loaded block already has it (ids are renumbered when a project loads).
  if (uid === undefined) {
    const taken = new Set([...model.values()].map((b) => b.uid));
    uid = `b${id}`;
    for (let k = 2; taken.has(uid); k++) uid = `b${id}_${k}`;
  }
  model.set(id, { uid, type, x, y, params: { ...p } });
  v1Blocks.set(id, new V1Block(id, def, x, y, p));
  stage.upsertBlock({ id, type, x, y, starPos: type === 'power.void' ? starPos(id) : undefined });
  if (needsInput(type)) listen(!quiet); // one the user puts down opens it; a loaded one may have to ask (CHG-0041)
  // Plugin: a SampleGen whose sound was saved as a file is played by the processor; it is not generated again.
  const savedFile = !!juce && typeof p.track === 'string' && p.track.startsWith('file:');
  const known = quiet && inside && innerSamples.get(inside.stageUid)?.has(uid); // looking into a Stage: shown from what it has
  if (type === 'source.sample-gen' && !savedFile && !known)
    generateSample(id, !!(p.seed as { waveVoices?: unknown } | undefined)?.waveVoices);
  if (type === 'fx.convolver') void showBuiltInImpulse(id);
  // CHG-0031: the Wavetable's panel draws its frames with the engine module (shows v1's loading square until then).
  if (type === 'source.wavetable')
    void engineModule().then(
      (m) => {
        setTableModule(m);
        v1Blocks.get(id)?.RefreshOptionsPanel();
      },
      () => {},
    );
  if (!quiet) {
    void resolveSample(id, true);
    send([
      { type: CommandType.AddBlock, id, blockType: typeIndex(type), x, y, key: uid },
      ...def.params.flatMap((q, i) =>
        !SESSION_PARAMS.has(q.key) &&
        (typeof p[q.key] === 'number' || typeof p[q.key] === 'boolean')
          ? [{ type: CommandType.SetParam, id, param: i, value: Number(p[q.key]) }]
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
