// The Patches panel (CHG-0005; layout by the owner, 2026-11-10): two tabs, SAVE and OPEN.
//
// SAVE holds nothing that can replace the current patch: the patch name, then (web) CREATE SHARE LINK, which becomes
// COPY LINK once made and SAVE (to the same link) once the patch has changed, with SAVE AS (a new link) under the link;
// and SAVE TO COMPUTER (a `.blokdust` file). The plugin has SAVE TO COMPUTER first, then CREATE SHARE LINK, which makes
// the link in the web browser (owner, 2026-11-10). OPEN lists the patches saved here (web: this browser's; plugin: the
// patches folder) and the built-in presets, with an OPEN and an INSERT button on every row, and OPEN FROM YOUR DEVICE,
// which asks Open or Insert once a file is picked. Opening over unsaved changes asks first (CANCEL · SAVE FIRST · OPEN
// ANYWAY). The last tab chosen is remembered.
//
// Nothing here is a new style: every piece is drawn with v1's own code and metrics, copied from
//   - SettingsPanel: the panel title, the tab bar (MenuCategory fills with their notch, dividers) and its close cross;
//   - SharePanel: TITLE field + rule + RANDOMISE TITLE, the filled SAVE/SAVE AS half buttons with their hover notch,
//     the italic copy, the URL box, the "saving…" spinner, the warnings, and its back chevron with a label (SKIP);
//   - SettingsPanel › Connect: the three 130×30 filled buttons (for the confirm step), and its 420×40 GUIDE button
//     (OPEN FROM YOUR DEVICE, the OPEN tab's main button);
//   - SoundcloudPanel: the paged rows, count, page number, arrows, and its bordered button (OPEN / INSERT);
//
// Owner review 1 (2026-11-15): three tabs, SAVE / SHARE · OPEN · GALLERY (web; the plugin keeps SAVE and OPEN).
// SAVE / SHARE (web) adds, from v1 pieces:
//   - ADD TO GALLERY: v1's OptionSwitch ("offOn": a dash, a divider, a diamond, the chosen side underlined), with the
//     options type for its name; signed out, an italic line says only signed-in users can publish;
// Owner review 2 (option A): one main button. Under the name, two switches, ADD TO GALLERY and MAKE VIDEO (on by
// default where the browser can share a video file, i.e. phones and tablets), then SAVE: Connect's 420×40 GUIDE button
// in SharePanel's SAVE colour. The link sits under it. SAVE AS and DOWNLOAD PATCH (not on phones) are v1's bordered
// buttons at the bottom. Saving with MAKE VIDEO on goes on to the video: portrait, as long as the patch's timers need
// (videoSeconds), shown as it renders with SharePanel's spinner, then played in a small portrait player (a DOM video
// over the panel, like v1's text fields) with SHARE VIDEO under it (DOWNLOAD VIDEO on desktop, where it also downloads
// once made). Nothing to save, the main button reads MAKE VIDEO. The plugin keeps SAVE TO COMPUTER · CREATE SHARE
// LINK and has no video.
// GALLERY (CHG-0024) is v1 SoundcloudPanel's layout: the search field over its rule with the bordered SEARCH above it,
// and POPULAR / NEW bottom right where v1 had RANDOMISE. Owner review 2: the rows are one list that scrolls (wheel or
// drag) and loads the next page as it nears its end, and each row has OPEN only (liking is on the stage, with the patch
// open: main.ts; reporting is Settings › FEEDBACK, CHG-0041).
import { App, Dimensions, DisplayObject } from './shim.ts';
import { Device } from './ported/Device';
import { MISSING_TEXT } from '../patch/server.ts';

export interface PatchItem {
  /** Shown upper-case on the row's first line. */
  name: string;
  /** The row's second line, e.g. "Preset" or "Saved 8 Nov 2026" (v1: "By <user>"). */
  detail: string;
  key: string;
  /** The user's own (saved here): the row has a bin. */
  removable?: boolean;
  /** The link it was saved to, if any. */
  link?: string;
}

/** A name not among `taken` (case ignored): "Name", else "Name (2)", "Name (3)", … (owner, 2026-11-18: your own
 * patches don't share a name). A name already ending in " (n)" counts on from its base. */
export function uniqueTitle(title: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((t) => t.trim().toLowerCase()));
  if (!used.has(title.trim().toLowerCase())) return title;
  const base = title.replace(/\s*\(\d+\)$/, '');
  for (let n = 2; ; n++) {
    const t = `${base} (${n})`;
    if (!used.has(t.toLowerCase())) return t;
  }
}
/** Accounts (CHG-0023): what the ACCOUNT tab shows. */
export interface AccountInfo {
  handle: string | null;
  passkeys: number;
  providers: string[];
  methods?: import('../account/client.ts').SignInMethod[];
  stats?: import('../account/client.ts').AccountStats;
  apps?: import('../account/client.ts').SignedInApp[];
}
export interface AccountHost {
  /** Who is signed in (null: nobody), whether Google and Apple sign-in are offered; null when there is no backend. */
  me(
    stats?: boolean,
  ): Promise<{ user: AccountInfo | null; google: boolean; apple?: boolean } | null>;
  signUp(handle: string): Promise<void>;
  signIn(): Promise<void>;
  google(): void;
  apple(): void;
  addPasskey(): Promise<void>;
  /** R7c: remove a way in (never the last). */
  removeMethod(signInMethod: import('../account/client.ts').SignInMethod): Promise<void>;
  setHandle(handle: string): Promise<void>;
  signOut(everywhere: boolean): Promise<void>;
  deleteAccount(): Promise<void>;
  /** The passkey dialog was closed by the user: nothing to report. */
  cancelled(e: unknown): boolean;
  /** The plugins (SHARING-0011): sign in with a device code, approved on the website. Absent on the website. */
  plugin?: {
    /** It can open the browser (an AUv3 on iPad can't: the QR code and the address do). */
    canOpenBrowser: boolean;
    start(): Promise<import('../account/device.ts').DeviceCode>;
    poll(deviceCode: string): Promise<import('../account/device.ts').DevicePoll>;
    open(url: string): void;
    /** Keep the key (the plugin's file) and use it from now on. */
    keep(key: string, handle: string | null): void;
    /** The iPad app: Sign in with Apple and passkeys natively; the answer is the key (fresh: a new account). */
    native?: {
      apple(): Promise<{ key: string; user: { handle: string | null }; fresh?: boolean }>;
      passkey(): Promise<{ key: string; user: { handle: string | null } }>;
    };
  };
  /** The website (SHARING-0011): the plugins signed in to this account, and approving a plugin's code. */
  apps?: {
    list(): Promise<import('../account/client.ts').SignedInApp[]>;
    remove(id: string): Promise<void>;
    info(code: string): Promise<{ name: string }>;
    approve(code: string, yes: boolean): Promise<{ name: string }>;
  };
}
/** The gallery (CHG-0024). */
/** The like control (owner review 3, 2026-11-16: chosen from three; the star didn't read as an up vote and its angles
 * aren't BlokDust's 45°): the first peak of v1's triangle-wave icon (OptionButton "wave", 2) as an open up chevron,
 * centred on x, y, `s` wide, in v1's 2 px line; liked, in the options colour. */
export function drawUpArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  liked: boolean,
  colour: string,
  on: string,
): void {
  const h = s / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - h, y + h / 2);
  ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x + h, y + h / 2);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2;
  ctx.strokeStyle = liked ? on : colour;
  ctx.stroke();
  ctx.restore();
}
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
/** POPULAR · ALL TIME TOP · NEW · EXAMPLES (owner review 3: EXAMPLES are @blokdust's patches; owner, 2026-11-17,
 * CHG-0035: ALL TIME TOP, popular without the fade over time, in place of TUTORIALS while there are none). The server
 * still answers `tutorials`. */
export type GallerySort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
export const GALLERY_SORTS: GallerySort[] = ['popular', 'top', 'new', 'examples'];
/** An Open or Insert: a promise while the patch is fetched (false: it couldn't be). */
/** Open or insert; a promise ends true, or false / the message bar's words for why it couldn't. */
type OpenRun = () => void | Promise<boolean | string>;
export interface GalleryRow {
  id: string;
  title: string;
  by: string;
  likes: number;
  remixes: number;
  views: number;
  liked: boolean;
  mine: boolean;
}
export interface GalleryHost {
  browse(
    sort: GallerySort,
    q: string,
    page: number,
  ): Promise<{ items: GalleryRow[]; more: boolean } | null>;
  /** Open a published patch (it replaces the current one; SAVE then makes a remix of it), or Insert its blocks. */
  open(row: GalleryRow, mode: 'open' | 'insert'): Promise<boolean | string>;
  /** Like or unlike (the host shows it at once on this row and the stage, and settles fast presses on the last). */
  like(row: GalleryRow): void;
  unpublish(id: string): Promise<void>;
}
/** Video export (CHG-0022): what the VIDEO tab asks for. */
export type VideoShape = 'portrait' | 'square' | 'wide';
/** Videos start from the beginning, as the patch plays when it has just loaded (owner, 2026-11-15). */
export interface VideoChoice {
  shape: VideoShape;
  seconds: number;
}
export interface VideoProgressInfo {
  phase: 'preparing' | 'rendering';
  done: number;
}
/** The share link of the current patch (web). */
export interface ShareLink {
  url: string;
  /** The patch changed since the link was made. */ stale: boolean;
  /** This browser made it (it can update it). */ owned: boolean;
}
/** A file picked with FROM YOUR COMPUTER or dropped on the stage: its title, or why it can't be used. */
export interface PickedFile {
  title: string;
  fileName: string;
  error?: string;
}
export interface PatchesHost {
  listPatches(): Promise<PatchItem[]>;
  /** Save the scene as a file under `title`; resolves true once written (false: cancelled or failed). */
  savePatch(title: string): Promise<boolean>;
  /** Open (replace) or Insert (place by hand) a listed patch. */
  openPatch(item: PatchItem, mode: 'open' | 'insert'): void | Promise<boolean | string>;
  /** Show the system file picker; the host answers with `PatchesPanel.showFile`. */
  pickPatchFile(): void;
  /** Open or Insert the file last given to `showFile`. */
  usePickedFile(mode: 'open' | 'insert'): void;
  /** The patch changed since it was last saved, shared or opened (and has blocks). */
  isDirty(): boolean;
  /** Delete one of the user's own patches (web: from this browser's list; plugin: the file goes to the Trash). */
  removePatch(item: PatchItem): Promise<void>;
  /** What deleting does, for the confirm step. */
  /** The delete step's line for this patch. */
  removeLine(item: PatchItem): string;
  hasBlocks(): boolean;
  /** Video export (SPEC-SHARING-VIDEO-EXPORT); null: no VIDEO tab (the plugin, R16). */
  video: null | {
    make(
      choice: VideoChoice,
      progress: (videoProgressInfo: VideoProgressInfo) => void,
      signal: AbortSignal,
    ): Promise<File>;
    /** In a click: the system share sheet (where a browser can't share files, the file is downloaded). */
    share(file: File): Promise<void>;
    /** This browser can hand a video to the share sheet (phones, tablets); else the video downloads. */
    canShareFiles(): boolean;
    /** How long the video runs: whole cycles of the patch's longest timer, 10 to 30 seconds (owner review 2). */
    seconds(): number;
  };
  /** The public gallery (SPEC-SHARING-GALLERY); null: no GALLERY tab (the plugin). */
  gallery: GalleryHost | null;
  /** Accounts (SPEC-SHARING-ACCOUNTS): Settings › SIGN IN / ACCOUNT (accountPage.ts); null in the plugin. */
  account: AccountHost | null;
  /** Someone is signed in (the gallery switch: only signed-in users can publish, SPEC-SHARING-GALLERY R2). */
  signedIn(): boolean;
  /** SAVE / SHARE's SIGN IN (signed out): open Settings › SIGN IN, and come back to SAVE once signed in (CHG-0035). */
  signInToSave?(title: string): void;
  /** Share links (SPEC-SHARING-BACKEND). */
  links: null | {
    /** Plugin: the link is made in the web browser (its page has the bot check); nothing is kept here. */
    external?: boolean;
    current(): ShareLink | null;
    /** v1 SAVE_AS (a new link) / SAVE (overwrite this browser's link); `gallery`: in the gallery or not (undefined:
     * leave it). Resolves with what the server said about the gallery. */
    make(
      mode: 'saveAs' | 'save',
      title: string,
      gallery?: boolean,
    ): Promise<{ published: boolean; reason?: string } | null | void>;
    /** v1 SharePanel's warning (recordings, the user's own files), or null. */
    warning(): string | null;
  };
}

/** The tab Patches opens on: the last one chosen (owner, 2026-11-10). */
const SORT_KEY = 'blokdust.gallerySort';
const TAB_KEY = 'blokdust.patchesTab';
function rememberedTab(): Tab {
  try {
    const t = Number(localStorage.getItem(TAB_KEY));
    return (t >= 0 && t <= 2 ? t : 0) as Tab;
  } catch {
    return 0;
  }
}

