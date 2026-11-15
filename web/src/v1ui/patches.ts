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
// VIDEO (web only, CHG-0022, SPEC-SHARING-VIDEO-EXPORT R15; owner review 2026-11-15): the OPEN tab's italic line and
// rule, then two controls that cycle when pressed: SHAPE, a frame icon (as Instagram's crop icons) with its name, and
// LENGTH, its seconds underlined (v1's link style); MAKE VIDEO as the OPEN tab's 420×40 GUIDE button, which becomes
// SHARE VIDEO once made; SharePanel's "saving…" spinner for progress.
//
// ACCOUNT (web only, CHG-0023, SPEC-SHARING-ACCOUNTS R13): signed out, the OPEN tab's italic line and rule, then
// SharePanel's two half buttons (SIGN IN WITH PASSKEY · SIGN IN WITH GOOGLE) and a bordered CREATE ACCOUNT; creating
// one (or naming a new Google account), the file step's heading and line, the SAVE tab's name field and rule (a DOM
// field as v1's title), and the GUIDE button; signed in, the header type for the name, the italic line, the half
// buttons (ADD PASSKEY · SIGN OUT) and two bordered buttons (SIGN OUT EVERYWHERE, DELETE ACCOUNT); deleting asks
// first with the delete step's CANCEL · DELETE.
import { App, Dimensions, DisplayObject } from './shim.ts';
import { Device } from './ported/Device';

export interface PatchItem {
  /** Shown upper-case on the row's first line. */
  name: string;
  /** The row's second line, e.g. "Preset" or "Saved 8 Nov 2026" (v1: "By <user>"). */
  detail: string;
  key: string;
  /** The user's own (saved here): the row has a bin. */
  removable?: boolean;
}
/** Accounts (CHG-0023): what the ACCOUNT tab shows. */
export interface AccountInfo { handle: string | null; passkeys: number; providers: string[] }
export interface AccountHost {
  /** Who is signed in (null: nobody), whether Google sign-in is offered; null when there is no backend. */
  me(): Promise<{ user: AccountInfo | null; google: boolean } | null>;
  signUp(handle: string): Promise<void>;
  signIn(): Promise<void>;
  google(): void;
  addPasskey(): Promise<void>;
  setHandle(handle: string): Promise<void>;
  signOut(everywhere: boolean): Promise<void>;
  deleteAccount(): Promise<void>;
  /** The passkey dialog was closed by the user: nothing to report. */
  cancelled(e: unknown): boolean;
}
/** The gallery (CHG-0024). */
export interface GalleryRow { id: string; title: string; by: string; likes: number; remixes: number; liked: boolean; mine: boolean }
export interface GalleryHost {
  browse(sort: 'popular' | 'new', q: string, page: number): Promise<{ items: GalleryRow[]; more: boolean } | null>;
  /** Open a published patch (it replaces the current one; SAVE then makes a remix of it). */
  open(row: GalleryRow): void;
  like(id: string, on: boolean): Promise<{ liked: boolean; likes: number }>;
  report(id: string): Promise<void>;
  /** Save the current patch to the signed-in account if needed, then publish it. */
  publish(title: string): Promise<void>;
  unpublish(id: string): Promise<void>;
  /** The open patch's share id when the signed-in account owns it (its row then offers UNPUBLISH). */
  currentId(): string | null;
}
/** Video export (CHG-0022): what the VIDEO tab asks for. */
export type VideoShape = 'portrait' | 'square' | 'wide';
/** Videos start from the beginning, as the patch plays when it has just loaded (owner, 2026-11-15). */
export interface VideoChoice { shape: VideoShape; seconds: 15 | 30 | 60 }
export interface VideoProgressInfo { phase: 'preparing' | 'rendering'; done: number }
/** The share link of the current patch (web). */
export interface ShareLink { url: string; /** The patch changed since the link was made. */ stale: boolean; /** This browser made it (it can update it). */ owned: boolean }
/** A file picked with FROM YOUR COMPUTER or dropped on the stage: its title, or why it can't be used. */
export interface PickedFile { title: string; fileName: string; error?: string }
export interface PatchesHost {
  listPatches(): Promise<PatchItem[]>;
  /** Save the scene as a file under `title`; resolves true once written (false: cancelled or failed). */
  savePatch(title: string): Promise<boolean>;
  /** Open (replace) or Insert (place by hand) a listed patch. */
  openPatch(item: PatchItem, mode: 'open' | 'insert'): void;
  /** Show the system file picker; the host answers with `PatchesPanel.showFile`. */
  pickPatchFile(): void;
  /** Open or Insert the file last given to `showFile`. */
  usePickedFile(mode: 'open' | 'insert'): void;
  /** The patch changed since it was last saved, shared or opened (and has blocks). */
  isDirty(): boolean;
  /** Delete one of the user's own patches (web: from this browser's list; plugin: the file goes to the Trash). */
  removePatch(item: PatchItem): Promise<void>;
  /** What deleting does, for the confirm step. */
  removeLine: string;
  hasBlocks(): boolean;
  /** Video export (SPEC-SHARING-VIDEO-EXPORT); null: no VIDEO tab (the plugin, R16). */
  video: null | {
    make(choice: VideoChoice, progress: (p: VideoProgressInfo) => void, signal: AbortSignal): Promise<File>;
    /** In a click: the system share sheet (where a browser can't share files, the file is downloaded). */
    share(file: File): Promise<void>;
  };
  /** The public gallery (SPEC-SHARING-GALLERY); null: no GALLERY tab (the plugin). */
  gallery: GalleryHost | null;
  /** Accounts (SPEC-SHARING-ACCOUNTS); null: no ACCOUNT tab (the plugin). */
  account: AccountHost | null;
  /** Share links (SPEC-SHARING-BACKEND). */
  links: null | {
    /** Plugin: the link is made in the web browser (its page has the bot check); nothing is kept here. */
    external?: boolean;
    current(): ShareLink | null;
    /** v1 SAVE_AS (a new link) / SAVE (overwrite this browser's link). */
    make(mode: 'saveAs' | 'save', title: string): Promise<void>;
    /** v1 SharePanel's warning (recordings, the user's own files), or null. */
    warning(): string | null;
  };
}

/** The tab Patches opens on: the last one chosen (owner, 2026-11-10). */
const TAB_KEY = 'blokdust.patchesTab';
function rememberedTab(): Tab {
  try { const t = Number(localStorage.getItem(TAB_KEY)); return (t >= 0 && t <= 4 ? t : 0) as Tab; } catch { return 0; }
}

const ITEMS = 5;

/** WCAG relative luminance of an `rgba(r,g,b,a)` palette colour, and its contrast with black text. */
function blackContrast(c: string): number {
  const [r, g, b] = (c.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) / 0.05;
}
/**
 * DOWNLOAD PATCH, with black text (owner, 2026-11-11: the menu colour was unreadable under the cream text): v1's third
 * options-panel slider colour (Mode Stereo's green, the Particle Emitter's Division), or, where black on it is below
 * WCAG's 4.5:1, the palette's options colour that is most readable with black.
 */
export function downloadColour(): string {
  const cols = App.ThemeManager.OptionsOrder.map((i: number) => App.Palette[i] as string);
  if (blackContrast(cols[2]) >= 4.5) return cols[2];
  return cols.reduce((a: string, c: string) => (blackContrast(c) > blackContrast(a) ? c : a));
}
const COPY = {
  panel: 'Patches', tabs: ['Save', 'Open', 'Video', 'Account', 'Gallery'] as const,
  name: 'Patch Name', randomise: 'Randomise Title',
  save: 'Save to Computer', saved: 'Saved',
  saveLinePlugin: 'Save a .blokdust patch file. It opens in the web version of BlokDust too.',
  share: 'Create Share Link',
  shareLinePlugin: 'Create a shareable link. It opens in your web browser.', opened: 'Opened',
  // Web (owner, 2026-11-11): three buttons, no help lines: SAVE (to the link: made the first time), SAVE AS (a new
  // link), DOWNLOAD PATCH (the .blokdust file). Clicking the link copies it.
  saveLink: 'Save', saveAs: 'Save As', download: 'Download Patch',
  linkLine: 'Share your creation with this unique URL:', linkCopied: 'Link copied.',
  saving: 'saving...',
  openLine: 'Open loads a patch. Insert adds its blocks to your patch.',
  open: 'Open', insert: 'Insert', empty: 'No patches yet', file: 'Open From Your Device', back: 'Back',
  openDesc: 'Replace the current patch', insertDesc: 'Add its blocks to this patch',
  confirm: 'Replace current patch?', confirmLine: 'You have unsaved changes. Opening another patch will replace your current work.',
  cancel: 'Cancel', saveFirst: 'Save First', openAnyway: 'Open Anyway',
  remove: 'Delete', removeButton: 'Delete',
  videoLine: 'Make a video to share on Instagram, TikTok and more.',
  galleryLine: 'Patches people have published. Search names, blocks or @people.', search: 'Search',
  popular: 'Popular', newest: 'New', publish: 'Publish This Patch', publishing: 'publishing...', unpublish: 'Unpublish',
  like: 'Like', liked: 'Liked', report: 'Report', noneYet: 'Nothing here yet', by: 'by',
  reportTitle: 'Report this patch?', reportLine: 'For a rude name or anything that should not be here. Patches reported by three people are hidden until they are reviewed.',
  reported: 'Thank you. The patch was reported.', published: 'Published. It is in the gallery now.',
  shape: 'Shape', length: 'Length', makeVideo: 'Make Video', cancelVideo: 'Cancel',
  rendering: 'making video', shareVideo: 'Share Video',
  accountLine: 'Sign in to keep your patches on every device. Saving and sharing work without it.',
  passkey: 'Sign In With Passkey', google: 'Sign In With Google', create: 'Create Account', newHere: 'New here?',
  createTitle: 'Create your account', createLine: 'Choose a name. It shows on patches you publish. Your device then makes a passkey: no password.',
  nameTitle: 'Choose your name', nameLine: 'It shows on patches you publish.', handle: 'Name',
  createButton: 'Create With Passkey', saveName: 'Save Name', signedInAs: 'Signed in as',
  signedInLine: 'Patches you save go to your account. Open them from any device you sign in on.',
  addPasskey: 'Add Passkey', signOut: 'Sign Out', signOutAll: 'Sign Out Everywhere', deleteAccount: 'Delete Account',
  deleteTitle: 'Delete your account?', deleteLine: 'Your account, its passkeys and all its patches are deleted. Links to those patches stop working.',
  noAccounts: 'Accounts are not available here.', working: 'one moment',
  videoReady: 'Your video is ready.',
};
/** Instagram's order: portrait, then landscape, then square. */
const SHAPES: VideoShape[] = ['portrait', 'wide', 'square'];
const SHAPE_NAMES: Record<VideoShape, string> = { portrait: 'Portrait', wide: 'Wide', square: 'Square' };
const LENGTHS = [15, 30, 60] as const;

