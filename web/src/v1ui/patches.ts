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
  try { return localStorage.getItem(TAB_KEY) === '1' ? 1 : 0; } catch { return 0; }
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
  panel: 'Patches', tabs: ['Save', 'Open'] as const,
  name: 'Patch Name', randomise: 'Randomise Title',
  save: 'Save to Computer', saved: 'Saved',
  saveLinePlugin: 'Save a .blokdust patch file. It opens in the web version of BlokDust too.',
  share: 'Create Share Link',
  shareLinePlugin: 'Create a shareable link. It opens in your web browser, ready to copy.', opened: 'Opened',
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
};

type Tab = 0 | 1;  // SAVE, OPEN
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
  private selected = [1, 0];
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
  }
  /** Click the link: it is copied (and selected, so it can be copied by hand where the clipboard is refused). */
  private async copyLink(): Promise<void> {
    const link = this.link; if (!link) return;
    this.UrlInput.select();
    try { await navigator.clipboard.writeText(link.url); } catch { document.execCommand?.('copy'); }
    this.flash = { key: 'url', label: COPY.linkCopied, until: performance.now() + 1500 }; this.settled();
  }

  flashing(key: string): boolean { return !!this.flash && this.flash.key === key && performance.now() < this.flash.until; }
  get animating(): boolean { const now = performance.now(); return this.Loading || this.Saving || now < this.settle || (!!this.flash && now < this.flash.until + 250); }
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
    const tabs = COPY.tabs.map(name => {
      const w = this.textW(name, `400 ${u * 10}px Dosis`) + gutter * u, t = { name: name.toUpperCase(), x: x + w * 0.5, w };
      x += w;
      return t;
    });
    return { tabs, half: menuWidth * 0.5 };
  }
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
      const s = this.selected[i], hw = t.w * 0.5, x = t.x;
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

    if (this.Tab === 0) this.drawSave(); else if (this.View === 'list') this.drawList(); else if (this.View === 'file') this.drawFile(); else if (this.View === 'remove') this.drawRemove(); else this.drawConfirm();
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
    tabs.forEach((t, i) => { r[`tab${i}`] = hit(t.x - t.w * 0.5, tabY, t.w, 60 * u); });
    const box = (b: { x: number; y: number; w: number; h: number }) => hit(b.x, b.y, b.w, b.h);
    const pad = (b: { x: number; y: number; w: number }) => hit(b.x - 5 * u, b.y - 10 * u, b.w + 10 * u, 40 * u);
    if (this.Tab === 0) {
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
    const t = /^tab(\d)$/.exec(name);
    if (t) { const tab = this.tabs().tabs[Number(t[1])]; return tab ? at(tab.x, this.OffsetY + 30 * u) : null; }
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
    for (const i of [0, 1] as Tab[]) if (r[`tab${i}`]) { this.selectTab(i); try { localStorage.setItem(TAB_KEY, String(i)); } catch { /* private mode */ } return; }
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
    for (const j of [0, 1]) this.tweenSelected(j, j === i ? 1 : 0, j === i ? 400 : 250);
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
    this.Tab = tab; this.View = 'list'; this.Picked = null; this.pending = null;
    this.selected = [tab === 0 ? 1 : 0, tab === 1 ? 1 : 0];
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
  }
  /** The name field shows on the SAVE tab; the link field when there is a link (v1 ShowDom / HideDom). */
  private showDom(): void {
    const on = this.shown, link = this.Tab === 0 && on && !this.Saving ? this.link : null;
    this.TitleContainer.style.display = on && this.Tab === 0 ? 'block' : 'none';
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
