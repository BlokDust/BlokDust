// The Patches panel's presses, drags and releases.
import { App } from '../shim.ts';
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
  protected requestOpen(run: OpenRun, gone?: () => void): void {
    if (!this.host.isDirty()) {
      this.runOpen(run, gone);
      return;
    }
    this.pending = { run, from: this.View, gone };
    this.View = 'confirm';
  }
  /** Open or Insert. A patch from the server keeps the panel up, spinning, until it is in; then the panel closes. */
  protected runOpen(run: OpenRun, gone?: () => void): void {
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
}
