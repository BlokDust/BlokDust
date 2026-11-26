// The plugin's patch files and requests to its processor (CHG-0005).
import { patchTitle, parsePatchFile, PATCH_EXT } from '../../patch/files.ts';
import { juce } from '../boot/page.ts';
import { showPicked } from './openPatch.ts';

// ---- patch files (CHG-0005, SPEC-PATCH-FORMAT-V2 R10) ----
/** Built-in presets: `web/src/patch/presets/*.blokdust`, listed by their title. */
export let PRESETS!: { file: string; text: string; name: string }[];

/** Plugin: one reply per request, matched by `req` (`wait` ms; the save dialog waits for the
 * user). */
export let patchReq = 0;

export const nativeReply = <T>(send: (req: number) => void, wait = 10000): Promise<T | null> =>
  new Promise((res) => {
    const req = ++patchReq,
      timeout = setTimeout(() => {
        pendingReplies.delete(req);
        res(null);
      }, wait);
    pendingReplies.set(req, (reply) => {
      clearTimeout(timeout);
      res(reply as T);
    });
    send(req);
  });

export const pendingReplies = new Map<number, (reply: unknown) => void>();

export const savedOn = (ms: number) =>
  `Saved ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

export async function nativePatches() {
  const reply = await nativeReply<{ items: { name: string; path: string; modified: number }[] }>(
    (req) => {
      juce?.emitEvent('bd_patchList', { req });
    },
  );
  return (reply?.items ?? []).map((i) => ({
    name: i.name,
    detail: savedOn(i.modified),
    key: `file:${i.path}`,
    removable: true,
  }));
}

const fileNameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export function init(): void {
  const presetFiles = import.meta.glob<string>('../../patch/presets/*.blokdust', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  // A glob that matches nothing is no build error: say so here.
  if (Object.keys(presetFiles).length === 0) throw new Error('BlokDust: no preset patches found');
  PRESETS = Object.entries(presetFiles)
    .map(([path, text]) => ({
      file: fileNameOf(path),
      text,
      name: patchTitle(parsePatchFile(text), fileNameOf(path).replace(/\.blokdust$/, '')),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
  // The plugin's page can't open browser windows: links (Settings › About, the code) open in the
  // user's browser.
  if (juce)
    window.open = (target?: string | URL) => {
      juce?.emitEvent('bd_openUrl', {
        url: String(target ?? '').replace(/^http:\/\//, 'https://'),
      });
      return null;
    };
  if (juce)
    for (const ev of ['bd_patchList', 'bd_patchSaved', 'bd_patchFile', 'bd_patchDeleted'])
      juce.addEventListener(ev, (message: { req?: number }) => {
        const resolveReply =
          message.req !== undefined ? pendingReplies.get(message.req) : undefined;
        if (resolveReply && message.req !== undefined) {
          pendingReplies.delete(message.req);
          resolveReply(message);
        } else if (ev === 'bd_patchFile') {
          const picked = message as { text: string; name: string; file?: string; stage?: number };
          showPicked(picked.text, picked.file ?? `${picked.name}.${PATCH_EXT}`);
        }
      });
}
