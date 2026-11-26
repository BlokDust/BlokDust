import { toPatch } from '../model/toPatch.ts';
import { type GalleryState, isServerId, save as saveShared } from '../../patch/server.ts';
import { PLUGIN_SITE } from '../../patch/site.ts';
import { App } from '../../v1ui/shim.ts';
import { track } from '../../analytics/client.ts';
import { saveSession, saveLocal } from '../../patch/share.ts';
import { setGuarded } from '../audio/microphone.ts';
import { THUMB, embedId, juce, session, sessionFor, setSession } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { model } from '../model/patchModel.ts';
import {
  contentOf,
  lastGallery,
  setBaseline,
  setLastGallery,
  setShareLink,
  shareLink,
} from '../model/unsavedChanges.ts';
import { keepMine } from '../patchFiles/myPatches.ts';
import { scene } from '../scene/scene.ts';
import { credit, setCredit } from '../stage/corners.ts';

/** SAVE / SAVE AS to a share link (SPEC-SHARING-BACKEND): v1 SAVE over this browser's (or
 * account's) link, else a new one. The link goes in the address bar; the patch counts as saved. */
export async function makeLink(
  mode: 'save' | 'saveAs',
  title: string,
  gallery?: boolean,
): Promise<GalleryState | null> {
  const id = await scene.host.share(
    mode === 'save' && shareLink?.owned ? 'save' : 'saveAs',
    title,
    gallery,
  );
  linkSaved(id, title);
  return lastGallery;
}

/** Saved to the link `id` (`at`: the content saved): the address bar shows it and the patch counts
 * as saved. */
export function linkSaved(id: string, title: string, at = contentOf(toPatch())): void {
  // The plugins' page isn't on the site: the link is the site's, and there is no address bar to
  // update.
  const url = `${juce ? PLUGIN_SITE : `${location.origin}${location.pathname}`}?c=${id}&t=${encodeURIComponent(title)}`;
  if (!juce) history.replaceState(null, '', url); // v1 AddressBarManager.UpdateURL
  setShareLink({ url, owned: isServerId(id) && !!App.SessionId, at, title });
  setGuarded(false); // saved: it is yours now (CHG-0041)
  setBaseline(at); // a shared patch counts as saved
  keepMine(title, id);
  setCredit(null); // saved: it is yours now (a remix keeps `parent`)
  track('patch_saved', { kind: 'link' }, { blocks: model.size });
  checkOwnDirty();
}

/** This device's own server link holds the patch (never in the plugins, which keep no link). */
export const ownLink = () =>
  !juce &&
  !embedId &&
  !credit &&
  !!shareLink?.owned &&
  !!App.CompositionId &&
  isServerId(App.CompositionId);

/** The own link's patch has changed since it was saved (worked out when an edit settles, not every
 * frame). */
export let ownDirty = false,
  quickSaving = false;

export function checkOwnDirty(): void {
  const dirty = ownLink() && contentOf(toPatch()) !== shareLink?.at;
  if (dirty !== ownDirty) {
    ownDirty = dirty;
    stage.redraw();
  }
}

export function openSaveTab(): void {
  if (scene.SettingsPanel.Open || scene.SoundcloudPanel.Open) return;
  if (scene.PatchesPanel.Open) scene.PatchesPanel.selectTab(0);
  else scene.PatchesPanel.OpenPanel(0);
}

/** Cmd/Ctrl+S or SAVE (CHG-0033, SPEC-SHARING-BACKEND R18–R20): over the own link, same title and
 * gallery; else Patches › SAVE. Never a new self-contained link: offline, it stays unsaved. */
export async function quickSave(): Promise<void> {
  if (quickSaving || scene.PatchesPanel.Saving) return;
  const link = shareLink;
  if (!link || !ownLink()) {
    openSaveTab();
    return;
  }
  const patch = toPatch(),
    at = contentOf(patch),
    title = link.title || 'Untitled';
  if (at === link.at) {
    checkOwnDirty();
    scene.message('Saved');
    return;
  }
  quickSaving = true;
  stage.redraw();
  try {
    const thumb = stage
      .thumbnail(THUMB.width, THUMB.height, { title })
      .toDataURL('image/png')
      .split(',')[1];
    const saved = await saveShared('save', App.CompositionId, { patch, title, thumb });
    if (!saved) throw new Error('no backend');
    // Not this device's to save over any more (its right was lost, or the patch deleted):
    // saveShared made a new link.
    setLastGallery(saved.gallery ?? null);
    App.CompositionId = saved.id;
    App.SessionId = sessionFor(saved.id);
    // edited while it saved: those edits are still unsaved
    const still = contentOf(toPatch()) !== at;
    setSession({ id: saved.id, dirty: still });
    saveSession(session);
    saveLocal(toPatch());
    linkSaved(saved.id, title, at);
    if (saved.gallery) scene.PatchesPanel.galleryKnown(saved.gallery.published);
    scene.message('Saved');
  } catch (error) {
    console.warn('BlokDust: quick save failed', error);
    track('save_failed', { kind: 'quick' });
    scene.message('Save failed, please try again.'); // v1 L10n Errors.SaveError
  } finally {
    quickSaving = false;
    checkOwnDirty();
    stage.redraw();
  }
}
