// Opening a patch: from a link, the account, a preset or a file.
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
import { toPatch } from '../model/patchModel.ts';
import { contentOf, setBaseline, setShareLink } from '../model/unsavedChanges.ts';
import { applyPatch } from './applyPatch.ts';
import { myPatches } from './myPatches.ts';
import { PRESETS, nativeReply, savedOn } from './pluginPatches.ts';
import { scene } from '../scene/scene.ts';
import { setCredit } from '../stage/corners.ts';

/** Open a server patch by id as the current composition (the account's, or one from the gallery: SAVE then saves
 * over it if this device may, else makes a new link with `parent` set: a remix). Insert just adds its blocks. */
/** Open or insert a saved patch; when it can't be had, the message bar's words for why (owner, 2026-11-18). */
export async function openShared(id: string, mode: 'open' | 'insert'): Promise<true | string> {
  const r = await loadOrWhy(id);
  if ('missing' in r) return MISSING_TEXT[r.missing];
  // Someone else's (CHG-0041): opened, or inserted into yours, it is guarded until saved as yours.
  const theirs = !r.mine && !canOverwrite(id);
  if (mode === 'open' || theirs) setGuarded(mode === 'open' ? theirs : true);
  usePatch(r.patch, r.title, mode, {
    id,
    rev: r.rev,
    ...(r.title ? { title: r.title } : {}),
    ...(r.by ? { by: r.by } : {}),
  });
  if (mode !== 'open') return true;
  // The plugins (CHG-0039): the processor has the patch now; the DAW project keeps it, so no link or session here.
  if (juce) {
    setCredit(
      r.by && !r.mine
        ? {
            id,
            title: r.title || 'Untitled',
            by: r.by,
            published: !!r.published,
            liked: !!r.liked,
            likes: r.likes ?? 0,
            views: r.views ?? 0,
          }
        : null,
    );
    return true;
  }
  App.CompositionId = id;
  App.SessionId = sessionFor(id);
  setSession({ id, dirty: false });
  saveSession(session);
  const url = `${location.origin}${location.pathname}?c=${id}${r.title ? `&t=${encodeURIComponent(r.title)}` : ''}`;
  history.replaceState(null, '', url);
  setShareLink({ url, owned: !!App.SessionId, at: contentOf(toPatch()), title: r.title ?? '' });
  setBaseline();
  setCredit(
    r.by && !r.mine
      ? {
          id,
          title: r.title || 'Untitled',
          by: r.by,
          published: !!r.published,
          liked: !!r.liked,
          likes: r.likes ?? 0,
          views: r.views ?? 0,
        }
      : null,
  );
  scene.PatchesPanel.galleryKnown(r.mine ? !!r.published : null);
  return true;
}

/** Signed in: the account's patches (R8), as OPEN rows. */
export async function accountItems(): Promise<
  { name: string; detail: string; key: string; removable: boolean; link: string }[]
> {
  if (embedId) return [];
  try {
    return (await account.accountPatches()).map((p) => ({
      name: p.title || 'Untitled',
      detail: savedOn(p.updated),
      key: `acct:${p.id}`,
      removable: true,
      link: p.id,
    }));
  } catch {
    return [];
  } // signed out, or no backend
}

export async function openPatchItem(
  key: string,
  mode: 'open' | 'insert',
): Promise<boolean | string> {
  if (key.startsWith('acct:')) return openShared(key.slice(5), mode); // saved over from this device (R9)
  if (key.startsWith('preset:')) {
    const p = PRESETS.find((x) => `preset:${x.file}` === key),
      patch = p && parsePatchFile(p.text);
    if (p && patch) usePatch(patch, p.name, mode, undefined, 'preset');
    return !!patch;
  }
  if (key.startsWith('mine:')) {
    const m = myPatches().find((x) => x.title === key.slice(5)),
      patch = m && parsePatchFile(JSON.stringify(m.patch));
    if (m && patch) usePatch(patch, m.title, mode);
    return !!patch;
  }
  if (juce && key.startsWith('file:')) {
    const r = await nativeReply<{ text: string; name: string }>((req) =>
      juce?.emitEvent('bd_patchRead', { req, path: key.slice(5) }),
    );
    const patch = r && parsePatchFile(r.text);
    if (r && patch) usePatch(patch, patchTitle(patch, r.name), mode);
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
    const f = input.files?.[0];
    if (f) showPicked(await f.text(), f.name);
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
  p: Patch,
  title: string,
  mode: 'open' | 'insert',
  from?: Omit<PatchSource, 'blocks'>,
  source: 'file' | 'preset' | 'link' = from ? 'link' : 'file',
): void {
  if (mode === 'open' && source !== 'link') setGuarded(false); // a file or a preset: not someone else's (CHG-0041)
  applyPatch(p, mode, from);
  track('patch_opened', { source });
  if (mode === 'open') scene.PatchesPanel.setTitle(title);
}

export function setPicked<Value extends typeof picked>(value: Value): Value {
  picked = value;
  return value;
}

export function init(): void {
  (window as unknown as { __bd_pickedFile: unknown }).__bd_pickedFile = showPicked;
}