type Tab = 0 | 1 | 2 | 3 | 4;  // SAVE, OPEN, VIDEO, ACCOUNT, GALLERY (web): ids, not places
/** The tabs in the order they show (owner, 2026-11-15: the gallery next to OPEN). */
const TAB_ORDER: Tab[] = [0, 1, 4, 2, 3];
const ALL_TABS: Tab[] = [0, 1, 2, 3, 4];
type View = 'list' | 'file' | 'confirm' | 'remove';

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
  private page = 1;
  private roll: Record<string, boolean> = {};
  /** Tab fills, 0..1 (v1 MenuCategory.Selected, tweened). */
  private selected = [1, 0, 0, 0, 0];
  /** The GALLERY tab (CHG-0024). */
  GalleryItems: GalleryRow[] = [];
  GallerySort: 'popular' | 'new' = 'popular';
  GalleryQuery = '';
  GalleryPage = 1;
  GalleryMore = false;
  GalleryLoading = false;
  GalleryMessage = '';
  GalleryView: 'list' | 'report' = 'list';
  private reporting: GalleryRow | null = null;
  private galleryAsk = 0;
  SearchContainer!: HTMLElement;
  SearchInput!: HTMLInputElement;
  /** The ACCOUNT tab (CHG-0023). Undefined until asked; null: signed out. */
  Account: AccountInfo | null | undefined = undefined;
  AccountView: 'main' | 'create' | 'name' | 'delete' = 'main';
  AccountBusy = false;
  AccountMessage = '';
  private googleOn = false;
  private noBackend = false;
  HandleContainer!: HTMLElement;
  HandleInput!: HTMLInputElement;
  /** The VIDEO tab (CHG-0022). */
  Video: VideoChoice = { shape: 'portrait', seconds: 15 };
  VideoState: 'idle' | 'making' | 'ready' | 'error' = 'idle';
  VideoProgress: VideoProgressInfo = { phase: 'preparing', done: 0 };
  VideoMessage = '';
  private videoFile: File | null = null;
  private videoAbort: AbortController | null = null;
  /** The patch the delete step asks about. */
  private removing: PatchItem | null = null;
  /** What OPEN ANYWAY / SAVE FIRST go on to do, and the view to go back to on CANCEL. */
  private pending: { run: () => void; from: View } | null = null;
  TitleContainer!: HTMLElement;
  Input!: HTMLInputElement;
  UrlContainer!: HTMLElement;
  UrlInput!: HTMLInputElement;

  constructor(private readonly host: PatchesHost) { super(); }

  Init(drawTo: any): void {
    super.Init(drawTo);
    this.OffsetY = -this.DrawTo.Height;
    this.TitleContainer = document.getElementById('patchTitle')!;
    this.Input = document.getElementById('patchTitleInput') as HTMLInputElement;
    this.UrlContainer = document.getElementById('patchUrl')!;
    this.UrlInput = document.getElementById('patchUrlText') as HTMLInputElement;
    // Any characters (owner, 2026-11-10: "+" in a name). v1 stripped punctuation because the title went into the URL
    // unescaped; the link now escapes it and the file name is made safe separately (fileNameFor, PatchFiles::safeName).
    this.Input.addEventListener('input', () => { this.Title = this.Input.value; });
    this.Input.addEventListener('keydown', e => { if (e.key === 'Enter') this.Input.blur(); });
    this.UrlInput.addEventListener('click', () => void this.copyLink());
    this.SearchContainer = document.getElementById('gallerySearch')!;
    this.SearchInput = document.getElementById('gallerySearchInput') as HTMLInputElement;
    this.SearchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { this.SearchInput.blur(); this.GalleryQuery = this.SearchInput.value.trim(); this.GalleryPage = 1; void this.browse(); } });
    this.HandleContainer = document.getElementById('accountHandle')!;
    this.HandleInput = document.getElementById('accountHandleInput') as HTMLInputElement;
    this.HandleInput.addEventListener('input', () => { this.HandleInput.value = this.HandleInput.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20); this.AccountMessage = ''; });
    this.HandleInput.addEventListener('keydown', e => { if (e.key === 'Enter') { this.HandleInput.blur(); void this.submitHandle(); } });
  }
  /** Click the link: it is copied (and selected, so it can be copied by hand where the clipboard is refused). */
  private async copyLink(): Promise<void> {
    const link = this.link; if (!link) return;
    this.UrlInput.select();
    try { await navigator.clipboard.writeText(link.url); } catch { document.execCommand?.('copy'); }
    this.flash = { key: 'url', label: COPY.linkCopied, until: performance.now() + 1500 }; this.settled();
  }

  flashing(key: string): boolean { return !!this.flash && this.flash.key === key && performance.now() < this.flash.until; }
  get animating(): boolean { const now = performance.now(); return this.Loading || this.Saving || this.VideoState === 'making' || this.AccountBusy || this.GalleryLoading || now < this.settle || (!!this.flash && now < this.flash.until + 250); }
  /** Keep drawing a moment after something async lands (a save, a link, the list), so its last state is drawn. */
  private settle = 0;
  private settled(): void { this.settle = performance.now() + 250; }
  private label(key: string, normal: string): string { return this.flashing(key) ? this.flash!.label : normal; }

  // ---- layout ----
  private get mobile() { return App.Metrics.Device === Device.mobile; }
  private get tablet() { return App.Metrics.Device === Device.tablet; }
  private get cy() { return this.OffsetY + App.Height * 0.5; }
  private get margin() { return App.Width * 0.5 - 210 * App.Unit; }
  private get pageW() { return 420 * App.Unit; }
  private get pages() { return Math.max(1, Math.ceil(this.Items.length / ITEMS)); }
  private textW(t: string, font = App.Metrics.TxtMid) { this.Ctx.font = font; return this.Ctx.measureText(t.toUpperCase()).width; }
  /** v1 SettingsPanel.Populate: the tab bar's width, and each tab's centre and width. */
  private tabs() {
    const u = App.Unit, W = App.Width, menuWidth = this.mobile ? (W / 7) * 5 : (W / 7) * 4, gutter = App.Metrics.Device !== Device.desktop ? 40 : 60;
    let x = W * 0.5 - menuWidth * 0.5;
    const tabs = TAB_ORDER.filter(id => this.hasTab(id)).map(id => {
      const name = COPY.tabs[id], w = this.textW(name, `400 ${u * 10}px Dosis`) + gutter * u, t = { id, name: name.toUpperCase(), x: x + w * 0.5, w };
      x += w;
      return t;
    });
    return { tabs, half: menuWidth * 0.5 };
  }
  /** VIDEO, ACCOUNT and GALLERY are web only. */
  private hasTab(id: Tab): boolean { return id < 2 || (id === 2 && !!this.host.video) || (id === 3 && !!this.host.account) || (id === 4 && !!this.host.gallery); }
  /** v1's bordered button (Search Freesound, Randomise Title): right edge at `right`, text baseline 14 units under `top`. */
  private bordered(label: string, right: number, top: number) {
    const u = App.Unit, w = this.textW(label);
    return { label, x: right - 10 * u - w, y: top, w: w + 10 * u, h: 20 * u, textX: right - 5 * u - w, textY: top + 14 * u };
  }
  private randomise() { const u = App.Unit; return this.bordered(COPY.randomise, App.Width * 0.5 + 210 * u, this.cy - 120 * u); }
  /** v1 SharePanel SAVE / SAVE AS: two filled half-width buttons. */
  private halves() {
    const u = App.Unit, W = App.Width, cy = this.cy;
    return { left: { x: W * 0.5 - 210 * u, y: cy - 20 * u, w: 202.5 * u, h: 40 * u, cx: W * 0.5 - 108.75 * u }, right: { x: W * 0.5 + 7.5 * u, y: cy - 20 * u, w: 202.5 * u, h: 40 * u, cx: W * 0.5 + 108.75 * u } };
  }
  /** The web's three: SAVE · SAVE AS · DOWNLOAD PATCH (owner, 2026-11-11), each a third of v1's 420u row (7.5u gaps,
   * as its halves). */
  private get web(): boolean { return !!this.host.links && !this.host.links.external; }
  private threeRow() {
    const u = App.Unit, W = App.Width, y = this.cy - 20 * u, w = 135 * u;
    return [-210, -67.5, 75].map(dx => ({ x: W * 0.5 + dx * u, y, w, h: 40 * u, cx: W * 0.5 + (dx + 67.5) * u }));
  }
  /** Web: SAVE (`share`), SAVE AS (`saveAs`), DOWNLOAD PATCH (`save`). Plugin: SAVE TO COMPUTER first (a file is what a
   * plugin user mostly wants), then CREATE SHARE LINK (owner, 2026-11-10). */
  private saveButtons() {
    if (this.web) { const [share, saveAs, save] = this.threeRow(); return { share, saveAs, save }; }
    const { left, right } = this.halves();
    return { save: left, share: right, saveAs: null };
  }
  /** One type for the three, the largest of v1's 24u that fits DOWNLOAD PATCH (owner: smaller rather than squeezed). */
  private threeFont(): { font: string; dy: number } {
    const ctx = this.Ctx, u = App.Unit, w = this.threeRow()[0].w - 16 * u;
    ctx.save(); ctx.font = App.Metrics.TxtUrl2;
    const at24 = Math.max(...[COPY.saveLink, COPY.saveAs, COPY.download].map(l => ctx.measureText(l.toUpperCase()).width));
    ctx.restore();
    const size = Math.min(24, Math.floor(24 * w / at24 * 2) / 2);  // in units (at24 and w are both device px)
    return { font: `200 ${Math.round(size * u)}px Dosis`, dy: 20 + size * 0.37 };
  }
  /** What SAVE does now. Web: no link yet → make one; changed since it was saved → save over it (v1 SAVE), or, for a
   * link made elsewhere (can't be saved over), make a new one; unchanged → nothing (off). Plugin: always a new link,
   * made in the browser. SAVE AS: a new link, once the patch has changed since the last (no repeated copies). */
  shareState(): { save: 'make' | 'save' | 'new' | null; saveAs: boolean } {
    const links = this.host.links, link = this.link;
    if (!links) return { save: null, saveAs: false };
    if (links.external) return { save: 'make', saveAs: false };
    if (!link) return { save: 'make', saveAs: false };
    if (!link.stale) return { save: null, saveAs: false };
    return { save: link.owned ? 'save' : 'new', saveAs: true };
  }
  /** v1 SettingsPanel › Connect: three 130×30 buttons. */
  private thirds() {
    const u = App.Unit, W = App.Width, y = this.cy + 5 * u;
    return [-210, -65, 80].map(dx => ({ x: W * 0.5 + dx * u, y, w: 130 * u, h: 30 * u, cx: W * 0.5 + (dx + 65) * u }));
  }
  /** OPEN, INSERT and (the user's own patches) a bin at the right: a small copy of v1's trash can. */
  private rowButtons(n: number) {
    const u = App.Unit, y = this.cy - 70 * u + n * 40 * u;
    const insert = this.bordered(COPY.insert, this.margin + this.pageW - 30 * u, y - 19 * u);
    const open = this.bordered(COPY.open, insert.x - 10 * u, y - 19 * u);
    return { open, insert, bin: { x: this.margin + this.pageW - 20 * u, y: y - 19 * u, w: 20 * u, h: 20 * u, cx: this.margin + this.pageW - 9 * u, cy: y - 9 * u } };
  }
  /** OPEN FROM YOUR DEVICE: the OPEN tab's main button (owner, 2026-11-10), v1's 420×40 GUIDE button (Settings ›
   * Connect) under the list, with the upload mark. On a phone v1 puts the page number and arrows in the middle of the
   * bottom row, so it goes beneath them. */
  private fileButton() {
    const u = App.Unit, y = this.cy + (this.mobile ? 195 : 175) * u;
    return { x: App.Width * 0.5 - 210 * u, y, w: 420 * u, h: 40 * u, cx: App.Width * 0.5 };
  }
  // ---- VIDEO tab layout (units from the panel centre) ----
  /** SHAPE (left half) and LENGTH (right half): each a press area under its label. */
  private videoControls() {
    const u = App.Unit, W = App.Width, y = this.cy - 70 * u;
    return { shape: { x: W * 0.5 - 210 * u, y, w: 202.5 * u, h: 100 * u, cx: W * 0.5 - 108.75 * u },
      length: { x: W * 0.5 + 7.5 * u, y, w: 202.5 * u, h: 100 * u, cx: W * 0.5 + 108.75 * u } };
  }
  /** MAKE VIDEO, then SHARE VIDEO: the OPEN tab's 420×40 GUIDE button. */
  private videoMain() {
    const u = App.Unit, W = App.Width;
    return { x: W * 0.5 - 210 * u, y: this.cy + 55 * u, w: 420 * u, h: 40 * u, cx: W * 0.5 };
  }
  /** v1 SharePanel's back chevron and its SKIP-style label. */
  private backArrow() {
    let arrowX = 275, arrowY = 0;
    if (this.tablet) arrowX = 245;
    if (this.mobile) { arrowX = 190; arrowY = 110; }
    return { arrowX, arrowY };
  }
  private get link() { return this.host.links?.current() ?? null; }

  Draw(): void {
    if (!this.shown) return;
    const ctx = this.Ctx, u = App.Unit, W = App.Width, txt = App.Palette[App.ThemeManager.Txt], tabY = this.OffsetY;

    // BG //
    App.FillColor(ctx, App.Palette[2]);
    ctx.globalAlpha = 0.95;
    ctx.fillRect(0, this.OffsetY, W, App.Height);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    App.FillColor(ctx, txt); App.StrokeColor(ctx, txt);

    // PANEL TITLE (v1 SettingsPanel: desktop only) //
    if (App.Metrics.Device === Device.desktop) { ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtHeader; ctx.fillText(COPY.panel.toUpperCase(), 20 * u, tabY + 41 * u); }

    // TABS (v1 SettingsPanel categories + MenuCategory.Draw) //
    const { tabs, half } = this.tabs(), h = Math.round(60 * u);
    App.StrokeColor(ctx, App.Palette[1]);
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - half, tabY + 60 * u - 1); ctx.lineTo(W * 0.5 + half, tabY + 60 * u - 1);
    for (let i = 1; i < tabs.length; i++) { const x = Math.round(tabs[i].x - tabs[i].w * 0.5); ctx.moveTo(x, tabY + 16 * u); ctx.lineTo(x, tabY + 44 * u); }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = App.Metrics.TxtMid;
    tabs.forEach((t, i) => {
      const s = this.selected[t.id], hw = t.w * 0.5, x = t.x;
      App.FillColor(ctx, App.Palette[App.ThemeManager.MenuOrder[i % App.ThemeManager.MenuOrder.length]]);
      ctx.beginPath();
      ctx.moveTo(x - hw, tabY); ctx.lineTo(x + hw, tabY); ctx.lineTo(x + hw, tabY + h * s); ctx.lineTo(x + 10 * u, tabY + h * s);
      ctx.lineTo(x, tabY + (h + 10 * u) * s); ctx.lineTo(x - 10 * u, tabY + h * s); ctx.lineTo(x - hw, tabY + h * s);
      ctx.closePath(); ctx.fill();
      App.FillColor(ctx, txt);
      ctx.fillText(t.name, x, tabY + h * 0.5 + 10 * u * 0.38);
    });

    // CLOSE (v1 SettingsPanel) //
    App.StrokeColor(ctx, txt);
    const closeY = tabY + 30 * u;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 + half + 12.5 * u, closeY - 7.5 * u); ctx.lineTo(W * 0.5 + half + 27.5 * u, closeY + 7.5 * u);
    ctx.moveTo(W * 0.5 + half + 27.5 * u, closeY - 7.5 * u); ctx.lineTo(W * 0.5 + half + 12.5 * u, closeY + 7.5 * u);
    ctx.stroke();

    if (this.Tab === 0) this.drawSave(); else if (this.Tab === 2) this.drawVideo(); else if (this.Tab === 3) this.drawAccount(); else if (this.Tab === 4) this.drawGallery(); else if (this.View === 'list') this.drawList(); else if (this.View === 'file') this.drawFile(); else if (this.View === 'remove') this.drawRemove(); else this.drawConfirm();
  }

  /** A filled button with v1's hover notch under its centre (SharePanel / SettingsPanel). */
  private filled(b: { x: number; y: number; w: number; h: number; cx: number }, colour: string, label: string, hover: boolean, font = App.Metrics.TxtUrl2, textDy = 29, text = App.Palette[App.ThemeManager.Txt]) {
    const ctx = this.Ctx, u = App.Unit;
    App.FillColor(ctx, colour);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (hover) { ctx.beginPath(); ctx.moveTo(b.cx, b.y + b.h + 9 * u); ctx.lineTo(b.cx - 10 * u, b.y + b.h - u); ctx.lineTo(b.cx + 10 * u, b.y + b.h - u); ctx.closePath(); ctx.fill(); }
    App.FillColor(ctx, text);
    ctx.textAlign = 'center';
    ctx.font = font;
    // v1's 24-unit type, narrowed to fit a half button when a label is longer than v1's ("OVERWRITE", "CREATE NEW").
    const w = ctx.measureText(label.toUpperCase()).width, max = b.w - 12 * u;
    if (w > max) { ctx.save(); ctx.translate(b.cx, 0); ctx.scale(max / w, 1); ctx.fillText(label.toUpperCase(), 0, b.y + textDy * u); ctx.restore(); }
    else ctx.fillText(label.toUpperCase(), b.cx, b.y + textDy * u);
  }
  private drawBordered(b: { label: string; x: number; y: number; w: number; h: number; textX: number; textY: number }, stroke: string, dx = 0) {
    const ctx = this.Ctx;
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'left';
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.fillText(b.label.toUpperCase(), b.textX + dx, b.textY);
    App.StrokeColor(ctx, stroke);
    ctx.beginPath(); ctx.rect(b.x + dx, b.y, b.w, b.h); ctx.stroke();
  }

  private drawSave(): void {
    const ctx = this.Ctx, u = App.Unit, W = App.Width, cy = this.cy, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    // NAME (v1 SharePanel TITLE) //
    ctx.font = App.Metrics.TxtMid;
    if (this.mobile) { ctx.textAlign = 'left'; ctx.fillText(COPY.name.toUpperCase(), W * 0.5 - 210 * u, cy - 150 * u); }
    else { ctx.textAlign = 'right'; ctx.fillText(COPY.name.toUpperCase(), W * 0.5 - 225 * u, cy - 106 * u); }
    App.StrokeColor(ctx, txt);
    ctx.beginPath(); ctx.moveTo(W * 0.5 - 210 * u, cy - 90 * u); ctx.lineTo(W * 0.5 + 210 * u, cy - 90 * u); ctx.stroke();
    this.drawBordered(this.randomise(), txt);

    const { share, save, saveAs } = this.saveButtons(), off = this.Saving || !this.host.hasBlocks(), links = this.host.links, link = this.link;
    const st = this.shareState();
    if (this.web) {
      // SAVE · SAVE AS · DOWNLOAD PATCH: v1 SharePanel's SAVE and SAVE AS colours, then the next menu colour. //
      const { font, dy } = this.threeFont();
      const fill = (isOff: boolean, c: string) => (isOff ? App.Palette[1] : c);
      const saveOff = off || !st.save, asOff = off || !st.saveAs;
      this.filled(share, fill(saveOff, App.Palette[menu[3]]), this.label('share', COPY.saveLink), !!this.roll.share && !saveOff, font, dy);
      this.filled(saveAs!, fill(asOff, App.Palette[menu[1]]), this.label('saveAs', COPY.saveAs), !!this.roll.saveAs && !asOff, font, dy);
      this.filled(save, fill(off, downloadColour()), this.label('save', COPY.download), !!this.roll.save && !off, font, dy, off ? App.Palette[App.ThemeManager.Txt] : '#000');
    } else {
      // Plugin: SAVE TO COMPUTER · CREATE SHARE LINK (v1 SAVE / SAVE AS), each with its line. //
      const { left } = this.halves();
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left'; App.FillColor(ctx, txt);
      this.wordWrap(COPY.saveLinePlugin, save.x, cy - 59 * u, 14 * u, save.w);
      this.wordWrap(COPY.shareLinePlugin, share.x, cy - 59 * u, 14 * u, share.w);
      // The left button is v1's SAVE colour, the right its SAVE AS colour.
      const colour = (b: { x: number }, isOff: boolean) => App.Palette[isOff ? 1 : b.x === left.x ? menu[3] : menu[1]];
      this.filled(save, colour(save, off), this.label('save', COPY.save), !!this.roll.save && !off);
      const shareOff = !links || off;
      this.filled(share, colour(share, shareOff), this.label('share', COPY.share), !!this.roll.share && !shareOff);
    }

    // THE LINK (v1 SharePanel's second page: its line + URL box; a click on it copies) //
    App.FillColor(ctx, txt);
    let warnY = cy + 75 * u;
    if (this.Saving) {
      ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
      ctx.fillText(COPY.saving.toUpperCase(), W * 0.5, cy + 75 * u);
      App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy + 50 * u, 16, true);
      warnY = cy + 105 * u;
    } else if (link) {
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
      this.wordWrap(this.label('url', COPY.linkLine), W * 0.5 - 210 * u, cy + 51 * u, 14 * u, 420 * u);
      App.FillColor(ctx, App.Palette[1]);
      ctx.fillRect(W * 0.5 - 210 * u, cy + 65 * u, 420 * u, 40 * u);
      warnY = cy + 135 * u;
    }
    // WARNINGS (v1 SharePanel) //
    if (!this.Saving) {
      App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
      const warn = !this.host.hasBlocks() ? App.L10n.UI.SharePanel.NoBlocks : links?.warning();
      if (warn) this.wordWrap(warn, W * 0.5 - 210 * u, warnY, 14 * u, 420 * u);
    }
  }

  private drawList(): void {
    const ctx = this.Ctx, u = App.Unit, cy = this.cy, margin = this.margin, pageW = this.pageW, W = App.Width, txt = App.Palette[App.ThemeManager.Txt];
    // HINT + RULE //
    App.FillColor(ctx, txt);
    ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
    ctx.fillText(COPY.openLine, margin, cy - 120 * u);
    App.StrokeColor(ctx, txt);
    ctx.beginPath(); ctx.moveTo(margin, cy - 110 * u); ctx.lineTo(margin + pageW, cy - 110 * u); ctx.stroke();

    // ROWS (v1 SoundcloudPanel track loop) //
    const n0 = this.Items.length;
    ctx.save();
    ctx.beginPath(); ctx.rect(margin - 5 * u, cy - 100 * u, pageW + 15 * u, 230 * u); ctx.clip();
    for (let i = 0; i < n0; i++) {
      const p = Math.floor(i / ITEMS), n = i - p * ITEMS;
      const x = this.OffsetX + (pageW + 10 * u) * p, y = cy - 70 * u + n * 40 * u;
      if (!(p > this.page - 3 && p < this.page + 1)) continue;
      if (n < 4 && i < n0 - 1) { App.StrokeColor(ctx, App.Palette[1]); ctx.beginPath(); ctx.moveTo(x + margin, y + 12 * u); ctx.lineTo(x + margin + pageW, y + 12 * u); ctx.stroke(); }
      const item = this.Items[i];
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic; ctx.textAlign = 'left';
      ctx.fillText(item.name.toUpperCase(), x + margin + u, y - 10 * u);
      ctx.fillText(item.detail, x + margin + u, y);
      // OPEN (text-colour border) and INSERT (the lighter rule colour): both explicit, Open the stronger.
      // No hover mark: v1's bordered buttons (Randomise Title, Search) have none.
      const b = this.rowButtons(n);
      this.drawBordered(b.open, txt, x);
      this.drawBordered(b.insert, App.Palette[1], x);
      if (item.removable) drawBin(ctx, b.bin.cx + x, b.bin.cy, p === this.page - 1 && !!this.roll[`bin${n}`] ? 0.55 * 1.2 : 0.55);
    }
    ctx.restore();

    // ITEM NUMBERS / EMPTY / LOADING //
    App.FillColor(ctx, txt);
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'left';
    if (n0 > 0) ctx.fillText(`${1 + ITEMS * (this.page - 1)} - ${Math.min(ITEMS * this.page, n0)} of ${n0}`, margin, cy + 160 * u);
    else if (this.Loading) App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy, 16, true);
    else { ctx.font = App.Metrics.TxtHeader; ctx.textAlign = 'center'; ctx.fillText(COPY.empty.toUpperCase(), W * 0.5, cy + 10 * u); }

    // PAGE NO + ARROWS (v1, per device) //
    let pageX = margin - 75 * u, pageY = -68, arrowX = 275, arrowY = 0;
    if (this.tablet) { pageX = margin - 45 * u; arrowX = 245; }
    if (this.mobile) { pageX = W * 0.5; pageY = 170; arrowX = 60; arrowY = 160; }
    if (n0 > ITEMS) { ctx.font = App.Metrics.TxtHeader; ctx.textAlign = 'center'; ctx.fillText(`${this.page}/${this.pages}`, pageX, cy + pageY * u); }
    for (const dir of [-1, 1]) {
      const live = dir < 0 ? this.page > 1 : this.page < this.pages;
      App.StrokeColor(ctx, live ? txt : App.Palette[1]);
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + dir * arrowX * u, cy + (arrowY - 20) * u);
      ctx.lineTo(W * 0.5 + dir * (arrowX + 20) * u, cy + arrowY * u);
      ctx.lineTo(W * 0.5 + dir * arrowX * u, cy + (arrowY + 20) * u);
      ctx.stroke();
    }

    // OPEN FROM YOUR DEVICE (v1 GUIDE button: SAVE colour, URL type, hover notch) + the upload mark left of its label //
    const f = this.fileButton();
    ctx.font = App.Metrics.TxtUrl2;
    const lw = ctx.measureText(COPY.file.toUpperCase()).width, mark = 22 * u;
    this.filled({ ...f, cx: f.cx + mark / 2 }, App.Palette[App.ThemeManager.MenuOrder[3]], COPY.file, false);
    if (this.roll.file) {  // the notch stays under the button's centre
      App.FillColor(ctx, App.Palette[App.ThemeManager.MenuOrder[3]]);
      ctx.beginPath(); ctx.moveTo(f.cx, f.y + f.h + 9 * u); ctx.lineTo(f.cx - 10 * u, f.y + f.h - u); ctx.lineTo(f.cx + 10 * u, f.y + f.h - u); ctx.closePath(); ctx.fill();
    }
    drawUploadMark(ctx, f.cx - lw / 2 - 4 * u, f.y + 15 * u);  // 8 units left of the label, centred together
  }

  /** The heading of the file and confirm steps: v1's header type over italic copy (SharePanel title + share line). */
  private heading(title: string, line: string): void {
    const ctx = this.Ctx, u = App.Unit, cy = this.cy;
    App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.textAlign = 'left'; ctx.font = App.Metrics.TxtHeader;
    // A long patch name is narrowed to the page width rather than run off it.
    const w = ctx.measureText(title.toUpperCase()).width;
    if (w > this.pageW) { ctx.save(); ctx.translate(this.margin, 0); ctx.scale(this.pageW / w, 1); ctx.fillText(title.toUpperCase(), 0, cy - 72 * u); ctx.restore(); }
    else ctx.fillText(title.toUpperCase(), this.margin, cy - 72 * u);
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath(); ctx.moveTo(this.margin, cy - 60 * u); ctx.lineTo(this.margin + this.pageW, cy - 60 * u); ctx.stroke();
    ctx.font = App.Metrics.TxtItalic2;
    this.wordWrap(line, this.margin, cy - 40 * u, 14 * u, this.pageW);
  }
  private drawBack(): void {
    const ctx = this.Ctx, u = App.Unit, W = App.Width, cy = this.cy, { arrowX, arrowY } = this.backArrow();
    App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]); App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - arrowX * u, cy + (arrowY - 20) * u);
    ctx.lineTo(W * 0.5 - (arrowX + 20) * u, cy + arrowY * u);
    ctx.lineTo(W * 0.5 - arrowX * u, cy + (arrowY + 20) * u);
    ctx.stroke();
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
    ctx.fillText(COPY.back.toUpperCase(), W * 0.5 - arrowX * u, cy + (arrowY + 35) * u);
  }
  private drawFile(): void {
    const f = this.Picked, u = App.Unit, menu = App.ThemeManager.MenuOrder;
    if (!f) return;
    this.heading(f.error ? 'Not a BlokDust patch' : f.title, f.error ?? f.fileName);
    if (!f.error) {
      const { left, right } = this.halves(), ctx = this.Ctx;
      for (const b of [left, right]) b.y = this.cy + 5 * u;
      this.filled(left, App.Palette[menu[3]], COPY.open, !!this.roll.fileOpen);
      this.filled(right, App.Palette[menu[1]], COPY.insert, !!this.roll.fileInsert);
      App.FillColor(ctx, App.Palette[App.ThemeManager.Txt]);
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'center';
      ctx.fillText(COPY.openDesc, left.cx, this.cy + 70 * u);
      ctx.fillText(COPY.insertDesc, right.cx, this.cy + 70 * u);
    }
    this.drawBack();
  }
  /** Delete one of the user's patches: v1's CANCEL-coloured and SAVE-coloured half buttons. */
  private drawRemove(): void {
    const item = this.removing, menu = App.ThemeManager.MenuOrder, u = App.Unit, { left, right } = this.halves();
    if (!item) return;
    this.heading(`${COPY.remove} ${item.name}?`, this.host.removeLine);
    for (const b of [left, right]) b.y = this.cy + 5 * u;
    this.filled(left, App.Palette[1], COPY.cancel, !!this.roll.removeCancel);
    this.filled(right, App.Palette[menu[3]], COPY.removeButton, !!this.roll.removeOk);
  }
  private drawConfirm(): void {
    const menu = App.ThemeManager.MenuOrder, [a, b, c] = this.thirds();
    this.heading(COPY.confirm, COPY.confirmLine);
    const font = App.Metrics.TxtMid;
    this.filled(a, App.Palette[1], COPY.cancel, !!this.roll.cancel, font, 18.5);
    this.filled(b, App.Palette[menu[1]], this.Saving ? COPY.saving : COPY.saveFirst, !!this.roll.saveFirst && !this.Saving, font, 18.5);
    this.filled(c, App.Palette[menu[3]], COPY.openAnyway, !!this.roll.openAnyway, font, 18.5);
  }

  private drawVideo(): void {
    const ctx = this.Ctx, u = App.Unit, W = App.Width, cy = this.cy, margin = this.margin, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    // HINT + RULE (the OPEN tab's) //
    App.FillColor(ctx, txt);
    ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
    ctx.fillText(COPY.videoLine, margin, cy - 120 * u);
    App.StrokeColor(ctx, txt);
    ctx.beginPath(); ctx.moveTo(margin, cy - 110 * u); ctx.lineTo(margin + this.pageW, cy - 110 * u); ctx.stroke();

    // SHAPE: a frame of the video's shape (Instagram's crop icons: a rounded outline round a filled inner frame) //
    const c = this.videoControls(), busy = this.VideoState === 'making';
    App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
    ctx.fillText(COPY.shape.toUpperCase(), c.shape.cx, c.shape.y + 10 * u);
    ctx.fillText(COPY.length.toUpperCase(), c.length.cx, c.length.y + 10 * u);
    const { w: fw, h: fh } = { portrait: { w: 20, h: 34 }, wide: { w: 34, h: 20 }, square: { w: 28, h: 28 } }[this.Video.shape];
    const fx = c.shape.cx - (fw * u) / 2, fy = c.shape.y + 44 * u - (fh * u) / 2, hot = !busy && !!this.roll.shape;
    App.StrokeColor(ctx, txt); ctx.lineWidth = Math.max(2, 2.5 * u);
    roundRect(ctx, fx, fy, fw * u, fh * u, 5 * u); ctx.stroke();
    ctx.globalAlpha = hot ? 1 : 0.85;
    roundRect(ctx, fx + 5 * u, fy + 5 * u, (fw - 10) * u, (fh - 10) * u, 2.5 * u); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.font = App.Metrics.TxtMid;
    ctx.fillText(SHAPE_NAMES[this.Video.shape].toUpperCase(), c.shape.cx, c.shape.y + 86 * u);

    // LENGTH: the seconds, underlined (pressing cycles 15 · 30 · 60) //
    ctx.font = App.Metrics.TxtUrl2;
    const len = `${this.Video.seconds} SECONDS`, lw = ctx.measureText(len).width, ly = c.length.y + 54 * u;
    ctx.fillText(len, c.length.cx, ly);
    ctx.beginPath(); ctx.moveTo(c.length.cx - lw / 2, ly + 6 * u); ctx.lineTo(c.length.cx + lw / 2, ly + 6 * u);
    ctx.lineWidth = !busy && this.roll.length ? 2 : 1; ctx.stroke(); ctx.lineWidth = 2;

    // MAKE VIDEO / CANCEL, then SHARE VIDEO //
    const m = this.videoMain();
    if (this.VideoState === 'ready') this.filled(m, App.Palette[menu[3]], COPY.shareVideo, !!this.roll.shareVideo);
    else if (busy) this.filled(m, App.Palette[1], COPY.cancelVideo, !!this.roll.make);
    else this.filled(m, App.Palette[menu[3]], COPY.makeVideo, !!this.roll.make && this.host.hasBlocks());

    // PROGRESS (SharePanel's "saving…" spinner) or the message //
    App.FillColor(ctx, txt);
    if (busy) {
      const label = `${COPY.rendering}... ${Math.floor(this.VideoProgress.done * 100)}%`;
      ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), W * 0.5, cy + 145 * u);
      App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy + 120 * u, 16, true);
    } else {
      const line = this.VideoState === 'ready' ? COPY.videoReady
        : this.VideoState === 'error' ? this.VideoMessage : !this.host.hasBlocks() ? App.L10n.UI.SharePanel.NoBlocks : '';
      if (line) { ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left'; this.wordWrap(line, margin, cy + 120 * u, 14 * u, this.pageW); }
    }
  }

  /** Any change to the choice drops a made video (it no longer matches). */
  private chooseVideo(c: Partial<VideoChoice>): void {
    if (this.VideoState === 'making') return;
    this.Video = { ...this.Video, ...c };
    this.VideoState = 'idle'; this.videoFile = null; this.VideoMessage = '';
  }
  private async makeVideo(): Promise<void> {
    const v = this.host.video;
    if (!v || this.VideoState === 'making' || !this.host.hasBlocks()) return;
    const abort = this.videoAbort = new AbortController();
    this.VideoState = 'making'; this.VideoProgress = { phase: 'preparing', done: 0 }; this.videoFile = null; this.VideoMessage = '';
    // Only the current render may change the panel: a cancelled one winds down on its own (CANCEL takes effect at once).
    const current = () => this.videoAbort === abort;
    try {
      const file = await v.make(this.Video, p => { if (current()) this.VideoProgress = p; }, abort.signal);
      if (current()) { this.videoFile = file; this.VideoState = 'ready'; }
    } catch (e) {
      if (current()) { this.VideoState = 'error'; this.VideoMessage = (e as Error).message || 'The video could not be made.'; }
    } finally { if (current()) this.videoAbort = null; this.settled(); }
  }
  /** CANCEL: the panel is free at once; the render stops at its next check. */
  private cancelVideo(): void {
    this.videoAbort?.abort();
    this.videoAbort = null;
    this.VideoState = 'idle'; this.VideoMessage = '';
  }

  // ---- GALLERY tab (CHG-0024) ----
  // v1 SoundcloudPanel's layout: the search field and its rule and bordered SEARCH, then five rows a page with their
  // count, page number and arrows; each row's bordered buttons (OPEN · LIKE · REPORT, or UNPUBLISH on your own);
  // SORT as the VIDEO tab's underlined cycling control; PUBLISH THIS PATCH as the OPEN tab's GUIDE button.
  private galleryLayout() {
    const u = App.Unit, W = App.Width, cy = this.cy, right = this.margin + this.pageW;
    const search = this.bordered(COPY.search, right, cy - 155 * u);
    return { search, sortY: cy - 108 * u, sortRight: right,
      publish: { x: W * 0.5 - 210 * u, y: cy + (this.mobile ? 195 : 175) * u, w: 420 * u, h: 40 * u, cx: W * 0.5 } };
  }
  private galleryRow(n: number) {
    const u = App.Unit, y = this.cy - 70 * u + n * 40 * u, right = this.margin + this.pageW;
    const rep = this.bordered(COPY.report, right, y - 19 * u);
    const item = this.GalleryItems[n];
    const likeLabel = item ? `${item.liked ? COPY.liked : COPY.like} ${item.likes}` : COPY.like;
    const mine = !!item?.mine;
    const unpub = this.bordered(COPY.unpublish, right, y - 19 * u);
    const like = this.bordered(likeLabel, (mine ? unpub.x : rep.x) - 8 * u, y - 19 * u);
    const open = this.bordered(COPY.open, like.x - 8 * u, y - 19 * u);
    return { open, like, report: rep, unpublish: unpub, mine, textRight: open.x - 6 * u };
  }
  private sortLabel() { return (this.GallerySort === 'popular' ? COPY.popular : COPY.newest).toUpperCase(); }
  private drawGallery(): void {
    const ctx = this.Ctx, u = App.Unit, W = App.Width, cy = this.cy, margin = this.margin, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    if (this.GalleryView === 'report' && this.reporting) {
      this.heading(COPY.reportTitle, COPY.reportLine);
      const { left, right } = this.halves();
      for (const h of [left, right]) h.y = cy + 5 * u;
      this.filled(left, App.Palette[1], COPY.cancel, !!this.roll.reportCancel);
      this.filled(right, App.Palette[menu[3]], COPY.report, !!this.roll.reportOk);
      return;
    }
    const L = this.galleryLayout();
    // SEARCH (v1 SoundcloudPanel: the field over a rule, SEARCH bordered at its right) //
    App.StrokeColor(ctx, txt);
    ctx.beginPath(); ctx.moveTo(margin, cy - 135 * u); ctx.lineTo(margin + this.pageW, cy - 135 * u); ctx.stroke();
    this.drawBordered(L.search, txt);
    // The line, and SORT (underlined, cycles) //
    App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
    ctx.fillText(COPY.galleryLine, margin, L.sortY);
    ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'right';
    const sl = this.sortLabel(), sw = ctx.measureText(sl).width;
    ctx.fillText(sl, L.sortRight, L.sortY);
    ctx.beginPath(); ctx.moveTo(L.sortRight - sw, L.sortY + 4 * u); ctx.lineTo(L.sortRight, L.sortY + 4 * u);
    ctx.lineWidth = this.roll.sort ? 2 : 1; ctx.stroke(); ctx.lineWidth = 2;
    // ROWS //
    const n0 = this.GalleryItems.length;
    for (let n = 0; n < Math.min(n0, ITEMS); n++) {
      const y = cy - 70 * u + n * 40 * u, it = this.GalleryItems[n], b = this.galleryRow(n);
      if (n < Math.min(n0, ITEMS) - 1) { App.StrokeColor(ctx, App.Palette[1]); ctx.beginPath(); ctx.moveTo(margin, y + 12 * u); ctx.lineTo(margin + this.pageW, y + 12 * u); ctx.stroke(); }
      App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic; ctx.textAlign = 'left';
      const maxW = b.textRight - margin - u;
      const fit = (t: string, yy: number) => { const w = ctx.measureText(t).width; if (w <= maxW) { ctx.fillText(t, margin + u, yy); return; } ctx.save(); ctx.translate(margin + u, yy); ctx.scale(maxW / w, 1); ctx.fillText(t, 0, 0); ctx.restore(); };
      fit(it.title.toUpperCase(), y - 10 * u);
      fit(`${COPY.by} @${it.by}${it.remixes ? ` \u00b7 ${it.remixes} remix${it.remixes === 1 ? '' : 'es'}` : ''}`, y);
      this.drawBordered(b.open, txt);
      this.drawBordered(b.like, it.liked ? txt : App.Palette[1]);
      this.drawBordered(b.mine ? b.unpublish : b.report, App.Palette[1]);
    }
    App.FillColor(ctx, txt);
    if (!n0 && this.GalleryLoading) App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy, 16, true);
    else if (!n0) { ctx.font = App.Metrics.TxtHeader; ctx.textAlign = 'center'; ctx.fillText(COPY.noneYet.toUpperCase(), W * 0.5, cy + 10 * u); }
    else { ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'left'; ctx.fillText(`${1 + ITEMS * (this.GalleryPage - 1)} - ${ITEMS * (this.GalleryPage - 1) + Math.min(n0, ITEMS)}`, margin, cy + 160 * u); }
    // PAGE ARROWS (v1, per device) //
    let arrowX = 275, arrowY = 0;
    if (this.tablet) arrowX = 245;
    if (this.mobile) { arrowX = 60; arrowY = 160; }
    for (const dir of [-1, 1]) {
      const live = dir < 0 ? this.GalleryPage > 1 : this.GalleryMore;
      App.StrokeColor(ctx, live ? txt : App.Palette[1]);
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + dir * arrowX * u, cy + (arrowY - 20) * u); ctx.lineTo(W * 0.5 + dir * (arrowX + 20) * u, cy + arrowY * u); ctx.lineTo(W * 0.5 + dir * arrowX * u, cy + (arrowY + 20) * u);
      ctx.stroke();
    }
    // PUBLISH THIS PATCH (the OPEN tab's GUIDE button) and the message //
    this.filled(L.publish, App.Palette[this.GalleryLoading ? 1 : menu[3]], this.GalleryLoading ? COPY.publishing : COPY.publish, !this.GalleryLoading && !!this.roll.publish && this.host.hasBlocks());
    if (this.GalleryMessage) { App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left'; this.wordWrap(this.GalleryMessage, margin, L.publish.y + 60 * u, 14 * u, this.pageW); }
  }
  /** Fetch the page shown (stale answers, from an earlier search or page, are dropped). */
  async browse(): Promise<void> {
    const g = this.host.gallery;
    if (!g) return;
    const ask = ++this.galleryAsk;
    this.GalleryLoading = true; this.showDom();
    try {
      const r = await g.browse(this.GallerySort, this.GalleryQuery, this.GalleryPage);
      if (ask !== this.galleryAsk) return;
      this.GalleryItems = r?.items ?? []; this.GalleryMore = !!r?.more;
      if (!r) this.GalleryMessage = 'The gallery is not available here.';
    } catch (e) { if (ask === this.galleryAsk) this.GalleryMessage = (e as Error).message; }
    finally { if (ask === this.galleryAsk) { this.GalleryLoading = false; this.settled(); } }
  }
  private async galleryAction(run: () => Promise<string | void>): Promise<void> {
    if (this.GalleryLoading) return;
    this.GalleryLoading = true; this.GalleryMessage = '';
    try { const msg = await run(); if (msg) this.GalleryMessage = msg; }
    catch (e) { this.GalleryMessage = (e as Error).message || 'That did not work. Try again.'; }
    finally { this.GalleryLoading = false; this.settled(); }
    await this.browse();
  }

  // ---- ACCOUNT tab (CHG-0023) ----
  private accountButtons() {
    const u = App.Unit, W = App.Width, cy = this.cy, y = cy - 40 * u;
    const half = (dx: number) => ({ x: W * 0.5 + dx * u, y, w: 202.5 * u, h: 40 * u, cx: W * 0.5 + (dx + 101.25) * u });
    const full = { x: W * 0.5 - 210 * u, y, w: 420 * u, h: 40 * u, cx: W * 0.5 };
    const allW = this.textW(COPY.signOutAll);
    return { left: half(-210), right: half(7.5), full,
      create: this.bordered(COPY.create, W * 0.5 + 210 * u, cy + 30 * u),
      signOutAll: this.bordered(COPY.signOutAll, W * 0.5 - 200 * u + allW, cy + 30 * u),
      deleteAccount: this.bordered(COPY.deleteAccount, W * 0.5 + 210 * u, cy + 30 * u),
      submit: { x: W * 0.5 - 210 * u, y: cy + 40 * u, w: 420 * u, h: 40 * u, cx: W * 0.5 } };
  }
  private drawAccount(): void {
    const ctx = this.Ctx, u = App.Unit, W = App.Width, cy = this.cy, margin = this.margin, txt = App.Palette[App.ThemeManager.Txt], menu = App.ThemeManager.MenuOrder;
    const b = this.accountButtons(), busy = this.AccountBusy;
    if (this.AccountView === 'create' || this.AccountView === 'name') {
      const create = this.AccountView === 'create';
      this.heading(create ? COPY.createTitle : COPY.nameTitle, create ? COPY.createLine : COPY.nameLine);
      // NAME (the SAVE tab's label, field and rule) //
      App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'right';
      if (!this.mobile) ctx.fillText(COPY.handle.toUpperCase(), W * 0.5 - 225 * u, cy + 4 * u);
      App.StrokeColor(ctx, txt);
      ctx.beginPath(); ctx.moveTo(W * 0.5 - 210 * u, cy + 20 * u); ctx.lineTo(W * 0.5 + 210 * u, cy + 20 * u); ctx.stroke();
      this.filled(b.submit, App.Palette[busy ? 1 : menu[3]], busy ? COPY.working : create ? COPY.createButton : COPY.saveName, !busy && !!this.roll.submit);
      if (create) this.drawBack();
    } else if (this.AccountView === 'delete') {
      this.heading(COPY.deleteTitle, COPY.deleteLine);
      const { left, right } = this.halves();
      for (const h of [left, right]) h.y = cy + 5 * u;
      this.filled(left, App.Palette[1], COPY.cancel, !!this.roll.deleteCancel);
      this.filled(right, App.Palette[menu[3]], busy ? COPY.working : COPY.deleteAccount, !busy && !!this.roll.deleteOk);
    } else if (this.Account) {
      // SIGNED IN AS <NAME> (the panel title's header type) //
      App.FillColor(ctx, txt); ctx.textAlign = 'left';
      ctx.font = App.Metrics.TxtMid; ctx.fillText(COPY.signedInAs.toUpperCase(), margin, cy - 130 * u);
      ctx.font = App.Metrics.TxtHeader; ctx.fillText((this.Account.handle ?? '').toUpperCase(), margin, cy - 96 * u);
      App.StrokeColor(ctx, txt);
      ctx.beginPath(); ctx.moveTo(margin, cy - 84 * u); ctx.lineTo(margin + this.pageW, cy - 84 * u); ctx.stroke();
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
      this.wordWrap(COPY.signedInLine, margin, cy - 64 * u, 14 * u, this.pageW);
      this.filled(b.left, App.Palette[busy ? 1 : menu[1]], COPY.addPasskey, !busy && !!this.roll.addPasskey, App.Metrics.TxtMid, 25);
      this.filled(b.right, App.Palette[busy ? 1 : menu[3]], COPY.signOut, !busy && !!this.roll.signOut, App.Metrics.TxtMid, 25);
      this.drawBordered(b.signOutAll, App.Palette[1]);
      this.drawBordered(b.deleteAccount, App.Palette[1]);
    } else {
      // SIGNED OUT //
      App.FillColor(ctx, txt);
      ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
      this.wordWrap(this.noBackend ? COPY.noAccounts : COPY.accountLine, margin, cy - 120 * u, 14 * u, this.pageW);
      App.StrokeColor(ctx, txt);
      ctx.beginPath(); ctx.moveTo(margin, cy - 90 * u); ctx.lineTo(margin + this.pageW, cy - 90 * u); ctx.stroke();
      if (this.Account === undefined && !this.noBackend) App.AnimationsLayer.DrawSprite(ctx, 'loading', W * 0.5, cy - 20 * u, 16, true);
      else if (!this.noBackend) {
        if (this.googleOn) {
          this.filled(b.left, App.Palette[busy ? 1 : menu[3]], COPY.passkey, !busy && !!this.roll.passkey, App.Metrics.TxtMid, 25);
          this.filled(b.right, App.Palette[busy ? 1 : menu[1]], COPY.google, !busy && !!this.roll.google, App.Metrics.TxtMid, 25);
        } else this.filled(b.full, App.Palette[busy ? 1 : menu[3]], COPY.passkey, !busy && !!this.roll.passkey);
        App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
        ctx.fillText(COPY.newHere, margin, b.create.textY);
        this.drawBordered(b.create, txt);
      }
    }
    if (this.AccountMessage) {
      App.FillColor(ctx, txt); ctx.font = App.Metrics.TxtItalic2; ctx.textAlign = 'left';
      this.wordWrap(this.AccountMessage, margin, cy + (this.AccountView === 'main' ? 90 : 110) * u, 14 * u, this.pageW);
    }
  }
  /** Ask who is signed in (on opening the tab, and after any change). */
  async refreshAccount(): Promise<void> {
    const a = this.host.account;
    if (!a) return;
    const m = await a.me();
    this.noBackend = !m;
    this.googleOn = !!m?.google;
    this.Account = m?.user ?? null;
    // A new Google account has no name yet: ask for one (R6).
    if (this.Account && !this.Account.handle && this.AccountView === 'main') { this.AccountView = 'name'; this.HandleInput.value = ''; }
    if (!this.Account && this.AccountView === 'name') this.AccountView = 'main';
    this.settled(); this.showDom();
  }
  /** Run an account action: busy meanwhile, the error (not a cancelled passkey dialog) shown after. */
  private async accountAction(run: () => Promise<void>, then: 'main' | null = 'main'): Promise<boolean> {
    const a = this.host.account;
    if (!a || this.AccountBusy) return false;
    this.AccountBusy = true; this.AccountMessage = ''; this.showDom();
    try { await run(); if (then) this.AccountView = then; await this.refreshAccount(); return true; }
    catch (e) { if (!a.cancelled(e)) this.AccountMessage = (e as Error).message || 'That did not work. Try again.'; return false; }
    finally { this.AccountBusy = false; this.settled(); this.showDom(); }
  }
  private async submitHandle(): Promise<void> {
    const a = this.host.account, h = this.HandleInput.value.trim().toLowerCase();
    if (!a) return;
    if (!h) { this.AccountMessage = 'Choose a name first.'; return; }
    if (this.AccountView === 'create') await this.accountAction(() => a.signUp(h));
    else if (this.AccountView === 'name') await this.accountAction(() => a.setHandle(h));
  }

  /** v1 SharePanel.WordWrap. */
  private wordWrap(text: string, x: number, y: number, lineHeight: number, fitWidth: number): void {
    const ctx = this.Ctx;
    let words = text.split(' '), line = 0, idx = 1;
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
    const u = App.Unit, W = App.Width, cy = this.cy, hit = (x: number, y: number, w: number, h: number) => Dimensions.hitRect(x, y, w, h, pt.x, pt.y);
    const { tabs, half } = this.tabs(), tabY = this.OffsetY;
    const r: Record<string, boolean> = { close: hit(W * 0.5 + half, tabY + 10 * u, 40 * u, 40 * u) };
    tabs.forEach(t => { r[`tab${t.id}`] = hit(t.x - t.w * 0.5, tabY, t.w, 60 * u); });
    const box = (b: { x: number; y: number; w: number; h: number }) => hit(b.x, b.y, b.w, b.h);
    const pad = (b: { x: number; y: number; w: number }) => hit(b.x - 5 * u, b.y - 10 * u, b.w + 10 * u, 40 * u);
    if (this.Tab === 4) {
      if (this.GalleryView === 'report') {
        const { left, right } = this.halves();
        for (const h of [left, right]) h.y = cy + 5 * u;
        r.reportCancel = box(left); r.reportOk = box(right);
      } else {
        const L = this.galleryLayout();
        r.search = pad(L.search); r.publish = box(L.publish);
        this.Ctx.font = App.Metrics.TxtMid;
        const sw = this.Ctx.measureText(this.sortLabel()).width;
        r.sort = hit(L.sortRight - sw - 5 * u, L.sortY - 20 * u, sw + 10 * u, 30 * u);
        let arrowX = 285, arrowY = 0;
        if (this.tablet) arrowX = 255;
        if (this.mobile) { arrowX = 70; arrowY = 160; }
        r.back = hit(W * 0.5 - (arrowX + 15) * u, cy + (arrowY - 20) * u, 30 * u, 40 * u);
        r.next = hit(W * 0.5 + (arrowX - 15) * u, cy + (arrowY - 20) * u, 30 * u, 40 * u);
        for (let n = 0; n < Math.min(ITEMS, this.GalleryItems.length); n++) {
          const b = this.galleryRow(n);
          r[`gopen${n}`] = pad(b.open); r[`glike${n}`] = pad(b.like);
          if (b.mine) r[`gunpub${n}`] = pad(b.unpublish); else r[`greport${n}`] = pad(b.report);
        }
      }
    } else if (this.Tab === 3) {
      const b = this.accountButtons();
      if (this.AccountView === 'create' || this.AccountView === 'name') {
        r.submit = box(b.submit);
        const { arrowX, arrowY } = this.backArrow();
        r.accountBack = this.AccountView === 'create' && hit(W * 0.5 - (arrowX + 15) * u, cy + (arrowY - 20) * u, 30 * u, 60 * u);
      } else if (this.AccountView === 'delete') {
        const { left, right } = this.halves();
        for (const h of [left, right]) h.y = cy + 5 * u;
        r.deleteCancel = box(left); r.deleteOk = box(right);
      } else if (this.Account) {
        r.addPasskey = box(b.left); r.signOut = box(b.right); r.signOutAll = pad(b.signOutAll); r.deleteAccount = pad(b.deleteAccount);
      } else if (this.Account === null && !this.noBackend) {
        if (this.googleOn) { r.passkey = box(b.left); r.google = box(b.right); } else r.passkey = box(b.full);
        r.create = pad(b.create);
      }
    } else if (this.Tab === 2) {
      const c = this.videoControls(), m = this.videoMain();
      r.shape = box(c.shape); r.length = box(c.length);
      if (this.VideoState === 'ready') r.shareVideo = box(m); else r.make = box(m);
    } else if (this.Tab === 0) {
      const { share, save, saveAs } = this.saveButtons();
      r.randomise = pad(this.randomise());
      r.save = box(save); r.share = box(share); r.saveAs = !!saveAs && box(saveAs);
      r.url = !!this.link && !this.Saving && hit(W * 0.5 - 210 * u, cy + 65 * u, 420 * u, 40 * u);
    } else if (this.View === 'list') {
      let arrowX = 285, arrowY = 0;
      if (this.tablet) arrowX = 255;
      if (this.mobile) { arrowX = 70; arrowY = 160; }
      const f = this.fileButton();
      r.back = hit(W * 0.5 - (arrowX + 15) * u, cy + (arrowY - 20) * u, 30 * u, 40 * u);
      r.next = hit(W * 0.5 + (arrowX - 15) * u, cy + (arrowY - 20) * u, 30 * u, 40 * u);
      r.file = box(f);
      for (let n = 0; n < ITEMS; n++) {
        const b = this.rowButtons(n), item = this.Items[(this.page - 1) * ITEMS + n];
        r[`open${n}`] = pad(b.open); r[`ins${n}`] = pad(b.insert);
        r[`bin${n}`] = !!item?.removable && hit(b.bin.x, b.bin.y - 10 * u, b.bin.w + 5 * u, 40 * u);
      }
    } else {
      const { arrowX, arrowY } = this.backArrow();
      if (this.View === 'remove') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * u;
        r.removeCancel = box(left); r.removeOk = box(right);
      } else if (this.View === 'file') {
        const { left, right } = this.halves();
        for (const b of [left, right]) b.y = cy + 5 * u;
        r.fileOpen = !this.Picked?.error && box(left); r.fileInsert = !this.Picked?.error && box(right);
        r.fileBack = hit(W * 0.5 - (arrowX + 15) * u, cy + (arrowY - 20) * u, 30 * u, 60 * u);
      } else {
        const [a, b, c] = this.thirds();
        r.cancel = box(a); r.saveFirst = box(b); r.openAnyway = box(c);
      }
    }
    this.roll = r;
  }
  /** Tests: the centre of a control in CSS px (tab0, tab1, close, randomise, save (web: DOWNLOAD PATCH), share (web:
   * SAVE), saveAs, url, open<n>,
   * ins<n>, file, fileOpen, fileInsert, fileBack, cancel, saveFirst, openAnyway). */
  centreOf(name: string): [number, number] | null {
    const u = App.Unit, pr = App.Metrics.PixelRatio, at = (x: number, y: number): [number, number] => [x / pr, y / pr];
    const mid = (b: { x: number; y: number; w: number; h: number }) => at(b.x + b.w / 2, b.y + b.h / 2);
    const m = /^(open|ins|bin)(\d)$/.exec(name);
    if (m) { const b = this.rowButtons(Number(m[2])); return mid(m[1] === 'open' ? b.open : m[1] === 'ins' ? b.insert : b.bin); }
    {
      const gm = /^g(open|like|report|unpub)(\d)$/.exec(name);
      if (gm) { const b = this.galleryRow(Number(gm[2])); return mid(gm[1] === 'open' ? b.open : gm[1] === 'like' ? b.like : gm[1] === 'report' ? b.report : b.unpublish); }
      const L = this.galleryLayout();
      if (name === 'search') return mid(L.search);
      if (name === 'publish') return mid(L.publish);
      if (name === 'sort') return at(L.sortRight - 15 * u, L.sortY - 5 * u);
      if (name === 'galleryField') return at(this.margin + 100 * u, this.cy - 150 * u);
      if (name === 'reportCancel' || name === 'reportOk') { const { left, right } = this.halves(); return at((name === 'reportOk' ? right : left).cx, this.cy + 25 * u); }
      if (name === 'galleryNext' || name === 'galleryBack') {
        let arrowX = 285, arrowY = 0;
        if (this.tablet) arrowX = 255;
        if (this.mobile) { arrowX = 70; arrowY = 160; }
        return at(App.Width * 0.5 + (name === 'galleryNext' ? 1 : -1) * arrowX * u, this.cy + arrowY * u);
      }
    }
    if (name === 'shape' || name === 'length') return mid(this.videoControls()[name]);
    if (name === 'make' || name === 'shareVideo') return mid(this.videoMain());
    {
      const b = this.accountButtons(), { left, right } = this.halves();
      const acct: Record<string, { x: number; y: number; w: number; h: number }> = {
        passkey: this.googleOn ? b.left : b.full, google: b.right, create: b.create, submit: b.submit, addPasskey: b.left, signOut: b.right,
        signOutAll: b.signOutAll, deleteAccount: b.deleteAccount, deleteCancel: { ...left, y: this.cy + 5 * u }, deleteOk: { ...right, y: this.cy + 5 * u },
      };
      if (acct[name]) return mid(acct[name]);
    }
    const t = /^tab(\d)$/.exec(name);
    if (t) { const tab = this.tabs().tabs.find(x => x.id === Number(t[1])); return tab ? at(tab.x, this.OffsetY + 30 * u) : null; }
    const { left, right } = this.halves(), [a, b, c] = this.thirds(), f = this.fileButton(), { arrowX, arrowY } = this.backArrow();
    switch (name) {
      case 'close': return at(App.Width * 0.5 + this.tabs().half + 20 * u, this.OffsetY + 30 * u);
      case 'randomise': return mid(this.randomise());
      case 'save': return mid(this.saveButtons().save);
      case 'share': return mid(this.saveButtons().share);
      case 'saveAs': { const b = this.saveButtons().saveAs; return b ? mid(b) : null; }
      case 'url': return at(App.Width * 0.5, this.cy + 85 * u);
      case 'file': return mid(f);
      case 'fileOpen': return at(left.cx, this.cy + 25 * u);
      case 'fileInsert': return at(right.cx, this.cy + 25 * u);
      case 'fileBack': return at(App.Width * 0.5 - (arrowX + 10) * u, this.cy + arrowY * u);
      case 'removeCancel': return at(left.cx, this.cy + 25 * u);
      case 'removeOk': return at(right.cx, this.cy + 25 * u);
      case 'cancel': return mid(a);
      case 'saveFirst': return mid(b);
      case 'openAnyway': return mid(c);
    }
    return null;
  }
  get Hover(): boolean { return Object.values(this.roll).some(Boolean); }

  MouseMove(pt: { x: number; y: number }): void { this.HitTests(pt); }
  MouseUp(): void {}
  MouseDown(pt: { x: number; y: number }): void {
    this.HitTests(pt);
    const r = this.roll;
    if (r.close) { this.ClosePanel(); return; }
    for (const i of ALL_TABS) if (r[`tab${i}`]) { this.selectTab(i); try { localStorage.setItem(TAB_KEY, String(i)); } catch { /* private mode */ } return; }
    if (this.Tab === 4) {
      const g = this.host.gallery;
      if (!g) return;
      if (this.GalleryView === 'report') {
        const row = this.reporting;
        if (r.reportCancel) { this.GalleryView = 'list'; this.reporting = null; return; }
        if (r.reportOk && row) { this.GalleryView = 'list'; this.reporting = null; void this.galleryAction(async () => { await g.report(row.id); return COPY.reported; }); }
        return;
      }
      if (r.search) { this.GalleryQuery = this.SearchInput.value.trim(); this.GalleryPage = 1; void this.browse(); return; }
      if (r.sort) { this.GallerySort = this.GallerySort === 'popular' ? 'new' : 'popular'; this.GalleryPage = 1; void this.browse(); return; }
      if (r.back) { if (this.GalleryPage > 1) { this.GalleryPage--; void this.browse(); } return; }
      if (r.next) { if (this.GalleryMore) { this.GalleryPage++; void this.browse(); } return; }
      if (r.publish) { if (this.host.hasBlocks()) void this.galleryAction(async () => { await g.publish(this.Title.trim() || 'Untitled'); return COPY.published; }); return; }
      for (let n = 0; n < ITEMS; n++) {
        const row = this.GalleryItems[n];
        if (!row) break;
        if (r[`gopen${n}`]) { this.requestOpen(() => g.open(row)); return; }
        if (r[`glike${n}`]) {
          void g.like(row.id, !row.liked).then(x => { row.liked = x.liked; row.likes = x.likes; this.settled(); }).catch(e => { this.GalleryMessage = (e as Error).message; this.settled(); });
          return;
        }
        if (r[`greport${n}`]) { this.reporting = row; this.GalleryView = 'report'; this.showDom(); return; }
        if (r[`gunpub${n}`]) { void this.galleryAction(async () => { await g.unpublish(row.id); }); return; }
      }
      return;
    }
    if (this.Tab === 3) {
      const a = this.host.account;
      if (!a || this.AccountBusy) return;
      if (r.passkey) { void this.accountAction(() => a.signIn()); return; }
      if (r.google) { a.google(); return; }
      if (r.create) { this.AccountView = 'create'; this.AccountMessage = ''; this.HandleInput.value = ''; this.showDom(); this.HandleInput.focus(); return; }
      if (r.accountBack) { this.AccountView = 'main'; this.AccountMessage = ''; this.showDom(); return; }
      if (r.submit) { void this.submitHandle(); return; }
      if (r.addPasskey) { void this.accountAction(() => a.addPasskey()).then(ok => { if (ok) this.AccountMessage = 'Passkey added.'; }); return; }
      if (r.signOut) { void this.accountAction(() => a.signOut(false)); return; }
      if (r.signOutAll) { void this.accountAction(() => a.signOut(true)); return; }
      if (r.deleteAccount) { this.AccountView = 'delete'; this.AccountMessage = ''; return; }
      if (r.deleteCancel) { this.AccountView = 'main'; return; }
      if (r.deleteOk) { void this.accountAction(() => a.deleteAccount()); return; }
      return;
    }
    if (this.Tab === 2) {
      const next = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
      if (r.shape) { this.chooseVideo({ shape: next(SHAPES, this.Video.shape) }); return; }
      if (r.length) { this.chooseVideo({ seconds: next(LENGTHS, this.Video.seconds) }); return; }
      if (r.make) { if (this.VideoState === 'making') this.cancelVideo(); else void this.makeVideo(); return; }
      // The share sheet needs this click's user activation: call it straight away.
      if (r.shareVideo && this.videoFile) { void this.host.video?.share(this.videoFile).catch(e => { this.VideoState = 'error'; this.VideoMessage = (e as Error).message; }); return; }
      return;
    }
    if (this.Tab === 0) {
      if (r.randomise) { this.setTitle(App.MainScene?.SharePanel?.GenerateLabel?.() ?? this.Title); return; }
      if (r.save) { if (!this.Saving && this.host.hasBlocks()) void this.save(); return; }
      if (r.share) { void this.share(); return; }
      if (r.saveAs) { if (this.shareState().saveAs) void this.saveAsLink(); return; }
      return;
    }
    if (this.View === 'list') {
      if (r.back) { if (this.page > 1) this.turn(this.page - 1); return; }
      if (r.next) { if (this.page < this.pages) this.turn(this.page + 1); return; }
      if (r.file) { this.host.pickPatchFile(); return; }
      for (let n = 0; n < ITEMS; n++) {
        if (!r[`open${n}`] && !r[`ins${n}`] && !r[`bin${n}`]) continue;
        const item = this.Items[(this.page - 1) * ITEMS + n];
        if (!item) return;
        if (r[`bin${n}`]) { this.removing = item; this.View = 'remove'; return; }
        if (r[`ins${n}`]) { this.ClosePanel(); this.host.openPatch(item, 'insert'); }
        else this.requestOpen(() => this.host.openPatch(item, 'open'));
        return;
      }
      return;
    }
    if (this.View === 'remove') {
      const item = this.removing;
      if (r.removeCancel) { this.removing = null; this.View = 'list'; return; }
      if (r.removeOk && item) { this.removing = null; this.View = 'list'; void this.host.removePatch(item).then(() => this.refresh()); }
      return;
    }
    if (this.View === 'file') {
      if (r.fileBack) { this.View = 'list'; this.Picked = null; return; }
      if (r.fileInsert) { this.ClosePanel(); this.host.usePickedFile('insert'); return; }
      if (r.fileOpen) { this.requestOpen(() => this.host.usePickedFile('open')); return; }
      return;
    }
    // confirm
    if (this.Saving) return;
    if (r.cancel) { this.View = this.pending?.from ?? 'list'; this.pending = null; return; }
    if (r.openAnyway) { const p = this.pending; this.pending = null; this.ClosePanel(); p?.run(); return; }
    if (r.saveFirst) {
      void this.save().then(ok => {
        if (!ok || !this.pending) return;
        const p = this.pending; this.pending = null; this.ClosePanel(); p.run();
      });
    }
  }
  /** Open replaces the patch: with unsaved changes, ask first (owner, 2026-11-10). */
  private requestOpen(run: () => void): void {
    if (!this.host.isDirty()) { this.ClosePanel(); run(); return; }
    this.pending = { run, from: this.View };
    this.View = 'confirm';
  }
  private turn(page: number): void { this.page = page; this.tween('OffsetX', -(page - 1) * 430 * App.Unit, 350); }
  /** v1 SettingsPanel category select: the new tab's fill drops in, the others lift. */
  selectTab(i: Tab): void {
    if (this.Tab !== i) { this.View = 'list'; this.Picked = null; this.pending = null; }
    this.Tab = i;
    for (const j of ALL_TABS) this.tweenSelected(j, j === i ? 1 : 0, j === i ? 400 : 250);
    if (i === 4) { this.GalleryView = 'list'; this.GalleryMessage = ''; void this.browse(); }
    if (i === 3) { if (this.AccountView === 'delete') this.AccountView = 'main'; void this.refreshAccount(); }
    // OPEN lists the account's patches too: signed in or out since the panel opened, the list has changed.
    if (i === 1 && this.View === 'list') void this.refresh();
    this.showDom();
  }

  async save(): Promise<boolean> {
    this.Saving = true;
    let ok = false;
    try { ok = await this.host.savePatch(this.Title.trim() || 'Untitled'); } finally { this.Saving = false; this.settled(); }
    if (ok) { this.flash = { key: 'save', label: COPY.saved, until: performance.now() + 1500 }; void this.refresh(); }
    return ok;
  }
  /** SAVE (web) / CREATE SHARE LINK (plugin): see shareState. */
  private async share(): Promise<void> {
    const st = this.shareState();
    if (!st.save) return;
    if (this.host.links?.external) {
      if (await this.makeLink('saveAs')) { this.flash = { key: 'share', label: COPY.opened, until: performance.now() + 1500 }; this.settled(); }
      return;
    }
    // Save over this link (v1 SAVE, "overwrite"); otherwise a new link (v1 SAVE_AS).
    if (await this.makeLink(st.save === 'save' ? 'save' : 'saveAs')) { this.flash = { key: 'share', label: COPY.saved, until: performance.now() + 1500 }; this.settled(); }
  }
  /** SAVE AS: a new link; the old one keeps what it had. */
  private async saveAsLink(): Promise<void> {
    if (await this.makeLink('saveAs')) { this.flash = { key: 'saveAs', label: COPY.saved, until: performance.now() + 1500 }; this.settled(); }
  }
  private async makeLink(mode: 'saveAs' | 'save'): Promise<boolean> {
    if (this.Saving || !this.host.hasBlocks() || !this.host.links) return false;
    this.Saving = true; this.showDom();
    try { await this.host.links.make(mode, this.Title.trim() || 'Untitled'); return true; } finally { this.Saving = false; this.settled(); this.showDom(); }
  }
  setTitle(t: string): void { this.Title = t; if (this.Input) this.Input.value = t; }
  async refresh(): Promise<void> {
    this.Loading = true;
    try { this.Items = await this.host.listPatches(); } finally { this.Loading = false; this.settled(); }
    if (this.page > this.pages) { this.page = this.pages; this.OffsetX = -(this.page - 1) * 430 * App.Unit; }
  }

  OpenPanel(tab: Tab = rememberedTab()): void {
    // A new scene gets a v1-style random title (v1 SharePanel.GenerateLabel), as the Share panel did.
    if (!this.Title) this.setTitle(App.MainScene?.SharePanel?.GenerateLabel?.() ?? '');
    this.Open = true; this.shown = true;
    if (!this.hasTab(tab)) tab = 0;  // a tab remembered from the web, in the plugin
    this.Tab = tab; this.View = 'list'; this.Picked = null; this.pending = null;
    this.selected = ALL_TABS.map(i => (i === tab ? 1 : 0));
    if (tab === 3) void this.refreshAccount();
    if (tab === 4) void this.browse();
    this.OffsetY = -App.Height;
    this.OffsetX = -(this.page - 1) * 430 * App.Unit;
    this.Input.value = this.Title;
    this.tween('OffsetY', 0, 500);
    this.showDom();
    void this.refresh();
  }
  /** A picked or dropped file: the OPEN tab asks what to do with it. */
  showFile(f: PickedFile): void {
    if (!this.Open) this.OpenPanel(1); else this.selectTab(1);
    this.Picked = f; this.View = 'file'; this.settled();
  }
  ClosePanel(): void { this.Open = false; this.tween('OffsetY', -App.Height, 500); }

  // v1 SoundcloudPanel.DelayTo (its text fields follow the panel), TweenDom and StyleDom.
  private tweens: Record<string, { stop(): void }> = {};
  private tween(key: 'OffsetX' | 'OffsetY', to: number, ms: number): void {
    // One tween per property: reopening while the close is still running must not let the close finish (and hide it).
    this.tweens[key]?.stop();
    const self = this, tw = new (window as any).TWEEN.Tween({ x: this[key] });
    this.tweens[key] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) { self[key] = this.x; if (key === 'OffsetY') self.placeDom(); });
    tw.onComplete(() => { if (key === 'OffsetY' && to !== 0) { this.shown = false; this.showDom(); } });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  private tweenSelected(i: number, to: number, ms: number): void {
    const k = `sel${i}`;
    this.tweens[k]?.stop();
    const self = this, tw = new (window as any).TWEEN.Tween({ x: this.selected[i] });
    this.tweens[k] = tw;
    tw.to({ x: to }, ms);
    tw.onUpdate(function (this: { x: number }) { self.selected[i] = this.x; });
    tw.easing((window as any).TWEEN.Easing.Exponential.InOut);
    tw.start(this.LastVisualTick);
  }
  private placeDom(): void {
    const pr = App.Metrics.PixelRatio, u = App.Unit, mid = this.OffsetY + App.Height * 0.5;
    this.TitleContainer.style.top = `${(mid - u * 132) / pr}px`;
    this.UrlContainer.style.top = `${(mid + u * 65) / pr}px`;
    if (this.HandleContainer) this.HandleContainer.style.top = `${(mid - u * 22) / pr}px`;
    if (this.SearchContainer) this.SearchContainer.style.top = `${(mid - u * 177) / pr}px`;
  }
  /** The name field shows on the SAVE tab; the link field when there is a link (v1 ShowDom / HideDom). */
  private showDom(): void {
    const on = this.shown, link = this.Tab === 0 && on && !this.Saving ? this.link : null;
    this.TitleContainer.style.display = on && this.Tab === 0 ? 'block' : 'none';
    if (this.SearchContainer) this.SearchContainer.style.display = on && this.Tab === 4 && this.GalleryView === 'list' ? 'block' : 'none';
    const handle = on && this.Tab === 3 && (this.AccountView === 'create' || this.AccountView === 'name');
    if (this.HandleContainer) this.HandleContainer.style.display = handle ? 'block' : 'none';
    this.UrlContainer.style.display = link ? 'block' : 'none';
    if (link && this.UrlInput.value !== link.url) this.UrlInput.value = link.url;  // unchanged: keep the selection
  }
  /** Keep the link field in step with the link (made, gone stale, reset). */
  Update(): void { if (this.shown) this.showDom(); }
  Resize(): void {
    const u = App.Unit, pr = App.Metrics.PixelRatio, el = this.TitleContainer, url = this.UrlContainer;
    if (!el) return;
    this.OffsetX = -(this.page - 1) * 430 * u;
    // v1 StyleDom(TitleInputContainer, 300, 42, 210, 132): up to RANDOMISE TITLE.
    const width = 420 - this.textW(COPY.randomise) / u - 20;
    el.style.font = App.Metrics.TxtHeaderPR;
    el.style.width = `${(u * width) / pr}px`;
    el.style.height = `${(u * 42) / pr}px`;
    el.style.lineHeight = `${(u * 42) / pr}px`;
    el.style.left = `${App.Width / pr * 0.5 - (u * 210) / pr}px`;
    // v1 StyleDom(URLInputContainer, 400, 40, 200, 20, …, TxtUrl): in v1's URL box.
    url.style.font = App.Metrics.TxtUrl;
    url.style.width = `${(u * 400) / pr}px`;
    url.style.height = `${(u * 40) / pr}px`;
    url.style.lineHeight = `${(u * 40) / pr}px`;
    url.style.left = `${App.Width / pr * 0.5 - (u * 200) / pr}px`;
    // The gallery search field (v1 SoundcloudPanel's): up to SEARCH.
    const sf = this.SearchContainer;
    if (sf) {
      sf.style.font = App.Metrics.TxtHeaderPR;
      sf.style.width = `${(u * (410 - this.textW(COPY.search) / u - 20)) / pr}px`; sf.style.height = `${(u * 42) / pr}px`; sf.style.lineHeight = `${(u * 42) / pr}px`;
      sf.style.left = `${App.Width / pr * 0.5 - (u * 210) / pr}px`;
    }
    // The account name field: the title field's type and height across the page width (ACCOUNT tab).
    const hf = this.HandleContainer;
    if (hf) {
      hf.style.font = App.Metrics.TxtHeaderPR;
      hf.style.width = `${(u * 420) / pr}px`; hf.style.height = `${(u * 42) / pr}px`; hf.style.lineHeight = `${(u * 42) / pr}px`;
      hf.style.left = `${App.Width / pr * 0.5 - (u * 210) / pr}px`;
    }
    if (!this.Open) this.OffsetY = -App.Height;
    this.showDom();
    this.placeDom();
  }
}

