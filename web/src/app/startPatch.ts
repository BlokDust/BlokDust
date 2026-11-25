// The patch the website starts with (DATA-0004, CHG-0003): a share link, a v1 composition, the
// autosave or, on a first visit, an empty stage (SPEC-VISUAL-V1-PARITY R12).
import type { Patch } from '../patch/loadPatch.ts';
import { decodePatch, loadLocal, loadSession } from '../patch/share.ts';
import { type Missing, isServerId, loadOrWhy } from '../patch/server.ts';
import { importV1, type V1Composition } from '../patch/importV1.ts';
import demo from '../demo/demo.patch.json';

export interface View {
  theme?: number;
  zoom?: number;
  drag?: { x: number; y: number };
}
export interface Start {
  patch: Patch;
  view: View;
  id: string | null;
  title?: string;
  /** The link opened no patch, and why. */ missing?: Missing;
  /** Its account's handle, when someone else's (SPEC-SHARING-GALLERY R15). */ by?: string | null;
  mine?: boolean;
  published?: boolean;
  liked?: boolean;
  likes?: number;
  views?: number;
  /** Where the patch came from (SPEC-SHARING-USAGE-ANALYTICS patch_opened). */ source?:
    'link' | 'embed' | 'autosave' | 'demo' | 'v1';
}
/** Start-up patch: `?c=` share (CHG-0003), `?v1=` composition (DATA-0004), autosave, else empty;
 * `?demo` opens the test scene (source 'demo': the tour asks, SPEC-VISUAL-V1-PARITY R12). */
export async function initialPatch(
  params: URLSearchParams,
  embedId: string | null,
  plugin = false,
): Promise<Start> {
  // The plugin's patch comes only from the processor (bd_patch): its web view keeps localStorage,
  // so an autosave would flash up first.
  if (plugin)
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null };
  const linkId = embedId ?? params.get('c');
  if (linkId && isServerId(linkId)) {
    const session = loadSession(),
      local = loadLocal();
    // Unsaved edits to this same composition (autosave) win over its saved version, as before a
    // reload.
    if (!embedId && session.id === linkId && session.dirty && local)
      return { patch: local, view: {}, id: linkId, source: 'autosave' };
    const loaded = await loadOrWhy(linkId);
    if (!('missing' in loaded))
      return {
        patch: loaded.patch,
        view: {},
        id: linkId,
        title: loaded.title,
        by: loaded.by ?? null,
        mine: !!loaded.mine,
        published: !!loaded.published,
        liked: !!loaded.liked,
        likes: loaded.likes ?? 0,
        views: loaded.views ?? 0,
        source: embedId ? 'embed' : 'link',
      };
    return {
      patch: { format: 'blokdust.patch', version: 2, blocks: [] },
      view: {},
      id: null,
      missing: loaded.missing,
    };
  }
  if (linkId) {
    const decoded = await decodePatch(linkId);
    if (decoded) return { patch: decoded, view: {}, id: null, source: 'link' };
    // Not a patch link at all (a made-up or cut-off id): say so on a blank stage, not this
    // browser's last one.
    return {
      patch: { format: 'blokdust.patch', version: 2, blocks: [] },
      view: {},
      id: null,
      missing: 'unknown',
    };
  }
  const v1 = params.get('v1');
  if (v1) {
    try {
      const imported = importV1(JSON.parse(v1) as V1Composition);
      return { patch: imported.patch, view: imported.view, id: null, source: 'v1' };
    } catch {
      /* fall through */
    }
  }
  if (params.has('demo')) return { patch: demo, view: {}, id: null, source: 'demo' };
  const local = loadLocal();
  return {
    patch: local ?? { format: 'blokdust.patch', version: 2, blocks: [] },
    view: {},
    id: loadSession().id,
    source: local ? 'autosave' : 'demo',
  };
}
