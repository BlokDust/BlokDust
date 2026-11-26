// Putting an opened patch on the stage, or inserting it.
import { readSources } from '../model/toPatch.ts';
import { type Patch, type PatchSource, relinks } from '../../patch/loadPatch.ts';
import { audioInAsMicrophone } from '../../patch/webInputs.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { insertBlocks } from '../../patch/files.ts';
import { CommandType } from '../../engine/wasmEngine.ts';
import { type SampleRef } from '../../patch/samples.ts';
import { addBlock } from '../blocks/addBlock.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { endPlacing, lastPointer, lastPointerType, startPlacing } from '../editing/placing.ts';
import { addLabels, readLabels } from '../labels/labels.ts';
import { send, sendRaw } from '../model/engineLink.ts';
import {
  model,
  refs,
  setConnectionOrder,
  setSources,
  setTempo,
  sources,
  tempo,
  uidToId,
} from '../model/patchModel.ts';
import { inside, macros } from '../model/stageWorlds.ts';
import { setBaseline } from '../model/unsavedChanges.ts';
import { applyView, keepBlocksInView } from '../model/view.ts';
import { viewCentre } from './openPatch.ts';
import { readMacros } from './showPatch.ts';
import { scene } from '../scene/scene.ts';
import { INSIDE_HIDDEN, exitStage } from '../stageBlock/lookInside.ts';

/** Open replaces the scene. Insert adds the patch's blocks, keeping their layout, for the pointer
 * to place (startPlacing): under a mouse, or mid-view on a touch screen. */
export function applyPatch(
  incoming: Patch,
  mode: 'open' | 'insert',
  from?: Omit<PatchSource, 'blocks'>,
): void {
  // the website's Audio In is a Microphone (CHG-0041)
  if (!juce) incoming = audioInAsMicrophone(incoming);
  if (inside && mode === 'insert') {
    insertInStage(incoming);
    return;
  }
  if (inside) exitStage();
  const touch = lastPointerType !== 'mouse',
    at = !touch && lastPointer ? lastPointer : viewCentre();
  const part =
    mode === 'open'
      ? {
          blocks: incoming.blocks.filter((b) => BLOCKS_BY_ID.has(b.type)),
          refs: { ...(incoming.refs ?? {}) },
        }
      : insertBlocks(
          { ...incoming, blocks: incoming.blocks.filter((b) => BLOCKS_BY_ID.has(b.type)) },
          new Set([...model.values()].map((b) => b.uid)),
          at,
        );
  endPlacing(false);
  if (juce) {
    // the processor owns the patch and the samples: it merges and the editor reloads (bd_patch)
    if (mode === 'open') {
      scene.ResetScene();
      pluginAfterLoad = { open: true };
    } else
      pluginAfterLoad = {
        place: new Set(part.blocks.map((b) => b.id).filter((id): id is string => !!id)),
        touch,
        at,
      };
    juce.emitEvent('bd_patchApply', {
      mode,
      patch: JSON.stringify({
        ...part,
        ...(mode === 'open' && incoming.tempo !== undefined ? { tempo: incoming.tempo } : {}),
        ...(mode === 'open' && incoming.connectionOrder
          ? { connectionOrder: incoming.connectionOrder }
          : {}),
        ...(mode === 'open' && incoming.view ? { view: incoming.view } : {}),
        ...(mode === 'open'
          ? incoming.labels?.length
            ? { labels: incoming.labels }
            : {}
          : 'labels' in part && part.labels.length
            ? { labels: part.labels }
            : {}),
        ...(mode === 'open'
          ? incoming.macros?.length
            ? { macros: incoming.macros }
            : {}
          : 'macros' in part && part.macros.length
            ? { macros: part.macros }
            : {}),
      }),
    });
    return;
  }
  if (mode === 'open') {
    scene.ResetScene();
    if (typeof incoming.tempo === 'number') {
      setTempo(incoming.tempo);
      sendRaw([{ type: CommandType.Tempo, id: 0, value: tempo, x: -1 }]);
    }
  }
  for (const [k, value] of Object.entries(part.refs))
    if (value && typeof value === 'object' && 'provider' in value && !refs.has(k))
      refs.set(k, value as SampleRef);
  for (const macro of readMacros(
    mode === 'open' ? incoming.macros : 'macros' in part ? part.macros : [],
  ))
    macros.set(macro.block, macro); // before their Stage blocks are added
  const ids = part.blocks.map((b) => addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id));
  // Lineage (SPEC-PATCH-FORMAT-V2 R11): opening keeps the patch's sources; inserting adds the
  // inserted patch (when it is a saved one) and carries its own sources, under the blocks' new ids.
  if (mode === 'open') setSources(readSources(incoming.sources));
  else {
    const kept = incoming.blocks.filter((b) => BLOCKS_BY_ID.has(b.type)),
      now = new Map(kept.map((b, i) => [b.id, part.blocks[i]?.id]));
    const moved = (bs: string[]) => bs.map((b) => now.get(b)).filter((b): b is string => !!b);
    for (const source of readSources(incoming.sources)) {
      const bs = moved(source.blocks);
      if (bs.length) sources.push({ ...source, blocks: bs });
    }
    if (from)
      sources.push({
        ...from,
        blocks: part.blocks.map((b) => b.id).filter((b): b is string => !!b),
      });
  }
  addLabels(readLabels(mode === 'open' ? incoming.labels : 'labels' in part ? part.labels : []));
  if (mode === 'open') {
    setConnectionOrder([...(incoming.connectionOrder ?? [])]);
    send(relinks(incoming, uidToId()));
    applyView(incoming.view);
    keepBlocksInView();
  }
  if (mode === 'open') setBaseline();
  else startPlacing(ids, touch, at);
  stage.redraw();
}

/** INSERT with a Stage open: the blocks go inside, placed like any insert, minus its Stage blocks
 * (one level); added as blocks put down inside are, so the plugins' processor hears the same. */
export function insertInStage(patch: Patch): void {
  const touch = lastPointerType !== 'mouse',
    at = !touch && lastPointer ? lastPointer : viewCentre();
  const fits = (type: string) => {
    const def = BLOCKS_BY_ID.get(type);
    return def !== undefined && !INSIDE_HIDDEN.has(def.menuId);
  };
  const part = insertBlocks(
    { ...patch, blocks: patch.blocks.filter((b) => fits(b.type)), macros: [] },
    new Set([...model.values()].map((b) => b.uid)),
    at,
  );
  endPlacing(false);
  for (const [k, value] of Object.entries(part.refs))
    if (value && typeof value === 'object' && 'provider' in value && !refs.has(k))
      refs.set(k, value as SampleRef);
  const ids = part.blocks.map((b) => addBlock(b.type, b.x ?? 0, b.y ?? 0, b.params ?? {}, b.id));
  addLabels(readLabels(part.labels));
  startPlacing(ids, touch, at);
  stage.redraw();
}

/** Plugin: what to do once the processor sends the merged patch back. */
export let pluginAfterLoad:
  { open: true } | { place: Set<string>; touch: boolean; at: { x: number; y: number } } | null =
  null;

export function setPluginAfterLoad<Value extends typeof pluginAfterLoad>(value: Value): Value {
  pluginAfterLoad = value;
  return value;
}
