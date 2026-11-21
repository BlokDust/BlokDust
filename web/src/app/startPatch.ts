// The patch the website starts with (DATA-0004, CHG-0003): a share link, a v1 composition, the autosave or, on a first
// visit, an empty stage (SPEC-VISUAL-V1-PARITY R12).
import type { Patch } from '../patch/loadPatch.ts';
import { decodePatch, loadLocal, loadSession } from '../patch/share.ts';
import { type Missing, isServerId, loadOrWhy } from '../patch/server.ts';
import { importV1, type V1Composition } from '../patch/importV1.ts';
import demo from '../demo/demo.patch.json';

export interface View { theme?: number; zoom?: number; drag?: { x: number; y: number } }
export interface Start { patch: Patch; view: View; id: string | null; title?: string; /** The link opened no patch, and why. */ missing?: Missing; /** Its account's handle, when someone else's (SPEC-SHARING-GALLERY R15). */ by?: string | null; mine?: boolean; published?: boolean; liked?: boolean; likes?: number; views?: number;
  /** Where the patch came from (SPEC-SHARING-USAGE-ANALYTICS patch_opened). */ source?: 'link' | 'embed' | 'autosave' | 'demo' | 'v1' }
/** Start-up patch: a `?c=` share (server id: CHG-0003; `p…` token: Phase 1), else a `?v1=` v1 composition JSON
 * (DATA-0004, with its theme/zoom/offset), else the autosave, else (a first visit) an empty stage. `?demo` opens the
 * test scene instead; both count as source 'demo' (SPEC-VISUAL-V1-PARITY R12: the first visit is asked about the tour). */
export async function initialPatch(params: URLSearchParams, embedId: string | null, plugin = false): Promise<Start> {
  // The plugin's patch comes only from the processor (bd_patch, with the DAW project). The web view keeps
  // localStorage between sessions, so its autosave would flash up first (owner, Logic, 2026-11-12).
  if (plugin) return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null };
  const c = embedId ?? params.get('c');
  if (c && isServerId(c)) {
    const session = loadSession(), local = loadLocal();
    // Unsaved edits to this same composition (autosave) win over its saved version, as before a reload.
    if (!embedId && session.id === c && session.dirty && local) return { patch: local, view: {}, id: c, source: 'autosave' };
    const r = await loadOrWhy(c);
    if (!('missing' in r)) return { patch: r.patch, view: {}, id: c, title: r.title, by: r.by ?? null, mine: !!r.mine, published: !!r.published, liked: !!r.liked, likes: r.likes ?? 0, views: r.views ?? 0, source: embedId ? 'embed' : 'link' };
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null, missing: r.missing };
  }
  if (c) {
    const p = await decodePatch(c);
    if (p) return { patch: p, view: {}, id: null, source: 'link' };
    // Not a patch link at all (a made-up or cut-off id): say so on a blank stage, not this browser's last one.
    return { patch: { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: null, missing: 'unknown' };
  }
  const v1 = params.get('v1');
  if (v1) { try { const r = importV1(JSON.parse(v1) as V1Composition); return { patch: r.patch, view: r.view, id: null, source: 'v1' }; } catch { /* fall through */ } }
  if (params.has('demo')) return { patch: demo as Patch, view: {}, id: null, source: 'demo' };
  const local = loadLocal();
  return { patch: local ?? { format: 'blokdust.patch', version: 2, blocks: [] }, view: {}, id: loadSession().id, source: local ? 'autosave' : 'demo' };
}
