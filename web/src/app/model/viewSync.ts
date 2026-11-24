// The view, once it settles, is kept: by the plugin with the DAW project (bd_view), on the web
// in the autosave, but only while that holds this patch (a link must not replace your work).
import { saveLocal } from '../../patch/share.ts';
import { embedId, juce } from '../boot/page.ts';
import { probe } from '../testing/probe.ts';
import { autosaveIsThis } from './autosave.ts';
import { toPatch } from './toPatch.ts';
import { currentView } from './view.ts';

const CHECK_EVERY_MS = 500;

export function init(): void {
  let sent = '';
  let seen = '';
  setInterval(() => {
    try {
      if (embedId || !probe.started) return;
      const view = JSON.stringify(currentView());
      if (view !== seen) {
        seen = view; // still moving
        return;
      }
      if (view === sent) return;
      sent = view;
      if (juce) juce.emitEvent('bd_view', JSON.parse(view) as unknown);
      else if (autosaveIsThis) saveLocal(toPatch());
    } catch {
      /* the page is still starting */
    }
  }, CHECK_EVERY_MS);
}
