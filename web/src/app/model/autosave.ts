// Every edit is autosaved here after it settles.
import { saveLocal, saveSession } from '../../patch/share.ts';
import { embedId, juce, params, session } from '../boot/page.ts';
import { toPatch } from './patchModel.ts';
import { syncMacros } from './stageWorlds.ts';
import { checkOwnDirty } from '../share/ownLink.ts';

export let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** The autosave holds the patch on screen (it was restored from it, or edited since). */
export let autosaveIsThis!: boolean;

export const changed = () => {
  if (juce) {
    syncMacros();
    return;
  } // in the plugin the DAW project keeps the patch (the processor has it)
  if (embedId) return; // the embed player never autosaves
  clearTimeout(saveTimer);
  autosaveIsThis = true;
  saveTimer = setTimeout(() => {
    saveLocal(toPatch());
    if (session.id && !session.dirty) {
      session.dirty = true;
      saveSession(session);
    }
    checkOwnDirty();
  }, 300);
};

export function init(): void {
  autosaveIsThis = !params.has('c') && !params.has('v1') && !params.has('demo') && !embedId;
}
