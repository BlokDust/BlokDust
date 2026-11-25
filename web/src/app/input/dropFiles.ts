import { addBlock } from '../blocks/addBlock.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { setLastPointer, setLastPointerType } from '../editing/placing.ts';
import { showPicked } from '../patchFiles/openPatch.ts';
import { SAMPLERS, useFile } from '../samples/userSamples.ts';

// A dropped audio file loads into the sampler under it, or a new Sample block (v1 had this planned:
// MainScene "FILE DRAGGING"). It is read locally, never uploaded (DATA-0005).
export const isAudioFile = (file: File) =>
  file.type.startsWith('audio/') ||
  /\.(wav|mp3|ogg|oga|flac|aiff?|m4a|aac|opus|webm)$/i.test(file.name);

/** Chromium can give a dropped file's File System Access handle. */
type HandleItem = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

export function init(): void {
  if (!embedId) {
    window.addEventListener('dragover', (event) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    });
    window.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      event.preventDefault();
      if (/\.(blokdust|json)$/i.test(file.name)) {
        // a patch file: the Patches panel asks Open or Insert (owner, 2026-11-10)
        const boundingClientRect = app.canvas.getBoundingClientRect(),
          [gx, gy] = stage.cssToGrid(
            event.clientX - boundingClientRect.left,
            event.clientY - boundingClientRect.top,
          );
        setLastPointer({ x: gx, y: gy });
        setLastPointerType('mouse');
        void file.text().then((text) => {
          showPicked(text, file.name);
        });
        return;
      }
      if (!isAudioFile(file)) return;
      // Chromium: a File System Access handle (asked for during the event) lets the file reload
      // next visit.
      const item: HandleItem | undefined = [...event.dataTransfer.items].find(
        (entry) => entry.kind === 'file',
      );
      const handle = item?.getAsFileSystemHandle?.().catch(() => null) ?? Promise.resolve(null);
      const canvasRect = app.canvas.getBoundingClientRect(),
        x = event.clientX - canvasRect.left,
        y = event.clientY - canvasRect.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) {
        const [gx, gy] = stage.cssToGrid(x, y);
        id = addBlock('source.sample', Math.round(gx), Math.round(gy), {});
      }
      const target = id;
      void handle.then((fileSystemHandle) =>
        useFile(
          target,
          file,
          fileSystemHandle?.kind === 'file' ? (fileSystemHandle as FileSystemFileHandle) : null,
          true,
        ),
      );
    });
  }
  // No browser menu on a right-click: it took the pointer's release, leaving a held block stuck
  // down. Links keep theirs (open in a new tab, copy the address), and text fields theirs (paste).
  document.addEventListener('contextmenu', (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        'a[href], input, textarea, [contenteditable=""], [contenteditable="true"]',
      )
    )
      return;
    event.preventDefault();
  });
}