/** v1's trash can (UI/TrashCan.Draw: a tapering bin with a cross), at `scale` and centred on (x, y). */
export function drawBin(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const u = App.Unit, s = scale;
  App.StrokeColor(ctx, App.Palette[App.ThemeManager.Txt]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11 * s * u, y - 11 * s * u); ctx.lineTo(x + 11 * s * u, y - 11 * s * u);
  ctx.lineTo(x + 8 * s * u, y + 11 * s * u); ctx.lineTo(x - 8 * s * u, y + 11 * s * u);
  ctx.closePath();
  ctx.moveTo(x - 4 * s * u, y - 4 * s * u); ctx.lineTo(x + 4 * s * u, y + 4 * s * u);
  ctx.moveTo(x + 4 * s * u, y - 4 * s * u); ctx.lineTo(x - 4 * s * u, y + 4 * s * u);
  ctx.stroke();
}

/**
 * A text button for the user's files (UPLOAD FILE in the sample panel, OPEN FROM YOUR DEVICE here), like v1's
 * Randomise button: its label (v1 mid type), then the usual upload mark under it (owner, 2026-11-10: an open tray with
 * an arrow out of it), in v1's 2 px line. Hovered, the label is underlined, so it reads as a button.
 */
export function drawUploadLink(ctx: CanvasRenderingContext2D, label: string, cx: number, base: number, hover: boolean): void {
  const u = App.Unit, txt = App.Palette[App.ThemeManager.Txt], text = label.toUpperCase();
  App.FillColor(ctx, txt); App.StrokeColor(ctx, txt);
  ctx.font = App.Metrics.TxtMid; ctx.textAlign = 'center';
  ctx.fillText(text, cx, base);
  ctx.lineWidth = 2;
  if (hover) { const w = ctx.measureText(text).width; ctx.beginPath(); ctx.moveTo(cx - w / 2, base + 3 * u); ctx.lineTo(cx + w / 2, base + 3 * u); ctx.stroke(); }
  drawUploadMark(ctx, cx, base + 7 * u);
}
/** The upload mark: an arrow (its tip at (cx, top)) out of an open tray, 14 × 11 units, in v1's 2 px text-colour line. */
export function drawUploadMark(ctx: CanvasRenderingContext2D, cx: number, top: number): void {
  const u = App.Unit, txt = App.Palette[App.ThemeManager.Txt];
  App.StrokeColor(ctx, txt);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * u, top + 5 * u); ctx.lineTo(cx - 7 * u, top + 11 * u); ctx.lineTo(cx + 7 * u, top + 11 * u); ctx.lineTo(cx + 7 * u, top + 5 * u);
  ctx.moveTo(cx, top + 8 * u); ctx.lineTo(cx, top);
  ctx.moveTo(cx - 3.5 * u, top + 3.5 * u); ctx.lineTo(cx, top); ctx.lineTo(cx + 3.5 * u, top + 3.5 * u);
  ctx.stroke();
}

/** A rounded rectangle path (the video shape icon). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
