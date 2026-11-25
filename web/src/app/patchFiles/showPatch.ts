// Showing a patch on the stage, and the one the page opened with.
import { readSources } from '../model/toPatch.ts';
import { type Macro, type Patch } from '../../patch/loadPatch.ts';
import { audioInAsMicrophone } from '../../patch/webInputs.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { type SampleRef } from '../../patch/samples.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { canOverwrite } from '../../patch/server.ts';
import { setGuarded } from '../audio/microphone.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { embedId, juce, start } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { redoStack, undoStack } from '../editing/undoSteps.ts';
import { addLabels, readLabels } from '../labels/labels.ts';
import { sendRaw } from '../model/engineLink.ts';
import {
  labels,
  model,
  nextId,
  refs,
  selectedLabels,
  setConnectionOrder,
  setNextId,
  setSeed,
  setSources,
  setTempo,
  tempo,
  v1Blocks,
} from '../model/patchModel.ts';
import { innerIds, innerSamples, inside, macros } from '../model/stageWorlds.ts';
import { applyView, keepBlocksInView } from '../model/view.ts';
import { missing, resolveSample, samples } from '../samples/userSamples.ts';
import { scene } from '../scene/scene.ts';
import { setUiSync } from '../stage/overlays.ts';
import { leaveStage } from '../stageBlock/lookInside.ts';

/** A patch's macros, checked: each names a block and lists blocks. */
export const readMacros = (list: unknown): Macro[] =>
  (Array.isArray(list) ? list : [])
    .filter(
      (macro): macro is Macro =>
        !!macro &&
        typeof macro === 'object' &&
        typeof (macro as Macro).block === 'string' &&
        Array.isArray((macro as Macro).blocks),
    )
    .map((macro) => structuredClone(macro));

/** Show a patch. `ids` (plugin): the processor's engine ids by patch block id, which may have
 * gaps. */
export function showPatch(shown: Patch, ids?: Record<string, number>): void {
  // The website's Audio In is a Microphone (CHG-0041).
  const patch = juce ? shown : audioInAsMicrophone(shown);
  if (inside) leaveStage(false);
  for (const id of [...model.keys()]) {
    model.delete(id);
    v1Blocks.delete(id);
    stage.removeBlock(id);
    samples.delete(id);
    missing.delete(id);
  }
  undoStack.length = 0;
  redoStack.length = 0;
  setSeed(patch.seed ?? 1);
  setNextId(1);
  setTempo(typeof patch.tempo === 'number' ? patch.tempo : undefined);
  if (tempo !== undefined) sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
  for (const [key, value] of Object.entries(patch.refs ?? {}))
    if (value && typeof value === 'object' && 'provider' in value)
      refs.set(key, value as SampleRef);
  for (const block of patch.blocks)
    if (BLOCKS_BY_ID.has(block.type)) {
      const fixed = ids && block.id !== undefined ? ids[block.id] : undefined;
      if (fixed !== undefined) setNextId(fixed);
      addBlock(block.type, block.x ?? 0, block.y ?? 0, block.params ?? {}, block.id, true);
    }
  if (ids) setNextId(Math.max(nextId, ...Object.values(ids).map((id) => id + 1)));
  setConnectionOrder(Array.isArray(patch.connectionOrder) ? [...patch.connectionOrder] : []);
  labels.length = 0;
  selectedLabels.clear();
  addLabels(readLabels(patch.labels));
  macros.clear();
  innerIds.clear();
  innerSamples.clear();
  for (const macro of readMacros(patch.macros)) macros.set(macro.block, macro);
  setSources(readSources(patch.sources));
  if (juce) applyView(patch.view); // on the web, init shows the opened patch's view
  for (const id of model.keys()) void resolveSample(id);
  scene.setBlocks([...v1Blocks.values()]);
  setUiSync(true);
  stage.redraw();
}

export function init(): void {
  // A link, file or autosave shows the view it was saved at; a v1 composition's own view wins.
  if (start.view.zoom === undefined && !start.view.drag && start.patch.view)
    start.view = {
      ...start.view,
      zoom: start.patch.view.zoom,
      drag: { x: start.patch.view.x, y: start.patch.view.y },
    };
  if (start.view.zoom !== undefined || start.view.drag)
    stage.setView(start.view.zoom ?? 1, start.view.drag ?? { x: 0, y: 0 });
  showPatch(start.patch);
  keepBlocksInView(); // its saved view may be far from its blocks
  // Someone else's patch from a link, or an embed, is guarded (CHG-0041); your own is not.
  setGuarded(
    !!embedId || (start.source === 'link' && !(start.id && (start.mine || canOverwrite(start.id)))),
  );
}
