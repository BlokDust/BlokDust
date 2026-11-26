// The API's JSON answers as the gallery tests read them (SPEC-SHARING-GALLERY).
import type { LoadedPatch, Saved } from '../../../web/src/patch/server.ts';
import type { GalleryRow } from '../../../web/src/v1ui/patches/hosts.ts';

/** A saved or loaded patch; each endpoint fills some of these fields. */
export type PatchAnswer = Partial<LoadedPatch & Saved> & { error?: string };
/** A page of the gallery. */
export interface GalleryList {
  items: GalleryRow[];
}
/** What `bd gallery <command>` prints, as the tests read it (tools/gallery). */
export interface BdGalleryAnswer {
  reported?: { id: string; reports: number; hidden: number }[];
  added?: { id: string }[];
  into?: string;
}
