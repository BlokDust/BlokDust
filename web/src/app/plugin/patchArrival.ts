// The processor sends the patch it holds (bd_patch): the page shows it and says it is ready.
import type { Patch } from '../../patch/loadPatch.ts';
import { apiUrl } from '../../patch/site.ts';
import { COPY as PATCH_COPY } from '../../v1ui/patches.ts';
import { hideLinks } from '../../v1ui/scene.ts';
import { App } from '../../v1ui/shim.ts';
import { juce } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { startPlacing } from '../editing/placing.ts';
import { ios, setIos, setStandalone, standalone } from '../model/engineLink.ts';
import { automation, ccBySlot, model, toPatch } from '../model/patchModel.ts';
import { innerIds, setSentMacros } from '../model/stageWorlds.ts';
import { setBaseline } from '../model/unsavedChanges.ts';
import { pluginAfterLoad, setPluginAfterLoad } from '../patchFiles/applyPatch.ts';
import { showPatch } from '../patchFiles/showPatch.ts';
import { scene } from '../scene/scene.ts';
import { hostSystem } from '../support/feedback.ts';
import { probe } from '../testing/probe.ts';

export interface PatchMessage {
  patch: string;
  /** The processor's engine ids, by patch block id. */
  ids?: Record<string, number>;
  /** The engine ids inside each Stage (CHG-0038), by the Stage's patch id. */
  innerIds?: Record<string, Record<string, number>>;
  standalone?: boolean;
  ios?: boolean;
  powerMode?: number;
  hostPlaying?: boolean;
}

/** Dust slots (PLUGIN-0003) saved with the DAW project. */
interface SavedAutomation {
  slot: number;
  block: string;
  param: string;
  cc?: number;
}

function adaptToHost(message: PatchMessage): void {
  setStandalone(!!message.standalone);
  setIos(!!message.ios);
  // DAW plugins have the power switch's HOST cell; a standalone app has no transport (CHG-0025).
  scene.hostPower = !standalone;
  scene.setHostState(message.powerMode ?? 1, !!message.hostPlaying);
  if (ios && !standalone && !App.NoLinks) hideLinks(); // an iPad extension can't open Safari
  if (ios)
    PATCH_COPY.shareLinePlugin =
      'Send a link to this patch from the share menu: Messages, WhatsApp, Mail and more.';
}

function restoreAutomation(saved: SavedAutomation[]): void {
  automation.clear();
  ccBySlot.clear();
  for (const dust of saved) {
    for (const [id, block] of model)
      if (block.uid === dust.block) automation.set(`${id}:${dust.param}`, dust.slot);
    if (typeof dust.cc === 'number') ccBySlot.set(dust.slot, dust.cc);
  }
}

/** What to do once the processor sends back a patch this page asked for (open or insert). */
function finishPendingLoad(): void {
  const after = pluginAfterLoad;
  setPluginAfterLoad(null);
  if (!after) return;
  if ('open' in after) {
    setBaseline();
    return;
  }
  const placed = [...model].filter(([, block]) => after.place.has(block.uid)).map(([id]) => id);
  startPlacing(placed, after.touch, after.at);
}

export function onPatchArrived(message: PatchMessage): void {
  adaptToHost(message);
  const patch = JSON.parse(message.patch) as Patch & { automation?: SavedAutomation[] };
  showPatch(patch, message.ids);
  // A reopened editor edits the blocks the processor has inside each Stage (CHG-0038).
  for (const [uid, ids] of Object.entries(message.innerIds ?? {}))
    innerIds.set(uid, { ids, nextId: Math.max(0, ...Object.values(ids)) + 1 });
  setSentMacros(JSON.stringify(toPatch().macros ?? []));
  finishPendingLoad();
  restoreAutomation(patch.automation ?? []);
  probe.started = true;
  // events: the server for the plugin's daily usage ping (SHARING-0010 R8).
  juce?.emitEvent('bd_ready', {
    blocks: stage.allBlocks().length,
    supportSystem: hostSystem,
    events: apiUrl('events'),
  });
}
