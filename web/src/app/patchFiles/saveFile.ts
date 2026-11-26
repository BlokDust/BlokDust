// Saving a patch file (SPEC-PATCH-FORMAT-V2 R10).
import { toPatch } from '../model/toPatch.ts';
import { fileNameFor, PATCH_EXT } from '../../patch/files.ts';
import { track } from '../../analytics/client.ts';
import { juce } from '../boot/page.ts';
import { model } from '../model/patchModel.ts';
import { setBaseline } from '../model/unsavedChanges.ts';
import { keepMine } from './myPatches.ts';
import { nativeReply } from './pluginPatches.ts';

/** SAVE TO COMPUTER, where the user picks: the plugin's dialog (from ~/Music/BlokDust/Patches), the
 * browser's save picker (Chromium: Music, then the last patch folder), else a download. */
export async function savePatchFile(title: string): Promise<boolean> {
  const name = `${fileNameFor(title)}.${PATCH_EXT}`;
  if (juce) {
    const reply = await nativeReply<{ ok: boolean }>(
      (req) => juce?.emitEvent('bd_patchSave', { req, name: fileNameFor(title), title }),
      30 * 60 * 1000,
    );
    if (reply?.ok) setBaseline();
    return !!reply?.ok;
  }
  const text = JSON.stringify({ ...toPatch(), meta: { title } }, null, 2);
  const pickerWindow = window as unknown as {
    showSaveFilePicker?: (options: object) => Promise<FileSystemFileHandle>;
  };
  if (pickerWindow.showSaveFilePicker) {
    let handle: FileSystemFileHandle;
    try {
      handle = await pickerWindow.showSaveFilePicker({
        suggestedName: name,
        startIn: 'music',
        id: 'blokdust-patches',
        types: [
          { description: 'BlokDust patch', accept: { 'application/json': [`.${PATCH_EXT}`] } },
        ],
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false; // cancelled
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
