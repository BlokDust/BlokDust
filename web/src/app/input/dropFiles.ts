import { addBlock } from '../blocks/addBlock.ts';
import { embedId } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { setLastPointer, setLastPointerType } from '../editing/placing.ts';
import { showPicked } from '../patchFiles/openPatch.ts';
import { SAMPLERS, useFile } from '../samples/userSamples.ts';

// ---- drop an audio file: onto a sampler → it loads there; onto the stage → a new Sample block holds it (v1 had this
// planned, MainScene "FILE DRAGGING", commented out). The file is read locally, never uploaded (DATA-0005). ----
export const isAudioFile = (f: File) =>
  f.type.startsWith('audio/') || /\.(wav|mp3|ogg|oga|flac|aiff?|m4a|aac|opus|webm)$/i.test(f.name);

export function init(): void {
  if (!embedId) {
    window.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });
    window.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      e.preventDefault();
      if (/\.(blokdust|json)$/i.test(file.name)) {
        // a patch file: the Patches panel asks Open or Insert (owner, 2026-11-10)
        const r = app.canvas.getBoundingClientRect(),
          [gx, gy] = stage.cssToGrid(e.clientX - r.left, e.clientY - r.top);
        setLastPointer({ x: gx, y: gy });
        setLastPointerType('mouse');
        void file.text().then((text) => showPicked(text, file.name));
        return;
      }
      if (!isAudioFile(file)) return;
      // Chromium: a File System Access handle (asked for during the event) lets the file reload next visit.
      const item = [...(e.dataTransfer?.items ?? [])].find((i) => i.kind === 'file') as
        | (DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> })
        | undefined;
      const handle = item?.getAsFileSystemHandle?.().catch(() => null) ?? Promise.resolve(null);
      const r = app.canvas.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      const hit = stage.hitTest(x, y);
      let id = hit && SAMPLERS.has(hit.type) ? hit.id : null;
      if (id === null) {
        const [gx, gy] = stage.cssToGrid(x, y);
        id = addBlock('source.sample', Math.round(gx), Math.round(gy), {});
      }
      const target = id;
      void handle.then((h) =>
        useFile(target, file, h?.kind === 'file' ? (h as FileSystemFileHandle) : null, true),
      );
    });
  }
  // No browser menu on a right-click (owner, 2026-11-17): it took the pointer's release, leaving a held block stuck
  // down. Links keep theirs (open in a new tab, copy the address), and text fields theirs (paste).
  document.addEventListener('contextmenu', (e) => {
    if (
      e.target instanceof Element &&
      e.target.closest('a[href], input, textarea, [contenteditable=""], [contenteditable="true"]')
    )
      return;
    e.preventDefault();
  });
}
