// The Patches panel's presses, drags and releases.
import { App, sceneIfMade } from '../shim.ts';
import { MISSING_TEXT } from '../../patch/server.ts';
import { COPY } from './copy.ts';
import { GALLERY_SORTS } from './hosts.ts';
import type { OpenRun } from './hosts.ts';
import { PatchesSaving } from './saving.ts';
import { ALL_TABS, SORT_KEY, TAB_KEY, type Tab } from './state.ts';

export abstract class PatchesInput extends PatchesSaving {
  abstract ClosePanel(): void;
  abstract selectTab(i: Tab): void;
  MouseMove(pt: { x: number; y: number }): void {
    const drag = this.galleryDrag;
    if (drag) {
      if (Math.abs(pt.y - drag.y) > 6 * App.Unit) drag.moved = true;
      if (drag.moved) {
        if (drag.tab === 2) {
          this.GalleryScroll = drag.scroll;
          this.scrollGallery(drag.y - pt.y);
        } else {
          this.OpenScroll = drag.scroll;
          this.scrollOpen(drag.y - pt.y);
        }
      }
    }
    this.HitTests(pt);
  }
  MouseUp(): void {
    const drag = this.galleryDrag,
      galleryApi = this.host.gallery;
    this.galleryDrag = null;
    if (
      drag &&
      !drag.moved &&
      drag.row >= 0 &&
      drag.tab === 1 &&
      this.Tab === 1 &&
      this.View === 'list'
    ) {
      const item = this.Items.at(drag.row);
      if (!item) return;
      if (drag.mode === 'bin') {
        this.removing = item;
        this.View = 'remove';
        return;
      }
      const gone = () => {
        this.Items = this.Items.filter((x) => x !== item);
      };
      if (drag.mode === 'insert') this.runOpen(() => this.host.openPatch(item, 'insert'), gone);
      else this.requestOpen(() => this.host.openPatch(item, 'open'), gone);
      return;
    }
    if (!drag || drag.moved || drag.row < 0 || !galleryApi || this.Tab !== 2 || drag.tab !== 2)
      return;
    const row = this.GalleryItems.at(drag.row);
    if (!row) return;
    // Likes from the list too (owner review 3); signed out, the host asks to sign in.
    if (drag.mode === 'like') {
      galleryApi.like(row);
      this.settled();
      return;
    }
    // Insert adds to the patch: nothing is lost, so it doesn't ask first (as OPEN's INSERT).
    // Deleted since the list loaded: its row goes (owner, 2026-11-18).
    const gone = () => {
      this.GalleryItems = this.GalleryItems.filter((x) => x !== row);
    };
    if (drag.mode === 'insert') this.runOpen(() => galleryApi.open(row, 'insert'), gone);
    else this.requestOpen(() => galleryApi.open(row, 'open'), gone);
  }
  MouseDown(pt: { x: number; y: number }): void {
    if (this.Opening) return;
    this.OpenError = '';
    this.HitTests(pt);
    const rolled = this.roll;
    if (rolled.close) {
      this.ClosePanel();
      return;
    }
    for (const i of ALL_TABS)
      if (rolled[`tab${i}`]) {
        this.selectTab(i);
        try {
          localStorage.setItem(TAB_KEY, String(i));
        } catch {
          /* private mode */
        }
        return;
      }
    if (this.Tab === 2 && this.View !== 'confirm') {
      const galleryApi = this.host.gallery;
      if (!galleryApi) return;
      if (rolled.search) {
        this.GalleryQuery = this.SearchInput.value.trim();
        void this.browse();
        return;
      }
      const sort = GALLERY_SORTS.find((gallerySort) => rolled[`sort_${gallerySort}`]);
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
      if (rolled.showMore) {
        void this.browse(true);
        return;
      }
      // The list: a press may become a drag (scrolling); a row opens on release, if it didn't move.
      if (rolled.list) {
        let row = -1,
          mode: 'open' | 'insert' | 'like' = 'open';
        for (let index = 0; index < this.GalleryItems.length; index++) {
          if (rolled[`gopen${index}`]) {
            row = index;
            break;
          }
          if (rolled[`gins${index}`]) {
            row = index;
            mode = 'insert';
            break;
          }
          if (rolled[`glike${index}`]) {
            row = index;
            mode = 'like';
            break;
          }
        }
        this.galleryDrag = { tab: 2, y: pt.y, scroll: this.GalleryScroll, moved: false, row, mode };
      }
      return;
    }
    if (this.Tab === 0 && this.View === 'video') {
      if (rolled.videoBack) {
        if (this.VideoState === 'making') this.cancelVideo();
        this.dropPlayer();
        this.View = 'list';
        this.showDom();
        return;
      }
      if (rolled.make) {
        if (this.VideoState === 'making') this.cancelVideo();
        else void this.makeVideo();
        return;
      }
      // The share sheet needs this click's user activation: call it straight away.
      if (rolled.shareVideo && this.videoFile) {
        void this.host.video?.share(this.videoFile).catch((error: unknown) => {
          this.VideoState = 'error';
          this.VideoMessage = (error as Error).message;
        });
        return;
      }
      return;
    }
    if (this.Tab === 0) {
      // Signed out, SIGN IN (or the greyed switch) goes to Settings › SIGN IN and back here.
      if (rolled.signIn || (rolled.gallerySwitch && this.signInShown)) {
        this.GalleryOn = true;
        this.ClosePanel();
        this.host.signInToSave?.(this.Title);
        return;
      }
      if (rolled.gallerySwitch) {
        if (this.host.signedIn()) {
          this.GalleryOn = !this.GalleryOn;
          this.GalleryNote = '';
        }
        return;
      }
      if (rolled.videoSwitch) {
        this.VideoOn = !this.videoOn;
        return;
      }
      if (rolled.randomise) {
        this.setTitle(sceneIfMade()?.SharePanel.GenerateLabel() ?? this.Title);
        return;
      }
      if (rolled.save) {
        if (!this.Saving && this.host.hasBlocks()) void this.save();
        return;
      }
      if (rolled.share) {
        if (!this.web) {
          void this.share();
          return;
        }
        const main = this.mainAction();
        if (main.off) return;
        // SAVE, then on to the video (MAKE VIDEO on); just the video when there is nothing to save.
        if (main.kind === 'save')
          void this.share().then((ok) => {
            if (ok && this.videoOn) void this.makeVideo();
          });
        else if (main.kind === 'video') void this.makeVideo();
        return;
      }
      if (rolled.saveAs) {
        if (this.shareState().saveAs && !this.Saving)
          void this.saveAsLink().then((ok) => {
            if (ok && this.videoOn) void this.makeVideo();
          });
        return;
      }
      if (rolled.copyLink) {
        void this.copyLink();
        return;
      }
      if (rolled.shareLink) {
        void this.shareSheet();
        return;
      }
      return;
    }
    if (this.View === 'list') {
      if (rolled.file) {
        this.host.pickPatchFile();
        return;
      }
      // The list: a press may become a drag (scroll); a row's button acts on release if still.
      if (rolled.list) {
        let row = -1,
          mode: 'open' | 'insert' | 'bin' = 'open';
        for (let itemIndex = 0; itemIndex < this.Items.length; itemIndex++) {
          if (rolled[`open${itemIndex}`]) {
            row = itemIndex;
            break;
          }
          if (rolled[`ins${itemIndex}`]) {
            row = itemIndex;
            mode = 'insert';
            break;
          }
          if (rolled[`bin${itemIndex}`]) {
            row = itemIndex;
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
      if (rolled.removeCancel) {
        this.removing = null;
        this.View = 'list';
        return;
      }
      if (rolled.removeOk && item) {
        this.removing = null;
        this.View = 'list';
        void this.host.removePatch(item).then(() => this.refresh());
      }
      return;
    }
    if (this.View === 'file') {
      if (rolled.fileBack) {
        this.View = 'list';
        this.Picked = null;
        return;
      }
      if (rolled.fileInsert) {
        this.ClosePanel();
        this.host.usePickedFile('insert');
        return;
      }
      if (rolled.fileOpen) {
        this.requestOpen(() => {
          this.host.usePickedFile('open');
        });
        return;
      }
      return;
    }
    // confirm
    if (this.Saving) return;
    if (rolled.cancel) {
      this.View = this.pending?.from ?? 'list';
      this.pending = null;
      return;
    }
    if (rolled.openAnyway) {
      const waiting = this.pending;
      this.pending = null;
      if (waiting) this.runOpen(waiting.run, waiting.gone);
      return;
    }
    if (rolled.saveFirst) {
      void this.save().then((ok) => {
        if (!ok || !this.pending) return;
        const waiting = this.pending;
        this.pending = null;
        this.runOpen(waiting.run, waiting.gone);
      });
    }
  }
  /** Open replaces the patch: with unsaved changes, ask first (owner, 2026-11-10). */
  protected requestOpen(run: OpenRun, gone?: () => void): void {
    if (!this.host.isDirty()) {
      this.runOpen(run, gone);
      return;
    }
    this.pending = { run, from: this.View, gone };
    this.View = 'confirm';
  }
  /** Open or Insert. A server patch keeps the panel up, spinning, until it is in, then closes. */
  protected runOpen(run: OpenRun, gone?: () => void): void {
    this.OpenError = '';
    const result = run();
    if (!(result instanceof Promise)) {
      this.ClosePanel();
      return;
    }
    this.Opening = true;
    this.showDom();
    // Couldn't: v1's message bar says why; a deleted patch's row leaves the list.
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
    result.then(
      (ok) => {
        done(ok);
      },
      () => {
        done(false);
      },
    );
  }
}
