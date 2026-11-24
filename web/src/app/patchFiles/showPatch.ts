// Showing a patch on the stage, and the one the page opened with.
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
  readSources,
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

/** Show a patch. `ids` (plugin): the processor's engine ids by patch block id, which the page must use (its engine
 * keeps running when the editor reopens, and its ids are not 1..N once blocks were deleted). */
/** A patch's macros, checked: each names a block and lists blocks. */
export const readMacros = (list: unknown): Macro[] =>
  (Array.isArray(list) ? list : [])
    .filter(
      (m): m is Macro =>
        !!m &&
        typeof m === 'object' &&
        typeof (m as Macro).block === 'string' &&
        Array.isArray((m as Macro).blocks),
    )
    .map((m) => structuredClone(m));

export function showPatch(p: Patch, ids?: Record<string, number>): void {
  if (!juce) p = audioInAsMicrophone(p); // the website's Audio In is a Microphone (CHG-0041)
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
  setSeed(p.seed ?? 1);
  setNextId(1);
  setTempo(typeof p.tempo === 'number' ? p.tempo : undefined);
  if (tempo !== undefined) sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
  for (const [k, r] of Object.entries(p.refs ?? {}))
    if (r && typeof r === 'object' && 'provider' in r) refs.set(k, r as SampleRef);
  for (const b of p.blocks)
    if (BLOCKS_BY_ID.has(b.type)) {
      const fixed = ids && b.id !== undefined ? ids[b.id] : undefined;
      if (fixed !== undefined) setNextId(fixed);
      addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id, true);
    }
  if (ids) setNextId(Math.max(nextId, ...Object.values(ids).map((i) => i + 1)));
  setConnectionOrder(Array.isArray(p.connectionOrder) ? [...p.connectionOrder] : []);
  labels.length = 0;
  selectedLabels.clear();
  addLabels(readLabels(p.labels));
  macros.clear();
  innerIds.clear();
  innerSamples.clear();
  for (const m of readMacros(p.macros)) macros.set(m.block, m);
  setSources(readSources(p.sources));
  if (juce) applyView(p.view); // the plugin's patch, from the processor (on the web, startup applies it below)
  for (const id of model.keys()) void resolveSample(id);
  scene.setBlocks([...v1Blocks.values()]);
  setUiSync(true);
  stage.redraw();
}

export function init(): void {
  // A link, file or autosave shows the view it was saved at (owner, 2026-11-12); a v1 composition's own view wins.
  if (start.view.zoom === undefined && !start.view.drag && start.patch.view)
    start.view = {
      ...start.view,
      zoom: start.patch.view.zoom,
      drag: { x: start.patch.view.x, y: start.patch.view.y },
    };
  if (start.view.zoom !== undefined || start.view.drag)
    stage.setView(start.view.zoom ?? 1, start.view.drag ?? { x: 0, y: 0 });
  showPatch(start.patch);
  keepBlocksInView();
  // its saved view may be far from its blocks (owner, 2026-11-19)
  // Someone else's patch from a link, or an embed (CHG-0041): guarded. One this browser or the account made is not.
  setGuarded(
    !!embedId || (start.source === 'link' && !(start.id && (start.mine || canOverwrite(start.id)))),
  );
}
