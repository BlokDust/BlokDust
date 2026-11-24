// The plugin's patch files and requests to its processor (CHG-0005).
import { patchTitle, parsePatchFile, PATCH_EXT } from '../../patch/files.ts';
import { juce } from '../boot/page.ts';
import { showPicked } from './openPatch.ts';

// ---- patch files (CHG-0005, SPEC-PATCH-FORMAT-V2 R10) ----
/** Built-in presets: `web/src/patch/presets/*.blokdust`, listed by their title. */
export let PRESETS!: { file: string; text: string; name: string }[];

/** Plugin: one reply per request, matched by `req` (`wait` ms; the save dialog waits for the user). */
export let patchReq = 0;

export const nativeReply = <T>(send: (req: number) => void, wait = 10000): Promise<T | null> =>
  new Promise((res) => {
    const req = ++patchReq,
      timeout = setTimeout(() => {
        pendingReplies.delete(req);
        res(null);
      }, wait);
    pendingReplies.set(req, (v) => {
      clearTimeout(timeout);
      res(v as T);
    });
    send(req);
  });

export const pendingReplies = new Map<number, (v: unknown) => void>();

export const savedOn = (ms: number) =>
  `Saved ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

export async function nativePatches() {
  const r = await nativeReply<{ items: { name: string; path: string; modified: number }[] }>(
    (req) => {
      juce!.emitEvent('bd_patchList', { req });
    },
  );
  return (r?.items ?? []).map((i) => ({
    name: i.name,
    detail: savedOn(i.modified),
    key: `file:${i.path}`,
    removable: true,
  }));
}

export function init(): void {
  PRESETS = Object.entries(
    import.meta.glob('../patch/presets/*.blokdust', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )
    .map(([path, text]) => ({
      file: path.split('/').pop()!,
      text,
      name: patchTitle(
        parsePatchFile(text),
        path
          .split('/')
          .pop()!
          .replace(/\.blokdust$/, ''),
      ),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
  // The plugin's page can't open browser windows: links (Settings › About, the code) open in the user's browser.
  if (juce)
    window.open = (u?: string | URL) => {
      juce?.emitEvent('bd_openUrl', { url: String(u ?? '').replace(/^http:\/\//, 'https://') });
      return null;
    };
  if (juce)
    for (const ev of ['bd_patchList', 'bd_patchSaved', 'bd_patchFile', 'bd_patchDeleted'])
      juce.addEventListener(ev, (e: { req?: number }) => {
        const f = e.req !== undefined ? pendingReplies.get(e.req) : undefined;
        if (f) {
          pendingReplies.delete(e.req!);
          f(e);
        } else if (ev === 'bd_patchFile') {
          const r = e as { text: string; name: string; file?: string; stage?: number };
          showPicked(r.text, r.file ?? `${r.name}.${PATCH_EXT}`);
        }
      });
}
