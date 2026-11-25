// The API's JSON answers as the sharing tests read them (SPEC-SHARING-BACKEND). Each endpoint fills
// some of these fields, so all are optional.
import type { LoadedPatch, Saved } from '../../../web/src/patch/server.ts';

export type ApiAnswer = Partial<LoadedPatch & Saved> & {
  error?: string;
  /** A new patch's edit token (only its creator holds it). */
  editToken?: string;
};
