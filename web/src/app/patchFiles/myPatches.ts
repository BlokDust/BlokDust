// The patches saved from this browser (MY PATCHES).
import { toPatch } from '../model/toPatch.ts';
import { type Patch } from '../../patch/loadPatch.ts';
import { embedId, juce } from '../boot/page.ts';

/** Web: what this browser saved (file or link), in OPEN above the presets; one per title, newest
 * first, oldest dropped past MINE_MAX. localStorage suffices: patches hold no audio (DATA-0005). */
export const MINE_KEY = 'blokdust.myPatches',
  MINE_MAX = 100;

/** `id`: its link, when it was saved to one (so the account's copy of it is listed once). */
export interface Mine {
  title: string;
  saved: number;
  patch: Patch;
  id?: string;
}

export function myPatches(): Mine[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]');
    return Array.isArray(stored) ? (stored as Mine[]) : [];
  } catch {
    return [];
  }
}

export function keepMine(title: string, id?: string): void {
  if (juce || embedId) return;
  let list: Mine[] = [
    {
      title,
      saved: Date.now(),
      patch: { ...toPatch(), meta: { title } } as Patch,
      ...(id ? { id } : {}),
    },
    ...myPatches().filter((mine) => mine.title !== title),
  ].slice(0, MINE_MAX);
  // Full: drop the oldest until it fits (the browser's limit, not ours).
  for (;;) {
    try {
      localStorage.setItem(MINE_KEY, JSON.stringify(list));
      return;
    } catch {
      if (list.length <= 1) return;
      list = list.slice(0, -1);
    }
  }
}
