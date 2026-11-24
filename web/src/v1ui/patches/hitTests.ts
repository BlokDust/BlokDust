// What the pointer is over in the Patches panel.
import { App, Dimensions } from '../shim.ts';
import { COPY } from './copy.ts';
import { PatchesFrame } from './frame.ts';

export abstract class PatchesHitTests extends PatchesFrame {
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
}