export const COPY = {
  panel: 'Patches',
  tabs: ['Save / Share', 'Open', 'Gallery'] as const,
  name: 'Patch Name',
  randomise: 'Randomise Title',
  save: 'Save to Computer',
  saved: 'Saved',
  saveLinePlugin: 'Save a .blokdust patch file. It opens in the web version of BlokDust too.',
  share: 'Create Share Link',
  shareLinePlugin: 'Create a shareable link. It opens in your web browser, ready to copy.',
  opened: 'Opened',
  // Web (owner, 2026-11-11): three buttons, no help lines: SAVE (to the link: made the first time), SAVE AS (a new
  // link), DOWNLOAD PATCH (the .blokdust file). Clicking the link copies it.
  saveLink: 'Save',
  saveAs: 'Save As',
  download: 'Download Patch',
  linkLine: 'Share your creation with this unique URL:',
  savedLine: 'Saved. Share your creation with this unique URL:',
  linkCopied: 'Link copied',
  savedCopied: 'Saved · Link copied',
  copyLink: 'Copy Link',
  shareLink: 'Share',
  saveChanges: 'Save Changes',
  saving: 'saving...',
  savingButton: 'Saving',
  open: 'Open',
  insert: 'Insert',
  empty: 'No patches yet',
  file: 'Open From Your Device',
  back: 'Back',
  openDesc: 'Replace the current patch',
  insertDesc: 'Add its blocks to this patch',
  confirm: 'Replace current patch?',
  confirmLine: 'You have unsaved changes. Opening another patch will replace your current work.',
  cancel: 'Cancel',
  saveFirst: 'Save First',
  openAnyway: 'Open Anyway',
  remove: 'Delete',
  removeButton: 'Delete',
  search: 'Search',
  sorts: {
    popular: 'Popular',
    top: 'All Time Top',
    new: 'New',
    examples: 'Examples',
    tutorials: 'Tutorials',
  },
  showMore: 'Show More',
  signIn: 'Sign In',
  unpublish: 'Unpublish',
  like: 'Like',
  liked: 'Liked',
  noneYet: 'Nothing here yet',
  by: 'by',
  openFailed: 'This patch couldn’t be opened. Check your connection and try again.',
  addToGallery: 'Add to Gallery',
  signInToPublish: 'Only signed-in users can publish to the gallery.',
  makeVideo: 'Make Video',
  downloadVideo: 'Download Video',
  tryAgain: 'Try Again',
  cancelVideo: 'Cancel',
  rendering: 'making video',
  shareVideo: 'Share Video',
};

type Tab = 0 | 1 | 2; // SAVE / SHARE, OPEN, GALLERY (web)
const ALL_TABS: Tab[] = [0, 1, 2];
type View = 'list' | 'file' | 'confirm' | 'remove' | 'video';

export class PatchesPanel extends DisplayObject {
  Open = false;
  /** Drawn while open or sliding away: closing hands input back at once, so a click right after isn't swallowed. */
  private shown = false;
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
  private flash: { key: string; label: string; until: number } | null = null;
  /** OPEN's list, scrolled (owner, 2026-11-16: one scrolling list, as the gallery, not pages of five). */
  OpenScroll = 0;
  private roll: Record<string, boolean> = {};
  /** Tab fills, 0..1 (v1 MenuCategory.Selected, tweened). */
  private selected = [1, 0, 0];
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
  GalleryView: 'list' = 'list';
  /** The list's scroll, device px from the top (owner review 2: one scrolling list, pages appended). */
  GalleryScroll = 0;
  /** A press on the list: where it started, and whether it has become a drag (a drag doesn't open the row under it). */
  /** A press on a list (OPEN's or the gallery's): it scrolls if it moves, else the row's button acts on release. */
  private galleryDrag: {
    tab: 1 | 2;
    y: number;
    scroll: number;
    moved: boolean;
    row: number;
    mode: 'open' | 'insert' | 'like' | 'bin';
  } | null = null;
  /** After REPORT: the thanks, then the panel closes. */
  private galleryAsk = 0;
  SearchContainer!: HTMLElement;
  SearchInput!: HTMLInputElement;
  /** SAVE / SHARE › ADD TO GALLERY (on by default, owner 2026-11-15), and what the last save made of it. */
  GalleryOn = true;
  private savedGallery: boolean | null = null;
  /** Why the last save could not publish (a Recorder, the user's own files, a rude title). */
  GalleryNote = '';
  /** SAVE / SHARE › MAKE VIDEO (CHG-0022, owner review 2): on by default where the video can go to the share sheet. */
  VideoOn: boolean | null = null;
  VideoState: 'idle' | 'making' | 'ready' | 'error' = 'idle';
  VideoProgress: VideoProgressInfo = { phase: 'preparing', done: 0 };
  VideoMessage = '';
  private videoFile: File | null = null;
  /** The small portrait player (a DOM video over the panel). */
  private player: HTMLVideoElement | null = null;
  private playerUrl = '';
  private videoAbort: AbortController | null = null;
  /** The patch the delete step asks about. */
  private removing: PatchItem | null = null;
  /** What OPEN ANYWAY / SAVE FIRST go on to do, and the view to go back to on CANCEL. */
  private pending: { run: OpenRun; from: View; gone?: () => void } | null = null;
  /** A patch is being fetched to open or insert: the panel stays up with v1's spinner (owner review 3, 2026-11-16: the
   * old stage showed, and could be changed, for the seconds it took), then closes. */
  Opening = false;
  OpenError = '';
  TitleContainer!: HTMLElement;
  Input!: HTMLInputElement;
  UrlContainer!: HTMLElement;
  UrlInput!: HTMLInputElement;

  constructor(private readonly host: PatchesHost) {
    super();
  }

