// Opening a patch: from a link, the account, a preset or a file.
import { toPatch } from '../model/toPatch.ts';
import { loadOrWhy, MISSING_TEXT, canOverwrite } from '../../patch/server.ts';
import { App } from '../../v1ui/shim.ts';
import { saveSession } from '../../patch/share.ts';
import * as account from '../../account/client.ts';
import { parsePatchFile, patchTitle, PATCH_EXT } from '../../patch/files.ts';
import { type Patch, type PatchSource } from '../../patch/loadPatch.ts';
import { track } from '../../analytics/client.ts';
import { setGuarded } from '../audio/microphone.ts';
import { embedId, juce, session, sessionFor, setSession } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { contentOf, setBaseline, setShareLink } from '../model/unsavedChanges.ts';
import { applyPatch } from './applyPatch.ts';
import { myPatches } from './myPatches.ts';
import { PRESETS, nativeReply, savedOn } from './pluginPatches.ts';
import { scene } from '../scene/scene.ts';
import { setCredit } from '../stage/corners.ts';

/** Browser-test hooks. */
declare global {
  interface Window {
    /** A picked file without a picker. */
    __bd_pickedFile: typeof showPicked;
  }
}

/** Open a server patch as the composition (SAVE saves over it if this device may, else remixes);
 * insert adds its blocks. Returns true, or the message bar's words for why it can't be had. */
export async function openShared(id: string, mode: 'open' | 'insert'): Promise<true | string> {
  const loaded = await loadOrWhy(id);
  if ('missing' in loaded) return MISSING_TEXT[loaded.missing];
  // Someone else's (CHG-0041): opened, or inserted into yours, it is guarded until saved as yours.
  const theirs = !loaded.mine && !canOverwrite(id);
  if (mode === 'open' || theirs) setGuarded(mode === 'open' ? theirs : true);
  usePatch(loaded.patch, loaded.title, mode, {
    id,
    rev: loaded.rev,
    ...(loaded.title ? { title: loaded.title } : {}),
    ...(loaded.by ? { by: loaded.by } : {}),
  });
  if (mode !== 'open') return true;
  // The plugins (CHG-0039): the processor has the patch now; the DAW project keeps it, so no link
  // or session here.
  if (juce) {
    setCredit(
      loaded.by && !loaded.mine
        ? {
            id,
            title: loaded.title || 'Untitled',
            by: loaded.by,
            published: !!loaded.published,
            liked: !!loaded.liked,
            likes: loaded.likes ?? 0,
            views: loaded.views ?? 0,
          }
        : null,
    );
    return true;
  }
  App.CompositionId = id;
  App.SessionId = sessionFor(id);
  setSession({ id, dirty: false });
  saveSession(session);
  const url = `${location.origin}${location.pathname}?c=${id}${loaded.title ? `&t=${encodeURIComponent(loaded.title)}` : ''}`;
  history.replaceState(null, '', url);
  setShareLink({ url, owned: !!App.SessionId, at: contentOf(toPatch()), title: loaded.title });
  setBaseline();
  setCredit(
    loaded.by && !loaded.mine
      ? {
          id,
          title: loaded.title || 'Untitled',
          by: loaded.by,
          published: !!loaded.published,
          liked: !!loaded.liked,
          likes: loaded.likes ?? 0,
          views: loaded.views ?? 0,
        }
      : null,
  );
  scene.PatchesPanel.galleryKnown(loaded.mine ? !!loaded.published : null);
  return true;
}

/** Signed in: the account's patches (R8), as OPEN rows. */
export async function accountItems(): Promise<
  { name: string; detail: string; key: string; removable: boolean; link: string }[]
> {
  if (embedId) return [];
  try {
    return (await account.accountPatches()).map((accountPatch) => ({
      name: accountPatch.title || 'Untitled',
      detail: savedOn(accountPatch.updated),
      key: `acct:${accountPatch.id}`,
      removable: true,
      link: accountPatch.id,
    }));
  } catch {
    return [];
  } // signed out, or no backend
}

export async function openPatchItem(
  key: string,
  mode: 'open' | 'insert',
): Promise<boolean | string> {
  // saved over from this device (R9)
  if (key.startsWith('acct:')) return openShared(key.slice(5), mode);
  if (key.startsWith('preset:')) {
    const preset = PRESETS.find((x) => `preset:${x.file}` === key),
      patch = preset && parsePatchFile(preset.text);
    if (preset && patch) usePatch(patch, preset.name, mode, undefined, 'preset');
    return !!patch;
  }
  if (key.startsWith('mine:')) {
    const mine = myPatches().find((x) => x.title === key.slice(5)),
      patch = mine && parsePatchFile(JSON.stringify(mine.patch));
    if (mine && patch) usePatch(patch, mine.title, mode);
    return !!patch;
  }
  if (juce && key.startsWith('file:')) {
    const reply = await nativeReply<{ text: string; name: string }>((req) =>
      juce?.emitEvent('bd_patchRead', { req, path: key.slice(5) }),
    );
    const patch = reply && parsePatchFile(reply.text);
    if (reply && patch) usePatch(patch, patchTitle(patch, reply.name), mode);
    return !!patch;
  }
  return false;
}

/** FROM YOUR COMPUTER: one picker; the panel then asks Open or Insert (owner, 2026-11-10). */
export function pickPatchFile(): void {
  if (juce) {
    juce.emitEvent('bd_patchPick', {});
    return;
  } // the reply arrives as bd_patchFile (no req)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = `.${PATCH_EXT},.json,application/json`;
  input.onchange = async () => {
    const file = input.files?.[0];
    if (file) showPicked(await file.text(), file.name);
  };
  input.click();
}

/** A picked or dropped file, held until the user chooses Open or Insert. */
export let picked: { patch: Patch; title: string } | null = null;

export function showPicked(text: string, fileName: string): void {
  const patch = parsePatchFile(text),
    title = patch ? patchTitle(patch, fileName.replace(/\.(blokdust|json)$/i, '')) : '';
  picked = patch ? { patch, title } : null;
  scene.PatchesPanel.showFile(
    patch
      ? { title, fileName }
      : { title: '', fileName, error: `${fileName} couldn't be read as a BlokDust patch.` },
  );
  stage.redraw();
}

// tests: a file without a picker
/** The view's centre, as a grid cell. */
export const viewCentre = () => {
  const [x, y] = stage.cssToGrid(app.canvas.clientWidth / 2, app.canvas.clientHeight / 2);
  return { x, y };
};

export function usePatch(
  patch: Patch,
  title: string,
  mode: 'open' | 'insert',
  from?: Omit<PatchSource, 'blocks'>,
  source: 'file' | 'preset' | 'link' = from ? 'link' : 'file',
): void {
  // a file or a preset: not someone else's (CHG-0041)
  if (mode === 'open' && source !== 'link') setGuarded(false);
  applyPatch(patch, mode, from);
  track('patch_opened', { source });
  if (mode === 'open') scene.PatchesPanel.setTitle(title);
}

export function setPicked<Value extends typeof picked>(value: Value): Value {
  picked = value;
  return value;
}

export function init(): void {
  window.__bd_pickedFile = showPicked;
}
