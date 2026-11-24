// The opened patch's unsaved baseline, title, link and credit.
import { openAccountSettings } from '../scene/hostParts.ts';
import { App } from '../../v1ui/shim.ts';
import { loadSession } from '../../patch/share.ts';
import * as account from '../../account/client.ts';
import { activity } from '../../account/activity.ts';
import { refreshOwnership } from '../account/pluginAccount.ts';
import { embedId, juce, linkArrival, params, pendingLink, signInReturn, start } from './page.ts';
import { app, stage } from './pixi.ts';
import { setCountActivity, toPatch } from '../model/patchModel.ts';
import {
  BASELINE_KEY,
  contentOf,
  replaceBaseline,
  setBaseline,
  setShareLink,
} from '../model/unsavedChanges.ts';
import { scene } from '../scene/scene.ts';
import { checkOwnDirty } from '../share/ownLink.ts';
import { backToSave } from '../share/signInReturn.ts';
import { accountPage, setCredit } from '../stage/corners.ts';
import { setUiSync } from '../stage/overlays.ts';

export function init(): void {
  // Unsaved changes are counted from what was opened: a link, a v1 composition or a first visit. Work restored from the last
  // visit counts from where it was last saved (or, never saved, as unsaved).
  if (start.missing)
    replaceBaseline(contentOf(toPatch())); // blank: nothing unsaved, and the kept baseline stays the autosave's
  else if (
    start.id ||
    params.has('c') ||
    params.has('v1') ||
    params.has('demo') ||
    start.source === 'demo'
  )
    setBaseline();
  else
    try {
      replaceBaseline(localStorage.getItem(BASELINE_KEY) ?? '');
    } catch {
      /* private mode */
    }
  {
    const title = params.get('t') ?? start.title ?? '';
    if (title) scene.PatchesPanel.setTitle(title);
    // This browser's own link (v1 App.SessionId): COPY LINK, or UPDATE LINK once the patch changes.
    if (start.id && App.SessionId && !embedId)
      setShareLink({
        url: `${location.origin}${location.pathname}?c=${start.id}${title ? `&t=${encodeURIComponent(title)}` : ''}`,
        owned: true,
        at: loadSession().dirty ? '' : contentOf(toPatch()),
        title,
      });
    // Someone else's patch: "TITLE BY @NAME" in the corner; yours: the gallery switch shows whether it is published.
    if (start.by && !start.mine && !embedId && start.id)
      setCredit({
        id: start.id,
        title: start.title || 'Untitled',
        by: start.by,
        published: !!start.published,
        liked: !!start.liked,
        likes: start.likes ?? 0,
        views: start.views ?? 0,
      });
    if (start.mine) scene.PatchesPanel.galleryKnown(!!start.published);
    checkOwnDirty(); // restored unsaved edits to this device's own link show as UNSAVED at once
    // Who is signed in (the corner, the Settings tab's name, the gallery switch).
    const page = accountPage();
    if (page && !juce && !embedId) {
      const prev = page.onChange;
      page.onChange = () => {
        prev();
        stage.redraw();
      };
      void page.refresh(false);
    }
    // R16: count time played, blocks added, particles and laser turns; keep them when the page is hidden, and send them
    // in one request when it closes (saves carry them too).
    if (page && !juce && !embedId) {
      setCountActivity(true);
      account.watchActivityBeacon();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') activity.keep();
      });
      addEventListener('pagehide', () => account.sendActivityOnClose(!!page.Account));
    }
    // From the plugin's CREATE SHARE LINK: the patch arrives in the address (`?c=p…&share=1`). The link is made here at
    // once, as SAVE makes it (the user asked for it in the app), and the address bar shows it, short, to copy; START
    // shows the scene (owner, 2026-11-13: the Patches panel opened instead, its title over the start screen). The flag
    // is dropped first, so a reload doesn't make another.
    if (params.has('share') && !juce && !embedId) {
      params.delete('share');
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
      requestAnimationFrame(
        () =>
          void scene.host.links
            ?.make('saveAs', title || 'Untitled')
            .catch((e) => console.warn('BlokDust: making the share link failed', e)),
      );
    }
    // Back from Google sign-in (CHG-0023): claim this browser's patches (R9) and show the account (a new one picks
    // its name). The flag is dropped so a reload doesn't do it again.
    // A plugin's code to approve (SHARING-0011): Settings › ACCOUNT asks (signed out: sign in first, then it asks).
    const link = !juce && !embedId && signInReturn !== 'new' ? pendingLink() : null;
    if (link !== null && (linkArrival !== null || signInReturn))
      requestAnimationFrame(() => {
        openAccountSettings();
        (scene.SettingsPanel as any).accountPage?.showApprove(link);
      });
    if (signInReturn && !juce && !embedId) {
      params.delete('account');
      history.replaceState(
        null,
        '',
        `${location.pathname}${params.size ? `?${params.toString()}` : ''}`,
      );
      void account
        .claimMine()
        .then(() => refreshOwnership())
        .catch(() => {});
      // A new account picks its name in Settings › ACCOUNT; a known one goes straight to the stage (owner, 2026-11-15),
      // or back to SAVE if that is where the sign-in began (CHG-0035).
      const linked = account.linkMessage(signInReturn);
      if (linked)
        requestAnimationFrame(() => {
          // R7a, R7b: back on SIGN-IN METHODS, which says what happened
          openAccountSettings();
          (scene.SettingsPanel as any).accountPage?.showMethods(linked);
        });
      else if (signInReturn === 'new') requestAnimationFrame(() => openAccountSettings());
      else if (pendingLink() !== null) {
        /* approving a plugin's code: below */
      }
      // No new account today from this network (R1b): Settings › SIGN IN says why.
      else if (signInReturn === 'limit')
        requestAnimationFrame(() => {
          openAccountSettings();
          (scene.SettingsPanel as any).accountPage?.refused(account.ACCOUNT_LIMIT_MESSAGE);
        });
      else backToSave();
    }
  }
  app.renderer.on('resize', () => {
    stage.resize();
    setUiSync(true);
  });
  app.ticker.add(() => {
    if (scene.update(performance.now())) stage.redraw();
    stage.update();
  });
}
