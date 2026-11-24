// Every edit is autosaved here after it settles.
import { syncMacros } from './macroSync.ts';
import { toPatch } from './toPatch.ts';
import { saveLocal, saveSession } from '../../patch/share.ts';
import { embedId, juce, params, session } from '../boot/page.ts';
import { checkOwnDirty } from '../share/ownLink.ts';

const SETTLE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** The autosave holds the patch on screen (it was restored from it, or edited since). */
export let autosaveIsThis = false;

export const changed = () => {
  // In the plugin the DAW project keeps the patch (the processor has it).
  if (juce) {
    syncMacros();
    return;
  }
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
  }, SETTLE_MS);
};

export function init(): void {
  autosaveIsThis = !params.has('c') && !params.has('v1') && !params.has('demo') && !embedId;
}