  Init(drawTo: any): void {
    super.Init(drawTo);
    this.OffsetY = -this.DrawTo.Height;
    this.TitleContainer = document.getElementById('patchTitle')!;
    this.Input = document.getElementById('patchTitleInput') as HTMLInputElement;
    this.UrlContainer = document.getElementById('patchUrl')!;
    this.UrlInput = document.getElementById('patchUrlText') as HTMLInputElement;
    // Any characters (owner, 2026-11-10: "+" in a name). v1 stripped punctuation because the title went into the URL
    // unescaped; the link now escapes it and the file name is made safe separately (fileNameFor, PatchFiles::safeName).
    this.Input.addEventListener('input', () => {
      this.Title = this.Input.value;
    });
    this.Input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.Input.blur();
    });
    this.UrlInput.addEventListener('click', () => void this.copyLink());
    this.player = document.getElementById('patchVideo') as HTMLVideoElement | null;
    this.SearchContainer = document.getElementById('gallerySearch')!;
    this.SearchInput = document.getElementById('gallerySearchInput') as HTMLInputElement;
    this.SearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.SearchInput.blur();
        this.GalleryQuery = this.SearchInput.value.trim();
        void this.browse();
      }
    });
  }
  /** Click the link: it is copied (and selected, so it can be copied by hand where the clipboard is refused). */
  private async copyLink(): Promise<void> {
    const link = this.link;
    if (!link) return;
    this.UrlInput.select();
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      document.execCommand?.('copy');
    }
    this.say(COPY.linkCopied);
  }
  /** v1's message bar (App.Message): saved, copied, shared. */
  private say(text: string, seconds = 2): void {
    (
      App.MainScene as { message?: (t: string, o?: { seconds?: number }) => void } | undefined
    )?.message?.(text, { seconds });
  }
  /** SHARE (phones): the device's own share sheet, which lists Instagram, Messages, WhatsApp… (owner, 2026-11-18). */
  private get canShare(): boolean {
    return this.mobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }
  private async shareSheet(): Promise<void> {
    const link = this.link;
    if (!link) return;
    try {
      await navigator.share({ title: this.Title.trim() || 'BlokDust', url: link.url });
    } catch {
      /* closed */
    }
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
  /** Keep drawing a moment after something async lands (a save, a link, the list), so its last state is drawn. */
  private settle = 0;
  private settled(): void {
    this.settle = performance.now() + 250;
  }
  private label(key: string, normal: string): string {
    return this.flashing(key) ? this.flash!.label : normal;
  }

  // ---- layout ----
  private get mobile() {
    return App.Metrics.Device === Device.mobile;
  }
  private get cy() {
    return this.OffsetY + this.pageDy[this.Tab] + App.Height * 0.5;
  }
  private get margin() {
    return App.Width * 0.5 - 210 * App.Unit;
  }
  private get pageW() {
    return 420 * App.Unit;
  }
  /** Phones (portrait, owner 2026-11-16): OPEN, GALLERY and the video are laid out from the tabs down to the bottom of
   * the screen (v1 centred its pages, which left wide gaps above and below on a tall phone), the rows taller and their
   * type larger. `top` is the tabs' rule, `bottom` the screen's foot. */
  private get top() {
    return this.OffsetY + this.pageDy[this.Tab] + 60 * App.Unit;
  }
  private get bottom() {
    return this.OffsetY + this.pageDy[this.Tab] + App.Height;
  }
  /** Each tab's page offset (v1 SettingsPanel's category YOffset): 0 on show, −height away; a new tab's page drops
   * in as the old one lifts out (owner, 2026-11-17, CHG-0035: as Settings' tabs do). */
  private pageDy: number[] = [0, 0, 0];
  private leaving: Tab | null = null;
  /** A list window's height: whole rows and a half (owner, 2026-11-17: the half row says there is more below). */
  private windowH(room: number) {
    const k = Math.max(1, Math.floor(room / this.rowH - 0.5));
    return (k + 0.5) * this.rowH;
  }
  private get rowH() {
    return (this.mobile ? 48 : 40) * App.Unit;
  }
  private get rowFont() {
    return this.mobile ? App.Metrics.TxtItalic3 : App.Metrics.TxtItalic;
  }
  /** A row's first line sits this far above its second (v1: 10 units). */
  /** A row's second baseline under its top, and its divider over that baseline: the text and buttons sit in the middle of
   * the row (a phone's rows are taller: owner, 2026-11-18, they sat a few units high). */
  private get rowBase() {
    return (this.mobile ? 35 : 30) * App.Unit;
  }
  private get rowDivider() {
    return (this.mobile ? 33 : 28) * App.Unit;
  }
  private get rowGap() {
    return (this.mobile ? 13 : 10) * App.Unit;
  }
  /** OPEN FROM YOUR DEVICE: not in a phone's browser (owner: it opens nothing useful there; the list does). */
  private get fileButtonShown() {
    return !(this.mobile && this.web);
  }
  private textW(t: string, font = App.Metrics.TxtMid) {
    this.Ctx.font = font;
    return this.Ctx.measureText(t.toUpperCase()).width;
  }
  /** v1 SettingsPanel.Populate: the tab bar's width, and each tab's centre and width. */
  private tabs() {
    const unit = App.Unit,
      width = App.Width,
      menuWidth = this.mobile ? (width / 7) * 5 : (width / 7) * 4,
      gutter = App.Metrics.Device !== Device.desktop ? 40 : 60;
    let x = width * 0.5 - menuWidth * 0.5;
    const tabs = ALL_TABS.filter((id) => this.hasTab(id)).map((id) => {
      const name = COPY.tabs[id],
        w = this.textW(name, `400 ${unit * 10}px Dosis`) + gutter * unit,
        t = { id, name: name.toUpperCase(), x: x + w * 0.5, w };
      x += w;
      return t;
    });
    return { tabs, half: menuWidth * 0.5 };
  }
  /** VIDEO, ACCOUNT and GALLERY are web only. */
  private hasTab(id: Tab): boolean {
    return id < 2 || (id === 2 && !!this.host.gallery);
  }
  /** v1's bordered button (Search Freesound, Randomise Title): right edge at `right`, text baseline 14 units under `top`. */
  private bordered(label: string, right: number, top: number) {
    const unit = App.Unit,
      w = this.textW(label);
    return {
      label,
      x: right - 10 * unit - w,
      y: top,
      w: w + 10 * unit,
      h: 20 * unit,
      textX: right - 5 * unit - w,
      textY: top + 14 * unit,
    };
  }
  private randomise() {
    const unit = App.Unit;
    return this.bordered(COPY.randomise, App.Width * 0.5 + 210 * unit, this.cy - 120 * unit);
  }
  /** v1 SharePanel SAVE / SAVE AS: two filled half-width buttons. */
  private halves() {
    const unit = App.Unit,
      width = App.Width,
      cy = this.cy;
    return {
      left: {
        x: width * 0.5 - 210 * unit,
        y: cy - 20 * unit,
        w: 202.5 * unit,
        h: 40 * unit,
        cx: width * 0.5 - 108.75 * unit,
      },
      right: {
        x: width * 0.5 + 7.5 * unit,
        y: cy - 20 * unit,
        w: 202.5 * unit,
        h: 40 * unit,
        cx: width * 0.5 + 108.75 * unit,
      },
    };
  }
  /** The web app (links made here), not the plugin (links made in the browser). */
  private get web(): boolean {
    return !!this.host.links && !this.host.links.external;
  }
  /** What SAVE does now. Web: no link yet → make one; changed since it was saved → save over it (v1 SAVE), or, for a
   * link made elsewhere (can't be saved over), make a new one; unchanged → nothing (off). Plugin: always a new link,
   * made in the browser. SAVE AS: a new link, once the patch has changed since the last (no repeated copies). */
  shareState(): { save: 'make' | 'save' | 'new' | null; saveAs: boolean } {
    const links = this.host.links,
      link = this.link;
    if (!links) return { save: null, saveAs: false };
    if (links.external) return { save: 'make', saveAs: false };
    if (!link) return { save: 'make', saveAs: false };
    const galleryChanged =
      this.host.signedIn() &&
      link.owned &&
      this.savedGallery !== null &&
      this.GalleryOn !== this.savedGallery;
    if (!link.stale && !galleryChanged) return { save: null, saveAs: false };
    if (!link.stale) return { save: 'save', saveAs: false };
    return { save: link.owned ? 'save' : 'new', saveAs: true };
  }
  /** v1 SettingsPanel › Connect: three 130×30 buttons. */
  private thirds() {
    const unit = App.Unit,
      width = App.Width,
      y = this.cy + 5 * unit;
    return [-210, -65, 80].map((dx) => ({
      x: width * 0.5 + dx * unit,
      y,
      w: 130 * unit,
      h: 30 * unit,
      cx: width * 0.5 + (dx + 65) * unit,
    }));
  }
  /** OPEN, INSERT and (the user's own patches) a bin at the right: a small copy of v1's trash can. */
  private rowButtons(n: number) {
    const unit = App.Unit,
      y = this.openRowY(n);
    const insert = this.bordered(COPY.insert, this.margin + this.pageW - 30 * unit, y - 19 * unit);
    const open = this.bordered(COPY.open, insert.x - 10 * unit, y - 19 * unit);
    return {
      open,
      insert,
      bin: {
        x: this.margin + this.pageW - 20 * unit,
        y: y - 19 * unit,
        w: 20 * unit,
        h: 20 * unit,
        cx: this.margin + this.pageW - 9 * unit,
        cy: y - 9 * unit,
      },
    };
  }
  /** OPEN FROM YOUR DEVICE: bordered like RANDOMISE TITLE (owner, 2026-11-18), at the right of the row under the list
   * (where GALLERY has its sorts). */
  private fileButton() {
    const unit = App.Unit;
    return this.bordered(COPY.file, this.margin + this.pageW, this.listFoot - 14 * unit);
  }
  // ---- SAVE / SHARE (web): units from the panel centre ----
  /** ADD TO GALLERY and MAKE VIDEO: v1's OptionSwitch in an options-panel row's proportions (60 units: the icons sit 7
   * units clear of the underline; owner review 2), one under the other between the name and SAVE. */
  /** ADD TO GALLERY and MAKE VIDEO side by side, each in half the page (owner review 3, 2026-11-16). */
  private gallerySwitch() {
    const unit = App.Unit;
    return { x: this.margin, y: this.cy - 72 * unit, w: 60 * unit, h: 60 * unit };
  }
  /** SIGN IN (signed out): bordered, right of ADD TO GALLERY, under RANDOMISE TITLE (owner, 2026-11-17, CHG-0035). */
  private signInButton() {
    const unit = App.Unit;
    return this.bordered(COPY.signIn, App.Width * 0.5 + 210 * unit, this.cy - 61 * unit);
  }
  private get signInShown() {
    return this.web && !!this.host.gallery && !!this.host.signInToSave && !this.host.signedIn();
  }
  private videoSwitch() {
    const unit = App.Unit;
    return {
      x: this.host.gallery ? this.margin + this.pageW * 0.5 + 10 * unit : this.margin,
      y: this.cy - 72 * unit,
      w: 60 * unit,
      h: 60 * unit,
    };
  }
  /** Saved and nothing changed (owner, 2026-11-18): no SAVE button, the link takes its place. */
  private get linkOnly(): boolean {
    return this.web && !!this.link && !this.Saving && this.mainAction().kind === null;
  }
  /** The link's line (baseline) and its field's top: in SAVE's place when saved, else under it. */
  private linkLineY() {
    return this.cy + (this.linkOnly ? 33 : 83) * App.Unit;
  }
  private urlTop() {
    return this.linkLineY() + 12 * App.Unit;
  }
  /** COPY LINK: at the right of the link on a desktop; under it on a phone, with SHARE beside it. */
  private copyButton() {
    const unit = App.Unit;
    if (!this.mobile)
      return this.bordered(COPY.copyLink, this.margin + this.pageW, this.urlTop() + 6 * unit);
    return this.bordered(
      COPY.copyLink,
      this.margin + this.textW(COPY.copyLink) + 10 * unit,
      this.urlTop() + 42 * unit,
    );
  }
  private shareButton() {
    const unit = App.Unit,
      c = this.copyButton();
    return this.bordered(
      COPY.shareLink,
      c.x + c.w + 15 * unit + this.textW(COPY.shareLink) + 10 * unit,
      c.y,
    );
  }
  /** The link field's width: up to COPY LINK on a desktop, the page on a phone. */
  private urlWidth() {
    const unit = App.Unit;
    return this.mobile ? this.pageW : this.pageW - this.copyButton().w - 15 * unit;
  }
  /** SAVE (or MAKE VIDEO): Connect's 420×40 GUIDE button. */
  private mainButton() {
    const unit = App.Unit,
      width = App.Width;
    return {
      x: width * 0.5 - 210 * unit,
      y: this.cy + 20 * unit,
      w: 420 * unit,
      h: 40 * unit,
      cx: width * 0.5,
    };
  }
  /** SAVE AS (left) and DOWNLOAD PATCH (right, not on phones): v1's bordered buttons at the bottom. */
  private secondary() {
    const unit = App.Unit,
      top = this.cy + 190 * unit,
      L = this.margin;
    return {
      saveAs: this.bordered(COPY.saveAs, L + this.textW(COPY.saveAs) + 10 * unit, top),
      download: this.mobile ? null : this.bordered(COPY.download, L + this.pageW, top),
    };
  }
  /** The video view: the portrait player (9:16), the button under it and the link under that (owner, 2026-11-16: no
   * name or RANDOMISE here, the name is chosen by now; BACK at the top left; larger on a phone). */
  private playerBox() {
    const unit = App.Unit,
      w = (this.mobile ? 252 : 126) * unit,
      h = (w * 16) / 9;
    return {
      x: App.Width * 0.5 - w / 2,
      y: this.mobile ? this.top + 70 * unit : this.cy - 150 * unit,
      w,
      h,
    };
  }
  private videoMain() {
    const unit = App.Unit,
      width = App.Width,
      pb = this.playerBox();
    return {
      x: width * 0.5 - 210 * unit,
      y: pb.y + pb.h + 20 * unit,
      w: 420 * unit,
      h: 40 * unit,
      cx: width * 0.5,
    };
  }
  /** The link's line (baseline) and its box's top, under the video's button: the link can be shared alone. */
  private videoLink() {
    const unit = App.Unit,
      m = this.videoMain();
    return { line: m.y + m.h + 30 * unit, box: m.y + m.h + 42 * unit };
  }
  private get videoOn(): boolean {
    return !!this.host.video && (this.VideoOn ?? this.shareFiles);
  }
  private get shareFiles(): boolean {
    return !!this.host.video?.canShareFiles();
  }
  /** v1 SharePanel's back chevron and its SKIP-style label, at the top right of the page, under the tabs (owner
   * review 2: the same place on every device). `x` is the chevron's middle (the label is centred under it), `y` its
   * point, in device px. */
  private backArrow() {
    const unit = App.Unit,
      video = this.Tab === 0 && this.View === 'video';
    // The video's BACK at the top left (owner, 2026-11-16), as a browser's.
    return {
      x: video ? this.margin + 10 * unit : App.Width * 0.5 + 195 * unit,
      y: video ? this.playerBox().y + 20 * unit : this.cy - 175 * unit,
    };
  }
  private backHit(pt: { x: number; y: number }) {
    const unit = App.Unit,
      b = this.backArrow();
    return Dimensions.hitRect(b.x - 20 * unit, b.y - 22 * unit, 40 * unit, 64 * unit, pt.x, pt.y);
  }
  private get link() {
    return this.host.links?.current() ?? null;
  }

  Draw(): void {
    if (!this.shown) return;
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      tabY = this.OffsetY;

    // BG //
    App.FillColor(ctx, App.Palette[2]);
    ctx.globalAlpha = 0.95;
    ctx.fillRect(0, this.OffsetY, width, App.Height);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    App.FillColor(ctx, txt);
    App.StrokeColor(ctx, txt);

    // PANEL TITLE (v1 SettingsPanel: desktop only) //
    if (App.Metrics.Device === Device.desktop) {
      ctx.textAlign = 'left';
      ctx.font = App.Metrics.TxtHeader;
      ctx.fillText(COPY.panel.toUpperCase(), 20 * unit, tabY + 41 * unit);
    }

    // TABS (v1 SettingsPanel categories + MenuCategory.Draw) //
    const { tabs, half } = this.tabs(),
      h = Math.round(60 * unit);
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - half, tabY + 60 * unit - 1);
    ctx.lineTo(width * 0.5 + half, tabY + 60 * unit - 1);
    for (let i = 1; i < tabs.length; i++) {
      const x = Math.round(tabs[i].x - tabs[i].w * 0.5);
      ctx.moveTo(x, tabY + 16 * unit);
      ctx.lineTo(x, tabY + 44 * unit);
    }
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = App.Metrics.TxtMid;
    tabs.forEach((tab, i) => {
      const s = this.selected[tab.id],
        hw = tab.w * 0.5,
        x = tab.x;
      App.FillColor(
        ctx,
        App.Palette[App.ThemeManager.MenuOrder[i % App.ThemeManager.MenuOrder.length]],
      );
      ctx.beginPath();
      ctx.moveTo(x - hw, tabY);
      ctx.lineTo(x + hw, tabY);
      ctx.lineTo(x + hw, tabY + h * s);
      ctx.lineTo(x + 10 * unit, tabY + h * s);
      ctx.lineTo(x, tabY + (h + 10 * unit) * s);
      ctx.lineTo(x - 10 * unit, tabY + h * s);
      ctx.lineTo(x - hw, tabY + h * s);
      ctx.closePath();
      ctx.fill();
      App.FillColor(ctx, txt);
      ctx.fillText(tab.name, x, tabY + h * 0.5 + 10 * unit * 0.38);
    });

    // CLOSE (v1 SettingsPanel) //
    App.StrokeColor(ctx, txt);
    const closeY = tabY + 30 * unit;
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + half + 12.5 * unit, closeY - 7.5 * unit);
    ctx.lineTo(width * 0.5 + half + 27.5 * unit, closeY + 7.5 * unit);
    ctx.moveTo(width * 0.5 + half + 27.5 * unit, closeY - 7.5 * unit);
    ctx.lineTo(width * 0.5 + half + 12.5 * unit, closeY + 7.5 * unit);
    ctx.stroke();

    // THE PAGES, sliding under the tabs (v1 SettingsPanel's clipping box: from the tabs' rule down) //
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, tabY + 60 * unit, width, App.Height);
    ctx.clip();
    try {
      const away = -App.Height + 1,
        leaving = this.leaving;
      if (leaving !== null && leaving !== this.Tab && this.pageDy[leaving] > away) {
        const keep = { Tab: this.Tab, View: this.View, GalleryView: this.GalleryView };
        this.Tab = leaving;
        this.View = 'list';
        this.GalleryView = 'list';
        try {
          this.drawPage();
        } finally {
          Object.assign(this, keep);
        }
      }
      if (this.pageDy[this.Tab] > away) this.drawPage();
    } finally {
      ctx.restore();
    }
  }
  private drawPage(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt];
    if (this.Opening) {
      App.AnimationsLayer.DrawSprite(ctx, 'loading', width * 0.5, this.cy, 16, true);
      return;
    }
    if (this.OpenError) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(this.OpenError, this.margin, this.cy + 205 * unit, 14 * unit, this.pageW);
    }
    // OPEN over unsaved changes asks first, from the OPEN tab or the gallery (bug, owner review 3: the gallery's
    // question was never drawn nor answered, so OPEN did nothing after an INSERT).
    if (this.View === 'confirm') this.drawConfirm();
    else if (this.Tab === 0) this.drawSave();
    else if (this.Tab === 2) this.drawGallery();
    else if (this.View === 'list') this.drawList();
    else if (this.View === 'file') this.drawFile();
    else if (this.View === 'remove') this.drawRemove();
    else this.drawConfirm();
  }

  /** A filled button with v1's hover notch under its centre (SharePanel / SettingsPanel). */
  private filled(
    b: { x: number; y: number; w: number; h: number; cx: number },
    colour: string,
    label: string,
    hover: boolean,
    font = App.Metrics.TxtUrl2,
    textDy = 29,
    text = App.Palette[App.ThemeManager.Txt],
  ) {
    const ctx = this.Ctx,
      unit = App.Unit;
    App.FillColor(ctx, colour);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (hover) {
      ctx.beginPath();
      ctx.moveTo(b.cx, b.y + b.h + 9 * unit);
      ctx.lineTo(b.cx - 10 * unit, b.y + b.h - unit);
      ctx.lineTo(b.cx + 10 * unit, b.y + b.h - unit);
      ctx.closePath();
      ctx.fill();
    }
    App.FillColor(ctx, text);
    ctx.textAlign = 'center';
    ctx.font = font;
    // v1's 24-unit type, narrowed to fit a half button when a label is longer than v1's ("OVERWRITE", "CREATE NEW").
    const w = ctx.measureText(label.toUpperCase()).width,
      max = b.w - 12 * unit;
    if (w > max) {
      ctx.save();
      ctx.translate(b.cx, 0);
      ctx.scale(max / w, 1);
      ctx.fillText(label.toUpperCase(), 0, b.y + textDy * unit);
      ctx.restore();
    } else ctx.fillText(label.toUpperCase(), b.cx, b.y + textDy * unit);
  }
  private drawBordered(
    b: { label: string; x: number; y: number; w: number; h: number; textX: number; textY: number },
    stroke: string,
    dx = 0,
  ) {
    const ctx = this.Ctx;
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'left';
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.fillText(b.label.toUpperCase(), b.textX + dx, b.textY);
    App.StrokeColor(ctx, stroke);
    ctx.beginPath();
    ctx.rect(b.x + dx, b.y, b.w, b.h);
    ctx.stroke();
  }

  private drawSave(): void {
    if (this.View === 'video') {
      this.drawVideo();
      return;
    }
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      cy = this.cy,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    // NAME (v1 SharePanel TITLE) //
    ctx.font = App.Metrics.TxtMid;
    if (this.mobile) {
      ctx.textAlign = 'left';
      ctx.fillText(COPY.name.toUpperCase(), width * 0.5 - 210 * unit, cy - 150 * unit);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(COPY.name.toUpperCase(), width * 0.5 - 225 * unit, cy - 106 * unit);
    }
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - 210 * unit, cy - 90 * unit);
    ctx.lineTo(width * 0.5 + 210 * unit, cy - 90 * unit);
    ctx.stroke();
    this.drawBordered(this.randomise(), txt);
    const off = this.Saving || !this.host.hasBlocks(),
      links = this.host.links,
      link = this.link;
    if (!this.web) {
      this.drawPluginSave(off);
      return;
    }

    // ADD TO GALLERY · MAKE VIDEO (v1 OptionSwitch "offOn") //
    const signedIn = this.host.signedIn();
    if (this.host.gallery)
      this.drawSwitch(
        this.gallerySwitch(),
        COPY.addToGallery,
        signedIn && this.GalleryOn,
        signedIn,
        signedIn ? '' : COPY.signInToPublish,
      );
    if (this.host.video)
      this.drawSwitch(this.videoSwitch(), COPY.makeVideo, this.videoOn, true, '');
    if (this.signInShown)
      this.drawBordered(this.signInButton(), this.roll.signIn ? txt : App.Palette[1]);

    // SAVE (SAVE CHANGES once there is a link), or MAKE VIDEO when there is nothing to save (the GUIDE button,
    // SharePanel's SAVE colour). Saved with nothing changed, there is no button: the link takes its place (owner,
    // 2026-11-18). While saving the button says so: no spinner or line under it.
    const main = this.mainAction(),
      m = this.mainButton();
    if (!this.linkOnly) {
      const label = this.Saving
        ? COPY.savingButton
        : main.kind === 'save' && link && this.shareState().save === 'save'
          ? COPY.saveChanges
          : main.label;
      this.filled(m, App.Palette[main.off ? 1 : menu[3]], label, !!this.roll.share && !main.off);
    }

    // THE LINK: its line, the link small on a rule (a DOM field: a click copies it), COPY LINK (and SHARE on a phone) //
    App.FillColor(ctx, txt);
    let warnY = cy + 85 * unit;
    if (link && !this.Saving) {
      ctx.save();
      if (!this.linkOnly) ctx.globalAlpha = 0.6; // changed since: the link is the last save's
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(
        this.linkOnly ? COPY.savedLine : COPY.linkLine,
        this.margin,
        this.linkLineY(),
        14 * unit,
        this.pageW,
      );
      App.StrokeColor(ctx, App.Palette[1]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.margin, this.urlTop() + 32 * unit);
      ctx.lineTo(this.margin + this.urlWidth(), this.urlTop() + 32 * unit);
      ctx.stroke();
      const c = this.copyButton();
      this.drawBordered(c, this.roll.copyLink ? txt : this.linkOnly ? txt : App.Palette[1]);
      if (this.canShare) this.drawBordered(this.shareButton(), txt);
      ctx.restore();
      warnY = this.urlTop() + (this.mobile ? 85 : 60) * unit;
    }
    // WARNINGS (v1 SharePanel) //
    if (!this.Saving) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      const warn = !this.host.hasBlocks()
        ? App.L10n.UI.SharePanel.NoBlocks
        : this.GalleryNote || links?.warning();
      if (warn) this.wordWrap(warn, width * 0.5 - 210 * unit, warnY, 14 * unit, 420 * unit);
    }
    // SAVE AS · DOWNLOAD PATCH (v1's bordered buttons, quieter: owner review 2) //
    const sec = this.secondary(),
      st = this.shareState();
    const quiet = (b: ReturnType<PatchesPanel['bordered']>, live: boolean, key: string) => {
      ctx.save();
      if (!live) ctx.globalAlpha = 0.4;
      this.drawBordered(
        { ...b, label: this.label(key, b.label) },
        live && this.roll[key] ? txt : App.Palette[1],
      );
      ctx.restore();
    };
    quiet(sec.saveAs, !off && st.saveAs, 'saveAs');
    if (sec.download) quiet(sec.download, !off, 'save');
  }
  /** What the main button does: SAVE (see shareState); with nothing to save and MAKE VIDEO on, MAKE VIDEO. */
  private mainAction(): { kind: 'save' | 'video' | null; label: string; off: boolean } {
    const st = this.shareState(),
      blocks = this.host.hasBlocks() && !this.Saving;
    if (st.save) return { kind: 'save', label: COPY.saveLink, off: !blocks };
    if (this.videoOn) return { kind: 'video', label: COPY.makeVideo, off: !blocks };
    return { kind: null, label: COPY.saveLink, off: true };
  }
  /** Plugin: SAVE TO COMPUTER · CREATE SHARE LINK (v1 SAVE / SAVE AS), each with its line. */
  private drawPluginSave(off: boolean): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      cy = this.cy,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    const { left, right } = this.halves(),
      save = left,
      share = right;
    ctx.font = App.Metrics.TxtItalic2;
    ctx.textAlign = 'left';
    App.FillColor(ctx, txt);
    this.wordWrap(COPY.saveLinePlugin, save.x, cy - 59 * unit, 14 * unit, save.w);
    this.wordWrap(COPY.shareLinePlugin, share.x, cy - 59 * unit, 14 * unit, share.w);
    this.filled(
      save,
      App.Palette[off ? 1 : menu[3]],
      this.label('save', COPY.save),
      !!this.roll.save && !off,
    );
    const shareOff = !this.host.links || off;
    this.filled(
      share,
      App.Palette[shareOff ? 1 : menu[1]],
      this.label('share', COPY.share),
      !!this.roll.share && !shareOff,
    );
    if (!this.host.hasBlocks()) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      this.wordWrap(App.L10n.UI.SharePanel.NoBlocks, save.x, cy + 75 * unit, 14 * unit, this.pageW);
    } else {
      const warn = this.host.links?.warning();
      if (warn) {
        App.FillColor(ctx, txt);
        ctx.font = App.Metrics.TxtItalic2;
        this.wordWrap(warn, save.x, cy + 75 * unit, 14 * unit, this.pageW);
      }
    }
  }
  /** v1 OptionSwitch.Draw, style 1, mode "offOn": the chosen side underlined in the options colour; its name after it,
   * and (dimmed) a line saying why it can't be used. */
  private drawSwitch(
    b: { x: number; y: number; w: number; h: number },
    name: string,
    on: boolean,
    enabled: boolean,
    note: string,
  ): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      txt = App.Palette[App.ThemeManager.Txt],
      { x, y, w, h } = b;
    ctx.save();
    if (!enabled) ctx.globalAlpha = 0.5;
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(x + w * 0.5), y + h * 0.15);
    ctx.lineTo(Math.round(x + w * 0.5), y + h * 0.55);
    ctx.stroke();
    App.FillColor(ctx, App.Palette[App.ThemeManager.OptionsOrder[2]]);
    ctx.fillRect(on ? x + w * 0.5 : x, y + h * 0.55, w * 0.5, h * 0.05);
    App.StrokeColor(ctx, txt);
    const cy = y + h * 0.35,
      lx = x + w * 0.25,
      rx = x + w * 0.75;
    ctx.beginPath();
    ctx.moveTo(lx - 5 * unit, cy);
    ctx.lineTo(lx + 5 * unit, cy);
    ctx.moveTo(rx + 5 * unit, cy);
    ctx.lineTo(rx, cy - 5 * unit);
    ctx.lineTo(rx - 5 * unit, cy);
    ctx.lineTo(rx, cy + 5 * unit);
    ctx.lineTo(rx + 5 * unit, cy);
    ctx.stroke();
    ctx.restore();
    App.FillColor(ctx, txt);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtMid;
    ctx.fillText(name.toUpperCase(), x + w + 12 * unit, cy + (note ? -2 : 4) * unit);
    // The note wraps inside this switch's half of the page.
    if (note) {
      ctx.font = App.Metrics.TxtItalic2;
      this.wordWrap(
        note,
        x + w + 12 * unit,
        cy + 12 * unit,
        12 * unit,
        this.pageW * 0.5 - 10 * unit - w - 12 * unit,
      );
    }
  }

  /** OPEN and GALLERY's rule (OPEN's top line, GALLERY's search rule): as high as it goes, 50 units under the tabs
   * (SEARCH above it stays clear of the tab's notch), at most 175 units over the centre (owner, 2026-11-18: the lists
   * started too low). */
  private get listRule() {
    const unit = App.Unit;
    return this.mobile
      ? this.top + 60 * unit
      : Math.max(this.cy - 175 * unit, this.top + 50 * unit);
  }
  /** The bottom row (GALLERY's sorts; OPEN's OPEN FROM YOUR DEVICE): its baseline. */
  private get listFoot() {
    const unit = App.Unit;
    return this.mobile ? this.bottom - 30 * unit : this.cy + 185 * unit;
  }
  /** OPEN: a rule, then the list in a window, scrolled, the same size as the gallery's (owner, 2026-11-18). */
  private openLayout() {
    const unit = App.Unit,
      rule = this.listRule,
      top = rule - 2 * unit;
    // The rows start right under the rule (a row's top is 2 units above its divider) and go under it as they scroll;
    // the window shows whole rows and a half.
    return { rule, top, bottom: top + this.windowH(this.listFoot - 35 * unit - top) };
  }
  /** Row n's second line's baseline, scrolled. */
  private openRowY(n: number) {
    return this.openLayout().top + this.rowBase + n * this.rowH - this.OpenScroll;
  }
  /** The last row ends 10 units above the window's foot (owner, 2026-11-17: it was cut off). */
  private openMaxScroll() {
    const L = this.openLayout(),
      lengthValue = this.Items.length;
    return Math.max(0, lengthValue * this.rowH + 10 * App.Unit - (L.bottom - L.top));
  }
  scrollOpen(dy: number): void {
    this.OpenScroll = Math.max(0, Math.min(this.openMaxScroll(), this.OpenScroll + dy));
    this.settled();
  }
  private drawList(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      margin = this.margin,
      pageW = this.pageW,
      W = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      L = this.openLayout();
    // RULE (no hint: owner, 2026-11-18) //
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(margin, L.rule);
    ctx.lineTo(margin + pageW, L.rule);
    ctx.stroke();

    // ROWS (v1 SoundcloudPanel track loop), clipped to the window and scrolled //
    const n0 = this.Items.length;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin - 5 * unit, L.rule + unit, pageW + 15 * unit, L.bottom - L.rule - unit);
    ctx.clip();
    for (let n = 0; n < n0; n++) {
      const y = this.openRowY(n);
      if (y + 20 * unit < L.top || y - 40 * unit > L.bottom) continue;
      if (n < n0 - 1) {
        App.StrokeColor(ctx, App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(margin, y + this.rowH - this.rowDivider);
        ctx.lineTo(margin + pageW, y + this.rowH - this.rowDivider);
        ctx.stroke();
      }
      const item = this.Items[n],
        b = this.rowButtons(n);
      App.FillColor(ctx, txt);
      ctx.font = this.rowFont;
      ctx.textAlign = 'left';
      // A long name is narrowed to the room left of OPEN, not run under it.
      const room = b.open.x - 8 * unit - (margin + unit),
        fit = (t: string, yy: number) => {
          const w = ctx.measureText(t).width;
          if (w <= room) {
            ctx.fillText(t, margin + unit, yy);
            return;
          }
          ctx.save();
          ctx.translate(margin + unit, yy);
          ctx.scale(room / w, 1);
          ctx.fillText(t, 0, 0);
          ctx.restore();
        };
      fit(item.name.toUpperCase(), y - this.rowGap);
      fit(item.detail, y);
      // OPEN (text-colour border) and INSERT (the lighter rule colour): both explicit, Open the stronger.
      // No hover mark: v1's bordered buttons (Randomise Title, Search) have none.
      this.drawBordered(b.open, txt);
      this.drawBordered(b.insert, App.Palette[1]);
      if (item.removable)
        drawBin(ctx, b.bin.cx, b.bin.cy, this.roll[`bin${n}`] ? 0.55 * 1.2 : 0.55);
    }
    ctx.restore();

    // EMPTY / LOADING //
    App.FillColor(ctx, txt);
    if (!n0 && this.Loading)
      App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, (L.top + L.bottom) / 2, 16, true);
    else if (!n0) {
      ctx.font = App.Metrics.TxtHeader;
      ctx.textAlign = 'center';
      ctx.fillText(COPY.empty.toUpperCase(), W * 0.5, (L.top + L.bottom) / 2 + 10 * unit);
    }

    // OPEN FROM YOUR DEVICE: bordered, as RANDOMISE TITLE (owner, 2026-11-18) //
    if (this.fileButtonShown) this.drawBordered(this.fileButton(), txt);
  }

  /** The heading of the file and confirm steps: v1's header type over italic copy (SharePanel title + share line). */
  private heading(title: string, line: string): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      cy = this.cy;
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.textAlign = 'left';
    ctx.font = App.Metrics.TxtHeader;
    // A long patch name is narrowed to the page width rather than run off it.
    const w = ctx.measureText(title.toUpperCase()).width;
    if (w > this.pageW) {
      ctx.save();
      ctx.translate(this.margin, 0);
      ctx.scale(this.pageW / w, 1);
      ctx.fillText(title.toUpperCase(), 0, cy - 72 * unit);
      ctx.restore();
    } else ctx.fillText(title.toUpperCase(), this.margin, cy - 72 * unit);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath();
    ctx.moveTo(this.margin, cy - 60 * unit);
    ctx.lineTo(this.margin + this.pageW, cy - 60 * unit);
    ctx.stroke();
    ctx.font = App.Metrics.TxtItalic2;
    this.wordWrap(line, this.margin, cy - 40 * unit, 14 * unit, this.pageW);
  }
  private drawBack(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      { x, y } = this.backArrow();
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath();
    ctx.moveTo(x + 10 * unit, y - 20 * unit);
    ctx.lineTo(x - 10 * unit, y);
    ctx.lineTo(x + 10 * unit, y + 20 * unit);
    ctx.stroke();
    ctx.font = App.Metrics.TxtMid;
    ctx.textAlign = 'center';
    ctx.fillText(COPY.back.toUpperCase(), x, y + 35 * unit);
  }
  private drawFile(): void {
    const picked = this.Picked,
      unit = App.Unit,
      menu = App.ThemeManager.MenuOrder;
    if (!picked) return;
    this.heading(
      picked.error ? 'Not a BlokDust patch' : picked.title,
      picked.error ?? picked.fileName,
    );
    if (!picked.error) {
      const { left, right } = this.halves(),
        ctx = this.Ctx;
      for (const b of [left, right]) b.y = this.cy + 5 * unit;
      this.filled(left, App.Palette[menu[3]], COPY.open, !!this.roll.fileOpen);
      this.filled(right, App.Palette[menu[1]], COPY.insert, !!this.roll.fileInsert);
      App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'center';
      ctx.fillText(COPY.openDesc, left.cx, this.cy + 70 * unit);
      ctx.fillText(COPY.insertDesc, right.cx, this.cy + 70 * unit);
    }
    this.drawBack();
  }
  /** Delete one of the user's patches: v1's CANCEL-coloured and SAVE-coloured half buttons. */
  private drawRemove(): void {
    const item = this.removing,
      menu = App.ThemeManager.MenuOrder,
      unit = App.Unit,
      { left, right } = this.halves();
    if (!item) return;
    this.heading(`${COPY.remove} ${item.name}?`, this.host.removeLine(item));
    for (const b of [left, right]) b.y = this.cy + 5 * unit;
    this.filled(left, App.Palette[1], COPY.cancel, !!this.roll.removeCancel);
    this.filled(right, App.Palette[menu[3]], COPY.removeButton, !!this.roll.removeOk);
  }
  private drawConfirm(): void {
    const menu = App.ThemeManager.MenuOrder,
      [a, b, c] = this.thirds();
    this.heading(COPY.confirm, COPY.confirmLine);
    const font = App.Metrics.TxtMid;
    this.filled(a, App.Palette[1], COPY.cancel, !!this.roll.cancel, font, 18.5);
    this.filled(
      b,
      App.Palette[menu[1]],
      this.Saving ? COPY.saving : COPY.saveFirst,
      !!this.roll.saveFirst && !this.Saving,
      font,
      18.5,
    );
    this.filled(c, App.Palette[menu[3]], COPY.openAnyway, !!this.roll.openAnyway, font, 18.5);
  }

  /** The video: SharePanel's spinner while it renders (CANCEL under it), then the portrait player with SHARE VIDEO
   * (DOWNLOAD VIDEO on desktop) under it; BACK at the top right. */
  private drawVideo(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      width = App.Width,
      txt = App.Palette[App.ThemeManager.Txt],
      menu = App.ThemeManager.MenuOrder;
    this.drawBack();
    const m = this.videoMain(),
      pb = this.playerBox(),
      mid = pb.y + pb.h / 2;
    // The player's frame, in every state (the DOM video sits inside it once made; its edge in the rule colour, as the
    // URL box), so the page keeps its shape while the video is made.
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.lineWidth = 2;
    ctx.strokeRect(pb.x - 1, pb.y - 1, pb.w + 2, pb.h + 2);
    App.FillColor(ctx, txt);
    if (this.VideoState === 'making') {
      ctx.font = App.Metrics.TxtMid;
      ctx.textAlign = 'center';
      ctx.fillText(
        `${COPY.rendering}... ${Math.floor(this.VideoProgress.done * 100)}%`.toUpperCase(),
        width * 0.5,
        mid + 25 * unit,
      );
      App.AnimationsLayer.DrawSprite(ctx, 'loading', width * 0.5, mid, 16, true);
      this.filled(m, App.Palette[1], COPY.cancelVideo, !!this.roll.make);
    } else if (this.VideoState === 'ready') {
      this.filled(
        m,
        App.Palette[menu[3]],
        this.shareFiles ? COPY.shareVideo : COPY.downloadVideo,
        !!this.roll.shareVideo,
      );
    } else {
      const line =
        this.VideoState === 'error'
          ? this.VideoMessage
          : !this.host.hasBlocks()
            ? App.L10n.UI.SharePanel.NoBlocks
            : '';
      if (line) {
        ctx.font = App.Metrics.TxtItalic2;
        ctx.textAlign = 'left';
        this.wordWrap(line, pb.x + 10 * unit, mid, 14 * unit, pb.w - 20 * unit);
      }
      this.filled(
        m,
        App.Palette[this.host.hasBlocks() ? menu[3] : 1],
        this.VideoState === 'error' ? COPY.tryAgain : COPY.makeVideo,
        !!this.roll.make && this.host.hasBlocks(),
      );
    }
    // THE LINK, to share on its own (v1 SharePanel's line + URL box; the field over it copies on a click) //
    if (this.link && this.web) {
      const L = this.videoLink();
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(this.label('url', COPY.linkLine), this.margin, L.line, 14 * unit, this.pageW);
      App.FillColor(ctx, App.Palette[1]);
      ctx.fillRect(this.margin, L.box, this.pageW, 40 * unit);
    }
  }

  /** Make the video (portrait, videoSeconds long) and show it; on desktop it also downloads once made. */
  private async makeVideo(): Promise<void> {
    const v = this.host.video;
    if (!v || this.VideoState === 'making' || !this.host.hasBlocks()) return;
    this.View = 'video';
    this.dropPlayer();
    const abort = (this.videoAbort = new AbortController());
    this.VideoState = 'making';
    this.VideoProgress = { phase: 'preparing', done: 0 };
    this.videoFile = null;
    this.VideoMessage = '';
    this.showDom();
    // Only the current render may change the panel: a cancelled one winds down on its own (CANCEL takes effect at once).
    const current = () => this.videoAbort === abort;
    try {
      const file = await v.make(
        { shape: 'portrait', seconds: v.seconds() },
        (videoProgressInfo) => {
          if (current()) this.VideoProgress = videoProgressInfo;
        },
        abort.signal,
      );
      if (!current()) return;
      this.videoFile = file;
      this.VideoState = 'ready';
      this.showPlayer(file);
      // Where the share sheet can't take files (desktop browsers), it downloads at once (owner, 2026-11-15).
      if (!this.shareFiles) await v.share(file).catch(() => {});
    } catch (error) {
      if (current()) {
        this.VideoState = 'error';
        this.VideoMessage = (error as Error).message || 'The video could not be made.';
      }
    } finally {
      if (current()) this.videoAbort = null;
      this.settled();
      this.showDom();
    }
  }
  /** CANCEL: the panel is free at once; the render stops at its next check. */
  private cancelVideo(): void {
    this.videoAbort?.abort();
    this.videoAbort = null;
    this.VideoState = 'idle';
    this.VideoMessage = '';
  }
  private showPlayer(file: File): void {
    const el = this.player;
    if (!el) return;
    if (this.playerUrl) URL.revokeObjectURL(this.playerUrl);
    this.playerUrl = URL.createObjectURL(file);
    el.src = this.playerUrl;
    void el.play().catch(() => {});
  }
  private dropPlayer(): void {
    const el = this.player;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    if (this.playerUrl) {
      URL.revokeObjectURL(this.playerUrl);
      this.playerUrl = '';
    }
  }

  // ---- GALLERY tab (CHG-0024) ----
  // v1 SoundcloudPanel's layout: SEARCH bordered above the rule at its right (the field is a DOM input over the rule),
  // five rows a page with their count bottom left, POPULAR / NEW bottom right where v1 had RANDOMISE, page arrows;
  // each row's bordered buttons (OPEN · LIKE · REPORT, or UNPUBLISH on your own).
  /** SEARCH and its rule at the top, POPULAR · NEW · … at the bottom; on a phone, right under the tabs and at the foot of
   * the screen, the list between them (owner, 2026-11-16). */
  private galleryLayout() {
    const unit = App.Unit,
      right = App.Width * 0.5 + 210 * unit,
      rule = this.listRule;
    return {
      search: this.bordered(COPY.search, right, rule - 30 * unit),
      rule,
      sortY: this.listFoot,
      sortRight: right,
    };
  }
  /** The list's window: under the search rule, above POPULAR / NEW. */
  /** The list's window: from the search rule (rows go under it as they scroll; a row's top is 2 units above its
   * divider) to 45 units above the sorts, holding whole rows and a half (owner, 2026-11-17, CHG-0035). */
  private galleryWindow() {
    const unit = App.Unit,
      L = this.galleryLayout(),
      top = L.rule - 2 * unit;
    return { top, bottom: top + this.windowH(L.sortY - 35 * unit - top), clip: L.rule + unit };
  }
  /** Row n's second line's baseline (v1 SoundcloudPanel's row: name 10 units above it), scrolled. */
  private galleryRowY(n: number) {
    return this.galleryWindow().top + this.rowBase + n * this.rowH - this.GalleryScroll;
  }
  /** Every row, the SHOW MORE row when there are more, and 10 units under the last (owner, 2026-11-17: it was cut off). */
  private galleryMaxScroll() {
    const unit = App.Unit,
      w = this.galleryWindow();
    return Math.max(
      0,
      this.GalleryItems.length * this.rowH +
        (this.GalleryMore || this.GalleryLoading ? this.rowH : 0) +
        10 * unit -
        (w.bottom - w.top),
    );
  }
  /** SHOW MORE, centred in the row after the last (more to fetch; a spinner while they come). */
  private showMoreButton() {
    const unit = App.Unit,
      y = this.galleryRowY(this.GalleryItems.length),
      w = this.textW(COPY.showMore);
    return this.bordered(COPY.showMore, App.Width * 0.5 + (w + 10 * unit) / 2, y - 19 * unit);
  }
  /** OPEN and INSERT, as OPEN's rows (owner review 3: insert from the gallery too). */
  private galleryRow(n: number) {
    const unit = App.Unit,
      y = this.galleryRowY(n),
      insert = this.bordered(COPY.insert, this.margin + this.pageW, y - 19 * unit);
    const open = this.bordered(COPY.open, insert.x - 10 * unit, y - 19 * unit);
    return { open, insert, textRight: open.x - 6 * unit };
  }
  /** POPULAR · NEW · EXAMPLES · TUTORIALS along the bottom (where v1 SoundcloudPanel had its count and RANDOMISE),
   * spread across the page; the chosen one underlined. */
  sortButtons() {
    const L = this.galleryLayout(),
      ctx = this.Ctx;
    ctx.font = App.Metrics.TxtMid;
    const names = GALLERY_SORTS.map((gallerySort) => COPY.sorts[gallerySort].toUpperCase()),
      ws = names.map((nameValue) => ctx.measureText(nameValue).width);
    const gap = (this.pageW - ws.reduce((a, b) => a + b, 0)) / (names.length - 1);
    let x = this.margin;
    return GALLERY_SORTS.map((sort, i) => {
      const b = { sort, label: names[i], x, y: L.sortY, w: ws[i] };
      x += ws[i] + gap;
      return b;
    });
  }
  /** Scroll the list by `dy` device px; near its end, the next page loads. */
  scrollGallery(dy: number): void {
    this.GalleryScroll = Math.max(0, Math.min(this.galleryMaxScroll(), this.GalleryScroll + dy));
    if (
      this.GalleryMore &&
      !this.GalleryLoading &&
      this.GalleryScroll > this.galleryMaxScroll() - 120 * App.Unit
    )
      void this.browse(true);
    this.settled();
  }
  /** A mouse wheel over the open panel (scene.wheel). */
  Wheel(event: WheelEvent): void {
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (this.Tab === 2 && this.GalleryView === 'list') this.scrollGallery(dy);
    else if (this.Tab === 1 && this.View === 'list') this.scrollOpen(dy);
  }
  private drawGallery(): void {
    const ctx = this.Ctx,
      unit = App.Unit,
      W = App.Width,
      cy = this.cy,
      margin = this.margin,
      txt = App.Palette[App.ThemeManager.Txt];
    const L = this.galleryLayout(),
      win = this.galleryWindow();
    // SEARCH (v1 SoundcloudPanel: the rule under the field, SEARCH bordered above it at the right) //
    App.StrokeColor(ctx, txt);
    ctx.beginPath();
    ctx.moveTo(margin, L.rule);
    ctx.lineTo(margin + this.pageW, L.rule);
    ctx.stroke();
    this.drawBordered(L.search, txt);
    // POPULAR · NEW · EXAMPLES · TUTORIALS (the chosen one underlined; the others underline on hover) //
    App.FillColor(ctx, txt);
    App.StrokeColor(ctx, txt);
    ctx.textAlign = 'left';
    for (const b of this.sortButtons()) {
      ctx.font = App.Metrics.TxtMid;
      ctx.fillText(b.label, b.x, b.y);
      const on = b.sort === this.GallerySort;
      if (!on && !this.roll[`sort_${b.sort}`]) continue;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 4 * unit);
      ctx.lineTo(b.x + b.w, b.y + 4 * unit);
      ctx.lineWidth = on ? 2 : 1;
      ctx.stroke();
      ctx.lineWidth = 2;
    }
    // ROWS: one list, clipped to its window and scrolled //
    const n0 = this.GalleryItems.length;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin - 5 * unit, win.clip, this.pageW + 15 * unit, win.bottom - win.clip);
    ctx.clip();
    for (let n = 0; n < n0; n++) {
      const y = this.galleryRowY(n),
        it = this.GalleryItems[n],
        b = this.galleryRow(n);
      if (y + 20 * unit < win.top || y - 40 * unit > win.bottom) continue;
      if (n < n0 - 1 || this.GalleryMore) {
        App.StrokeColor(ctx, App.Palette[1]);
        ctx.beginPath();
        ctx.moveTo(margin, y + this.rowH - this.rowDivider);
        ctx.lineTo(margin + this.pageW, y + this.rowH - this.rowDivider);
        ctx.stroke();
      }
      App.FillColor(ctx, txt);
      ctx.font = this.rowFont;
      ctx.textAlign = 'left';
      const left = margin + unit + 30 * unit,
        maxW = b.textRight - left;
      const fit = (t: string, yy: number, x = left) => {
        const w = ctx.measureText(t).width;
        if (w <= maxW - (x - left)) {
          ctx.fillText(t, x, yy);
          return;
        }
        ctx.save();
        ctx.translate(x, yy);
        ctx.scale((maxW - (x - left)) / w, 1);
        ctx.fillText(t, 0, 0);
        ctx.restore();
      };
      const on = App.Palette[App.ThemeManager.OptionsOrder[2]];
      fit(it.title.toUpperCase(), y - this.rowGap);
      const remixes = it.remixes
          ? ` \u00b7 ${plural(it.remixes, 'remix').replace('remixs', 'remixes')}`
          : '',
        views = plural(it.views, 'view');
      // Reddit's column (owner's pick, B): the like chevron over the count, left of the row; pressing it likes.
      drawUpArrow(ctx, margin + 12 * unit, y - 15 * unit, 10 * unit, it.liked, txt, on);
      ctx.textAlign = 'center';
      ctx.fillText(String(it.likes), margin + 12 * unit, y);
      ctx.textAlign = 'left';
      fit(`${COPY.by} @${it.by} \u00b7 ${views}${remixes}`, y);
      this.drawBordered(b.open, txt);
      this.drawBordered(b.insert, App.Palette[1]);
    }
    // More on the way: v1's spinner where the next row will be; more to fetch: SHOW MORE there (the list also fetches
    // them by itself near its end).
    if (n0 && this.GalleryLoading)
      App.AnimationsLayer.DrawSprite(
        ctx,
        'loading',
        W * 0.5,
        this.galleryRowY(n0) - 9 * unit,
        16,
        true,
      );
    else if (n0 && this.GalleryMore)
      this.drawBordered(this.showMoreButton(), this.roll.showMore ? txt : App.Palette[1]);
    ctx.restore();
    App.FillColor(ctx, txt);
    if (!n0 && this.GalleryLoading)
      App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy, 16, true);
    else if (!n0) {
      ctx.font = App.Metrics.TxtHeader;
      ctx.textAlign = 'center';
      ctx.fillText(COPY.noneYet.toUpperCase(), W * 0.5, cy + 10 * unit);
    }
    if (this.GalleryMessage) {
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2;
      ctx.textAlign = 'left';
      this.wordWrap(
        this.GalleryMessage,
        margin,
        this.mobile ? win.top + 30 * unit : cy + 185 * unit,
        14 * unit,
        this.pageW,
      );
    }
  }
  /** Fetch the list from the top, or (`more`) the next page onto its end. Stale answers (an earlier search) are dropped. */
  async browse(more = false): Promise<void> {
    const g = this.host.gallery;
    if (!g) return;
    if (more && (!this.GalleryMore || this.GalleryLoading)) return;
    const ask = ++this.galleryAsk,
      page = more ? this.GalleryPage + 1 : 1;
    if (!more) {
      this.GalleryItems = [];
      this.GalleryScroll = 0;
      this.GalleryMore = false;
    }
    this.GalleryLoading = true;
    this.showDom();
    try {
      const r = await g.browse(this.GallerySort, this.GalleryQuery, page);
      if (ask !== this.galleryAsk) return;
      // A patch can move up between pages (POPULAR changes as people like): keep each once.
      const have = new Set(this.GalleryItems.map((i) => i.id));
      this.GalleryItems = [
        ...this.GalleryItems,
        ...(r?.items ?? []).filter((i) => !have.has(i.id)),
      ];
      this.GalleryMore = !!r?.more;
      this.GalleryPage = page;
      if (!r) this.GalleryMessage = 'The gallery is not available here.';
    } catch (error) {
      if (ask === this.galleryAsk) this.GalleryMessage = (error as Error).message;
    } finally {
      if (ask === this.galleryAsk) {
        this.GalleryLoading = false;
        this.settled();
      }
    }
  }
  /** v1 SharePanel.WordWrap. */
  private wordWrap(text: string, x: number, y: number, lineHeight: number, fitWidth: number): void {
    const ctx = this.Ctx;
    let words = text.split(' '),
      line = 0,
      idx = 1;
    while (words.length > 0 && idx <= words.length) {
      const w = ctx.measureText(words.slice(0, idx).join(' ')).width;
      if (w > fitWidth) {
        if (idx === 1) idx = 2;
        ctx.fillText(words.slice(0, idx - 1).join(' '), x, y + lineHeight * line);
        line++;
        words = words.splice(idx - 1);
        idx = 1;
      } else idx++;
    }
    if (idx > 0) ctx.fillText(words.join(' '), x, y + lineHeight * line);
  }

  // ---- input ----
  HitTests(pt: { x: number; y: number }): void {
    const unit = App.Unit,
      width = App.Width,
      cy = this.cy,
      hit = (x: number, y: number, w: number, h: number) =>
        Dimensions.hitRect(x, y, w, h, pt.x, pt.y);
    const { tabs, half } = this.tabs(),
      tabY = this.OffsetY;
    const r: Record<string, boolean> = {
      close: hit(width * 0.5 + half, tabY + 10 * unit, 40 * unit, 40 * unit),
    };
    tabs.forEach((tab) => {
      r[`tab${tab.id}`] = hit(tab.x - tab.w * 0.5, tabY, tab.w, 60 * unit);
    });
    const box = (b: { x: number; y: number; w: number; h: number }) => hit(b.x, b.y, b.w, b.h);
    const pad = (b: { x: number; y: number; w: number }) =>
      hit(b.x - 5 * unit, b.y - 10 * unit, b.w + 10 * unit, 40 * unit);
    if (this.View === 'confirm') {
      const [a, b, c] = this.thirds();
      r.cancel = box(a);
      r.saveFirst = box(b);
      r.openAnyway = box(c);
    } else if (this.Tab === 2) {
      {
        const L = this.galleryLayout();
        r.search = pad(L.search);
        for (const b of this.sortButtons())
          r[`sort_${b.sort}`] = hit(b.x - 5 * unit, b.y - 20 * unit, b.w + 10 * unit, 30 * unit);
        const win = this.galleryWindow();
        r.list = hit(
          this.margin - 5 * unit,
          win.clip,
          this.pageW + 15 * unit,
          win.bottom - win.clip,
        );
        if (r.list)
          for (let n = 0; n < this.GalleryItems.length; n++) {
            const b = this.galleryRow(n);
            if (b.open.y > win.bottom || b.open.y + b.open.h < win.top) continue;
            if (pad(b.open)) r[`gopen${n}`] = true;
            else if (pad(b.insert)) r[`gins${n}`] = true;
            else if (
              hit(this.margin - 5 * unit, this.galleryRowY(n) - 30 * unit, 35 * unit, 40 * unit)
            )
              r[`glike${n}`] = true;
          }
        if (r.list && this.GalleryMore && !this.GalleryLoading && this.GalleryItems.length)
          r.showMore = pad(this.showMoreButton());
      }
    } else if (this.Tab === 0 && this.View === 'video') {
      const m = this.videoMain();
      if (this.VideoState === 'ready') r.shareVideo = box(m);
      else r.make = box(m);
      r.videoBack = this.backHit(pt);
    } else if (this.Tab === 0 && !this.web) {
      const { left, right } = this.halves();
      r.randomise = pad(this.randomise());
      r.save = box(left);
      r.share = box(right);
    } else if (this.Tab === 0) {
      const sw = (g: { x: number; y: number; w: number; h: number }, name: string) =>
        hit(g.x, g.y + g.h * 0.1, g.w + 12 * unit + this.textW(name), g.h * 0.55);
      if (this.host.gallery) r.gallerySwitch = sw(this.gallerySwitch(), COPY.addToGallery);
      if (this.host.video) r.videoSwitch = sw(this.videoSwitch(), COPY.makeVideo);
      if (this.signInShown) r.signIn = pad(this.signInButton());
      r.randomise = pad(this.randomise());
      r.share = box(this.mainButton());
      const sec = this.secondary();
      r.saveAs = pad(sec.saveAs);
      r.save = !!sec.download && pad(sec.download);
      const live = !!this.link && !this.Saving;
      r.copyLink = live && pad(this.copyButton());
      r.shareLink = live && this.canShare && pad(this.shareButton());
      if (this.linkOnly) r.share = false; // no SAVE button here
    } else if (this.View === 'list') {
      if (this.fileButtonShown) r.file = pad(this.fileButton());
      const L = this.openLayout();
      r.list = hit(this.margin - 5 * unit, L.top, this.pageW + 15 * unit, L.bottom - L.top);
      if (r.list)
        for (let n = 0; n < this.Items.length; n++) {
          const b = this.rowButtons(n);
          if (b.open.y > L.bottom || b.open.y + b.open.h < L.top) continue;
          if (pad(b.open)) r[`open${n}`] = true;
          else if (pad(b.insert)) r[`ins${n}`] = true;
          else if (
            this.Items[n].removable &&
            hit(b.bin.x, b.bin.y - 10 * unit, b.bin.w + 5 * unit, 40 * unit)
          )
            r[`bin${n}`] = true;
        }
    } else {
      if (this.View === 'remove') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * unit;
        r.removeCancel = box(left);
        r.removeOk = box(right);
      } else if (this.View === 'file') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * unit;
        r.fileOpen = !this.Picked?.error && box(left);
        r.fileInsert = !this.Picked?.error && box(right);
        r.fileBack = this.backHit(pt);
      } else {
        const [a, b, c] = this.thirds();
        r.cancel = box(a);
        r.saveFirst = box(b);
        r.openAnyway = box(c);
      }
    }
    this.roll = r;
  }
  /** Tests: the centre of a control in CSS px (tab0, tab1, close, randomise, save (web: DOWNLOAD PATCH), share (web:
   * SAVE), saveAs, url, open<n>,
   * ins<n>, file, fileOpen, fileInsert, fileBack, cancel, saveFirst, openAnyway). */
  centreOf(name: string): [number, number] | null {
    const unit = App.Unit,
      pr = App.Metrics.PixelRatio,
      at = (x: number, y: number): [number, number] => [x / pr, y / pr];
    const mid = (b: { x: number; y: number; w: number; h: number }) =>
      at(b.x + b.w / 2, b.y + b.h / 2);
    const match = /^(open|ins|bin)(\d+)$/.exec(name);
    if (match) {
      const b = this.rowButtons(Number(match[2]));
      return mid(match[1] === 'open' ? b.open : match[1] === 'ins' ? b.insert : b.bin);
    }
    {
      const gm = /^g(open|ins)(\d+)$/.exec(name);
      if (gm) {
        const b = this.galleryRow(Number(gm[2]));
        return mid(gm[1] === 'open' ? b.open : b.insert);
      }
      const lm = /^glike(\d+)$/.exec(name);
      if (lm) return at(this.margin + 12 * unit, this.galleryRowY(Number(lm[1])) - 12 * unit);
      if (name === 'list') {
        const w = this.galleryWindow();
        return at(App.Width * 0.5, (w.top + w.bottom) / 2);
      }
      const L = this.galleryLayout();
      if (name === 'search') return mid(L.search);
      const sb =
        /^sort_(\w+)$/.exec(name) && this.sortButtons().find((b) => `sort_${b.sort}` === name);
      if (sb) return at(sb.x + sb.w / 2, sb.y - 5 * unit);
    }
    if (name === 'gallerySwitch' || name === 'videoSwitch') {
      const g = name === 'gallerySwitch' ? this.gallerySwitch() : this.videoSwitch();
      return at(g.x + g.w / 2, g.y + g.h * 0.35);
    }
    if (name === 'player') return mid(this.playerBox());
    if (name === 'videoBack' || name === 'fileBack') {
      const b = this.backArrow();
      return at(b.x, b.y);
    }
    if (name === 'list') {
      const L = this.openLayout();
      return at(App.Width * 0.5, (L.top + L.bottom) / 2);
    }
    if (name === 'make' || name === 'shareVideo') return mid(this.videoMain());
    const t = /^tab(\d)$/.exec(name);
    if (t) {
      const tab = this.tabs().tabs.find((x) => x.id === Number(t[1]));
      return tab ? at(tab.x, this.OffsetY + 30 * unit) : null;
    }
    const { left, right } = this.halves(),
      [a, b, c] = this.thirds(),
      f = this.fileButton();
    switch (name) {
      case 'close':
        return at(App.Width * 0.5 + this.tabs().half + 20 * unit, this.OffsetY + 30 * unit);
      case 'randomise':
        return mid(this.randomise());
      case 'signIn':
        return this.signInShown ? mid(this.signInButton()) : null;
      case 'showMore':
        return this.GalleryMore && this.GalleryItems.length ? mid(this.showMoreButton()) : null;
      case 'save': {
        if (!this.web) return mid(left);
        const d = this.secondary().download;
        return d ? mid(d) : null;
      }
      case 'share':
        return this.web ? mid(this.mainButton()) : mid(right);
      case 'saveAs':
        return this.web ? mid(this.secondary().saveAs) : null;
      case 'url':
        return this.View === 'video'
          ? at(App.Width * 0.5, this.videoLink().box + 20 * unit)
          : at(this.margin + this.urlWidth() / 2, this.urlTop() + 15 * unit);
      case 'copyLink':
        return this.link ? mid(this.copyButton()) : null;
      case 'shareLink':
        return this.link && this.canShare ? mid(this.shareButton()) : null;
      case 'file':
        return mid(f);
      case 'fileOpen':
        return at(left.cx, this.cy + 25 * unit);
      case 'fileInsert':
        return at(right.cx, this.cy + 25 * unit);
      case 'removeCancel':
        return at(left.cx, this.cy + 25 * unit);
      case 'removeOk':
        return at(right.cx, this.cy + 25 * unit);
      case 'cancel':
        return mid(a);
      case 'saveFirst':
        return mid(b);
      case 'openAnyway':
        return mid(c);
    }
    return null;
  }
  get Hover(): boolean {
    return Object.values(this.roll).some(Boolean);
  }

  MouseMove(pt: { x: number; y: number }): void {
    const d = this.galleryDrag;
    if (d) {
      if (Math.abs(pt.y - d.y) > 6 * App.Unit) d.moved = true;
      if (d.moved) {
        if (d.tab === 2) {
          this.GalleryScroll = d.scroll;
          this.scrollGallery(d.y - pt.y);
        } else {
          this.OpenScroll = d.scroll;
          this.scrollOpen(d.y - pt.y);
        }
      }
    }
    this.HitTests(pt);
  }
  MouseUp(): void {
    const d = this.galleryDrag,
      g = this.host.gallery;
    this.galleryDrag = null;
    if (d && !d.moved && d.row >= 0 && d.tab === 1 && this.Tab === 1 && this.View === 'list') {
      const item = this.Items[d.row];
      if (!item) return;
      if (d.mode === 'bin') {
        this.removing = item;
        this.View = 'remove';
        return;
      }
      const gone = () => {
        this.Items = this.Items.filter((x) => x !== item);
      };
      if (d.mode === 'insert') this.runOpen(() => this.host.openPatch(item, 'insert'), gone);
      else this.requestOpen(() => this.host.openPatch(item, 'open'), gone);
      return;
    }
    if (!d || d.moved || d.row < 0 || !g || this.Tab !== 2 || d.tab !== 2) return;
    const row = this.GalleryItems[d.row];
    if (!row) return;
    // Likes from the list too (owner review 3: changed their mind); signed out, the host asks to sign in.
    if (d.mode === 'like') {
      g.like(row);
      this.settled();
      return;
    }
    // Insert adds to the patch: nothing is lost, so it doesn't ask first (as OPEN's INSERT).
    // Deleted since the list loaded: its row goes (owner, 2026-11-18).
    const gone = () => {
      this.GalleryItems = this.GalleryItems.filter((x) => x !== row);
    };
    if (d.mode === 'insert') this.runOpen(() => g.open(row, 'insert'), gone);
    else this.requestOpen(() => g.open(row, 'open'), gone);
  }
  MouseDown(pt: { x: number; y: number }): void {
    if (this.Opening) return;
    this.OpenError = '';
    this.HitTests(pt);
    const r = this.roll;
    if (r.close) {
      this.ClosePanel();
      return;
    }
    for (const i of ALL_TABS)
      if (r[`tab${i}`]) {
        this.selectTab(i);
        try {
          localStorage.setItem(TAB_KEY, String(i));
        } catch {
          /* private mode */
        }
        return;
      }
    if (this.Tab === 2 && this.View !== 'confirm') {
      const g = this.host.gallery;
      if (!g) return;
      if (r.search) {
        this.GalleryQuery = this.SearchInput.value.trim();
        void this.browse();
        return;
      }
      const sort = GALLERY_SORTS.find((gallerySort) => r[`sort_${gallerySort}`]);
      if (sort) {
        this.GallerySort = sort;
        try {
          localStorage.setItem(SORT_KEY, sort);
        } catch {
          /* private mode */
        }
        void this.browse();
        return;
      }
      if (r.showMore) {
        void this.browse(true);
        return;
      }
      // The list: a press may become a drag (scrolling); a row opens on release, if it didn't move.
      if (r.list) {
        let row = -1,
          mode: 'open' | 'insert' | 'like' = 'open';
        for (let n = 0; n < this.GalleryItems.length; n++) {
          if (r[`gopen${n}`]) {
            row = n;
            break;
          }
          if (r[`gins${n}`]) {
            row = n;
            mode = 'insert';
            break;
          }
          if (r[`glike${n}`]) {
            row = n;
            mode = 'like';
            break;
          }
        }
        this.galleryDrag = { tab: 2, y: pt.y, scroll: this.GalleryScroll, moved: false, row, mode };
      }
      return;
    }
    if (this.Tab === 0 && this.View === 'video') {
      if (r.videoBack) {
        if (this.VideoState === 'making') this.cancelVideo();
        this.dropPlayer();
        this.View = 'list';
        this.showDom();
        return;
      }
      if (r.make) {
        if (this.VideoState === 'making') this.cancelVideo();
        else void this.makeVideo();
        return;
      }
      // The share sheet needs this click's user activation: call it straight away.
      if (r.shareVideo && this.videoFile) {
        void this.host.video?.share(this.videoFile).catch((error) => {
          this.VideoState = 'error';
          this.VideoMessage = (error as Error).message;
        });
        return;
      }
      return;
    }
    if (this.Tab === 0) {
      // Signed out, SIGN IN (or the greyed switch) goes to Settings › SIGN IN and comes back here after.
      if (r.signIn || (r.gallerySwitch && this.signInShown)) {
        this.GalleryOn = true;
        this.ClosePanel();
        this.host.signInToSave?.(this.Title);
        return;
      }
      if (r.gallerySwitch) {
        if (this.host.signedIn()) {
          this.GalleryOn = !this.GalleryOn;
          this.GalleryNote = '';
        }
        return;
      }
      if (r.videoSwitch) {
        this.VideoOn = !this.videoOn;
        return;
      }
      if (r.randomise) {
        this.setTitle(App.MainScene?.SharePanel?.GenerateLabel?.() ?? this.Title);
        return;
      }
      if (r.save) {
        if (!this.Saving && this.host.hasBlocks()) void this.save();
        return;
      }
      if (r.share) {
        if (!this.web) {
          void this.share();
          return;
        }
        const main = this.mainAction();
        if (main.off) return;
        // SAVE, then (MAKE VIDEO on) on to the video; or just the video when there is nothing to save.
        if (main.kind === 'save')
          void this.share().then((ok) => {
            if (ok && this.videoOn) void this.makeVideo();
          });
        else if (main.kind === 'video') void this.makeVideo();
        return;
      }
      if (r.saveAs) {
        if (this.shareState().saveAs && !this.Saving)
          void this.saveAsLink().then((ok) => {
            if (ok && this.videoOn) void this.makeVideo();
          });
        return;
      }
      if (r.copyLink) {
        void this.copyLink();
        return;
      }
      if (r.shareLink) {
        void this.shareSheet();
        return;
      }
      return;
    }
    if (this.View === 'list') {
      if (r.file) {
        this.host.pickPatchFile();
        return;
      }
      // The list: a press may become a drag (scrolling); a row's button acts on release, if it didn't move.
      if (r.list) {
        let row = -1,
          mode: 'open' | 'insert' | 'bin' = 'open';
        for (let n = 0; n < this.Items.length; n++) {
          if (r[`open${n}`]) {
            row = n;
            break;
          }
          if (r[`ins${n}`]) {
            row = n;
            mode = 'insert';
            break;
          }
          if (r[`bin${n}`]) {
            row = n;
            mode = 'bin';
            break;
          }
        }
        this.galleryDrag = { tab: 1, y: pt.y, scroll: this.OpenScroll, moved: false, row, mode };
      }
      return;
    }
    if (this.View === 'remove') {
      const item = this.removing;
      if (r.removeCancel) {
        this.removing = null;
        this.View = 'list';
        return;
      }
      if (r.removeOk && item) {
        this.removing = null;
        this.View = 'list';
        void this.host.removePatch(item).then(() => this.refresh());
      }
      return;
    }
    if (this.View === 'file') {
      if (r.fileBack) {
        this.View = 'list';
        this.Picked = null;
        return;
      }
      if (r.fileInsert) {
        this.ClosePanel();
        this.host.usePickedFile('insert');
        return;
      }
      if (r.fileOpen) {
        this.requestOpen(() => {
          this.host.usePickedFile('open');
        });
        return;
      }
      return;
    }
    // confirm
    if (this.Saving) return;
    if (r.cancel) {
      this.View = this.pending?.from ?? 'list';
      this.pending = null;
      return;
    }
    if (r.openAnyway) {
      const p = this.pending;
      this.pending = null;
      if (p) this.runOpen(p.run, p.gone);
      return;
    }
    if (r.saveFirst) {
      void this.save().then((ok) => {
        if (!ok || !this.pending) return;
        const p = this.pending;
        this.pending = null;
        this.runOpen(p.run, p.gone);
      });
    }
  }
  /** Open replaces the patch: with unsaved changes, ask first (owner, 2026-11-10). */
  private requestOpen(run: OpenRun, gone?: () => void): void {
    if (!this.host.isDirty()) {
      this.runOpen(run, gone);
      return;
    }
    this.pending = { run, from: this.View, gone };
    this.View = 'confirm';
  }
  /** Open or Insert. A patch from the server keeps the panel up, spinning, until it is in; then the panel closes. */
  private runOpen(run: OpenRun, gone?: () => void): void {
    this.OpenError = '';
    const r = run();
    if (!(r instanceof Promise)) {
      this.ClosePanel();
      return;
    }
    this.Opening = true;
    this.showDom();
    // Couldn't: v1's message bar says why (owner, 2026-11-18); a deleted patch's row goes from the list.
    const done = (ok: boolean | string) => {
      this.Opening = false;
      if (ok === true) this.ClosePanel();
      else {
        const why = typeof ok === 'string' ? ok : COPY.openFailed;
        (
          App.MainScene as { message?: (t: string, o?: { seconds?: number }) => void } | undefined
        )?.message?.(why, { seconds: 5 });
        if (why === MISSING_TEXT.deleted) gone?.();
        this.showDom();
      }
      this.settled();
    };
    r.then(
      (ok) => {
        done(ok === undefined ? true : ok);
      },
      () => {
        done(false);
      },
    );
  }
  /** v1 SettingsPanel category select: the new tab's fill drops in, the others lift. */
  selectTab(i: Tab): void {
    if (this.Tab !== i) {
      this.View = 'list';
      this.Picked = null;
      this.pending = null;
      // v1 SettingsPanel: the old page lifts out in 250 ms; the new one drops in after 400 ms, over 400 ms.
      this.leaving = this.Tab;
      this.tweenPage(this.Tab, -App.Height, 250, 0);
      this.pageDy[i] = -App.Height;
      this.tweenPage(i, 0, 400, 400);
    }
    this.Tab = i;
    for (const j of ALL_TABS) this.tweenSelected(j, j === i ? 1 : 0, j === i ? 400 : 250);
    if (i === 2) {
      this.GalleryView = 'list';
      this.GalleryMessage = '';
      void this.browse();
    }
    // OPEN lists the account's patches too: signed in or out since the panel opened, the list has changed.
    if (i === 1 && this.View === 'list') void this.refresh();
    this.showDom();
  }

  async save(): Promise<boolean> {
    this.Saving = true;
    let ok = false;
    try {
      ok = await this.host.savePatch(this.Title.trim() || 'Untitled');
    } finally {
      this.Saving = false;
      this.settled();
    }
    if (ok) {
      this.flash = { key: 'save', label: COPY.saved, until: performance.now() + 1500 };
      void this.refresh();
    }
    return ok;
  }
  /** SAVE (web) / CREATE SHARE LINK (plugin): see shareState. */
  private async share(): Promise<boolean> {
    const st = this.shareState();
    if (!st.save) return false;
    if (this.host.links?.external) {
      if (await this.makeLink('saveAs')) {
        this.flash = { key: 'share', label: COPY.opened, until: performance.now() + 1500 };
        this.settled();
        return true;
      }
      return false;
    }
    // Save over this link (v1 SAVE, "overwrite"); otherwise a new link (v1 SAVE_AS).
    if (await this.makeLink(st.save === 'save' ? 'save' : 'saveAs')) {
      await this.flashSaved('share');
      return true;
    }
    return false;
  }
  /** SAVE AS: a new link; the old one keeps what it had. */
  private async saveAsLink(): Promise<boolean> {
    if (await this.makeLink('saveAs')) {
      await this.flashSaved('saveAs');
      return true;
    }
    return false;
  }
  /** The button that saved reads LINK COPIED once the link is on the clipboard, else SAVED. */
  private async flashSaved(key: string): Promise<void> {
    const copied = await (this.copying ?? Promise.resolve(false));
    this.copying = null;
    // The button goes once saved (owner, 2026-11-18): the message bar says so.
    this.lastSaved = { key, copied };
    this.say(copied ? COPY.savedCopied : COPY.saved);
    this.settled();
  }
  /** Saving a link copies it (owner, 2026-11-17, CHG-0035): no second click on the link. The clipboard is asked in
   * the press itself, with the link to follow (a ClipboardItem promise), as browsers allow a copy only in a user's
   * press; where that is refused, the link is copied as it arrives if the browser still allows it. */
  private copying: Promise<boolean> | null = null;
  /** Tests: the last save's button and whether its link was copied. */
  lastSaved: { key: string; copied: boolean } | null = null;
  private copyWhenSaved(): (url: string | null) => void {
    let done: (url: string | null) => void = () => {};
    if (
      !this.web ||
      this.host.links?.external ||
      typeof navigator === 'undefined' ||
      !navigator.clipboard
    ) {
      this.copying = null;
      return done;
    }
    const url = new Promise<string>((res, rej) => {
      done = (u) => {
        u ? res(u) : rej(new Error('not saved'));
      };
    });
    url.catch(() => {});
    const text = () =>
      url
        .then((u) => navigator.clipboard.writeText(u))
        .then(
          () => true,
          () => false,
        );
    try {
      this.copying =
        typeof ClipboardItem === 'function' && navigator.clipboard.write
          ? navigator.clipboard
              .write([
                new ClipboardItem({
                  'text/plain': url.then((u) => new Blob([u], { type: 'text/plain' })),
                }),
              ])
              .then(() => true, text)
          : text();
    } catch {
      this.copying = text();
    }
    return done;
  }
  private async makeLink(mode: 'saveAs' | 'save'): Promise<boolean> {
    if (this.Saving || !this.host.hasBlocks() || !this.host.links) return false;
    this.Saving = true;
    this.showDom();
    const copy = this.copyWhenSaved();
    // Your own patches don't share a name: one already used by another of them gets " (2)", shown in the name field
    // before it saves (owner, 2026-11-18). Saving over this link may keep its own name.
    if (this.web) {
      const mine = await this.host.listPatches().catch(() => [] as PatchItem[]);
      const here = mode === 'save' ? App.CompositionId : null;
      const title = uniqueTitle(
        this.Title.trim() || 'Untitled',
        mine.filter((i) => !here || i.link !== here).map((i) => i.name),
      );
      if (title !== (this.Title.trim() || 'Untitled')) this.setTitle(title);
    }
    // Signed out, the gallery is left as it is (only signed-in users can publish, SPEC-SHARING-GALLERY R2).
    const gallery =
      this.web && this.host.gallery && this.host.signedIn() ? this.GalleryOn : undefined;
    let url: string | null = null;
    try {
      const g = await this.host.links.make(mode, this.Title.trim() || 'Untitled', gallery);
      if (g) {
        this.savedGallery = g.published;
        this.GalleryNote = g.reason ?? '';
      }
      url = this.link?.url ?? null;
      return true;
    } finally {
      copy(url);
      this.Saving = false;
      this.settled();
      this.showDom();
    }
  }
  setTitle(t: string): void {
    this.Title = t;
    if (this.Input) this.Input.value = t;
  }
  /** Open the gallery on a search (a patch's "by @name" on the stage). */
  showGallery(q: string): void {
    this.GalleryQuery = q;
    this.GalleryView = 'list';
    this.GalleryMessage = '';
    if (this.SearchInput) this.SearchInput.value = q;
    if (!this.Open) this.OpenPanel(2);
    else this.selectTab(2);
  }
  /** The open patch is (or isn't) in the gallery: the switch shows it (an opened patch of yours; null: unknown). */
  galleryKnown(published: boolean | null): void {
    this.savedGallery = published;
    if (published !== null) this.GalleryOn = published;
    this.GalleryNote = '';
  }
  async refresh(): Promise<void> {
    this.Loading = true;
    try {
      this.Items = await this.host.listPatches();
    } finally {
      this.Loading = false;
      this.settled();
    }
    this.OpenScroll = Math.min(this.OpenScroll, this.openMaxScroll());
  }

  OpenPanel(tab: Tab = rememberedTab()): void {
    // A new scene gets a v1-style random title (v1 SharePanel.GenerateLabel), as the Share panel did.
    if (!this.Title) this.setTitle(App.MainScene?.SharePanel?.GenerateLabel?.() ?? '');
    this.Open = true;
    this.shown = true;
    if (!this.hasTab(tab)) tab = 0; // a tab remembered from the web, in the plugin
    this.Tab = tab;
    this.View = 'list';
    this.Picked = null;
    this.pending = null;
    this.selected = ALL_TABS.map((i) => (i === tab ? 1 : 0));
    for (const k of ALL_TABS) {
      this.tweens[`page${k}`]?.stop();
      this.pageDy[k] = k === tab ? 0 : -App.Height;
    }
    this.leaving = null;
    if (tab === 2) void this.browse();
    this.OffsetY = -App.Height;
    this.OpenScroll = 0;
    this.Input.value = this.Title;
    this.tween('OffsetY', 0, 500);
    this.showDom();
    void this.refresh();
  }
  /** A picked or dropped file: the OPEN tab asks what to do with it. */
  showFile(pickedFile: PickedFile): void {
    if (!this.Open) this.OpenPanel(1);
    else this.selectTab(1);
    this.Picked = pickedFile;
    this.View = 'file';
    this.settled();
  }
  ClosePanel(): void {
    this.Open = false;
    this.tween('OffsetY', -App.Height, 500);
  }

  // v1 SoundcloudPanel.DelayTo (its text fields follow the panel), TweenDom and StyleDom.
  private tweens: Record<string, { stop(): void }> = {};
  private tween(key: 'OffsetX' | 'OffsetY', to: number, ms: number): void {
    // One tween per property: reopening while the close is still running must not let the close finish (and hide it).
    this.tweens[key]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this[key] });
    this.tweens[key] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self[key] = this.x;
      if (key === 'OffsetY') self.placeDom();
    });
    tw.onComplete(() => {
      if (key === 'OffsetY' && to !== 0) {
        this.shown = false;
        this.showDom();
      }
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  private tweenPage(i: number, to: number, ms: number, delay: number): void {
    const k = `page${i}`;
    this.tweens[k]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this.pageDy[i] });
    this.tweens[k] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self.pageDy[i] = this.x;
      self.placeDom();
    });
    tw.onComplete(() => {
      if (i === this.leaving && to !== 0) this.leaving = null;
      this.showDom();
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.delay(delay);
    tw.start(this.LastVisualTick);
  }
  private tweenSelected(i: number, to: number, ms: number): void {
    const k = `sel${i}`;
    this.tweens[k]?.stop();
    const self = this,
      tw = new (window as any).TWEEN.Tween({ x: this.selected[i] });
    this.tweens[k] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) {
      self.selected[i] = this.x;
    });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  private placeDom(): void {
    const pr = App.Metrics.PixelRatio,
      unit = App.Unit,
      mid = this.cy;
    // The fields slide with their page and, like the canvas, are cut off at the tabs' foot (owner, 2026-11-18: the name
    // showed above the tabs as SAVE / SHARE lifted out).
    const clipTop = this.OffsetY + 60 * unit;
    const at = (el: HTMLElement, top: number, h: number) => {
      el.style.top = `${top / pr}px`;
      const hidden = Math.max(0, Math.min(h, clipTop - top));
      el.style.clipPath = hidden > 0 ? `inset(${hidden / pr}px 0 0 0)` : '';
      el.style.visibility = hidden >= h ? 'hidden' : '';
    };
    at(this.TitleContainer, mid - unit * 132, unit * 42);
    // The link: v1's large URL box under the video; on SAVE / SHARE small, on a rule, up to COPY LINK (owner, 2026-11-18).
    const video = this.Tab === 0 && this.View === 'video',
      url = this.UrlContainer.style;
    const font = video ? App.Metrics.TxtUrl : `300 ${Math.round((unit * 12) / pr)}px Dosis`,
      w = video ? unit * 400 : this.urlWidth(),
      h = unit * (video ? 40 : 30);
    if (url.font !== font) url.font = font;
    url.width = `${w / pr}px`;
    url.height = `${h / pr}px`;
    url.lineHeight = `${h / pr}px`;
    url.left = `${(video ? App.Width * 0.5 - unit * 200 : this.margin) / pr}px`;
    url.opacity = video || this.linkOnly ? '' : '0.6';
    at(this.UrlContainer, video ? this.videoLink().box : this.urlTop(), h);
    if (this.player) at(this.player, this.playerBox().y, this.playerBox().h);
    if (this.SearchContainer)
      at(this.SearchContainer, this.galleryLayout().rule - unit * 42, unit * 42); // v1 StyleDom(…, 152): 42 above the rule
  }
  /** The name field shows on the SAVE tab; the link field when there is a link (v1 ShowDom / HideDom). */
  private showDom(): void {
    const on = this.shown,
      link = this.Tab === 0 && on && !this.Saving ? this.link : null;
    this.TitleContainer.style.display =
      on && this.Tab === 0 && this.View !== 'video' && !this.Opening ? 'block' : 'none';
    if (this.SearchContainer)
      this.SearchContainer.style.display =
        on &&
        this.Tab === 2 &&
        this.GalleryView === 'list' &&
        this.View !== 'confirm' &&
        !this.Opening
          ? 'block'
          : 'none';
    this.UrlContainer.style.display =
      link && (this.View !== 'video' || this.web) ? 'block' : 'none';
    if (this.player)
      this.player.style.display =
        on && this.Tab === 0 && this.View === 'video' && this.VideoState === 'ready'
          ? 'block'
          : 'none';
    if (link && this.UrlInput.value !== link.url) this.UrlInput.value = link.url; // unchanged: keep the selection
    this.placeDom(); // the link sits under the video in the video view
  }
  /** Keep the link field in step with the link (made, gone stale, reset). */
  Update(): void {
    if (this.shown) this.showDom();
  }
  Resize(): void {
    const unit = App.Unit,
      pr = App.Metrics.PixelRatio,
      el = this.TitleContainer,
      url = this.UrlContainer;
    if (!el) return;
    // v1 StyleDom(TitleInputContainer, 300, 42, 210, 132): up to RANDOMISE TITLE.
    const width = 420 - this.textW(COPY.randomise) / unit - 20;
    el.style.font = App.Metrics.TxtHeaderPR;
    el.style.width = `${(unit * width) / pr}px`;
    el.style.height = `${(unit * 42) / pr}px`;
    el.style.lineHeight = `${(unit * 42) / pr}px`;
    el.style.left = `${(App.Width / pr) * 0.5 - (unit * 210) / pr}px`;
    // v1 StyleDom(URLInputContainer, 400, 40, 200, 20, …, TxtUrl): in v1's URL box.
    url.style.font = App.Metrics.TxtUrl;
    url.style.width = `${(unit * 400) / pr}px`;
    url.style.height = `${(unit * 40) / pr}px`;
    url.style.lineHeight = `${(unit * 40) / pr}px`;
    url.style.left = `${(App.Width / pr) * 0.5 - (unit * 200) / pr}px`;
    // The gallery search field: v1 SoundcloudPanel StyleDom(SearchInputContainer, 300, 42, 210, 152, 0, TxtHeaderPR).
    const sf = this.SearchContainer;
    if (sf) {
      sf.style.font = App.Metrics.TxtHeaderPR;
      sf.style.width = `${(unit * 300) / pr}px`;
      sf.style.height = `${(unit * 42) / pr}px`;
      sf.style.lineHeight = `${(unit * 42) / pr}px`;
      sf.style.left = `${(App.Width / pr) * 0.5 - (unit * 210) / pr}px`;
    }
    if (this.player) {
      const b = this.playerBox();
      Object.assign(this.player.style, {
        left: `${b.x / pr}px`,
        width: `${b.w / pr}px`,
        height: `${b.h / pr}px`,
      });
    }
    if (!this.Open) this.OffsetY = -App.Height;
    this.showDom();
    this.placeDom();
  }
}

