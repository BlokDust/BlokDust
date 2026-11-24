import { type Patch } from '../../patch/loadPatch.ts';
import { type GalleryState } from '../../patch/server.ts';
import { embedId, juce } from '../boot/page.ts';
import { toPatch } from './patchModel.ts';

// ---- unsaved changes (owner, 2026-11-10): the patch as last saved, shared or opened ----
/** What Open would lose: blocks, their params and the tempo (not the view); not a Toggle's on/off, which a
 * running scene flips by itself (CHG-0013). */
export const withoutLogic = (blocks: Patch['blocks']) =>
  blocks.map((b) =>
    b.type === 'power.toggle' && b.params && 'logic' in b.params
      ? {
          ...b,
          params: Object.fromEntries(Object.entries(b.params).filter(([k]) => k !== 'logic')),
        }
      : b,
  );

export const contentOf = (patch: Patch) =>
  JSON.stringify([
    withoutLogic(patch.blocks),
    patch.tempo ?? null,
    ...(patch.labels?.length || patch.macros?.length ? [patch.labels ?? []] : []),
    ...(patch.macros?.length
      ? [
          patch.macros.map((macro) => ({
            ...macro,
            blocks: withoutLogic(macro.blocks),
            view: undefined,
          })),
        ]
      : []),
  ]);

export const BASELINE_KEY = 'blokdust.savedPatch';

export let baseline = '';

export function setBaseline(content = contentOf(toPatch())): void {
  baseline = content;
  if (!juce && !embedId)
    try {
      localStorage.setItem(BASELINE_KEY, baseline);
    } catch {
      /* private mode */
    }
}

/** The share link made here (or the one this browser can update, from the start-up link). */
export let shareLink: { url: string; owned: boolean; at: string; title: string } | null = null;

/** What the last save said about the gallery (SPEC-SHARING-GALLERY R1). */
export let lastGallery: GalleryState | null = null;

export function setShareLink<Value extends typeof shareLink>(value: Value): Value {
  shareLink = value;
  return value;
}

export function setLastGallery<Value extends typeof lastGallery>(value: Value): Value {
  lastGallery = value;
  return value;
}

export function replaceBaseline<Value extends typeof baseline>(value: Value): Value {
  baseline = value;
  return value;
}
