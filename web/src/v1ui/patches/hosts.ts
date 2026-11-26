// What the Patches panel asks of the app: patches, links, the gallery, video and accounts.
import type { AccountStats, SignInMethod, SignedInApp } from '../../account/client.ts';
import type { DeviceCode, DevicePoll } from '../../account/device.ts';

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

/** Accounts (CHG-0023): what the ACCOUNT tab shows. */
export interface AccountInfo {
  handle: string | null;
  passkeys: number;
  providers: string[];
  methods?: SignInMethod[];
  stats?: AccountStats;
  apps?: SignedInApp[];
}
export interface AccountHost {
  /** Who is signed in (null: nobody), and the sign-ins offered; null without a backend. */
  me(
    stats?: boolean,
  ): Promise<{ user: AccountInfo | null; google: boolean; apple?: boolean } | null>;
  signUp(handle: string): Promise<void>;
  signIn(): Promise<void>;
  google(): void;
  apple(): void;
  addPasskey(): Promise<void>;
  /** R7c: remove a way in (never the last). */
  removeMethod(signInMethod: SignInMethod): Promise<void>;
  setHandle(handle: string): Promise<void>;
  signOut(everywhere: boolean): Promise<void>;
  deleteAccount(): Promise<void>;
  /** The passkey dialog was closed by the user: nothing to report. */
  cancelled(e: unknown): boolean;
  /** The plugins (SHARING-0011): sign in with a device code approved on the website. */
  plugin?: {
    /** It can open the browser (an AUv3 on iPad can't: the QR code and the address do). */
    canOpenBrowser: boolean;
    start(): Promise<DeviceCode>;
    poll(deviceCode: string): Promise<DevicePoll>;
    open(url: string): void;
    /** Keep the key (the plugin's file) and use it from now on. */
    keep(key: string, handle: string | null): void;
    /** The iPad app: native Sign in with Apple and passkeys; the answer is the key. */
    native?: {
      apple(): Promise<{ key: string; user: { handle: string | null }; fresh?: boolean }>;
      passkey(): Promise<{ key: string; user: { handle: string | null } }>;
    };
  };
  /** The website (SHARING-0011): the plugins signed in here, and approving a plugin's code. */
  apps?: {
    list(): Promise<SignedInApp[]>;
    remove(id: string): Promise<void>;
    info(code: string): Promise<{ name: string }>;
    approve(code: string, yes: boolean): Promise<{ name: string }>;
  };
}

/** POPULAR · ALL TIME TOP · NEW · EXAMPLES (@blokdust's patches); ALL TIME TOP is popular without
 * the fade (CHG-0035), in TUTORIALS' place while there are none (the server says tutorials). */
export type GallerySort = 'popular' | 'top' | 'new' | 'examples' | 'tutorials';
export const GALLERY_SORTS: GallerySort[] = ['popular', 'top', 'new', 'examples'];
/** An Open or Insert: a promise while the patch is fetched (false: it couldn't be). */
/** Open or insert; a promise ends true, or false / the message bar's words for why it couldn't. */
export type OpenRun = () => undefined | Promise<boolean | string>;
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
  /** Open a published patch (replacing the current one; SAVE then remixes it), or insert it. */
  open(row: GalleryRow, mode: 'open' | 'insert'): Promise<boolean | string>;
  /** Like or unlike: shown at once on the row and stage; fast presses settle on the last. */
  like(row: GalleryRow): void;
  unpublish(id: string): Promise<void>;
}
/** Video export (CHG-0022): what the VIDEO tab asks for. */
export type VideoShape = 'portrait' | 'square' | 'wide';
/** Videos start from the beginning, as the patch plays when it has just loaded. */
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
/** A file picked (FROM YOUR COMPUTER) or dropped on the stage: its title, or why not. */
export interface PickedFile {
  title: string;
  fileName: string;
  error?: string;
}
export interface PatchesHost {
  listPatches(): Promise<PatchItem[]>;
  /** Save the scene as a file named `title`; true once written, false if cancelled or failed. */
  savePatch(title: string): Promise<boolean>;
  /** Open (replace) or Insert (place by hand) a listed patch. */
  openPatch(item: PatchItem, mode: 'open' | 'insert'): undefined | Promise<boolean | string>;
  /** Show the system file picker; the host answers with `PatchesPanel.showFile`. */
  pickPatchFile(): void;
  /** Open or Insert the file last given to `showFile`. */
  usePickedFile(mode: 'open' | 'insert'): void;
  /** The patch changed since it was last saved, shared or opened (and has blocks). */
  isDirty(): boolean;
  /** Delete one of the user's patches (web: from this browser's list; plugin: to the Trash). */
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
    /** In a click: the system share sheet (a browser that can't share files downloads it). */
    share(file: File): Promise<void>;
    /** This browser can hand a video to the share sheet (phones, tablets); else it downloads. */
    canShareFiles(): boolean;
    /** The video's length: whole cycles of the patch's longest timer, 10 to 30 seconds. */
    seconds(): number;
  };
  /** The public gallery (SPEC-SHARING-GALLERY); null: no GALLERY tab (the plugin). */
  gallery: GalleryHost | null;
  /** Accounts (SPEC-SHARING-ACCOUNTS): Settings › SIGN IN / ACCOUNT; null in the plugin. */
  account: AccountHost | null;
  /** Someone is signed in: only they can publish (SPEC-SHARING-GALLERY R2). */
  signedIn(): boolean;
  /** SAVE / SHARE's SIGN IN: Settings › SIGN IN, back to SAVE once signed in (CHG-0035). */
  signInToSave?(title: string): void;
  /** Share links (SPEC-SHARING-BACKEND). */
  links: null | {
    /** Plugin: the link is made in the web browser (its page has the bot check). */
    external?: boolean;
    current(): ShareLink | null;
    /** v1 SAVE_AS (a new link) / SAVE (overwrite this browser's link); `gallery`: in the gallery or
     * not (undefined: leave it). Resolves with what the server said about the gallery. */
    make(
      mode: 'saveAs' | 'save',
      title: string,
      gallery?: boolean,
    ): Promise<{ published: boolean; reason?: string } | null | undefined>;
    /** v1 SharePanel's warning (recordings, the user's own files), or null. */
    warning(): string | null;
  };
}
