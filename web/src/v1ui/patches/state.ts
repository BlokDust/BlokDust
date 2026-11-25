// The Patches panel's state (CHG-0005): what is open, saving, loading and shown.
import { App, DisplayObject } from '../shim.ts';
import { GALLERY_SORTS } from './hosts.ts';
import type {
  GallerySort,
  GalleryRow,
  OpenRun,
  PatchItem,
  PatchesHost,
  PickedFile,
  VideoProgressInfo,
} from './hosts.ts';

/** The tab Patches opens on: the last one chosen (owner, 2026-11-10). */
export const SORT_KEY = 'blokdust.gallerySort';
export const TAB_KEY = 'blokdust.patchesTab';
export function rememberedTab(): Tab {
  try {
    const tab = Number(localStorage.getItem(TAB_KEY));
    return (tab >= 0 && tab <= 2 ? tab : 0) as Tab;
  } catch {
    return 0;
  }
}

export type Tab = 0 | 1 | 2; // SAVE / SHARE, OPEN, GALLERY (web)
export const ALL_TABS: Tab[] = [0, 1, 2];
export type View = 'list' | 'file' | 'confirm' | 'remove' | 'video';

export abstract class PatchesState extends DisplayObject {
  Open = false;
  /** Drawn while open or sliding away; closing hands input back at once (no swallowed click). */
  protected shown = false;
  OffsetX = 0;
  OffsetY = 0;
  Title = '';
  Items: PatchItem[] = [];
  Loading = false;
  Tab: Tab = 0;
  View: View = 'list';
  /** The picked or dropped file waiting for Open / Insert. */
  Picked: PickedFile | null = null;
  Saving = false;
  /** A short label in place of a button's own (SAVED, COPIED) until `flashUntil`. */
  protected flash: { key: string; label: string; until: number } | null = null;
  /** OPEN's list, scrolled: one scrolling list, as the gallery, not pages of five. */
  OpenScroll = 0;
  /** What the pointer is over, by control name (an unnamed control is not hovered). */
  protected roll: Partial<Record<string, boolean>> = {};
  /** Tab fills, 0..1 (v1 MenuCategory.Selected, tweened). */
  protected selected = [1, 0, 0];
  /** The GALLERY tab (CHG-0024). */
  GalleryItems: GalleryRow[] = [];
  GallerySort: GallerySort = (() => {
    try {
      const item = localStorage.getItem(SORT_KEY) as GallerySort;
      return GALLERY_SORTS.includes(item) ? item : 'popular';
    } catch {
      return 'popular';
    }
  })();
  GalleryQuery = '';
  GalleryPage = 1;
  GalleryMore = false;
  GalleryLoading = false;
  GalleryMessage = '';
  GalleryView = 'list' as const;
  /** The list's scroll, device px from the top (one scrolling list, pages appended). */
  GalleryScroll = 0;
  /** A press on a list (OPEN's or the gallery's): it scrolls if it moves (and opens no row), else
   * the row's button acts on release. */
  protected galleryDrag: {
    tab: 1 | 2;
    y: number;
    scroll: number;
    moved: boolean;
    row: number;
    mode: 'open' | 'insert' | 'like' | 'bin';
  } | null = null;
  /** After REPORT: the thanks, then the panel closes. */
  protected galleryAsk = 0;
  SearchContainer!: HTMLElement;
  SearchInput!: HTMLInputElement;
  /** SAVE / SHARE › ADD TO GALLERY (on by default), and what the last save made of it. */
  GalleryOn = true;
  protected savedGallery: boolean | null = null;
  /** Why the last save could not publish (a Recorder, the user's own files, a rude title). */
  GalleryNote = '';
  /** SAVE / SHARE › MAKE VIDEO (CHG-0022): on by default where the video can be shared. */
  VideoOn: boolean | null = null;
  VideoState: 'idle' | 'making' | 'ready' | 'error' = 'idle';
  VideoProgress: VideoProgressInfo = { phase: 'preparing', done: 0 };
  VideoMessage = '';
  protected videoFile: File | null = null;
  /** The small portrait player (a DOM video over the panel). */
  protected player: HTMLVideoElement | null = null;
  protected playerUrl = '';
  protected videoAbort: AbortController | null = null;
  /** The patch the delete step asks about. */
  protected removing: PatchItem | null = null;
  /** What OPEN ANYWAY / SAVE FIRST go on to do, and the view to go back to on CANCEL. */
  protected pending: { run: OpenRun; from: View; gone?: () => void } | null = null;
  /** A patch is being fetched to open or insert: the panel stays up with v1's spinner, then closes
   * (else the old stage showed, and could be changed, while it loaded). */
  Opening = false;
  OpenError = '';
  TitleContainer!: HTMLElement;
  Input!: HTMLInputElement;
  UrlContainer!: HTMLElement;
  UrlInput!: HTMLInputElement;

  constructor(protected readonly host: PatchesHost) {
    super();
  }

  /** v1's message bar (App.Message): saved, copied, shared. */
  protected say(text: string, seconds = 2): void {
    (
      App.MainScene as { message?: (t: string, o?: { seconds?: number }) => void } | undefined
    )?.message?.(text, { seconds });
  }

  flashing(key: string): boolean {
    return !!this.flash && this.flash.key === key && performance.now() < this.flash.until;
  }
  get animating(): boolean {
    const now = performance.now();
    return (
      this.Loading ||
      this.Saving ||
      this.Opening ||
      this.VideoState === 'making' ||
      this.GalleryLoading ||
      now < this.settle ||
      (!!this.flash && now < this.flash.until + 250)
    );
  }
  /** Keep drawing a moment after something async lands (save, link, list), so its end is drawn. */
  protected settle = 0;
  protected settled(): void {
    this.settle = performance.now() + 250;
  }
  protected label(key: string, normal: string): string {
    const flash = this.flash;
    return flash && this.flashing(key) ? flash.label : normal;
  }
}