/** v1's trash can (UI/TrashCan.Draw: a tapering bin with a cross), at `scale` and centred on (x, y). */
export function drawBin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const unit = App.Unit,
    s = scale;
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11 * s * unit, y - 11 * s * unit);
  ctx.lineTo(x + 11 * s * unit, y - 11 * s * unit);
  ctx.lineTo(x + 8 * s * unit, y + 11 * s * unit);
  ctx.lineTo(x - 8 * s * unit, y + 11 * s * unit);
  ctx.closePath();
  ctx.moveTo(x - 4 * s * unit, y - 4 * s * unit);
  ctx.lineTo(x + 4 * s * unit, y + 4 * s * unit);
  ctx.moveTo(x + 4 * s * unit, y - 4 * s * unit);
  ctx.lineTo(x - 4 * s * unit, y + 4 * s * unit);
  ctx.stroke();
}

/**
 * A text button for the user's files (UPLOAD FILE in the sample panel, OPEN FROM YOUR DEVICE here), like v1's
 * Randomise button: its label (v1 mid type), then the usual upload mark under it (owner, 2026-11-10: an open tray with
 * an arrow out of it), in v1's 2 px line. Hovered, the label is underlined, so it reads as a button.
 */
export function drawUploadLink(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  base: number,
  hover: boolean,
): void {
  const unit = App.Unit,
    txt = App.Palette[App.ThemeManager.Txt],
    text = label.toUpperCase();
  App.FillColor(ctx, txt);
  App.StrokeColor(ctx, txt);
  ctx.font = App.Metrics.TxtMid;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, base);
  ctx.lineWidth = 2;
  if (hover) {
    const w = ctx.measureText(text).width;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, base + 3 * unit);
    ctx.lineTo(cx + w / 2, base + 3 * unit);
    ctx.stroke();
  }
  drawUploadMark(ctx, cx, base + 7 * unit);
}
/** The upload mark: an arrow (its tip at (cx, top)) out of an open tray, 14 × 11 units, in v1's 2 px text-colour line. */
export function drawUploadMark(ctx: CanvasRenderingContext2D, cx: number, top: number): void {
  const unit = App.Unit,
    txt = App.Palette[App.ThemeManager.Txt];
  App.StrokeColor(ctx, txt);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * unit, top + 5 * unit);
  ctx.lineTo(cx - 7 * unit, top + 11 * unit);
  ctx.lineTo(cx + 7 * unit, top + 11 * unit);
  ctx.lineTo(cx + 7 * unit, top + 5 * unit);
  ctx.moveTo(cx, top + 8 * unit);
  ctx.lineTo(cx, top);
  ctx.moveTo(cx - 3.5 * unit, top + 3.5 * unit);
  ctx.lineTo(cx, top);
  ctx.lineTo(cx + 3.5 * unit, top + 3.5 * unit);
  ctx.stroke();
}
