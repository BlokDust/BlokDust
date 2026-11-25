// Where everything in the Patches panel sits (device px, from v1's units).
import { App, Dimensions } from '../shim.ts';
import { Device } from '../ported/Device';
import { COPY } from './copy.ts';
import { GALLERY_SORTS } from './hosts.ts';
import { PatchesState } from './state.ts';
import { ALL_TABS, type Tab } from './state.ts';

/** v1's bordered button: its box and where its label goes. */
export type BorderedButton = ReturnType<PatchesLayout['bordered']>;

export abstract class PatchesLayout extends PatchesState {
  // ---- layout ----
  protected get mobile() {
    return App.Metrics.Device === Device.mobile;
  }
  protected get cy() {
    return this.OffsetY + this.pageDy[this.Tab] + App.Height * 0.5;
  }
  protected get margin() {
    return App.Width * 0.5 - 210 * App.Unit;
  }
  protected get pageW() {
    return 420 * App.Unit;
  }
  /** Phones (portrait): OPEN, GALLERY and the video fill from the tabs (`top`, their rule) to the
   * screen's foot (`bottom`), with taller rows and larger type (v1 centred, leaving wide gaps). */
  protected get top() {
    return this.OffsetY + this.pageDy[this.Tab] + 60 * App.Unit;
  }
  protected get bottom() {
    return this.OffsetY + this.pageDy[this.Tab] + App.Height;
  }
  /** Each tab's page offset (v1 SettingsPanel's category YOffset): 0 shown, −height away; a new
   * tab's page drops in as the old one lifts out, as Settings' tabs do (CHG-0035). */
  protected pageDy: number[] = [0, 0, 0];
  protected leaving: Tab | null = null;
  /** A list window's height: whole rows and a half (the half row says there is more below). */
  protected windowH(room: number) {
    const k = Math.max(1, Math.floor(room / this.rowH - 0.5));
    return (k + 0.5) * this.rowH;
  }
  protected get rowH() {
    return (this.mobile ? 48 : 40) * App.Unit;
  }
  protected get rowFont() {
    return this.mobile ? App.Metrics.TxtItalic3 : App.Metrics.TxtItalic;
  }
  /** A row's second baseline under its top, and its divider over it: text and buttons sit in
   * the row's middle (a phone's rows are taller). */
  protected get rowBase() {
    return (this.mobile ? 35 : 30) * App.Unit;
  }
  protected get rowDivider() {
    return (this.mobile ? 33 : 28) * App.Unit;
  }
  protected get rowGap() {
    return (this.mobile ? 13 : 10) * App.Unit;
  }
  /** OPEN FROM YOUR DEVICE: not in a phone's browser (it opens nothing useful there). */
  protected get fileButtonShown() {
    return !(this.mobile && this.web);
  }
  protected textW(text: string, font = App.Metrics.TxtMid) {
    this.Ctx.font = font;
    return this.Ctx.measureText(text.toUpperCase()).width;
  }
  /** v1 SettingsPanel.Populate: the tab bar's width, and each tab's centre and width. */
  protected tabs() {
    const unit = App.Unit,
      width = App.Width,
      menuWidth = this.mobile ? (width / 7) * 5 : (width / 7) * 4,
      gutter = App.Metrics.Device !== Device.desktop ? 40 : 60;
    let x = width * 0.5 - menuWidth * 0.5;
    const tabs = ALL_TABS.filter((id) => this.hasTab(id)).map((id) => {
      const name = COPY.tabs[id],
        width = this.textW(name, `400 ${unit * 10}px Dosis`) + gutter * unit,
        tab = { id, name: name.toUpperCase(), x: x + width * 0.5, w: width };
      x += width;
      return tab;
    });
    return { tabs, half: menuWidth * 0.5 };
  }
  /** VIDEO, ACCOUNT and GALLERY are web only. */
  protected hasTab(id: Tab): boolean {
    return id < 2 || (id === 2 && !!this.host.gallery);
  }
  /** v1's bordered button (Search Freesound, Randomise Title): right edge `right`, text 14 down. */
  protected bordered(label: string, right: number, top: number) {
    const unit = App.Unit,
      width = this.textW(label);
    return {
      label,
      x: right - 10 * unit - width,
      y: top,
      w: width + 10 * unit,
      h: 20 * unit,
      textX: right - 5 * unit - width,
      textY: top + 14 * unit,
    };
  }
  protected randomise() {
    const unit = App.Unit;
    return this.bordered(COPY.randomise, App.Width * 0.5 + 210 * unit, this.cy - 120 * unit);
  }
  /** v1 SharePanel SAVE / SAVE AS: two filled half-width buttons. */
  protected halves() {
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
  protected get web(): boolean {
    return !!this.host.links && !this.host.links.external;
  }
  /** What SAVE does now (web): make the link, save over it when changed (or a new one for a link
   * made elsewhere), or nothing if unchanged; the plugin always makes a new link in the browser. */
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
  protected thirds() {
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
  /** OPEN, INSERT and (the user's own patches) a bin at the right: v1's trash can, small. */
  protected rowButtons(row: number) {
    const unit = App.Unit,
      y = this.openRowY(row);
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
  /** OPEN FROM YOUR DEVICE: bordered like RANDOMISE TITLE (owner, 2026-11-18), at the right of the
   * row under the list (where GALLERY has its sorts). */
  protected fileButton() {
    const unit = App.Unit;
    return this.bordered(COPY.file, this.margin + this.pageW, this.listFoot - 14 * unit);
  }
  // SAVE / SHARE (web): units from the panel centre. ADD TO GALLERY and MAKE VIDEO (v1's
  // OptionSwitch in an options row's proportions) side by side, each in half the page:
  protected gallerySwitch() {
    const unit = App.Unit;
    return { x: this.margin, y: this.cy - 72 * unit, w: 60 * unit, h: 60 * unit };
  }
  /** SIGN IN (signed out): bordered, right of ADD TO GALLERY, under RANDOMISE TITLE (CHG-0035). */
  protected signInButton() {
    const unit = App.Unit;
    return this.bordered(COPY.signIn, App.Width * 0.5 + 210 * unit, this.cy - 61 * unit);
  }
  protected get signInShown() {
    return this.web && !!this.host.gallery && !!this.host.signInToSave && !this.host.signedIn();
  }
  protected videoSwitch() {
    const unit = App.Unit;
    return {
      x: this.host.gallery ? this.margin + this.pageW * 0.5 + 10 * unit : this.margin,
      y: this.cy - 72 * unit,
      w: 60 * unit,
      h: 60 * unit,
    };
  }
  /** Saved and nothing changed (owner, 2026-11-18): no SAVE button, the link takes its place. */
  protected get linkOnly(): boolean {
    return this.web && !!this.link && !this.Saving && this.mainAction().kind === null;
  }
  /** The link's line (baseline) and its field's top: in SAVE's place when saved, else under it. */
  protected linkLineY() {
    return this.cy + (this.linkOnly ? 33 : 83) * App.Unit;
  }
  protected urlTop() {
    return this.linkLineY() + 12 * App.Unit;
  }
  /** COPY LINK: right of the link on a desktop; under it on a phone, with SHARE beside it. */
  protected copyButton() {
    const unit = App.Unit;
    if (!this.mobile)
      return this.bordered(COPY.copyLink, this.margin + this.pageW, this.urlTop() + 6 * unit);
    return this.bordered(
      COPY.copyLink,
      this.margin + this.textW(COPY.copyLink) + 10 * unit,
      this.urlTop() + 42 * unit,
    );
  }
  protected shareButton() {
    const unit = App.Unit,
      copy = this.copyButton();
    return this.bordered(
      COPY.shareLink,
      copy.x + copy.w + 15 * unit + this.textW(COPY.shareLink) + 10 * unit,
      copy.y,
    );
  }
  /** The link field's width: up to COPY LINK on a desktop, the page on a phone. */
  protected urlWidth() {
    const unit = App.Unit;
    return this.mobile ? this.pageW : this.pageW - this.copyButton().w - 15 * unit;
  }
  /** SAVE (or MAKE VIDEO): Connect's 420×40 GUIDE button. */
  protected mainButton() {
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
  /** SAVE AS (left) and DOWNLOAD PATCH (right, not on phones): v1's bordered buttons. */
  protected secondary() {
    const unit = App.Unit,
      top = this.cy + 190 * unit,
      left = this.margin;
    return {
      saveAs: this.bordered(COPY.saveAs, left + this.textW(COPY.saveAs) + 10 * unit, top),
      download: this.mobile ? null : this.bordered(COPY.download, left + this.pageW, top),
    };
  }
  /** The video view: the portrait player (9:16), its button and the link under that; no name or
   * RANDOMISE (chosen by now), BACK at the top left, larger on a phone. */
  protected playerBox() {
    const unit = App.Unit,
      width = (this.mobile ? 252 : 126) * unit,
      height = (width * 16) / 9;
    return {
      x: App.Width * 0.5 - width / 2,
      y: this.mobile ? this.top + 70 * unit : this.cy - 150 * unit,
      w: width,
      h: height,
    };
  }
  protected videoMain() {
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
  /** The link's baseline and box top, under the video's button: the link can be shared alone. */
  protected videoLink() {
    const unit = App.Unit,
      main = this.videoMain();
    return { line: main.y + main.h + 30 * unit, box: main.y + main.h + 42 * unit };
  }
  protected get videoOn(): boolean {
    return !!this.host.video && (this.VideoOn ?? this.shareFiles);
  }
  protected get shareFiles(): boolean {
    return !!this.host.video?.canShareFiles();
  }
  /** v1 SharePanel's back chevron and SKIP-style label, top right under the tabs on every device:
   * `x` is the chevron's middle (the label centred under it), `y` its point, in device px. */
  protected backArrow() {
    const unit = App.Unit,
      video = this.Tab === 0 && this.View === 'video';
    // The video's BACK at the top left (owner, 2026-11-16), as a browser's.
    return {
      x: video ? this.margin + 10 * unit : App.Width * 0.5 + 195 * unit,
      y: video ? this.playerBox().y + 20 * unit : this.cy - 175 * unit,
    };
  }
  protected backHit(pt: { x: number; y: number }) {
    const unit = App.Unit,
      b = this.backArrow();
    return Dimensions.hitRect(b.x - 20 * unit, b.y - 22 * unit, 40 * unit, 64 * unit, pt.x, pt.y);
  }
  protected get link() {
    return this.host.links?.current() ?? null;
  }

  /** What the main button does: SAVE (see shareState); nothing to save and MAKE VIDEO on: video. */
  protected mainAction(): { kind: 'save' | 'video' | null; label: string; off: boolean } {
    const st = this.shareState(),
      blocks = this.host.hasBlocks() && !this.Saving;
    if (st.save) return { kind: 'save', label: COPY.saveLink, off: !blocks };
    if (this.videoOn) return { kind: 'video', label: COPY.makeVideo, off: !blocks };
    return { kind: null, label: COPY.saveLink, off: true };
  }

  /** OPEN's top line and GALLERY's search rule: 50 units under the tabs (SEARCH clears the tab's
   * notch), at most 175 units over the centre. */
  protected get listRule() {
    const unit = App.Unit;
    return this.mobile
      ? this.top + 60 * unit
      : Math.max(this.cy - 175 * unit, this.top + 50 * unit);
  }
  /** The bottom row (GALLERY's sorts; OPEN's OPEN FROM YOUR DEVICE): its baseline. */
  protected get listFoot() {
    const unit = App.Unit;
    return this.mobile ? this.bottom - 30 * unit : this.cy + 185 * unit;
  }
  /** OPEN: a rule, then the list in a window, scrolled, the same size as the gallery's. */
  protected openLayout() {
    const unit = App.Unit,
      rule = this.listRule,
      top = rule - 2 * unit;
    // The rows start right under the rule (a row's top is 2 units above its divider) and go under
    // it as they scroll; the window shows whole rows and a half.
    return { rule, top, bottom: top + this.windowH(this.listFoot - 35 * unit - top) };
  }
  /** Row n's second line's baseline, scrolled. */
  protected openRowY(row: number) {
    return this.openLayout().top + this.rowBase + row * this.rowH - this.OpenScroll;
  }
  /** The last row ends 10 units above the window's foot (owner, 2026-11-17: it was cut off). */
  protected openMaxScroll() {
    const layout = this.openLayout(),
      lengthValue = this.Items.length;
    return Math.max(0, lengthValue * this.rowH + 10 * App.Unit - (layout.bottom - layout.top));
  }

  /** GALLERY (CHG-0024, v1 SoundcloudPanel's layout): SEARCH and its rule at the top, the sorts at
   * the bottom, the list between; on a phone right under the tabs and at the screen's foot. */
  protected galleryLayout() {
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
  /** The list's window: from the search rule (rows scroll under it; a row's top is 2 units over its
   * divider) to 45 units above the sorts, holding whole rows and a half (CHG-0035). */
  protected galleryWindow() {
    const unit = App.Unit,
      layout = this.galleryLayout(),
      top = layout.rule - 2 * unit;
    return {
      top,
      bottom: top + this.windowH(layout.sortY - 35 * unit - top),
      clip: layout.rule + unit,
    };
  }
  /** Row n's second baseline (v1 SoundcloudPanel: the name 10 units above), scrolled. */
  protected galleryRowY(row: number) {
    return this.galleryWindow().top + this.rowBase + row * this.rowH - this.GalleryScroll;
  }
  /** Every row, SHOW MORE when there are more, and 10 units under the last. */
  protected galleryMaxScroll() {
    const unit = App.Unit,
      visible = this.galleryWindow();
    return Math.max(
      0,
      this.GalleryItems.length * this.rowH +
        (this.GalleryMore || this.GalleryLoading ? this.rowH : 0) +
        10 * unit -
        (visible.bottom - visible.top),
    );
  }
  /** SHOW MORE, centred in the row after the last (more to fetch; a spinner while they come). */
  protected showMoreButton() {
    const unit = App.Unit,
      y = this.galleryRowY(this.GalleryItems.length),
      width = this.textW(COPY.showMore);
    return this.bordered(COPY.showMore, App.Width * 0.5 + (width + 10 * unit) / 2, y - 19 * unit);
  }
  /** OPEN and INSERT, as OPEN's rows (owner review 3: insert from the gallery too). */
  protected galleryRow(row: number) {
    const unit = App.Unit,
      y = this.galleryRowY(row),
      insert = this.bordered(COPY.insert, this.margin + this.pageW, y - 19 * unit);
    const open = this.bordered(COPY.open, insert.x - 10 * unit, y - 19 * unit);
    return { open, insert, textRight: open.x - 6 * unit };
  }
  /** POPULAR · NEW · EXAMPLES · TUTORIALS along the bottom (where v1 SoundcloudPanel had its count
   * and RANDOMISE), spread across the page; the chosen one underlined. */
  sortButtons() {
    const layout = this.galleryLayout(),
      ctx = this.Ctx;
    ctx.font = App.Metrics.TxtMid;
    const names = GALLERY_SORTS.map((gallerySort) => COPY.sorts[gallerySort].toUpperCase()),
      ws = names.map((nameValue) => ctx.measureText(nameValue).width);
    const gap = (this.pageW - ws.reduce((a, b) => a + b, 0)) / (names.length - 1);
    let x = this.margin;
    return GALLERY_SORTS.map((sort, i) => {
      const b = { sort, label: names[i], x, y: layout.sortY, w: ws[i] };
      x += ws[i] + gap;
      return b;
    });
  }
}
