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
// The Patches panel (CHG-0005): opening, closing and choosing tabs.
import { App } from '../shim.ts';
import type { PickedFile } from './hosts.ts';
import { PatchesInput } from './input.ts';
import { ALL_TABS, rememberedTab, type Tab } from './state.ts';

export class PatchesPanel extends PatchesInput {
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
      this.tweens.get(`page${k}`)?.stop();
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
}
