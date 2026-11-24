// Saving a patch file (SPEC-PATCH-FORMAT-V2 R10).
import { toPatch } from '../model/toPatch.ts';
import { fileNameFor, PATCH_EXT } from '../../patch/files.ts';
import { track } from '../../analytics/client.ts';
import { juce } from '../boot/page.ts';
import { model } from '../model/patchModel.ts';
import { setBaseline } from '../model/unsavedChanges.ts';
import { keepMine } from './myPatches.ts';
import { nativeReply } from './pluginPatches.ts';

/**
 * SAVE TO COMPUTER: the user picks where (owner, 2026-11-10). Plugin: the native save dialog, starting in
 * ~/Music/BlokDust/Patches. Web: the browser's save dialog where there is one (Chromium: it starts in Music, then
 * remembers the last folder used for patches); elsewhere a download, as before.
 */
export async function savePatchFile(title: string): Promise<boolean> {
  const name = `${fileNameFor(title)}.${PATCH_EXT}`;
  if (juce) {
    const r = await nativeReply<{ ok: boolean }>(
      (req) => juce?.emitEvent('bd_patchSave', { req, name: fileNameFor(title), title }),
      30 * 60 * 1000,
    );
    if (r?.ok) setBaseline();
    return !!r?.ok;
  }
  const text = JSON.stringify({ ...toPatch(), meta: { title } }, null, 2);
  const w = window as unknown as {
    showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle>;
  };
  if (w.showSaveFilePicker) {
    let handle: FileSystemFileHandle;
    try {
      handle = await w.showSaveFilePicker({
        suggestedName: name,
        startIn: 'music',
        id: 'blokdust-patches',
        types: [
          { description: 'BlokDust patch', accept: { 'application/json': [`.${PATCH_EXT}`] } },
        ],
      });
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return false; // cancelled
      console.warn('BlokDust: no save dialog; downloading instead', error);
      return download(name, text, title);
    }
    try {
      const out = await handle.createWritable();
      await out.write(text);
      await out.close();
    } catch (error) {
      track('save_failed', { kind: 'file' });
      throw error;
    }
    setBaseline();
    keepMine(title);
    track('patch_saved', { kind: 'file' }, { blocks: model.size });
    return true;
  }
  return download(name, text, title);
}

export function download(name: string, text: string, title: string): boolean {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);
  setBaseline();
  keepMine(title);
  track('patch_saved', { kind: 'file' }, { blocks: model.size });
  return true;
}
