// The Patches panel (CHG-0005): opening, closing and choosing tabs. Its layout, and the v1 pieces
// each part is drawn with: docs/architecture/patches-panel.md.
import { App, sceneIfMade } from '../shim.ts';
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
      // v1 SettingsPanel: the old page lifts out in 250 ms; the new drops in after 400 ms, in 400.
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
    // OPEN lists the account's patches: signed in or out since the panel opened, the list changed.
    if (i === 1 && this.View === 'list') void this.refresh();
    this.showDom();
  }

  /** Open the gallery on a search (a patch's "by @name" on the stage). */
  showGallery(query: string): void {
    this.GalleryQuery = query;
    this.GalleryView = 'list';
    this.GalleryMessage = '';
    if (this.domReady) this.SearchInput.value = query;
    if (!this.Open) this.OpenPanel(2);
    else this.selectTab(2);
  }
  /** The open patch is (or isn't) in the gallery: the switch shows it (null: unknown). */
  galleryKnown(published: boolean | null): void {
    this.savedGallery = published;
    if (published !== null) this.GalleryOn = published;
    this.GalleryNote = '';
  }

  OpenPanel(tab: Tab = rememberedTab()): void {
    // A new scene gets a v1-style random title (v1 SharePanel.GenerateLabel).
    if (!this.Title) this.setTitle(sceneIfMade()?.SharePanel.GenerateLabel() ?? '');
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
