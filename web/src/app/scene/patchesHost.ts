// The Patches panel (CHG-0005): SAVE, OPEN and SHARE for patch files, links and the account.
import { track } from '../../analytics/client.ts';
import { appKey } from '../../account/appKey.ts';
import { encodePatch, saveLocal, saveSession } from '../../patch/share.ts';
import { remove as removeShared, save as saveShared } from '../../patch/server.ts';
import type { PatchItem } from '../../v1ui/patches.ts';
import { App } from '../../v1ui/shim.ts';
import { THUMB, juce, session, sessionFor, setSession } from '../boot/page.ts';
import { stage } from '../boot/pixi.ts';
import { ios } from '../model/engineLink.ts';
import { model, toPatch } from '../model/patchModel.ts';
import { baseline, contentOf, setLastGallery, setShareLink } from '../model/unsavedChanges.ts';
import { MINE_KEY, myPatches } from '../patchFiles/myPatches.ts';
import {
  accountItems,
  openPatchItem,
  pickPatchFile,
  picked,
  setPicked,
  usePatch,
} from '../patchFiles/openPatch.ts';
import { PRESETS, nativePatches, nativeReply, savedOn } from '../patchFiles/pluginPatches.ts';
import { savePatchFile } from '../patchFiles/saveFile.ts';
import { checkOwnDirty } from '../share/ownLink.ts';
import { setCredit } from '../stage/corners.ts';
import type { SceneHostPart } from './hostParts.ts';
import { scene } from './scene.ts';

type PatchesHost = SceneHostPart<
  | 'listPatches'
  | 'savePatch'
  | 'openPatch'
  | 'pickPatchFile'
  | 'usePickedFile'
  | 'isDirty'
  | 'hasBlocks'
  | 'removePatch'
  | 'removeLine'
  | 'share'
>;

/** Plugin: signed in (SHARING-0011) the account's patches come first, then its files and presets. */
async function pluginPatchList(): Promise<PatchItem[]> {
  return [
    ...(appKey() ? await accountItems() : []),
    ...(await nativePatches()),
    ...PRESETS.map((preset) => ({
      name: preset.name,
      detail: 'Preset',
      key: `preset:${preset.file}`,
    })),
  ];
}

/** Web (owner, 2026-11-18): the account's patches once each, then this browser's copies not among them. */
async function webPatchList(): Promise<PatchItem[]> {
  const accountPatches = await accountItems();
  const accountIds = new Set(accountPatches.map((item) => item.key.slice(5)));
  const accountNames = new Set(accountPatches.map((item) => item.name));
  // A copy remembers its link; older ones without it are matched by name.
  const localOnly = myPatches().filter((mine) =>
    mine.id ? !accountIds.has(mine.id) : !accountNames.has(mine.title),
  );
  return [
    ...accountPatches,
    ...localOnly.map((mine) => ({
      name: mine.title,
      detail: savedOn(mine.saved),
      key: `mine:${mine.title}`,
      removable: true,
      ...(mine.id ? { link: mine.id } : {}),
    })),
  ];
}

function keepMyPatches(keep: (mine: ReturnType<typeof myPatches>[number]) => boolean): void {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(myPatches().filter(keep)));
  } catch {
    /* private mode */
  }
}

/** A real delete (owner, 2026-11-18): the link and its gallery entry go. */
async function deleteAccountPatch(item: PatchItem): Promise<void> {
  const id = item.key.slice(5);
  try {
    await removeShared(id);
  } catch {
    scene.message('That patch couldn’t be deleted. Try again.', { seconds: 4 });
    return;
  }
  keepMyPatches((mine) => mine.id !== id && (Boolean(mine.id) || mine.title !== item.name));
  // The patch on the stage was that one: it stays, unsaved; SAVE makes a new link.
  if (App.CompositionId === id) {
    App.CompositionId = null;
    App.SessionId = null;
    setShareLink(null);
    setCredit(null);
    setSession({ id: null, dirty: false });
    saveSession(session);
    history.replaceState(null, '', location.pathname);
    checkOwnDirty();
    stage.redraw();
  }
  scene.message('Patch deleted', { seconds: 2 });
}

const removePatch: PatchesHost['removePatch'] = async (item) => {
  if (item.key.startsWith('acct:')) await deleteAccountPatch(item);
  else if (item.key.startsWith('mine:')) keepMyPatches((mine) => mine.title !== item.key.slice(5));
  else if (juce && item.key.startsWith('file:'))
    await nativeReply((req) => juce?.emitEvent('bd_patchDelete', { req, path: item.key.slice(5) }));
};

/** The owner's wording (2026-11-10); a plugin file really goes to the Trash (iPad has none). */
const removeLine: PatchesHost['removeLine'] = (item) => {
  if (item.key.startsWith('acct:'))
    return 'Anyone with the link will no longer be able to open this save. If it’s published, it will also be removed from the gallery.';
  if (!juce)
    return 'This patch will be removed from the patches list. Your local downloaded patches and generated links remain untouched.';
  return ios
    ? 'This patch file will be deleted. Links you generated remain untouched.'
    : 'This patch file will be moved to the Trash. Links you generated remain untouched.';
};

/** v1 SAVE / SAVE AS to the server; with no backend (or a failure), a self-contained link. */
const share: PatchesHost['share'] = async (mode, title, gallery) => {
  const patch = toPatch();
  setLastGallery(null);
  try {
    const thumb = stage
      .thumbnail(THUMB.width, THUMB.height, { title })
      .toDataURL('image/png')
      .split(',')[1];
    const saved = await saveShared(mode, App.CompositionId, {
      patch,
      title,
      thumb,
      ...(gallery !== undefined ? { gallery } : {}),
    });
    if (saved) {
      setLastGallery(saved.gallery ?? null);
      App.CompositionId = saved.id;
      App.SessionId = sessionFor(saved.id);
      setSession({ id: saved.id, dirty: false });
      saveSession(session);
      if (!juce) saveLocal(patch);
      return saved.id;
    }
  } catch (error) {
    console.warn('BlokDust: saving to the server failed; sharing as a link instead', error);
    track('save_failed', { kind: 'link' });
  }
  return encodePatch(patch);
};

export function patchesHost(): PatchesHost {
  return {
    // OPEN lists only the user's own patches on the web: the presets are @blokdust's gallery EXAMPLES.
    listPatches: () => (juce ? pluginPatchList() : webPatchList()),
    savePatch: (title) => savePatchFile(title),
    openPatch: (item, mode) => openPatchItem(item.key, mode),
    pickPatchFile: () => pickPatchFile(),
    usePickedFile: (mode) => {
      if (!picked) return;
      const file = picked;
      setPicked(null);
      usePatch(file.patch, file.title, mode);
    },
    isDirty: () => model.size > 0 && contentOf(toPatch()) !== baseline,
    hasBlocks: () => model.size > 0,
    removePatch,
    removeLine,
    share,
  };
}
